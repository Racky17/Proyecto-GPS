const request = require('supertest')
const app = require('../app')

describe('POST /api/auth/google', () => {
  it('rejects requests without a credential', async () => {
    const response = await request(app).post('/api/auth/google').send({})
    expect(response.status).toBe(400)
  })

  it('fails clearly when GOOGLE_CLIENT_ID is not configured, or rejects an invalid credential', async () => {
    const response = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'not-a-real-google-token' })
    // 503 si el servidor no tiene GOOGLE_CLIENT_ID; 401 si lo tiene y el token es inválido
    expect([401, 503]).toContain(response.status)
    expect(response.body.message).toBeDefined()
  })
})
