// lib/qr.ts
// Signs and verifies the token encoded into each ticket's QR code.
// A signed token means the scanner can trust the QR before touching Firestore.

import crypto from 'crypto';

const SECRET = process.env.QR_SIGNING_SECRET!;

export function signTicket(ticketId: string): string {
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(ticketId)
    .digest('hex')
    .slice(0, 16);

  return `${ticketId}.${signature}`;
}

export function verifyTicketToken(token: string): { valid: boolean; ticketId?: string } {
  if (typeof token !== 'string' || !token.includes('.')) return { valid: false };

  const [ticketId, signature] = token.split('.');
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(ticketId)
    .digest('hex')
    .slice(0, 16);

  const sigBuf = Buffer.from(signature || '');
  const expBuf = Buffer.from(expected);

  const valid =
    sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

  return valid ? { valid: true, ticketId } : { valid: false };
}