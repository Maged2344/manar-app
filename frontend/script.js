const API_URL = '/api';
let isLoginMode = true;

// DOM
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
const modalTitle = document.getElementById('modalTitle');
const nameGroup = document.getElementById('nameGroup');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navbar = document.getElementById('navbar');

// Mobile nav
if (navToggle) navToggle.addEventListener('click', () => { navLinks.classList.toggle('active'); });
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => { if (navLinks) navLinks.classList.remove('active'); }));

// Scroll
window.addEventListener('scroll', () => { if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50); });

// Track visit
fetch(API_URL + '/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: window.location.pathname }) }).catch(() => {});

// Auth
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user && loginBtn) { loginBtn.textContent = user.name; loginBtn.classList.remove('btn-outline'); loginBtn.classList.add('btn-primary'); }
}

if (loginBtn) loginBtn.addEventListener('click', e => {
    e.preventDefault();
    if (localStorage.getItem('token')) { if (confirm('Logout?')) { localStorage.removeItem('token'); localStorage.removeItem('user'); location.reload(); } }
    else if (loginModal) loginModal.classList.add('active');
});
if (closeModal) closeModal.addEventListener('click', () => loginModal.classList.remove('active'));
if (loginModal) loginModal.addEventListener('click', e => { if (e.target === loginModal) loginModal.classList.remove('active'); });

if (toggleAuth) toggleAuth.addEventListener('click', e => {
    e.preventDefault(); isLoginMode = !isLoginMode;
    modalTitle.textContent = isLoginMode ? 'Sign In' : 'Create Account';
    authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Create Account';
    nameGroup.style.display = isLoginMode ? 'none' : 'block';
    toggleAuth.textContent = isLoginMode ? 'Register' : 'Sign In';
});

if (authForm) authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value, pw = document.getElementById('password').value;
    const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
    const body = isLoginMode ? { email, password: pw } : { name: document.getElementById('name').value, email, password: pw };
    try {
        const r = await fetch(API_URL + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (r.ok) {
            localStorage.setItem('token', d.token); localStorage.setItem('user', JSON.stringify(d.user));
            loginModal.classList.remove('active'); checkAuth();
            if (d.user.role === 'admin') { window.location.href = '/admin.html'; return; }
            notify(isLoginMode ? 'Welcome back!' : 'Account created!', 'success');
        }
        else notify(d.error || 'Something went wrong', 'error');
    } catch (err) { notify('Connection error', 'error'); }
});

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = { name: document.getElementById('contactName').value, email: document.getElementById('contactEmail').value, phone: document.getElementById('contactPhone').value, service: document.getElementById('contactService').value, message: document.getElementById('contactMessage').value };
    const s = document.getElementById('contactStatus');
    try {
        const r = await fetch(API_URL + '/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r.ok) { s.textContent = 'Message sent! We\'ll get back to you soon.'; s.className = 'form-status success'; contactForm.reset(); }
        else { const d = await r.json(); s.textContent = d.error || 'Failed to send.'; s.className = 'form-status error'; }
    } catch (err) { s.textContent = 'Connection error.'; s.className = 'form-status error'; }
});

// Apply form
const applyForm = document.getElementById('applyForm');
if (applyForm) applyForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = { name: document.getElementById('applyName').value, email: document.getElementById('applyEmail').value, phone: document.getElementById('applyPhone').value, company: document.getElementById('applyCompany').value, service: document.getElementById('applyService').value, budget: document.getElementById('applyBudget').value, timeline: document.getElementById('applyTimeline').value, details: document.getElementById('applyDetails').value };
    const s = document.getElementById('applyStatus');
    try {
        const r = await fetch(API_URL + '/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r.ok) { s.textContent = 'Application submitted! We\'ll contact you within 24 hours.'; s.className = 'form-status success'; applyForm.reset(); }
        else { const d = await r.json(); s.textContent = d.error || 'Failed to submit.'; s.className = 'form-status error'; }
    } catch (err) { s.textContent = 'Connection error.'; s.className = 'form-status error'; }
});

// FAQ
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => { const item = btn.parentElement; const active = item.classList.contains('active'); document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active')); if (!active) item.classList.add('active'); });
});

// Portfolio filter
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
        const f = btn.dataset.filter;
        document.querySelectorAll('.portfolio-item').forEach(i => { i.style.display = (f === 'all' || i.dataset.category === f) ? '' : 'none'; });
    });
});

// Counter animation
function animateCounters() {
    document.querySelectorAll('.stat-number[data-target]').forEach(el => {
        const target = +el.dataset.target, step = target / 60;
        let cur = 0;
        const update = () => { cur += step; if (cur < target) { el.textContent = Math.floor(cur) + '+'; requestAnimationFrame(update); } else el.textContent = target + '+'; };
        update();
    });
}
const heroStats = document.querySelector('.hero-stats');
if (heroStats) { const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) { animateCounters(); obs.disconnect(); } }, { threshold: 0.5 }); obs.observe(heroStats); }

// Services page - show only selected service when hash present
if (window.location.pathname.includes('services.html') && window.location.hash) {
    const hash = window.location.hash.slice(1);
    const allDetails = document.querySelectorAll('.service-detail');
    let found = false;
    allDetails.forEach(el => {
        if (el.id === hash) { el.classList.remove('hidden'); found = true; }
        else { el.classList.add('hidden'); }
    });
    if (found) {
        const pageHeader = document.querySelector('.page-header p');
        if (pageHeader) pageHeader.innerHTML = '<a href="/services.html" class="back-link">&larr; View All Services</a>';
    }
}

// Notification
function notify(msg, type) {
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;top:90px;right:20px;padding:0.8rem 1.5rem;border-radius:8px;color:#fff;font-weight:500;font-size:0.9rem;z-index:3000;background:${type === 'success' ? '#10b981' : '#ef4444'};box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
    n.textContent = msg; document.body.appendChild(n);
    setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 3000);
}

checkAuth();
