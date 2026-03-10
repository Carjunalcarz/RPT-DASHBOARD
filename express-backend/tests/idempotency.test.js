const request = require('supertest');
const app = require('../src/server');
const { randomUUID } = require('crypto');
const { supabasePrisma } = require('../src/database/prisma');

describe('Idempotency Middleware', () => {
  let idempotencyKey;

  beforeAll(async () => {
    // Add a test route that bypasses auth but uses global middleware
    app.post('/test-idempotency', (req, res) => {
        res.status(201).json({ id: '123', title: req.body.title });
    });
  });

  beforeEach(() => {
    idempotencyKey = randomUUID();
  });

  afterAll(async () => {
    // await supabasePrisma.$disconnect();
  });

  it('should process request normally without key', async () => {
    const res = await request(app)
      .post('/test-idempotency')
      .send({ title: 'Test Task No Key' });
    
    // 201 or 200 depending on implementation
    expect([200, 201]).toContain(res.statusCode);
  });

  it('should be idempotent with key', async () => {
    const payload = { title: `Idempotent Task ${idempotencyKey}` };

    // First request
    const res1 = await request(app)
      .post('/test-idempotency')
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);
    
    expect([200, 201]).toContain(res1.statusCode);
    const body1 = res1.body;

    // Second request (duplicate)
    const res2 = await request(app)
      .post('/test-idempotency')
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res2.statusCode).toBe(res1.statusCode);
    expect(res2.body).toEqual(body1);
  }, 30000); // Increase timeout

  it('should return 409 for concurrent requests with same key', async () => {
    const key = randomUUID();
    const payload = { title: `Concurrent Task ${key}` };

    // To ensure overlap, we need the handler to be slow.
    // We can define a slow route.
    app.post('/test-idempotency-slow', async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        res.status(201).json({ id: 'slow', title: req.body.title });
    });
    
    const p1 = request(app)
      .post('/test-idempotency-slow')
      .set('Idempotency-Key', key)
      .send(payload);

    const p2 = request(app)
      .post('/test-idempotency-slow')
      .set('Idempotency-Key', key)
      .send(payload);

    const [res1, res2] = await Promise.all([p1, p2]);

    const statuses = [res1.statusCode, res2.statusCode].sort();
    // One should be 409 (Conflict), the other 201
    // Because the second one hits the "locked" state while first is sleeping.
    
    expect(statuses).toEqual([201, 409]);
  });
});
