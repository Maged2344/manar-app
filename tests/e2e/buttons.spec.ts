import { test, expect } from '@playwright/test';

test.describe('Navigation Buttons & Links @buttons @smoke', () => {
  test('Hero "Explore Services" button navigates to services', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Explore Services")');
    await expect(page).toHaveURL(/services\.html/);
  });

  test('Hero "Request a Service" button navigates to apply', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Request a Service")');
    await expect(page).toHaveURL(/apply\.html/);
  });

  test('Logo click navigates to homepage', async ({ page }) => {
    await page.goto('/services.html');
    await page.click('.logo');
    await expect(page).toHaveURL('/');
  });

  test('Navbar links navigate correctly', async ({ page }) => {
    await page.goto('/');
    
    await page.click('.nav-links a:has-text("Services")');
    await expect(page).toHaveURL(/services\.html/);
    
    await page.click('.nav-links a:has-text("Portfolio")');
    await expect(page).toHaveURL(/portfolio\.html/);
    
    await page.click('.nav-links a:has-text("About")');
    await expect(page).toHaveURL(/about\.html/);
    
    await page.click('.nav-links a:has-text("Contact")');
    await expect(page).toHaveURL(/contact\.html/);
  });

  test('"Request a Service" CTA in services section works', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('#services-preview a:has-text("Request a Service")');
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/apply\.html/);
  });

  test('"Start a Project" CTA button works', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('.cta-section a:has-text("Start a Project")');
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/apply\.html/);
  });

  test('"View Our Work" CTA button works', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('.cta-section a:has-text("View Our Work")');
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/portfolio\.html/);
  });

  test('"Meet the Full Team" button works', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('a:has-text("Meet the Full Team")');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL(/about\.html/);
  });

  test('Service cards link to service details', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.locator('.services-grid .service-card').first();
    const href = await firstCard.getAttribute('href');
    expect(href).toContain('/services.html#');
  });

  test('Footer links are present and work', async ({ page }) => {
    await page.goto('/');
    const footerLinks = page.locator('.footer a[href="/services.html"]').first();
    await expect(footerLinks).toBeVisible();
    
    const faqLink = page.locator('.footer a[href="/faq.html"]');
    await expect(faqLink).toBeVisible();
    
    const contactLink = page.locator('.footer a[href="/contact.html"]');
    await expect(contactLink).toBeVisible();
  });

  test('WhatsApp floating button is present', async ({ page }) => {
    await page.goto('/');
    const waBtn = page.locator('.whatsapp-float');
    await expect(waBtn).toBeVisible();
    const href = await waBtn.getAttribute('href');
    expect(href).toContain('wa.me');
  });

  test('Contact section WhatsApp link works', async ({ page }) => {
    await page.goto('/');
    const waLink = page.locator('#contact-preview a[href*="wa.me"]');
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toContain('wa.me');
  });

  test('Social media links in footer are present', async ({ page }) => {
    await page.goto('/');
    const socialLinks = page.locator('.social-links a');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Form Buttons @buttons', () => {
  test('Quick contact form submit button exists', async ({ page }) => {
    await page.goto('/');
    const submitBtn = page.locator('#quickContactForm button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('Apply form has submit button', async ({ page }) => {
    await page.goto('/apply.html');
    const submitBtn = page.locator('#applyForm button[type="submit"], #applyForm .btn');
    await expect(submitBtn.first()).toBeVisible();
  });

  test('Contact form has submit button', async ({ page }) => {
    await page.goto('/contact.html');
    const submitBtn = page.locator('#contactForm button[type="submit"], #contactForm .btn');
    await expect(submitBtn.first()).toBeVisible();
  });

  test('Login modal opens when Sign In clicked', async ({ page }) => {
    await page.goto('/');
    const signInBtn = page.locator('#loginBtn');
    await signInBtn.click();
    const modal = page.locator('#loginModal');
    await expect(modal).toHaveClass(/active/);
  });

  test('Login modal close button works', async ({ page }) => {
    await page.goto('/');
    await page.click('#loginBtn');
    await page.click('#closeModal');
    const modal = page.locator('#loginModal');
    await expect(modal).not.toHaveClass(/active/);
  });

  test('Toggle between Sign In and Register works', async ({ page }) => {
    await page.goto('/');
    await page.click('#loginBtn');
    const toggleLink = page.locator('#toggleAuth');
    await toggleLink.click();
    await expect(page.locator('#modalTitle')).toHaveText('Create Account');
    await expect(page.locator('#nameGroup')).toBeVisible();
    // Toggle back
    await toggleLink.click();
    await expect(page.locator('#modalTitle')).toHaveText('Sign In');
  });
});

test.describe('FAQ Accordion @buttons', () => {
  test('FAQ questions are clickable and expand answers', async ({ page }) => {
    await page.goto('/faq.html');
    const firstQuestion = page.locator('.faq-question').first();
    await firstQuestion.click();
    const parentItem = page.locator('.faq-item').first();
    await expect(parentItem).toHaveClass(/active/);
  });

  test('Only one FAQ item is open at a time', async ({ page }) => {
    await page.goto('/faq.html');
    const questions = page.locator('.faq-question');
    await questions.nth(0).click();
    await questions.nth(1).click();
    const firstItem = page.locator('.faq-item').nth(0);
    const secondItem = page.locator('.faq-item').nth(1);
    await expect(firstItem).not.toHaveClass(/active/);
    await expect(secondItem).toHaveClass(/active/);
  });
});
