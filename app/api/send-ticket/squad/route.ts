import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Fix #2: cryptographically secure ticket code generator
function generateTicketCode(): string {
  // 4 random bytes → 8 hex characters (e.g. "a3f9c120")
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Fix #6 + #7: map Squad amount (in kobo) back to the correct tier and quantity
const TIER_PRICES: Record<string, number> = {
  regular: 510000,   // ₦5,000 + ₦100 fee in kobo
  couples: 1510000,  // ₦15,000 + ₦100 fee in kobo
  table:   5010000,  // ₦50,000 + ₦100 fee in kobo
};

const BASE_CAPACITY: Record<string, number> = {
  regular: 1,
  couples: 2,
  table: 5,
};

const TIER_NAMES: Record<string, string> = {
  regular: 'Standard Pass',
  couples: 'Couples Pass',
  table:   'Table of 5',
};

function inferTierFromAmount(amountKobo: number): {
  tier: string;
  totalCapacity: number;
  tierName: string;
  capacityLabel: string;
} {
  // Try exact match first (single ticket purchase)
  for (const [tier, price] of Object.entries(TIER_PRICES)) {
    if (amountKobo === price) {
      const cap = BASE_CAPACITY[tier];
      return { tier, totalCapacity: cap, tierName: TIER_NAMES[tier], capacityLabel: `${cap} Guest${cap > 1 ? 's' : ''}` };
    }
  }

  // Fix #7: detect quantity > 1 by checking if amount is a multiple of a tier price
  // e.g. 2× regular = ₦10,200 = 1,020,000 kobo (2 × 510,000)
  for (const [tier, price] of Object.entries(TIER_PRICES)) {
    if (amountKobo % price === 0) {
      const quantity = amountKobo / price;
      if (quantity >= 1 && quantity <= 10) {
        const baseCap = BASE_CAPACITY[tier];
        const totalCapacity = baseCap * quantity;
        return {
          tier,
          totalCapacity,
          tierName: TIER_NAMES[tier],
          capacityLabel: `${totalCapacity} Guest${totalCapacity > 1 ? 's' : ''}`,
        };
      }
    }
  }

  // Last resort: infer by price range (single ticket)
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