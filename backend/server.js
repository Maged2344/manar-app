const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const promClient = require('prom-client');

const app = express();

// ===== Prometheus Metrics Setup =====
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'manarapp_' });

const httpRequestsTotal = new promClient.Counter({
  name: 'manarapp_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'manarapp_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

// Middleware
app.use(cors());
app.use(express.json());

// Request metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route: req.path, status: res.statusCode }, duration);

    // Track visitor requests
    visitorLog.push({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      timestamp: new Date()
    });
    if (visitorLog.length > MAX_LOG_SIZE) visitorLog.shift();
  });
  next();
});

// In-memory visitor tracking
const visitorLog = [];
const MAX_LOG_SIZE = 1000;

// MongoDB Connection
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

const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('Contact', contactSchema);

// ===== JWT Middleware =====
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

// ===== Routes =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'manar-media', timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// ===== Auth Routes =====

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ===== Contact Routes =====

// Submit contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, phone, service } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    const contact = new Contact({ name, email, phone, service, message });
    await contact.save();
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all contact submissions (admin)
app.get('/api/contact', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const contacts = await Contact.find().sort({ createdAt: -1 }).limit(50);
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// ===== Services Routes =====

// Get services list
app.get('/api/services', (req, res) => {
  const services = [
    {
      id: 'video',
      title: 'Video Production',
      description: 'Cinematic commercials, corporate videos, and social media content.',
      features: ['Commercial & Brand Videos', 'Corporate Documentaries', 'Social Media Content', 'Motion Graphics', 'Event Coverage', 'Product Demos']
    },
    {
      id: 'branding',
      title: 'Branding & Design',
      description: 'Complete brand identity and visual systems.',
      features: ['Logo Design', 'Brand Strategy', 'Print & Packaging', 'UI/UX Design', 'Social Media Templates', 'Marketing Collateral']
    },
    {
      id: 'photography',
      title: 'Photography',
      description: 'Professional photography that tells your story.',
      features: ['Product Photography', 'Corporate Headshots', 'Event Photography', 'Lifestyle & Editorial', 'Food & Interior', 'Drone/Aerial']
    },
    {
      id: 'marketing',
      title: 'Digital Marketing',
      description: 'Data-driven campaigns for maximum impact.',
      features: ['Social Media Management', 'SEO & Content Marketing', 'Paid Advertising', 'Email Marketing', 'Influencer Partnerships', 'Analytics']
    },
    {
      id: 'web',
      title: 'Web Development',
      description: 'Modern websites that convert visitors to customers.',
      features: ['Custom Websites', 'E-commerce', 'Web Applications', 'Landing Pages', 'CMS Integration', 'Performance Optimization']
    },
    {
      id: 'content',
      title: 'Content Strategy',
      description: 'Strategic content planning for engagement and growth.',
      features: ['Content Calendars', 'Copywriting', 'Script Writing', 'Brand Voice', 'Content Audits', 'SEO Optimization']
    }
  ];
  res.json(services);
});

// ===== Portfolio Routes =====

// Get portfolio items
app.get('/api/portfolio', (req, res) => {
  const portfolio = [
    { id: 1, title: 'TechStart Launch Campaign', category: 'video', description: 'Brand launch video series' },
    { id: 2, title: 'Nile Corp Rebrand', category: 'branding', description: 'Complete brand identity redesign' },
    { id: 3, title: 'Luxor Hotel Collection', category: 'photography', description: 'Luxury hospitality photography' },
    { id: 4, title: 'GrowthLab Platform', category: 'web', description: 'Full-stack web application' },
    { id: 5, title: 'Food Festival Promo', category: 'video', description: 'Event promotional video' },
    { id: 6, title: 'Sahara Fitness', category: 'branding', description: 'Brand identity for fitness chain' },
    { id: 7, title: 'Cairo Fashion Week', category: 'photography', description: 'Editorial fashion photography' },
    { id: 8, title: 'E-Commerce Redesign', category: 'web', description: 'UX overhaul with 150% conversion increase' }
  ];

  const { category } = req.query;
  if (category && category !== 'all') {
    return res.json(portfolio.filter(p => p.category === category));
  }
  res.json(portfolio);
});

// ===== Admin Routes =====

// Admin stats overview
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const totalUsers = await User.countDocuments();
    const totalContacts = await Contact.countDocuments();
    const totalRequests = visitorLog.length;
    const totalVisits = visitorLog.filter(v => !v.path.startsWith('/api/')).length;
    res.json({ totalUsers, totalContacts, totalRequests, totalVisits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Admin get all users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Admin get visitor data (aggregated by path)
app.get('/api/admin/visitors', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // Aggregate visits by method + path
    const aggregated = {};
    visitorLog.forEach(v => {
      const key = v.method + ' ' + v.path;
      if (!aggregated[key]) {
        aggregated[key] = { method: v.method, path: v.path, count: 0 };
      }
      aggregated[key].count++;
    });
    const sorted = Object.values(aggregated).sort((a, b) => b.count - a.count).slice(0, 30);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get visitor data' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Manar Media backend running on port ${PORT}`);
});
