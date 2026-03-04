import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { checkRateLimit, getClientIP } from '@/lib/server/rateLimit';

export const prerender = false;

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

export const POST: APIRoute = async ({ request }) => {
  const limited = checkRateLimit('contact', getClientIP(request), 5, 60_000);
  if (limited) return limited;

  const host = import.meta.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT || '465');
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  const to = import.meta.env.CONTACT_EMAIL || user;

  if (!host || !user || !pass) {
    return new Response(JSON.stringify({ error: 'SMTP not configured on server' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  let body: {
    companyName?: string;
    customerName?: string;
    position?: string;
    workEmail?: string;
    contactInfo?: string;
    summary?: string;
    bizType?: string;
    cardImage?: string;
    source?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { companyName, customerName, position, workEmail, contactInfo, summary, bizType, cardImage, source } = body;

  if (!companyName && !customerName) {
    return new Response(JSON.stringify({ error: 'Company name or contact name required' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const rows = [
    ['Company', companyName],
    ['Contact', customerName],
    ['Position', position],
    ['Work Email', workEmail],
    ['Contact Info', contactInfo],
    ['Business Type', bizType],
    ['Source', source || 'Website'],
    ['Summary', summary],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:8px 12px;color:#111827">${v}</td></tr>`)
    .join('\n');

  const html = `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto">
  <h2 style="color:#0369a1;margin:0 0 16px">New Contact Lead from BidMosaic</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    ${rows}
  </table>
  <p style="color:#9ca3af;font-size:12px;margin-top:16px">Sent from bidmosaic.com contact form</p>
</div>`;

  const subject = `[BidMosaic Lead] ${companyName || customerName || 'New Contact'}`;

  const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
  if (cardImage) {
    const match = cardImage.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      const ext = match[1] === 'image/png' ? 'png' : 'jpg';
      attachments.push({
        filename: `card.${ext}`,
        content: Buffer.from(match[2], 'base64'),
        contentType: match[1],
      });
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"BidMosaic" <${user}>`,
      to,
      subject,
      html,
      attachments,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email send failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: jsonHeaders,
    });
  }
};
