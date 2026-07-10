import supertest from 'supertest';

import app from './app';

describe('App', () => {
  it('should return 200 on /health', async () => {
    const response = await supertest(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is healthy.');
  });
});
