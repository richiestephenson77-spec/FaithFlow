const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { Resend } = require('resend');

const prisma = require('../db');
const resend = new Resend(process.env.RESEND_API_KEY);

async function signup(req, res) {
  const { name, email, password, churchName, location, bio } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, churchName, location, bio },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Suspended accounts (repeat offenders) can't log in.
    if (user.isSuspended) return res.status(403).json({ error: 'This account has been suspended.' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    const { data, error: resendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'FaithBridge <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your FaithBridge password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;">✝</span>
            <h1 style="color:#7c3aed;margin:8px 0 0;">FaithBridge</h1>
          </div>
          <h2 style="color:#1f2937;">Password Reset Request</h2>
          <p style="color:#4b5563;">Hello ${user.name},</p>
          <p style="color:#4b5563;">We received a request to reset your password. Click the button below to create a new one. This link expires in 1 hour.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">Reset My Password</a>
          </div>
          <p style="color:#9ca3af;font-size:13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#d1d5db;font-size:12px;text-align:center;">United in faith, connected in prayer</p>
        </div>
      `,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return res.status(500).json({ error: 'email_send_failed' });
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: record.userId }, data: { password: hashed } });
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

function sanitize(user) {
  const { password, ...rest } = user;
  return rest;
}

module.exports = { signup, login, forgotPassword, resetPassword };
