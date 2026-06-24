import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 1. Receive the ticket details from the frontend
    const body = await request.json();
    const { email, name, ticketCode, tierName, capacity } = body;

    // 2. Send the email
    const data = await resend.emails.send({
      // NOTE: Until you verify a custom domain in Resend, you MUST use this exact 'from' address
      from: 'NACOS Events <onboarding@resend.dev>', 
      to: email,
      subject: 'Your Ticket is Confirmed! | NACOS Dinner & Awards',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f041a; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #3b1c6b;">
          
          <div style="background-color: #1b0a33; padding: 30px; text-align: center; border-bottom: 2px solid #6b21a8;">
            <h1 style="margin: 0; color: #d8b4fe; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">Payment Secured</h1>
          </div>

          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #e9d5ff; margin-bottom: 20px;">Hello ${name},</p>
            <p style="font-size: 16px; color: #e9d5ff; line-height: 1.6;">Your registration for the NACOS Dinner and Awards is officially confirmed. Please present the 7-digit code below at the venue entrance.</p>
            
            <div style="background-color: #000000; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px dashed #6b21a8;">
              <p style="margin: 0; font-size: 12px; color: #a855f7; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Unique Check-in Code</p>
              <p style="margin: 0; font-size: 42px; font-weight: bold; color: #ffffff; letter-spacing: 6px;">${ticketCode}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3b1c6b; color: #a855f7; font-size: 14px;">Ticket Tier</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3b1c6b; color: #ffffff; font-size: 14px; text-align: right; text-transform: capitalize;">${tierName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3b1c6b; color: #a855f7; font-size: 14px;">Admit</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3b1c6b; color: #ffffff; font-size: 14px; text-align: right;">${capacity}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #0b0612; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">Keep this email safe. We look forward to hosting you!</p>
          </div>

        </div>
      `
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Resend Error:", error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}