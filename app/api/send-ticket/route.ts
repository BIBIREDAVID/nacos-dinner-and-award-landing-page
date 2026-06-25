import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Fix #2: cryptographically secure ticket code generator
function generateTicketCode(): string {
  // 4 random bytes → 8 hex characters (e.g. "a3f9c120")
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Fix #6: map Squad amount (in kobo) back to the correct tier
const TIER_MAP: Record<number, { tier: string; totalCapacity: number; tierName: string; capacityLabel: string }> = {
  510000:  { tier: 'regular', totalCapacity: 1, tierName: 'Standard Pass',  capacityLabel: '1 Guest' },   // ₦5,000 + ₦100 fee
  1510000: { tier: 'couples', totalCapacity: 2, tierName: 'Couples Pass',   capacityLabel: '2 Guests' },  // ₦15,000 + ₦100 fee
  5010000: { tier: 'table',   totalCapacity: 5, tierName: 'Table of 5',     capacityLabel: '5 Guests' },  // ₦50,000 + ₦100 fee
};

// Fallback if amount doesn't match exactly (e.g. quantity > 1)
function inferTierFromAmount(amountKobo: number): { tier: string; totalCapacity: number; tierName: string; capacityLabel: string } {
  if (TIER_MAP[amountKobo]) return TIER_MAP[amountKobo];

  // Try to infer by range
  const naira = amountKobo / 100;
  if (naira <= 5200)  return { tier: 'regular', totalCapacity: 1, tierName: 'Standard Pass', capacityLabel: '1 Guest' };
  if (naira <= 15200) return { tier: 'couples', totalCapacity: 2, tierName: 'Couples Pass',  capacityLabel: '2 Guests' };
  return { tier: 'table', totalCapacity: 5, tierName: 'Table of 5', capacityLabel: '5 Guests' };
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-squad-signature');
    const secret = process.env.SQUAD_SECRET_KEY;

    if (!secret) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    // Verify Squad HMAC-SHA512 signature
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (hash.toLowerCase() !== signature?.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.Event === 'charge.completed' || event.Event === 'transaction.successful') {
      const transactionData = event.Body;
      const paymentRef = transactionData.transaction_ref;

      // Check if the frontend already created a ticket for this reference
      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, where('squadRef', '==', paymentRef));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Frontend failed or closed early — webhook creates the ticket as fallback

        // Fix #2: use crypto-secure code
        const newTicketCode = generateTicketCode();

        // Fix #6: derive tier from actual payment amount instead of hardcoding 'regular'
        const amountKobo = transactionData.amount ?? 0;
        const tierInfo = inferTierFromAmount(amountKobo);

        await setDoc(doc(db, 'tickets', newTicketCode), {
          buyerName:       transactionData.customer_name  || 'Guest',
          email:           transactionData.email,
          phone:           transactionData.customer_mobile || 'N/A',
          price:           amountKobo / 100,
          tier:            tierInfo.tier,
          totalCapacity:   tierInfo.totalCapacity,
          admissionsUsed:  0,
          status:          'paid',
          squadRef:        paymentRef,
          isWebhookFallback: true,
          createdAt:       new Date().toISOString(),
        });

        // Fix #11: use server-side env var (no NEXT_PUBLIC_ prefix needed in API routes)
        // Set BASE_URL=https://your-domain.vercel.app in Vercel env vars
        const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const internalSecret = process.env.INTERNAL_API_SECRET;

        try {
          await fetch(`${baseUrl}/api/send-ticket`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Fix #5: pass the internal secret so the route accepts the request
              'x-internal-key': internalSecret ?? '',
            },
            body: JSON.stringify({
              email:      transactionData.email,
              name:       transactionData.customer_name || 'Guest',
              ticketCode: newTicketCode,
              tierName:   tierInfo.tierName,
              capacity:   tierInfo.capacityLabel,
            }),
          });
        } catch (err) {
          console.error('Webhook email trigger failed', err);
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}