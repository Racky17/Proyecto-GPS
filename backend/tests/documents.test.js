const request = require('supertest')
const app = require('../app')

// Flujo básico de documentos usando el almacenamiento en memoria (sin MongoDB).
describe('Documents API', () => {
  let token
  let userId

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      username: 'docuser',
      email: 'docuser@example.com',
      password: 'S3cret!pass',
    })
    const login = await request(app).post('/api/auth/login').send({
      username: 'docuser',
      password: 'S3cret!pass',
    })
    token = login.body.token
    userId = login.body.user.id
  })

  it('lists documents for an authenticated user', async () => {
    const response = await request(app)
      .get('/api/user/documents')
      .set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  it('creates a set and a folder', async () => {
    const setResponse = await request(app)
      .post('/api/user/sets')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Set de prueba' })
    expect(setResponse.status).toBe(201)

    const folderResponse = await request(app)
      .post('/api/user/folders')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Carpeta de prueba', setId: setResponse.body.data._id })
    expect(folderResponse.status).toBe(201)
  })

  it('rejects set creation without title', async () => {
    const response = await request(app)
      .post('/api/user/sets')
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(response.status).toBe(400)
  })

  it('returns 404 for a non-existent document download', async () => {
    const response = await request(app)
      .get('/api/user/documents/000000000000000000000000/download')
      .set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(404)
  })

  it('returns account info for the authenticated user', async () => {
    const response = await request(app)
      .get(`/api/user/account/${userId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(200)
    expect(response.body.username).toBe('docuser')
  })

  it('returns 404 for an unknown account id', async () => {
    const response = await request(app)
      .get('/api/user/account/ffffffffffffffffffffffff')
      .set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(404)
  })
})
