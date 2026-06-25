import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure this points to your firebase config

export async function POST(req: Request) {
  try {
    // 1. Get the raw body and signature header
    const body = await req.text();
    const signature = req.headers.get('x-squad-signature');
    const secret = process.env.SQUAD_SECRET_KEY;

    if (!secret) {
      console.error("Squad Secret Key is missing");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Verify the webhook is actually from Squad (Security Check)
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (hash.toLowerCase() !== signature?.toLowerCase()) {
      console.error("Invalid Squad Webhook Signature");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse the verified data
    const event = JSON.parse(body);

    // 4. Handle a Successful Payment
    if (event.Event === 'charge.completed' || event.Event === 'transaction.successful') {
      const transactionData = event.Body;
      const paymentRef = transactionData.transaction_ref;
      
      // We use the transaction reference as a fallback Document ID 
      // in case the frontend didn't create the ticket code in time.
      const ticketRef = doc(db, "tickets", paymentRef);
      const ticketSnap = await getDoc(ticketRef);

      // Only create if it doesn't already exist from the frontend onSuccess callback
      if (!ticketSnap.exists()) {
        await setDoc(ticketRef, {
          buyerName: transactionData.customer_name || 'Guest',
          email: transactionData.email,
          phone: transactionData.customer_mobile || 'N/A',
          price: transactionData.amount / 100, // Convert back to Naira from Kobo
          status: 'paid',
          squadRef: paymentRef,
          isWebhookFallback: true, // Tags this ticket so you know how it was generated
          createdAt: new Date().toISOString(),
          // Note: Tier and Capacity would default to regular here unless 
          // you pass them through Squad's metadata field during checkout.
          tier: 'regular',
          totalCapacity: 1,
          admissionsUsed: 0,
        });
      }
    }

    // Always return 200 OK so Squad knows we received it
    return NextResponse.json({ status: 'success' }, { status: 200 });
    
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}