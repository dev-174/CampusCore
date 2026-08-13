const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const INTERNAL_SECRET =
  process.env.INTERNAL_SECRET || 'campuscore_internal_email_secret_key';

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json());

// Header Secret Middleware for Django <-> Node communication security
app.use((req, res, next) => {
  const requestSecret = (
    req.headers['x-internal-secret'] ||
    req.headers['X-Internal-Secret'] ||
    ''
  )
    .toString()
    .trim();

  const targetSecret = (INTERNAL_SECRET || '').toString().trim();

  if (!requestSecret || requestSecret !== targetSecret) {
    return res
      .status(403)
      .json({ error: 'Unauthorized: Invalid internal secret key' });
  }

  next();
});

// POST /send-email endpoint
app.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject) {
    return res
      .status(400)
      .json({ error: 'Recipient "to" and "subject" are required.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[EMAIL SERVICE] RESEND_API_KEY is missing');
    return res.status(500).json({
      error: 'Email service is not configured properly.',
    });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'CampusCore <onboarding@resend.dev>',
      to: [to],
      subject,
      text: text || '',
      html: html || text || '',
    });

    if (error) {
      console.error('[EMAIL SERVICE] Resend Error:', error);
      return res.status(500).json({
        error: 'Failed to send email via Resend',
        details: error.message,
      });
    }

    console.log(
      `[EMAIL SERVICE] Email sent to ${to} via Resend: ${data.id}`
    );

    return res.json({
      success: true,
      messageId: data.id,
    });
  } catch (err) {
    console.error('[EMAIL SERVICE] Resend Error:', err);

    return res.status(500).json({
      error: 'Failed to send email via Resend',
      details: err.message,
    });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'campuscore-email-service' });
});

app.listen(PORT, () => {
  console.log(`CampusCore Email Service running on port ${PORT}`);
});