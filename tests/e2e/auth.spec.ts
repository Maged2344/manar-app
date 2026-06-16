import { test, expect } from '@playwright/test';

test.describe('Authentication Flow @auth @smoke', () => {
  test('Admin login page has email and password fields', async ({ page }) => {
    await page.goto('/admin.html');
    await page.waitForLoadState('domcontentloaded');
    const emailField = page.locator('#adminEmail');
    const passwordField = page.locator('#adminPassword');
    await expect(emailField).toBeVisible({ timeout: 5000 });
    await expect(passwordField).toBeVisible({ timeout: 5000 });
  });

  test('Admin login with wrong credentials shows error', async ({ page }) => {
    await page.goto('/admin.html');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('#adminEmail', 'wrong@admin.com');
    await page.fill('#adminPassword', 'wrongpass');
    await page.click('#adminLoginForm button[type="submit"]');
    await page.waitForTimeout(2000);
    const error = page.locator('#loginError');
    await expect(error).toBeVisible();
    const text = await error.textContent();
    expect(text?.toLowerCase()).toMatch(/invalid|error|denied|incorrect|failed/);
  });

  test('Sign In modal has required form fields', async ({ page }) => {
    await page.goto('/');
    await page.click('#loginBtn');
    await page.waitForTimeout(500);
    const emailInput = page.locator('#loginModal #email');
    const passwordInput = page.locator('#loginModal #password');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('Register mode shows name field', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.click('#loginBtn');
    await page.click('#toggleAuth');
    const nameInput = page.locator('#loginModal #name');
    await expect(nameInput).toBeVisible();
  });

  test('Register mode shows phone and company fields', async ({ page }) => {
    await page.goto('/');
    await page.click('#loginBtn');
    await page.click('#toggleAuth');
    const phoneGroup = page.locator('#regPhoneGroup');
    const companyGroup = page.locator('#regCompanyGroup');
    await expect(phoneGroup).toBeVisible();
    await expect(companyGroup).toBeVisible();
  });

  test('Login form prevents empty submission (HTML5 validation)', async ({ page }) => {
    await page.goto('/');
    await page.click('#loginBtn');
    await page.waitForTimeout(300);
    // Try to submit without filling fields
    const emailInput = page.locator('#loginModal #email');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('Portal page redirects if not logged in', async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    await page.goto('/portal.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Should redirect to homepage with login param
    const url = page.url();
    expect(url).toMatch(/\/$|\?login=1|index\.html/);
  });

  test('Modal closes when clicking overlay', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.click('#loginBtn');
    await expect(page.locator('#loginModal')).toHaveClass(/active/);
    // Click overlay (outside modal content)
    await page.locator('#loginModal').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#loginModal')).not.toHaveClass(/active/);
  });
});

test.describe('User Registration @auth', () => {
  const testUser = {
    name: 'Test User',
    email: `testuser_${Date.now()}@example.com`,
    password: 'Test@12345',
  };

  test('Can register a new user via API', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: testUser,
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.token).toBeDefined();
    expect(body.user.name).toBe(testUser.name);
    expect(body.user.email).toBe(testUser.email);
    expect(body.user.role).toBe('user');
  });

  test('Cannot register with duplicate email', async ({ request }) => {
    // First registration
    await request.post('/api/auth/register', {
      data: { name: 'Dup User', email: 'dup_test@example.com', password: 'Test123!' },
    });
    // Second attempt
    const response = await request.post('/api/auth/register', {
      data: { name: 'Dup User 2', email: 'dup_test@example.com', password: 'Test456!' },
    });
    expect([400, 409]).toContain(response.status());
  });

  test('Cannot register with short password', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: { name: 'Short Pw', email: `short_${Date.now()}@test.com`, password: '12345' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('6');
  });

  test('Cannot register with missing fields', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: { email: 'missing@test.com' },
    });
    expect(response.status()).toBe(400);
  });
});
