const request = require('supertest')
const app = require('../app')

// Estas pruebas usan el almacenamiento en memoria (fallback) del backend,
// por lo que no requieren una instancia de MongoDB.
describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('rejects requests with missing fields', async () => {
      const response = await request(app).post('/api/auth/register').send({ username: 'x' })
      expect(response.status).toBe(400)
    })

    it('creates a new user and returns an encryption salt', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'S3cret!pass',
      })
      expect(response.status).toBe(201)
      expect(response.body.encryptionSalt).toBeDefined()
    })

    it('rejects duplicate usernames', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'other@example.com',
        password: 'S3cret!pass',
      })
      expect(response.status).toBe(409)
    })
  })

  describe('POST /api/auth/login', () => {
    it('rejects requests with missing credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({})
      expect(response.status).toBe(400)
    })

    it('rejects invalid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: 'testuser',
        password: 'wrong-password',
      })
      expect(response.status).toBe(401)
    })

    it('logs in a registered user and returns a token', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: 'testuser',
        password: 'S3cret!pass',
      })
      expect(response.status).toBe(200)
      expect(response.body.token).toBeDefined()
      expect(response.body.user.username).toBe('testuser')
    })

    it('logs in the seeded admin user', async () => {
      const response = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'admin123',
      })
      expect(response.status).toBe(200)
      expect(response.body.token).toBeDefined()
    })
  })

  describe('protected routes', () => {
    it('rejects requests without a token', async () => {
      const response = await request(app).get('/api/user/documents')
      expect(response.status).toBe(401)
    })

    it('rejects requests with an invalid token', async () => {
      const response = await request(app)
        .get('/api/user/documents')
        .set('Authorization', 'Bearer not-a-valid-token')
      expect(response.status).toBe(401)
    })
  })
})
