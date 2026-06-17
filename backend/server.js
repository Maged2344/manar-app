const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const promClient = require('prom-client');
const crypto = require('crypto');

const app = express();

// Prometheus
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'manarapp_' });
const httpRequestsTotal = new promClient.Counter({ name: 'manarapp_http_requests_total', help: 'Total HTTP requests', labelNames: ['method', 'route', 'status'] });
const httpRequestDuration = new promClient.Histogram({ name: 'manarapp_http_request_duration_seconds', help: 'HTTP request duration', labelNames: ['method', 'route', 'status'], buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5] });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route: req.path, status: res.statusCode }, duration);
  });
  next();
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/manarapp';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ===== Models =====
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  phone: { type: String, default: '' },
  company: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  service: { type: String, default: '' },
  message: { type: String, required: true },
  status: { type: String, default: 'new' },
  createdAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String, default: '' },
  service: { type: String, required: true },
  budget: { type: String, default: '' },
  timeline: { type: String, default: '' },
  details: { type: String, required: true },
  status: { type: String, default: 'new' },
  createdAt: { type: Date, default: Date.now }
});

const visitSchema = new mongoose.Schema({
  page: { type: String, default: '/' },
  visitorKey: { type: String, required: true },
  deviceId: { type: String, default: '' },
  ip: { type: String, default: '' },
  date: { type: String, required: true }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Application = mongoose.model('Application', applicationSchema);
const Visit = mongoose.model('Visit', visitSchema);

// JWT
const JWT_SECRET = process.env.JWT_SECRET || 'manar-app-secret-key';
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}

// ===== Routes =====

// Health
app.get('/api/health', (req, res) => { res.json({ status: 'ok', app: 'manar-media', timestamp: new Date().toISOString() }); });

// Metrics
app.get('/metrics', async (req, res) => { res.set('Content-Type', promClient.register.contentType); res.end(await promClient.register.metrics()); });

// ===== Visit Tracking =====
app.post('/api/track', async (req, res) => {
  try {
    const page = req.body.page || '/';
    const rawDeviceId = req.body.deviceId || '';
    const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.slice(0, 120) : '';
    const ip = getClientIp(req);
    const visitorKey = deviceId || ip || 'unknown';
    const today = new Date().toISOString().split('T')[0];
    // Count one visit per visitor per day (prevents refresh from inflating visits).
    await Visit.findOneAndUpdate(
      { date: today, visitorKey },
      { $setOnInsert: { page, date: today, visitorKey, deviceId, ip } },
      { upsert: true, new: false }
    );
    res.json({ ok: true });
  } catch (e) { res.json({ ok: true }); }
});

// ===== Auth =====
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hash });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try { const user = await User.findById(req.user.id).select('-password'); if (!user) return res.status(404).json({ error: 'User not found' }); res.json(user); }
  catch (e) { res.status(500).json({ error: 'Failed to get user' }); }
});

// Update Profile
app.patch('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, company, bio, avatar, location, website } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (company !== undefined) updates.company = company;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;
    if (location !== undefined) updates.location = location;
    if (website !== undefined) updates.website = website;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: 'Failed to update profile' }); }
});

// Change Password
app.patch('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (e) { res.status(500).json({ error: 'Failed to change password' }); }
});

// Get user's own applications
app.get('/api/auth/applications', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const apps = await Application.find({ email: user.email }).sort({ createdAt: -1 });
    res.json(apps);
  } catch (e) { res.status(500).json({ error: 'Failed to get applications' }); }
});

app.patch('/api/auth/applications/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const appRecord = await Application.findById(req.params.id);
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });
    if (appRecord.email !== user.email) return res.status(403).json({ error: 'Not allowed to edit this application' });

    // Allow edits until admins start processing or finalize the request.
    const lockedStatuses = ['in-progress', 'approved', 'completed', 'rejected'];
    if (lockedStatuses.includes(appRecord.status)) {
      return res.status(400).json({ error: 'This application can no longer be edited' });
    }

    const fields = ['name', 'phone', 'company', 'service', 'budget', 'timeline', 'details'];
    const updates = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const required = ['name', 'phone', 'service', 'details'];
    for (const key of required) {
      const value = updates[key] !== undefined ? updates[key] : appRecord[key];
      if (!value) return res.status(400).json({ error: 'Name, phone, service, and details are required' });
    }

    const updated = await Application.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Failed to update application' }); }
});

// ===== Contact =====
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, phone, service } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });
    await Contact.create({ name, email, phone, service, message });
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (e) { res.status(500).json({ error: 'Failed to send message' }); }
});

app.get('/api/contact', authenticateToken, requireAdmin, async (req, res) => {
  try { const contacts = await Contact.find().sort({ createdAt: -1 }).limit(100); res.json(contacts); }
  catch (e) { res.status(500).json({ error: 'Failed to get contacts' }); }
});

app.delete('/api/contact/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: 'Message deleted successfully' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete message' }); }
});

// ===== Applications =====
app.post('/api/applications', async (req, res) => {
  try {
    const { name, email, phone, company, service, budget, timeline, details } = req.body;
    if (!name || !email || !phone || !service || !details) return res.status(400).json({ error: 'Name, email, phone, service, and details are required' });
    await Application.create({ name, email, phone, company, service, budget, timeline, details });
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (e) { res.status(500).json({ error: 'Failed to submit application' }); }
});

app.get('/api/admin/applications', authenticateToken, requireAdmin, async (req, res) => {
  try { const apps = await Application.find().sort({ createdAt: -1 }).limit(100); res.json(apps); }
  catch (e) { res.status(500).json({ error: 'Failed to get applications' }); }
});

app.patch('/api/admin/applications/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'reviewed', 'approved', 'rejected', 'in-progress', 'completed'];
    if (!status || !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const app = await Application.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json(app);
  } catch (e) { res.status(500).json({ error: 'Failed to update application' }); }
});

// ===== Admin =====
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try { const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100); res.json(users); }
  catch (e) { res.status(500).json({ error: 'Failed to get users' }); }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Admin users cannot be deleted from here' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete user' }); }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [totalUsers, totalContacts, totalApplications, visitorsToday, totalVisits] = await Promise.all([
      User.countDocuments(),
      Contact.countDocuments(),
      Application.countDocuments(),
      Visit.countDocuments({ date: today }),
      Visit.countDocuments()
    ]);
    // Service breakdown from applications
    const serviceBreakdown = await Application.aggregate([
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $project: { service: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);
    res.json({ totalUsers, totalContacts, totalApplications, visitorsToday, totalVisits, serviceBreakdown });
  } catch (e) { res.status(500).json({ error: 'Failed to get stats' }); }
});

app.delete('/api/admin/visits', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await Visit.deleteMany({});
    res.json({ message: 'All visitor data reset successfully' });
  } catch (e) { res.status(500).json({ error: 'Failed to reset visitors' }); }
});

app.delete('/api/admin/applications/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const app = await Application.findByIdAndDelete(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    res.json({ message: 'Application deleted successfully' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete application' }); }
});

app.get('/api/admin/reach', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
    const weekAgo = new Date(now - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(now - 30 * 86400000).toISOString().split('T')[0];

    const [todayCount, yesterdayCount, weekCount, monthCount] = await Promise.all([
      Visit.countDocuments({ date: today }),
      Visit.countDocuments({ date: yesterday }),
      Visit.countDocuments({ date: { $gte: weekAgo } }),
      Visit.countDocuments({ date: { $gte: monthAgo } })
    ]);

    // Daily breakdown last 30 days
    const daily = await Visit.aggregate([
      { $match: { date: { $gte: monthAgo } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } }
    ]);

    // Fill gaps
    const filled = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().split('T')[0];
      const found = daily.find(x => x.date === d);
      filled.push({ date: d.slice(5), count: found ? found.count : 0 });
    }

    const daysWithData = filled.filter(d => d.count > 0).length || 1;
    const dailyAverage = Math.round(monthCount / daysWithData);

    res.json({ today: todayCount, yesterday: yesterdayCount, thisWeek: weekCount, thisMonth: monthCount, dailyAverage, daily: filled });
  } catch (e) { res.status(500).json({ error: 'Failed to get reach data' }); }
});

// ===== Static API =====
app.get('/api/services', (req, res) => {
  res.json([
    { id: 'video', title: 'Video Production', description: 'Cinematic commercials, corporate videos, and social media content.' },
    { id: 'branding', title: 'Branding & Design', description: 'Complete brand identity and visual systems.' },
    { id: 'photography', title: 'Photography', description: 'Professional photography that tells your story.' },
    { id: 'marketing', title: 'Digital Marketing', description: 'Data-driven campaigns for maximum impact.' },
    { id: 'web', title: 'Web Development', description: 'Modern websites that convert visitors.' },
    { id: 'content', title: 'Content Strategy', description: 'Strategic content planning for growth.' }
  ]);
});

// ===== Paymob Payment Gateway =====
const PAYMOB_API_KEY       = process.env.PAYMOB_API_KEY || '';
const PAYMOB_INTEGRATION_ID = parseInt(process.env.PAYMOB_INTEGRATION_ID || '0', 10);
const PAYMOB_IFRAME_ID     = process.env.PAYMOB_IFRAME_ID || '';
const PAYMOB_HMAC_SECRET   = process.env.PAYMOB_HMAC_SECRET || '';
const SITE_URL             = process.env.SITE_URL || 'https://manar.cloud-stacks.com';

const PAYMENT_PLANS = {
  starter:      { name: 'Starter Plan',      amountCents: parseInt(process.env.STARTER_AMOUNT_CENTS      || '300000',  10) }, // default 3,000 EGP
  professional: { name: 'Professional Plan', amountCents: parseInt(process.env.PRO_AMOUNT_CENTS          || '1500000', 10) }  // default 15,000 EGP
};

const paymentSchema = new mongoose.Schema({
  plan:                 { type: String, required: true },
  planName:             { type: String },
  amountCents:          { type: Number },
  paymobOrderId:        { type: String },
  paymobTransactionId:  { type: String, default: '' },
  status:               { type: String, default: 'pending' }, // pending | paid | failed
  userEmail:            { type: String },
  userName:             { type: String },
  userPhone:            { type: String },
  createdAt:            { type: Date, default: Date.now }
});
const Payment = mongoose.model('Payment', paymentSchema);

// Initiate payment — calls Paymob in 3 steps and returns an iframe URL
app.post('/api/payment/initiate', async (req, res) => {
  try {
    const { plan, name, email, phone } = req.body;
    if (!plan || !name || !email || !phone)
      return res.status(400).json({ error: 'Plan, name, email, and phone are required' });

    const planConfig = PAYMENT_PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan selected' });

    if (!PAYMOB_API_KEY || !PAYMOB_INTEGRATION_ID || !PAYMOB_IFRAME_ID)
      return res.status(503).json({ error: 'Payment gateway is not configured yet. Please contact us directly.' });

    // Step 1 — authenticate
    const authRes  = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY })
    });
    const authData = await authRes.json();
    if (!authRes.ok || !authData.token)
      return res.status(502).json({ error: 'Payment gateway authentication failed' });
    const authToken = authData.token;

    // Step 2 — create order
    const orderRes  = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: planConfig.amountCents,
        currency: 'EGP',
        items: [{ name: planConfig.name, amount_cents: planConfig.amountCents, description: planConfig.name, quantity: 1 }]
      })
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.id)
      return res.status(502).json({ error: 'Failed to create payment order' });

    // Save pending record so we can link the webhook back
    const payment = await Payment.create({
      plan, planName: planConfig.name, amountCents: planConfig.amountCents,
      paymobOrderId: String(orderData.id), userEmail: email, userName: name, userPhone: phone
    });

    // Step 3 — get payment key
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || name;
    const lastName  = parts.slice(1).join(' ') || 'N/A';
    const payKeyRes  = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: planConfig.amountCents,
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          first_name: firstName, last_name: lastName,
          email, phone_number: phone,
          apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA',
          shipping_method: 'NA', postal_code: 'NA', city: 'Cairo', country: 'EG', state: 'NA'
        },
        currency: 'EGP',
        integration_id: PAYMOB_INTEGRATION_ID
      })
    });
    const payKeyData = await payKeyRes.json();
    if (!payKeyRes.ok || !payKeyData.token)
      return res.status(502).json({ error: 'Failed to generate payment token' });

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${payKeyData.token}`;
    res.json({ iframeUrl, paymentId: String(payment._id) });
  } catch (e) {
    console.error('Payment initiation error:', e);
    res.status(500).json({ error: 'Payment initiation failed. Please try again.' });
  }
});

// Paymob redirect callback (GET) — user lands here after paying
app.get('/api/payment/callback', async (req, res) => {
  try {
    const success       = req.query.success === 'true';
    const transactionId = req.query.id || '';
    const orderId       = req.query.merchant_order_id || '';
    if (orderId) {
      await Payment.findOneAndUpdate(
        { paymobOrderId: String(orderId) },
        { paymobTransactionId: String(transactionId), status: success ? 'paid' : 'failed' }
      );
    }
    res.redirect(`/payment-result.html?success=${success ? '1' : '0'}`);
  } catch (e) {
    res.redirect('/payment-result.html?success=0');
  }
});

// Paymob HMAC webhook (POST) — authoritative payment confirmation
app.post('/api/payment/webhook', async (req, res) => {
  try {
    if (PAYMOB_HMAC_SECRET && req.query.hmac) {
      const txn = req.body.obj || {};
      const fields = [
        txn.amount_cents, txn.created_at, txn.currency,
        txn.error_occured, txn.has_parent_transaction, req.body.id,
        txn.integration_id, txn.is_3d_secure, txn.is_auth,
        txn.is_capture, txn.is_refunded, txn.is_standalone_payment,
        txn.is_voided, txn.order?.id, txn.owner,
        txn.pending, txn.source_data?.pan,
        txn.source_data?.sub_type, txn.source_data?.type, txn.success
      ].map(v => (v == null ? '' : String(v)));
      const computed = crypto.createHmac('sha512', PAYMOB_HMAC_SECRET).update(fields.join('')).digest('hex');
      if (computed !== req.query.hmac) return res.status(403).json({ error: 'Invalid HMAC signature' });
    }
    const txn = req.body.obj || {};
    if (txn.order?.id) {
      await Payment.findOneAndUpdate(
        { paymobOrderId: String(txn.order.id) },
        { paymobTransactionId: String(txn.id || ''), status: txn.success === true ? 'paid' : 'failed' }
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(200).json({ ok: true }); // Always 200 so Paymob doesn't retry forever
  }
});

// Admin: list payments
app.get('/api/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }).limit(200);
    res.json(payments);
  } catch (e) { res.status(500).json({ error: 'Failed to get payments' }); }
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Manar Media backend running on port ${PORT}`); });
