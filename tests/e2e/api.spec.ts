import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://manar.cloud-stacks.com';
const API_URL = `${BASE_URL}/api`;

test.describe('API Smoke Tests @smoke @api', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.app).toBe('manar-media');
  });

  test('GET /api/services returns services array', async ({ request }) => {
    const response = await request.get(`${API_URL}/services`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThanOrEqual(5);
  });

  test('POST /api/auth/login with invalid creds returns 401', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'fake@test.com', password: 'wrong' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/auth/register with missing fields returns 400', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/register`, {
      data: { email: '' },
    });
    expect(response.status()).toBe(400);
  });

  test('POST /api/contact creates a message', async ({ request }) => {
    const response = await request.post(`${API_URL}/contact`, {
      data: { name: 'Test', email: 'test@test.com', message: 'Test message' },
    });
    expect(response.status()).toBe(201);
  });

  test('POST /api/contact with missing fields returns 400', async ({ request }) => {
    const response = await request.post(`${API_URL}/contact`, {
      data: { name: 'Test' },
    });
    expect(response.status()).toBe(400);
  });

  test('POST /api/applications creates an application', async ({ request }) => {
    const response = await request.post(`${API_URL}/applications`, {
      data: {
        name: 'Test App',
        email: 'testapp@test.com',
        phone: '+201234567890',
        service: 'Web Development',
        details: 'Test application details for e2e testing',
      },
    });
    expect(response.status()).toBe(201);
  });

  test('POST /api/applications with missing fields returns 400', async ({ request }) => {
    const response = await request.post(`${API_URL}/applications`, {
      data: { name: 'Test' },
    });
    expect(response.status()).toBe(400);
  });

  test('POST /api/track records a visit', async ({ request }) => {
    const response = await request.post(`${API_URL}/track`, {
      data: { page: '/test-page' },
    });
    expect(response.status()).toBe(200);
  });

  test('GET /api/admin/stats without token returns 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/admin/stats`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/admin/applications without token returns 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/admin/applications`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/admin/users without token returns 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/admin/users`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/admin/reach without token returns 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/admin/reach`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/auth/me without token returns 401', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/me`);
    expect(response.status()).toBe(401);
  });

  test('PATCH /api/auth/profile without token returns 401', async ({ request }) => {
    const response = await request.patch(`${API_URL}/auth/profile`, {
      data: { name: 'Hacker' },
    });
    expect(response.status()).toBe(401);
  });

  test('API handles large payloads gracefully', async ({ request }) => {
    const largePayload = { email: 'a'.repeat(500) + '@test.com', password: 'test' };
    const response = await request.post(`${API_URL}/auth/login`, { data: largePayload });
    expect(response.status()).toBeLessThan(500);
  });

  test('API handles concurrent requests', async ({ request }) => {
    const requests = Array(10).fill(null).map(() =>
      request.get(`${API_URL}/health`)
    );
    const responses = await Promise.all(requests);
    responses.forEach(r => {
      expect(r.status()).toBeLessThan(500);
    });
  });
});

test.describe('Security Tests @api', () => {
  test('SQL/NoSQL injection attempt returns error, not data', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: { email: "' OR 1=1 --", password: "' OR 1=1 --" },
    });
    expect([400, 401]).toContain(response.status());
    const body = await response.text();
    expect(body).not.toContain('password');
    expect(body).not.toContain('token');
  });

  test('NoSQL injection via $gt operator fails', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: { email: { $gt: '' }, password: { $gt: '' } },
    });
    expect([400, 401, 500]).toContain(response.status());
    const body = await response.text();
    expect(body).not.toContain('"token"');
  });

  test('XSS attempt in contact form is not reflected', async ({ request }) => {
    const response = await request.post(`${API_URL}/contact`, {
      data: {
        name: '<script>alert("xss")</script>',
        email: 'xss@test.com',
        message: '<img src=x onerror=alert(1)>',
      },
    });
    const body = await response.text();
    expect(body).not.toContain('<script>');
  });

  test('JWT token required for admin routes', async ({ request }) => {
    const adminRoutes = [
      '/admin/stats',
      '/admin/applications',
      '/admin/users',
      '/admin/reach',
    ];
    for (const route of adminRoutes) {
      const response = await request.get(`${API_URL}${route}`);
      expect([401, 403]).toContain(response.status());
    }
  });

  test('Invalid JWT token is rejected', async ({ request }) => {
    const response = await request.get(`${API_URL}/admin/stats`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('Expired/malformed JWT is rejected', async ({ request }) => {
    const response = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJlbWFpbCI6ImZha2VAZmFrZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjF9.fake_signature' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('PATCH /api/admin/applications without admin role fails', async ({ request }) => {
    // Register a normal user and try to access admin route
    const regResponse = await request.post(`${API_URL}/auth/register`, {
      data: { name: 'Normal User', email: `normal_${Date.now()}@test.com`, password: 'Test123!' },
    });
    if (regResponse.status() === 201) {
      const { token } = await regResponse.json();
      const response = await request.get(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(403);
    }
  });
});
