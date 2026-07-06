/**
 * Importa el dataset "data2" (issues de GitHub de proyectos de computación
 * cuántica) al gestor documental.
 *
 * Cada archivo `<org>_<repo>_<estado>_<n>.txt` se guarda como un documento
 * cifrado dentro de una carpeta por repositorio, todo bajo el conjunto
 * "data2 - GitHub issues" del usuario administrador.
 *
 * Uso:
 *   node scripts/seed-data2.js            (lee backend/data/data2)
 *   DATA2_DIR=/otra/ruta node scripts/seed-data2.js
 *
 * Requiere MongoDB accesible (MONGODB_URI) y ENCRYPTION_KEY en el .env.
 * El script es idempotente: los documentos ya importados se omiten.
 */
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { client, collections, connectMongo, isMongoConnected } = require('../config/mongo')
const { encryptFile } = require('../utils/encryption')

const DATA_DIR = process.env.DATA2_DIR || path.join(__dirname, '..', 'data', 'data2')
const SET_TITLE = 'data2 - GitHub issues'
const BATCH_SIZE = 500

const parseFileName = (fileName) => {
  // <org>_<repo>_<open|closed>_<n>.txt — el repo puede contener '_'
  const base = fileName.replace(/\.txt$/i, '')
  const match = base.match(/^(.+)_(open|closed)_(\d+)$/)
  if (!match) return { repo: 'otros', state: 'unknown', issue: base }
  return { repo: match[1], state: match[2], issue: match[3] }
}

const run = async () => {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`No existe el directorio de datos: ${DATA_DIR}`)
    console.error('Extrae el zip data2 en backend/data/ o define DATA2_DIR.')
    process.exit(1)
  }

  await connectMongo()
  if (!isMongoConnected()) {
    console.error('MongoDB no está disponible; el seed requiere la base de datos real.')
    process.exit(1)
  }

  const admin = await collections.users.findOne({ username: process.env.DATA2_OWNER || 'admin' })
  if (!admin) {
    console.error('No se encontró el usuario propietario (admin).')
    process.exit(1)
  }

  // Conjunto raíz
  let set = await collections.sets.findOne({ title: SET_TITLE, ownerId: admin._id })
  if (!set) {
    const inserted = await collections.sets.insertOne({
      userId: admin._id,
      ownerId: admin._id,
      sharedWith: [],
      title: SET_TITLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    set = { _id: inserted.insertedId }
    console.log(`Conjunto creado: ${SET_TITLE}`)
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith('.txt'))
  console.log(`Archivos a procesar: ${files.length}`)

  // Carpetas por repositorio
  const folderCache = new Map()
  const getFolderId = async (repo) => {
    if (folderCache.has(repo)) return folderCache.get(repo)
    let folder = await collections.folders.findOne({ title: repo, setId: set._id, ownerId: admin._id })
    if (!folder) {
      const inserted = await collections.folders.insertOne({
        userId: admin._id,
        ownerId: admin._id,
        sharedWith: [],
        setId: set._id,
        title: repo,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      folder = { _id: inserted.insertedId }
    }
    folderCache.set(repo, folder._id)
    return folder._id
  }

  // Títulos ya importados (idempotencia)
  const existing = new Set(
    (await collections.documents
      .find({ setId: set._id, ownerId: admin._id })
      .project({ title: 1 })
      .toArray()).map((d) => d.title),
  )

  let imported = 0
  let skipped = 0
  let batch = []

  for (const fileName of files) {
    if (existing.has(fileName)) {
      skipped += 1
      continue
    }

    const { repo, state } = parseFileName(fileName)
    const folderId = await getFolderId(repo)
    const content = fs.readFileSync(path.join(DATA_DIR, fileName))
    const encrypted = encryptFile(content)

    batch.push({
      userId: admin._id,
      ownerId: admin._id,
      sharedWith: [],
      title: fileName,
      folderId,
      setId: set._id,
      tags: [],
      metadata: { source: 'data2', repo, state },
      file: {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        originalName: fileName,
        contentType: 'text/plain',
        originalSize: content.length,
      },
      versions: [],
      revisionHistory: [
        {
          action: 'created',
          userId: String(admin._id),
          userName: admin.name || admin.username,
          userEmail: admin.email || null,
          timestamp: new Date(),
          details: { source: 'seed-data2' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    if (batch.length >= BATCH_SIZE) {
      await collections.documents.insertMany(batch)
      imported += batch.length
      batch = []
      console.log(`Importados ${imported}...`)
    }
  }

  if (batch.length > 0) {
    await collections.documents.insertMany(batch)
    imported += batch.length
  }

  console.log(`Listo. Importados: ${imported}, omitidos (ya existían): ${skipped}`)
  await client.close()
}

run().catch((error) => {
  console.error('Error en el seed:', error)
  process.exit(1)
})
