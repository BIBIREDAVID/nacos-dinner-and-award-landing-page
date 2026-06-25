// lib/email.ts
// Sends the ticket receipt + QR code email via Resend.
// The QR token is signed so the scanner can verify it at the door.

import { Resend } from 'resend';
import QRCode from 'qrcode';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.EMAIL_FROM || 'onboarding@resend.dev';

const EVENT_NAME  = 'NACOS LASU Dinner & Awards';
const EVENT_DATE  = 'June 30, 2026';
const EVENT_VENUE = 'To be announced';

interface SendTicketEmailParams {
  to: string;
  name: string;
  tierName: string;
  ticketId: string;
  qrToken: string;
  capacity: string;
  totalPaid: number;
}

export async function sendTicketEmail({
  to,
  name,
  tierName,
  ticketId,
  qrToken,
  capacity,
  totalPaid,
}: SendTicketEmailParams) {
  const qrPngBuffer = await QRCode.toBuffer(qrToken, { width: 400, margin: 2 });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0514; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #3b1c6b;">

      <div style="background: #1b0a33; padding: 28px 32px; border-bottom: 2px solid #6b21a8; text-align: center;">
        <h1 style="margin: 0; color: #d8b4fe; font-size: 22px; letter-spacing: 2px; text-transform: uppercase;">${EVENT_NAME}</h1>
      </div>

      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #e9d5ff; margin-bottom: 6px;">Hi ${name},</p>
        <p style="font-size: 15px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
          Your ticket is confirmed! Show the QR code attached to this email at the venue entrance — it can only be scanned once.
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #3b1c6b;">
            <td style="padding: 10px 0; color: #a855f7;">Ticket ID</td>
            <td style="padding: 10px 0; text-align: right; color: #fff; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 3px;">${ticketId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #3b1c6b;">
            <td style="padding: 10px 0; color: #a855f7;">Tier</td>
            <td style="padding: 10px 0; text-align: right; color: #fff;">${tierName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #3b1c6b;">
            <td style="padding: 10px 0; color: #a855f7;">Admits</td>
            <td style="padding: 10px 0; text-align: right; color: #fff;">${capacity}</td>
          </tr>
          <tr style="border-bottom: 1px solid #3b1c6b;">
            <td style="padding: 10px 0; color: #a855f7;">Date</td>
            <td style="padding: 10px 0; text-align: right; color: #fff;">${EVENT_DATE}</td>
          </tr>
          <tr style="border-bottom: 1px solid #3b1c6b;">
            <td style="padding: 10px 0; color: #a855f7;">Venue</td>
            <td style="padding: 10px 0; text-align: right; color: #fff;">${EVENT_VENUE}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #a855f7;">Amount Paid</td>
            <td style="padding: 10px 0; text-align: right; color: #4ade80; font-weight: bold;">₦${totalPaid.toLocaleString()}</td>
          </tr>
        </table>

        <div style="background: #0b0612; border: 1px dashed #6b21a8; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 11px; color: #a855f7; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">QR Code Attached</p>
          <p style="margin: 0; font-size: 13px; color: #71717a;">Open the attached file <strong style="color:#d8b4fe;">ticket-${ticketId}.png</strong> and show it at the door.</p>
        </div>
      </div>

      <div style="background: #0b0612; padding: 16px; text-align: center; font-size: 11px; color: #52525b;">
        <p style="margin: 0;">Keep this email safe. We look forward to hosting you at ${EVENT_NAME}!</p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your Ticket — ${EVENT_NAME} 🎉`,
    html,
    attachments: [
      {
        filename: `ticket-${ticketId}.png`,
        content: qrPngBuffer.toString('base64'),
      },
    ],
  });
}