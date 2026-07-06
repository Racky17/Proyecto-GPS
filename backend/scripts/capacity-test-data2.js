/**
 * Prueba de capacidad: sube N archivos del dataset "data2" a la base de
 * datos configurada en .env (MongoDB Atlas), creando un "proyecto"
 * (conjunto/set) por repositorio y agrupando dentro sus archivos .txt.
 *
 *   Ejemplo de estructura resultante:
 *     proyecto "arguelles_nuSQuIDS"
 *        ├── arguelles_nuSQuIDS_closed_1.txt
 *        ├── arguelles_nuSQuIDS_open_2.txt
 *        └── ...
 *
 * La selección es round-robin entre repositorios para que todos los
 * proyectos queden representados hasta alcanzar el límite.
 *
 * Uso:
 *   node scripts/capacity-test-data2.js
 *   DATA2_DIR="D:\ruta\data2" DATA2_LIMIT=1000 node scripts/capacity-test-data2.js
 *
 * Requiere MongoDB accesible y ENCRYPTION_KEY en el .env. Idempotente:
 * los archivos ya subidos a su proyecto se omiten.
 */
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { client, collections, connectMongo, isMongoConnected } = require('../config/mongo')
const { encryptFile } = require('../utils/encryption')

const DATA_DIR = process.env.DATA2_DIR || path.join(__dirname, '..', 'data', 'data2')
const LIMIT = Number(process.env.DATA2_LIMIT || 1000)
const BATCH_SIZE = 200

const parseFileName = (fileName) => {
  const base = fileName.replace(/\.txt$/i, '')
  const match = base.match(/^(.+)_(open|closed)_(\d+)$/)
  if (!match) return { repo: 'otros', state: 'unknown', issue: 0 }
  return { repo: match[1], state: match[2], issue: Number(match[3]) }
}

// Selección round-robin: 1 archivo de cada repo por ronda hasta el límite
const selectFiles = (files, limit) => {
  const byRepo = new Map()
  for (const file of files) {
    const { repo, issue } = parseFileName(file)
    if (!byRepo.has(repo)) byRepo.set(repo, [])
    byRepo.get(repo).push({ file, issue })
  }
  const queues = [...byRepo.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([repo, items]) => ({ repo, items: items.sort((a, b) => a.issue - b.issue) }))

  const selected = []
  let index = 0
  while (selected.length < limit && queues.some((q) => q.items.length > 0)) {
    const queue = queues[index % queues.length]
    if (queue.items.length > 0) {
      selected.push({ repo: queue.repo, file: queue.items.shift().file })
    }
    index += 1
  }
  return selected
}

const run = async () => {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`No existe el directorio de datos: ${DATA_DIR}`)
    process.exit(1)
  }

  await connectMongo()
  if (!isMongoConnected()) {
    console.error('MongoDB no está disponible; esta prueba requiere la base de datos real.')
    process.exit(1)
  }

  const owner = await collections.users.findOne({ username: process.env.DATA2_OWNER || 'admin' })
  if (!owner) {
    console.error('No se encontró el usuario propietario (admin).')
    process.exit(1)
  }

  const allFiles = fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith('.txt'))
  const selected = selectFiles(allFiles, LIMIT)
  console.log(`Archivos disponibles: ${allFiles.length} | seleccionados: ${selected.length}`)

  // Un "proyecto" (set) por repositorio
  const setCache = new Map()
  const getSetId = async (repo) => {
    if (setCache.has(repo)) return setCache.get(repo)
    let set = await collections.sets.findOne({ title: repo, ownerId: owner._id })
    if (!set) {
      const inserted = await collections.sets.insertOne({
        userId: owner._id,
        ownerId: owner._id,
        sharedWith: [],
        title: repo,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      set = { _id: inserted.insertedId }
      console.log(`Proyecto creado: ${repo}`)
    }
    setCache.set(repo, set._id)
    return set._id
  }

  // Títulos ya subidos por proyecto (idempotencia)
  const existingTitles = new Set(
    (
      await collections.documents
        .find({ ownerId: owner._id, 'metadata.source': 'data2-capacity' })
        .project({ title: 1 })
        .toArray()
    ).map((d) => d.title),
  )

  let uploaded = 0
  let skipped = 0
  let bytes = 0
  let batch = []
  const started = Date.now()

  for (const { repo, file } of selected) {
    if (existingTitles.has(file)) {
      skipped += 1
      continue
    }

    const setId = await getSetId(repo)
    const content = fs.readFileSync(path.join(DATA_DIR, file))
    const encrypted = encryptFile(content)
    bytes += content.length

    batch.push({
      userId: owner._id,
      ownerId: owner._id,
      sharedWith: [],
      title: file,
      folderId: null,
      setId,
      tags: [],
      metadata: { source: 'data2-capacity', repo, state: parseFileName(file).state },
      file: {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        originalName: file,
        contentType: 'text/plain',
        originalSize: content.length,
      },
      versions: [],
      revisionHistory: [
        {
          action: 'created',
          userId: String(owner._id),
          userName: owner.name || owner.username,
          userEmail: owner.email || null,
          timestamp: new Date(),
          details: { source: 'capacity-test-data2' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    if (batch.length >= BATCH_SIZE) {
      await collections.documents.insertMany(batch)
      uploaded += batch.length
      batch = []
      console.log(`Subidos ${uploaded}/${selected.length}...`)
    }
  }

  if (batch.length > 0) {
    await collections.documents.insertMany(batch)
    uploaded += batch.length
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log('--- Resultado de la prueba de capacidad ---')
  console.log(`Subidos: ${uploaded} | omitidos (ya existían): ${skipped}`)
  console.log(`Proyectos: ${setCache.size} | datos originales: ${(bytes / 1024).toFixed(1)} KB | tiempo: ${seconds}s`)
  await client.close()
}

run().catch((error) => {
  console.error('Error en la prueba de capacidad:', error)
  process.exit(1)
})
