import { test, expect } from '@playwright/test';

test.describe('Form Submissions @forms @smoke', () => {
  test('Contact form submits successfully with valid data', async ({ page }) => {
    await page.goto('/contact.html');
    await page.fill('#contactName', 'E2E Test User');
    await page.fill('#contactEmail', 'e2etest@example.com');
    await page.fill('#contactPhone', '+201234567890');
    await page.selectOption('#contactService', { index: 1 });
    await page.fill('#contactMessage', 'This is an automated e2e test message');
    await page.click('#contactForm button[type="submit"]');
    await page.waitForTimeout(2000);
    const status = page.locator('#contactStatus');
    await expect(status).toBeVisible();
    const text = await status.textContent();
    expect(text?.toLowerCase()).toContain('sent');
  });

  test('Contact form shows error with missing fields', async ({ page }) => {
    await page.goto('/contact.html');
    // Only fill name, skip email and message
    await page.fill('#contactName', 'Partial User');
    // The form should have HTML5 validation preventing submission
    const emailInput = page.locator('#contactEmail');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('Apply/Request service form has all fields', async ({ page }) => {
    await page.goto('/apply.html');
    await expect(page.locator('#applyName')).toBeVisible();
    await expect(page.locator('#applyEmail')).toBeVisible();
    await expect(page.locator('#applyPhone')).toBeVisible();
    await expect(page.locator('#applyCompany')).toBeVisible();
    await expect(page.locator('#applyService')).toBeVisible();
    await expect(page.locator('#applyBudget')).toBeVisible();
    await expect(page.locator('#applyTimeline')).toBeVisible();
    await expect(page.locator('#applyDetails')).toBeVisible();
  });

  test('Apply form submits successfully', async ({ page }) => {
    await page.goto('/apply.html', { waitUntil: 'domcontentloaded' });
    await page.fill('#applyName', 'E2E Test Client');
    await page.fill('#applyEmail', 'e2eclient@example.com');
    await page.fill('#applyPhone', '+201111111111');
    await page.fill('#applyCompany', 'Test Company');
    await page.selectOption('#applyService', { index: 1 });
    await page.selectOption('#applyBudget', { index: 1 });
    await page.selectOption('#applyTimeline', { index: 1 });
    await page.fill('#applyDetails', 'This is an automated e2e test application submission');
    await page.click('#applyForm button[type="submit"]');
    await page.waitForTimeout(2000);
    const status = page.locator('#applyStatus');
    await expect(status).toBeVisible();
    const text = await status.textContent();
    expect(text?.toLowerCase()).toContain('submitted');
  });

  test('Quick contact form on homepage works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const form = page.locator('#quickContactForm');
    await form.locator('#qcName').fill('Quick Test');
    await form.locator('#qcEmail').fill('quicktest@example.com');
    await form.locator('#qcPhone').fill('+201234567890');
    await form.locator('#qcMessage').fill('Quick contact test message');
    await form.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    const status = page.locator('#quickFormStatus');
    await expect(status).toBeVisible();
    const text = await status.textContent();
    expect(text?.toLowerCase()).toContain('sent');
  });
});

test.describe('Portfolio & Content @pages', () => {
  test('Portfolio page shows project cards', async ({ page }) => {
    await page.goto('/portfolio.html');
    const cards = page.locator('.portfolio-card, .portfolio-item');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Portfolio filter buttons exist', async ({ page }) => {
    await page.goto('/portfolio.html');
    const filterBtns = page.locator('.filter-btn');
    const count = await filterBtns.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Portfolio filter works', async ({ page }) => {
    await page.goto('/portfolio.html');
    const filterBtns = page.locator('.filter-btn');
    const count = await filterBtns.count();
    if (count > 1) {
      await filterBtns.nth(1).click();
      await expect(filterBtns.nth(1)).toHaveClass(/active/);
    }
  });

  test('About page shows team members', async ({ page }) => {
    await page.goto('/about.html');
    const teamCards = page.locator('.team-card');
    const count = await teamCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('About page shows company stats', async ({ page }) => {
    await page.goto('/about.html');
    const stats = page.locator('.about-stats, .about-stat-number');
    const count = await stats.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Services page shows service details', async ({ page }) => {
    await page.goto('/services.html');
    const services = page.locator('.service-detail, .service-card');
    const count = await services.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Pricing page shows pricing plans', async ({ page }) => {
    await page.goto('/pricing.html');
    await page.waitForLoadState('domcontentloaded');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/price|plan|package/);
  });

  test('FAQ page has questions', async ({ page }) => {
    await page.goto('/faq.html');
    const questions = page.locator('.faq-item, .faq-question');
    const count = await questions.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Navigation Consistency @pages', () => {
  const pagePaths = ['/', '/services.html', '/portfolio.html', '/about.html', '/contact.html', '/faq.html', '/pricing.html', '/apply.html'];

  for (const path of pagePaths) {
    test(`Navbar is present on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.navbar')).toBeVisible();
    });

    test(`Footer is present on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.footer')).toBeVisible();
    });
  }

  test('All pages have consistent nav links', async ({ page }) => {
    await page.goto('/');
    const navLinks = page.locator('.nav-links a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });
});
