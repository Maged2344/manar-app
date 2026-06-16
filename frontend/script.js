const API_URL = '/api';

// Auth state
let isLoginMode = true;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.getElementById('closeModal');
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
const modalTitle = document.getElementById('modalTitle');
const nameGroup = document.getElementById('nameGroup');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const getStartedBtn = document.getElementById('getStartedBtn');

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) {
        if (loginBtn) {
            loginBtn.textContent = user.name;
            loginBtn.href = '#';
        }
    }
}

// Open modal
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
        } else {
            loginModal.classList.add('active');
        }
    });
}

// Close modal
if (closeModal) {
    closeModal.addEventListener('click', () => {
        loginModal.classList.remove('active');
    });
}

// Toggle login/register
if (toggleAuth) {
    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            modalTitle.textContent = 'Login';
            authSubmitBtn.textContent = 'Login';
            nameGroup.style.display = 'none';
            toggleAuth.textContent = 'Register';
            toggleAuth.parentElement.firstChild.textContent = "Don't have an account? ";
        } else {
            modalTitle.textContent = 'Register';
            authSubmitBtn.textContent = 'Register';
            nameGroup.style.display = 'block';
            toggleAuth.textContent = 'Login';
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
        const body = isLoginMode ? { email, password } : { name: document.getElementById('name').value, email, password };

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
                alert(isLoginMode ? 'Login successful!' : 'Registration successful!');
            } else {
                alert(data.error || 'Something went wrong');
            }
        } catch (err) {
            alert('Network error. Please try again.');
        }
    });
}

// Get Started button
if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
        const token = localStorage.getItem('token');
        if (token) {
            alert('Welcome back!');
        } else {
            loginModal.classList.add('active');
        }
    });
}

// Init
checkAuth();
