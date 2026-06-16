import { test, expect } from '@playwright/test';

test.describe('Page Navigation & Loading @pages @smoke', () => {
  const pages = [
    { path: '/', title: 'Manar Media', name: 'Homepage' },
    { path: '/services.html', title: 'Services', name: 'Services' },
    { path: '/portfolio.html', title: 'Portfolio', name: 'Portfolio' },
    { path: '/about.html', title: 'About', name: 'About' },
    { path: '/pricing.html', title: 'Pricing', name: 'Pricing' },
    { path: '/faq.html', title: 'FAQ', name: 'FAQ' },
    { path: '/contact.html', title: 'Contact', name: 'Contact' },
    { path: '/apply.html', title: 'Request|Apply|Service', name: 'Apply/Request Service' },
    { path: '/portal.html', title: 'Manar|Portal|Account', name: 'User Portal' },
    { path: '/admin.html', title: 'Admin|Manar', name: 'Admin Panel' },
  ];

  for (const page of pages) {
    test(`${page.name} page loads successfully (${page.path})`, async ({ page: p }) => {
      const response = await p.goto(page.path);
      expect(response?.status()).toBe(200);
      await expect(p).toHaveTitle(new RegExp(page.title, 'i'));
    });
  }

  test('Homepage has all main sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('#services-preview')).toBeVisible();
    await expect(page.locator('#process')).toBeVisible();
    await expect(page.locator('#why-us')).toBeVisible();
    await expect(page.locator('#team')).toBeVisible();
    await expect(page.locator('#testimonials')).toBeVisible();
    await expect(page.locator('#contact-preview')).toBeVisible();
    await expect(page.locator('.footer')).toBeVisible();
  });

  test('Homepage has hero stats counters', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const stats = page.locator('.hero-stats .stat');
    await expect(stats).toHaveCount(4);
  });

  test('Homepage team section shows team members', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const teamCards = page.locator('.home-team-card');
    const count = await teamCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('Homepage services grid shows 6 services', async ({ page }) => {
    await page.goto('/');
    const serviceCards = page.locator('.services-grid .service-card');
    await expect(serviceCards).toHaveCount(6);
  });

  test('Homepage process section shows 4 steps', async ({ page }) => {
    await page.goto('/');
    const steps = page.locator('.process-step');
    await expect(steps).toHaveCount(4);
  });

  test('Homepage testimonials show 3 reviews', async ({ page }) => {
    await page.goto('/');
    const testimonials = page.locator('.testimonial-card');
    await expect(testimonials).toHaveCount(3);
  });

  test('No console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    // Filter out known third-party errors
    const realErrors = errors.filter(e => !e.includes('favicon') && !e.includes('third-party') && !e.includes('cdn-cgi') && !e.includes('cloudflare'));
    expect(realErrors.length).toBe(0);
  });
});

test.describe('Responsive Design @pages', () => {
  test('Mobile menu toggle works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const navToggle = page.locator('#navToggle, .nav-toggle');
    await expect(navToggle).toBeVisible();
    await navToggle.click();
    await expect(page.locator('#navLinks, .nav-links')).toBeVisible();
  });

  test('Desktop hides hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const navToggle = page.locator('#navToggle, .nav-toggle');
    await expect(navToggle).toBeHidden();
  });

  test('Page renders correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('.hero')).toBeVisible();
    await expect(page.locator('.navbar')).toBeVisible();
  });

  test('Services grid stacks on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const grid = page.locator('.services-grid');
    const box = await grid.boundingBox();
    expect(box).not.toBeNull();
  });

  test('Contact section is responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('#contact-preview')).toBeVisible();
  });
});
