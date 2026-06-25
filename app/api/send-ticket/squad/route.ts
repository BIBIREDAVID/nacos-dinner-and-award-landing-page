import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-squad-signature');
    const secret = process.env.SQUAD_SECRET_KEY;

    if (!secret) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    // Verify Signature
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (hash.toLowerCase() !== signature?.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.Event === 'charge.completed' || event.Event === 'transaction.successful') {
      const transactionData = event.Body;
      const paymentRef = transactionData.transaction_ref;
      
      // Check if this ticket was ALREADY created by the frontend
      const ticketsRef = collection(db, "tickets");
      const q = query(ticketsRef, where("squadRef", "==", paymentRef));
      const querySnapshot = await getDocs(q);

      // If no ticket exists with this bank reference, the frontend failed/closed early. 
      // The Webhook will now step in and generate it.
      if (querySnapshot.empty) {
        const newTicketCode = Math.floor(1000000 + Math.random() * 9000000).toString();
        
        await setDoc(doc(db, "tickets", newTicketCode), {
          buyerName: transactionData.customer_name || 'Guest',
          email: transactionData.email,
          phone: transactionData.customer_mobile || 'N/A',
          price: transactionData.amount / 100, 
          status: 'paid',
          squadRef: paymentRef,
          isWebhookFallback: true,
          createdAt: new Date().toISOString(),
          tier: 'regular', // Default fallback
          totalCapacity: 1, // Default fallback
          admissionsUsed: 0,
        });

        // Trigger the Email API to send the guest their newly generated code
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: transactionData.email,
              name: transactionData.customer_name || 'Guest',
              ticketCode: newTicketCode,
              tierName: 'Regular Pass',
              capacity: '1 Guest'
            })
          });
        } catch (err) { console.error("Webhook email trigger failed", err); }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}