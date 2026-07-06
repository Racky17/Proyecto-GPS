// Clave de cifrado de prueba para que la subida/descifrado funcione sin .env
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'a'.repeat(64)

const request = require('supertest')
const app = require('../app')

describe('Document preview & download', () => {
  let token
  let documentId
  const fileContent = 'contenido de prueba para previsualizar y descargar'

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      username: 'previewuser',
      email: 'previewuser@example.com',
      password: 'S3cret!pass',
    })
    const login = await request(app).post('/api/auth/login').send({
      username: 'previewuser',
      password: 'S3cret!pass',
    })
    token = login.body.token

    const uploadResponse = await request(app)
      .post('/api/user/documents')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'notas.txt')
      .attach('file', Buffer.from(fileContent), {
        filename: 'notas.txt',
        contentType: 'text/plain',
      })
    expect(uploadResponse.status).toBe(201)
    documentId = uploadResponse.body.data._id
  })

  it('previews the document inline with its content type', async () => {
    const response = await request(app)
      .get(`/api/user/documents/${documentId}/preview`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/plain')
    expect(response.headers['content-disposition']).toContain('inline')
    expect(response.text).toBe(fileContent)
  })

  it('downloads the document as an attachment with its original name', async () => {
    const response = await request(app)
      .get(`/api/user/documents/${documentId}/download`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.headers['content-disposition']).toContain('attachment')
    expect(response.headers['content-disposition']).toContain('notas.txt')
    expect(response.text).toBe(fileContent)
  })

  it('returns 404 when previewing a non-existent document', async () => {
    const response = await request(app)
      .get('/api/user/documents/000000000000000000000000/preview')
      .set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(404)
  })

  it('rejects preview without authentication', async () => {
    const response = await request(app).get(`/api/user/documents/${documentId}/preview`)
    expect(response.status).toBe(401)
  })

  it('denies preview to a user without access to the document', async () => {
    await request(app).post('/api/auth/register').send({
      username: 'otheruser',
      email: 'otheruser@example.com',
      password: 'S3cret!pass',
    })
    const login = await request(app).post('/api/auth/login').send({
      username: 'otheruser',
      password: 'S3cret!pass',
    })

    const response = await request(app)
      .get(`/api/user/documents/${documentId}/preview`)
      .set('Authorization', `Bearer ${login.body.token}`)
    expect(response.status).toBe(404)
  })
})
