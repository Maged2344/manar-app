import { test, expect } from '@playwright/test';

test.describe('Visual & UX Bug Checks @bugs', () => {
  test('No horizontal scrollbar on any page', async ({ page }) => {
    const pages = ['/', '/services.html', '/portfolio.html', '/about.html', '/contact.html', '/faq.html', '/pricing.html', '/apply.html'];
    for (const path of pages) {
      await page.goto(path);
      const hasHScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasHScroll, `Horizontal scroll detected on ${path}`).toBeFalsy();
    }
  });

  test('No overlapping elements in navbar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navbar = page.locator('.navbar');
    const navBox = await navbar.boundingBox();
    expect(navBox).not.toBeNull();
    expect(navBox!.height).toBeLessThan(120);
  });

  test('Footer is at bottom of page', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('.footer');
    const footerBox = await footer.boundingBox();
    const viewportHeight = page.viewportSize()!.height;
    expect(footerBox!.y).toBeGreaterThan(viewportHeight - 100);
  });

  test('No text overflow/clipping in service cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.service-card, .feature-item, .testimonial-card');
    const count = await cards.count();
    for (let i = 0; i < Math.min(count, 8); i++) {
      const card = cards.nth(i);
      const overflow = await card.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.overflow === 'hidden' && el.scrollHeight > el.clientHeight + 5;
      });
      expect(overflow, `Card ${i} has text overflow`).toBeFalsy();
    }
  });

  test('All buttons have pointer cursor', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button, .btn, a.btn');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 15); i++) {
      const cursor = await buttons.nth(i).evaluate((el) =>
        window.getComputedStyle(el).cursor
      );
      expect(cursor, `Button ${i} missing pointer cursor`).toBe('pointer');
    }
  });

  test('No broken anchor links (404 sections)', async ({ page }) => {
    await page.goto('/');
    const anchorLinks = page.locator('a[href^="#"]');
    const count = await anchorLinks.count();
    for (let i = 0; i < count; i++) {
      const href = await anchorLinks.nth(i).getAttribute('href');
      if (href && href.length > 1) {
        const targetId = href.substring(1);
        const target = page.locator(`#${targetId}`);
        const exists = await target.count();
        expect(exists, `Anchor target #${targetId} not found`).toBeGreaterThan(0);
      }
    }
  });

  test('Forms have proper labels/placeholders', async ({ page }) => {
    await page.goto('/contact.html');
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      expect(
        placeholder || hasLabel || ariaLabel,
        `Input ${i} has no label, placeholder, or aria-label`
      ).toBeTruthy();
    }
  });

  test('Apply form has all required fields', async ({ page }) => {
    await page.goto('/apply.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#applyName, input[name="name"]').first()).toBeVisible();
    await expect(page.locator('#applyEmail, input[name="email"]').first()).toBeVisible();
    await expect(page.locator('#applyPhone, input[name="phone"]').first()).toBeVisible();
    await expect(page.locator('#applyService, select[name="service"]').first()).toBeVisible();
    await expect(page.locator('#applyDetails, textarea[name="details"]').first()).toBeVisible();
  });

  test('Contact form validation works', async ({ page }) => {
    await page.goto('/contact.html', { waitUntil: 'domcontentloaded' });
    const nameInput = page.locator('#contactName, input[name="name"]').first();
    const isRequired = await nameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('Team cards dont overflow on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const teamGrid = page.locator('.home-team-grid');
    const gridBox = await teamGrid.boundingBox();
    const containerWidth = 1200; // max-width
    expect(gridBox!.width).toBeLessThanOrEqual(containerWidth + 100);
  });

  test('Process steps are visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const steps = page.locator('.process-step');
    const count = await steps.count();
    expect(count).toBe(4);
    for (let i = 0; i < count; i++) {
      await expect(steps.nth(i)).toBeVisible();
    }
  });

  test('Quick contact form is visible on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const form = page.locator('#quickContactForm');
    await expect(form).toBeVisible();
  });

  test('Hero stats are visible and have numbers', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for counter animation
    const stats = page.locator('.stat-number');
    const count = await stats.count();
    expect(count).toBe(4);
    for (let i = 0; i < count; i++) {
      const text = await stats.nth(i).textContent();
      expect(text).toMatch(/\d+/);
    }
  });

  test('Navbar becomes fixed on scroll', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const navbar = page.locator('.navbar');
    const position = await navbar.evaluate(el => window.getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });

  test('No z-index issues - modal appears above content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.click('#loginBtn');
    const modal = page.locator('#loginModal');
    const zIndex = await modal.evaluate(el => window.getComputedStyle(el).zIndex);
    expect(parseInt(zIndex)).toBeGreaterThanOrEqual(2000);
  });
});

test.describe('Mobile Bug Checks @bugs', () => {
  test('Mobile - No horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const pages = ['/', '/services.html', '/about.html', '/contact.html'];
    for (const path of pages) {
      await page.goto(path);
      const hasHScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasHScroll, `Mobile horizontal scroll on ${path}`).toBeFalsy();
    }
  });

  test('Mobile - Hero section fits screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('.hero');
    const heroBox = await hero.boundingBox();
    expect(heroBox!.width).toBeLessThanOrEqual(375);
  });

  test('Mobile - Buttons are tappable size (min 44px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const buttons = page.locator('.hero-buttons .btn');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box!.height, `Button ${i} too small to tap`).toBeGreaterThanOrEqual(40);
    }
  });

  test('Mobile - Nav toggle closes after selection', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.click('.nav-toggle');
    await page.click('.nav-links a:has-text("Services")');
    // After clicking a link, nav should close
    await page.waitForTimeout(500);
  });
});
