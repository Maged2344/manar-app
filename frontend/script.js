const API_URL = '/api';

// ===== Auth State =====
let isLoginMode = true;

// ===== DOM Elements =====
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

// ===== Mobile Navigation =====
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        navToggle.classList.toggle('active');
    });
}

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
    });
});

// ===== Navbar Scroll Effect =====
window.addEventListener('scroll', () => {
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// ===== Auth Check =====
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user && loginBtn) {
        loginBtn.textContent = user.name;
        loginBtn.classList.remove('btn-outline');
        loginBtn.classList.add('btn-primary');
    }
}

// ===== Auth Modal =====
if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (token) {
            if (confirm('Do you want to logout?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                location.reload();
            }
        } else if (loginModal) {
            loginModal.classList.add('active');
        }
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        loginModal.classList.remove('active');
    });
}

// Close modal on background click
if (loginModal) {
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.remove('active');
        }
    });
}

// Toggle login/register
if (toggleAuth) {
    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            modalTitle.textContent = 'Sign In';
            authSubmitBtn.textContent = 'Sign In';
            nameGroup.style.display = 'none';
            toggleAuth.textContent = 'Register';
            toggleAuth.parentElement.firstChild.textContent = "Don't have an account? ";
        } else {
            modalTitle.textContent = 'Create Account';
            authSubmitBtn.textContent = 'Create Account';
            nameGroup.style.display = 'block';
            toggleAuth.textContent = 'Sign In';
            toggleAuth.parentElement.firstChild.textContent = "Already have an account? ";
        }
    });
}

// Auth form submit
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
        const body = isLoginMode
            ? { email, password }
            : { name: document.getElementById('name').value, email, password };

        try {
            const res = await fetch(API_URL + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                loginModal.classList.remove('active');
                checkAuth();
                showNotification(isLoginMode ? 'Welcome back!' : 'Account created successfully!', 'success');
            } else {
                showNotification(data.error || 'Something went wrong', 'error');
            }
        } catch (err) {
            showNotification('Connection error. Please try again.', 'error');
        }
    });
}

// ===== Contact Form =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            phone: document.getElementById('contactPhone').value,
            service: document.getElementById('contactService').value,
            message: document.getElementById('contactMessage').value
        };

        const statusEl = document.getElementById('contactStatus');

        try {
            const res = await fetch(API_URL + '/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                statusEl.textContent = 'Message sent successfully! We\'ll get back to you soon.';
                statusEl.className = 'form-status success';
                contactForm.reset();
            } else {
                statusEl.textContent = data.error || 'Failed to send message. Please try again.';
                statusEl.className = 'form-status error';
            }
        } catch (err) {
            statusEl.textContent = 'Connection error. Please try again later.';
            statusEl.className = 'form-status error';
        }
    });
}

// ===== FAQ Accordion =====
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const isActive = item.classList.contains('active');

        // Close all
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

        // Toggle current
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// ===== Portfolio Filter =====
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;

        // Update active button
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Filter items
        document.querySelectorAll('.portfolio-item').forEach(item => {
            if (filter === 'all' || item.dataset.category === filter) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// ===== Counter Animation =====
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const update = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current) + '+';
                requestAnimationFrame(update);
            } else {
                counter.textContent = target + '+';
            }
        };
        update();
    });
}

// Intersection Observer for counter animation
const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    observer.observe(heroStats);
}

// ===== Notification =====
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: #fff;
        font-weight: 500;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== Smooth Scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===== Initialize =====
checkAuth();
