const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'campuscore_internal_email_secret_key';

app.use(cors());
app.use(express.json());

// Header Secret Middleware for Django <-> Node communication security
app.use((req, res, next) => {
  const requestSecret = (req.headers['x-internal-secret'] || req.headers['X-Internal-Secret'] || '').toString().trim();
  const targetSecret = (INTERNAL_SECRET || '').toString().trim();
  if (!requestSecret || requestSecret !== targetSecret) {
    return res.status(403).json({ error: 'Unauthorized: Invalid internal secret key' });
  }
  next();
});

// Create Nodemailer transporter dynamically based on environment config
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }
  return null;
}

// POST /send-email endpoint
app.post('/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'Recipient "to" and "subject" are required.' });
  }

  const from = process.env.EMAIL_FROM || 'CampusCore <noreply@campuscore.edu>';
  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html: html || text,
      });
      console.log(`[EMAIL SERVICE] Email sent to ${to}: ${info.messageId}`);
      return res.json({ success: true, messageId: info.messageId });
    } catch (err) {
      console.error('[EMAIL SERVICE] SMTP Error:', err);
      return res.status(500).json({ error: 'Failed to send email via SMTP', details: err.message });
    }
  } else {
    // Dev Mode Fallback: Log email details cleanly to console
    console.log('\n==================================================');
    console.log(' [EMAIL SERVICE - DEV MODE LOGGER]');
    console.log(` TO:      ${to}`);
    console.log(` FROM:    ${from}`);
    console.log(` SUBJECT: ${subject}`);
    console.log('--------------------------------------------------');
    console.log(text || html);
    console.log('==================================================\n');

    return res.json({
      success: true,
      devMode: true,
      message: `Email logged to console for ${to} (No SMTP configured).`,
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
