import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, ticketCode, tierName, capacity } = body;

    if (!email || !name || !ticketCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Configure the Gmail SMTP Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // The 16-letter App Password
      },
    });

    // 2. Generate a live QR Code image URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${ticketCode}`;

    // 3. The HTML Email Template
    const emailHtml = `
      <div style="font-family: sans-serif; max-w-md: 600px; margin: 0 auto; background-color: #0f041a; color: #ffffff; padding: 40px; border-radius: 12px; border: 1px solid #4c1d95;">
        <h1 style="color: #c084fc; text-align: center; font-family: serif;">NACOS Gala & Awards</h1>
        <p style="text-align: center; color: #a1a1aa;">Your official event ticket is confirmed.</p>
        
        <div style="background-color: #1b0a33; padding: 24px; border-radius: 8px; margin-top: 30px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px; color: #ffffff;">${name}</h2>
          <p style="color: #c084fc; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">${tierName} • Admits ${capacity}</p>
          
          <div style="margin: 30px 0;">
            <img src="${qrCodeUrl}" alt="Ticket QR Code" style="border-radius: 8px; border: 4px solid white;" />
          </div>
          
          <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 8px;">Your Unique Check-in Code:</p>
          <div style="background-color: #000000; padding: 12px; border-radius: 6px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #c084fc;">
            ${ticketCode}
          </div>
        </div>
        
        <p style="text-align: center; color: #71717a; font-size: 12px; margin-top: 30px;">
          Please present this QR code or the 7-digit number at the entrance.<br/>
          Do not share this code with anyone.
        </p>
      </div>
    `;

    // 4. Send the Email
    const mailOptions = {
      from: `"NACOS Events" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Ticket: NACOS Gala & Awards (#${ticketCode})`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });

  } catch (error) {
    console.error('Email sending failed:', error);
    return NextResponse.json({ error: 'Failed to send ticket email' }, { status: 500 });
  }
}