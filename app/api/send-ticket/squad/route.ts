import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

// Crypto-secure ticket code
function generateTicketCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Tier prices in kobo (amount × 100).
// TEST_MODE: ₦100 + ₦100 fee = ₦200 = 20000 kobo
// LIVE:      ₦5,000 + ₦100 fee = ₦5,100 = 510000 kobo
const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

const TIER_PRICES: Record<string, number> = {
  regular: isTestMode ? 20000 : 510000,
  couples: 1510000,
  table:   5010000,
};

const BASE_CAPACITY: Record<string, number> = {
  regular: 1,
  couples: 2,
  table:   5,
};

const TIER_NAMES: Record<string, string> = {
  regular: isTestMode ? 'Standard Pass (TEST)' : 'Standard Pass',
  couples: 'Couples Pass',
  table:   'Table of 5',
};

function inferTierFromAmount(amountKobo: number): {
  tier: string;
  totalCapacity: number;
  tierName: string;
  capacityLabel: string;
} {
  // Exact match (single ticket)
  for (const [tier, price] of Object.entries(TIER_PRICES)) {
    if (amountKobo === price) {
      const cap = BASE_CAPACITY[tier];
      return { tier, totalCapacity: cap, tierName: TIER_NAMES[tier], capacityLabel: `${cap} Guest${cap > 1 ? 's' : ''}` };
    }
  }

  // Quantity > 1: check if amount is a clean multiple of a tier price
  for (const [tier, price] of Object.entries(TIER_PRICES)) {
    if (amountKobo % price === 0) {
      const quantity = amountKobo / price;
      if (quantity >= 2 && quantity <= 10) {
        const baseCap = BASE_CAPACITY[tier];
        const totalCapacity = baseCap * quantity;
        return { tier, totalCapacity, tierName: TIER_NAMES[tier], capacityLabel: `${totalCapacity} Guests` };
      }
    }
  }

  // Last resort: price range
  const naira = amountKobo / 100;
  if (naira <= (isTestMode ? 300 : 5200))  return { tier: 'regular', totalCapacity: 1, tierName: TIER_NAMES.regular, capacityLabel: '1 Guest' };
  if (naira <= 15200) return { tier: 'couples', totalCapacity: 2, tierName: 'Couples Pass',  capacityLabel: '2 Guests' };
  return { tier: 'table', totalCapacity: 5, tierName: 'Table of 5', capacityLabel: '5 Guests' };
}

export async function POST(req: Request) {
  try {
    const body      = await req.text();
    const signature = req.headers.get('x-squad-signature');
    const secret    = process.env.SQUAD_SECRET_KEY;

    if (!secret) {
      console.error('SQUAD_SECRET_KEY env var is not set');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    // Verify Squad HMAC-SHA512 signature
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (hash.toLowerCase() !== signature?.toLowerCase()) {
      console.error('Squad webhook signature mismatch');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('Squad webhook event:', event.Event, JSON.stringify(event.Body ?? {}).slice(0, 200));

    // Accept both event name variants Squad may send
    const isSuccess = ['charge.completed', 'transaction.successful', 'charge_completed', 'payment.success'].includes(event.Event);

    if (isSuccess) {
      const transactionData = event.Body ?? event.data ?? {};
      const paymentRef      = transactionData.transaction_ref ?? transactionData.reference;

      if (!paymentRef) {
        console.error('No transaction_ref found in webhook body');
        return NextResponse.json({ error: 'Missing transaction ref' }, { status: 400 });
      }

      // Check if the frontend already created a ticket for this reference
      const existing = await adminDb.collection('tickets').where('squadRef', '==', paymentRef).limit(1).get();

      if (existing.empty) {
        // Frontend didn't create the ticket — webhook creates it as fallback
        const newTicketCode = generateTicketCode();
        const amountKobo    = transactionData.amount ?? transactionData.transaction_amount ?? 0;
        const tierInfo      = inferTierFromAmount(Number(amountKobo));

        await adminDb.collection('tickets').doc(newTicketCode).set({
          buyerName:         transactionData.customer_name  || transactionData.name  || 'Guest',
          email:             transactionData.email          || transactionData.customer_email || '',
          phone:             transactionData.customer_mobile || transactionData.phone || 'N/A',
          price:             Number(amountKobo) / 100,
          fee:               100,
          totalPaid:         Number(amountKobo) / 100,
          tier:              tierInfo.tier,
          totalCapacity:     tierInfo.totalCapacity,
          admissionsUsed:    0,
          status:            'paid',
          squadRef:          paymentRef,
          isWebhookFallback: true,
          createdAt:         new Date().toISOString(),
        });

        console.log(`Webhook fallback ticket created: ${newTicketCode} for ref ${paymentRef}`);

        // Send confirmation email
        const baseUrl       = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const internalSecret = process.env.INTERNAL_API_SECRET;

        try {
          await fetch(`${baseUrl}/api/send-ticket`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-key': internalSecret ?? '',
            },
            body: JSON.stringify({
              email:      transactionData.email || transactionData.customer_email,
              name:       transactionData.customer_name || 'Guest',
              ticketCode: newTicketCode,
              tierName:   tierInfo.tierName,
              capacity:   tierInfo.capacityLabel,
            }),
          });
        } catch (err) {
          console.error('Webhook email trigger failed:', err);
          // Don't fail the webhook over email — ticket is already saved
        }
      } else {
        console.log(`Ticket already exists for ref ${paymentRef} — skipping duplicate`);
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}