require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const upload = require('./modules/multermodule')
const { MongoClient, ObjectId } = require('mongodb')

const app = express()
const port = process.env.PORT || 4000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'proyecto_gps'
const SALT_ROUNDS = 12

const client = new MongoClient(MONGODB_URI)
let usersCollection, docsCollection, foldersCollection, setsCollection, tagsCollection
let mongoConnected = false

const fallbackUsers = [
  {
    _id: new ObjectId(),
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('admin123', SALT_ROUNDS),
    encryptionSalt: crypto.randomBytes(16).toString('base64'),
    name: 'Administrador',
    createdAt: new Date(),
  },
]
const fallbackDocs = []
const fallbackFolders = []
const fallbackSets = []
const fallbackTags = []

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://localhost:2200',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:2200',
].filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true)
    }

    const localHostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
    if (allowedOrigins.includes(origin) || localHostPattern.test(origin)) {
      return callback(null, true)
    }

    callback(new Error(`CORS origin not allowed: ${origin}`))
  },
  credentials: true,
}))
app.use(express.json())

const createToken = (user) => {
  const id = user._id || user.id || user.username
  return Buffer.from(`${id}:${user.username}:${Date.now()}`).toString('base64')
}

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS)
const comparePassword = async (password, hash) => bcrypt.compare(password, hash)

const findUserByUsernameOrEmail = async (value) => {
  if (mongoConnected && usersCollection) {
    return usersCollection.findOne({ $or: [{ username: value }, { email: value }] })
  }
  return fallbackUsers.find((user) => user.username === value || user.email === value) || null
}

const findUserByIdAndUsername = async (id, username) => {
  if (mongoConnected && usersCollection) {
    return usersCollection.findOne({ _id: new ObjectId(id), username })
  }
  return fallbackUsers.find(
    (user) => String(user._id) === String(id) && user.username === username,
  )
}

const findUserByCredentials = async (value, password) => {
  const user = await findUserByUsernameOrEmail(value)
  if (!user) {
    return null
  }

  const validPassword = await comparePassword(password, user.passwordHash)
  return validPassword ? user : null
}

const insertUser = async (user) => {
  if (mongoConnected && usersCollection) {
    return usersCollection.insertOne(user)
  }
  fallbackUsers.push(user)
  return { insertedId: user._id || user.username }
}

const findAccessibleDocumentsForUser = async (userId) => {
  if (mongoConnected && docsCollection) {
    return docsCollection
      .find({
        $or: [
          { ownerId: new ObjectId(userId) },
          { sharedWith: new ObjectId(userId) },
          { userId: new ObjectId(userId) },
        ],
      })
      .toArray()
  }

  return fallbackDocs.filter(
    (doc) =>
      String(doc.ownerId) === String(userId) ||
      String(doc.userId) === String(userId) ||
      (doc.sharedWith || []).includes(String(userId)),
  )
}

const findAccessibleFoldersForUser = async (userId) => {
  if (mongoConnected && foldersCollection) {
    return foldersCollection
      .find({
        $or: [
          { ownerId: new ObjectId(userId) },
          { sharedWith: new ObjectId(userId) },
        ],
      })
      .toArray()
  }

  return fallbackFolders.filter(
    (folder) =>
      String(folder.ownerId) === String(userId) ||
      (folder.sharedWith || []).includes(String(userId)),
  )
}

const findAccessibleSetsForUser = async (userId) => {
  if (mongoConnected && setsCollection) {
    return setsCollection
      .find({
        $or: [
          { ownerId: new ObjectId(userId) },
          { sharedWith: new ObjectId(userId) },
        ],
      })
      .toArray()
  }

  return fallbackSets.filter(
    (setItem) =>
      String(setItem.ownerId) === String(userId) ||
      (setItem.sharedWith || []).includes(String(userId)),
  )
}

const insertDocument = async (document) => {
  if (mongoConnected && docsCollection) {
    return docsCollection.insertOne(document)
  }
  const fallbackDoc = { ...document, _id: new ObjectId() }
  fallbackDocs.push(fallbackDoc)
  return { insertedId: fallbackDoc._id }
}

const updateDocument = async (documentId, updateFields) => {
  if (mongoConnected && docsCollection) {
    return docsCollection.findOneAndUpdate(
      { _id: new ObjectId(documentId) },
      { $set: updateFields },
      { returnDocument: 'after' },
    )
  }
  const fallbackIndex = fallbackDocs.findIndex((doc) => String(doc._id) === String(documentId))
  if (fallbackIndex === -1) {
    return { value: null }
  }
  fallbackDocs[fallbackIndex] = { ...fallbackDocs[fallbackIndex], ...updateFields }
  return { value: fallbackDocs[fallbackIndex] }
}

const insertFolder = async (folder) => {
  if (mongoConnected && foldersCollection) {
    return foldersCollection.insertOne(folder)
  }
  const fallbackFolder = { ...folder, _id: new ObjectId() }
  fallbackFolders.push(fallbackFolder)
  return { insertedId: fallbackFolder._id }
}

const insertSet = async (setItem) => {
  if (mongoConnected && setsCollection) {
    return setsCollection.insertOne(setItem)
  }
  const fallbackSet = { ...setItem, _id: new ObjectId() }
  fallbackSets.push(fallbackSet)
  return { insertedId: fallbackSet._id }
}

const findTagsForUser = async (userId) => {
  if (mongoConnected && tagsCollection) {
    return tagsCollection.find({ ownerId: new ObjectId(userId) }).toArray()
  }
  return fallbackTags.filter((tag) => String(tag.ownerId) === String(userId))
}

const insertTag = async (tag) => {
  if (mongoConnected && tagsCollection) {
    return tagsCollection.insertOne(tag)
  }
  const fallbackTag = { ...tag, _id: new ObjectId() }
  fallbackTags.push(fallbackTag)
  return { insertedId: fallbackTag._id }
}

const updateTag = async (tagId, updateFields) => {
  if (mongoConnected && tagsCollection) {
    return tagsCollection.findOneAndUpdate(
      { _id: new ObjectId(tagId) },
      { $set: updateFields },
      { returnDocument: 'after' },
    )
  }
  const fallbackIndex = fallbackTags.findIndex((tag) => String(tag._id) === String(tagId))
  if (fallbackIndex === -1) {
    return null
  }
  fallbackTags[fallbackIndex] = { ...fallbackTags[fallbackIndex], ...updateFields }
  return { value: fallbackTags[fallbackIndex] }
}

const deleteTag = async (tagId) => {
  if (mongoConnected && tagsCollection) {
    return tagsCollection.deleteOne({ _id: new ObjectId(tagId) })
  }
  const fallbackIndex = fallbackTags.findIndex((tag) => String(tag._id) === String(tagId))
  if (fallbackIndex === -1) {
    return { deletedCount: 0 }
  }
  fallbackTags.splice(fallbackIndex, 1)
  return { deletedCount: 1 }
}

const addSharedAccess = async (collection, itemId, shareWithId) => {
  if (mongoConnected && collection) {
    return collection.updateOne(
      { _id: new ObjectId(itemId) },
      { $addToSet: { sharedWith: new ObjectId(shareWithId) } },
    )
  }
  return null
}

const getUserFromToken = async (token) => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [id, username] = decoded.split(':')
    if (mongoConnected) {
      if (!ObjectId.isValid(id)) {
        return null
      }
      return findUserByIdAndUsername(id, username)
    }
    return findUserByIdAndUsername(id, username)
  } catch (error) {
    return null
  }
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid.' })
  }

  const token = authHeader.split(' ')[1]
  const user = await getUserFromToken(token)
  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }

  req.user = user
  next()
}

const connectMongo = async () => {
  try {
    await client.connect()
    const database = client.db(MONGODB_DB)
    usersCollection = database.collection('users')
    docsCollection = database.collection('documents')
    foldersCollection = database.collection('folders')
    setsCollection = database.collection('sets')
    tagsCollection = database.collection('tags')

    await usersCollection.createIndex({ username: 1 }, { unique: true })
    await usersCollection.createIndex({ email: 1 }, { unique: true })
    await docsCollection.createIndex({ ownerId: 1 })
    await docsCollection.createIndex({ sharedWith: 1 })
    await docsCollection.createIndex({ userId: 1 })
    await foldersCollection.createIndex({ ownerId: 1 })
    await foldersCollection.createIndex({ sharedWith: 1 })
    await foldersCollection.createIndex({ userId: 1 })
    await foldersCollection.createIndex({ setId: 1 })
    await setsCollection.createIndex({ ownerId: 1 })
    await setsCollection.createIndex({ sharedWith: 1 })
    await setsCollection.createIndex({ userId: 1 })
    await tagsCollection.createIndex({ ownerId: 1 })
    await tagsCollection.createIndex({ userId: 1 })

    const admin = await usersCollection.findOne({ username: 'admin' })
    if (!admin) {
      const passwordHash = await hashPassword('admin123')
      await usersCollection.insertOne({
        username: 'admin',
        email: 'admin@example.com',
        passwordHash,
        encryptionSalt: crypto.randomBytes(16).toString('base64'),
        name: 'Administrador',
        createdAt: new Date(),
      })
    }

    mongoConnected = true
    console.log('Connected to MongoDB at', MONGODB_URI)
  } catch (error) {
    mongoConnected = false
    console.warn(
      'MongoDB unavailable. The backend will run with in-memory fallback data until MongoDB is started.',
    )
    console.warn(error.message)
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/documents', async (req, res) => {
  try {
    if (!docsCollection) {
      return res.json({
        data: [
          {
            id: 1,
            title: 'Acta de reunión',
            status: 'En revisión',
            updatedAt: '2026-05-01',
          },
          {
            id: 2,
            title: 'Política de calidad',
            status: 'Aprobado',
            updatedAt: '2026-04-27',
          },
        ],
      })
    }

    const docs = await docsCollection
      .find({})
      .limit(20)
      .toArray()

    res.json({ data: docs })
  } catch (error) {
    res.status(500).json({ message: 'Unable to retrieve documents.' })
  }
})

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' })
  }

  const existing = await findUserByUsernameOrEmail(username) || await findUserByUsernameOrEmail(email)
  if (existing) {
    return res.status(409).json({ message: 'Username or email already exists.' })
  }

  const passwordHash = await hashPassword(password)
  const encryptionSalt = crypto.randomBytes(16).toString('base64')
  const newUser = {
    username,
    email,
    passwordHash,
    encryptionSalt,
    name: username,
    createdAt: new Date(),
  }

  const result = await insertUser(newUser)
  if (!result.insertedId) {
    return res.status(500).json({ message: 'Unable to create user.' })
  }

  res.status(201).json({ message: 'User created successfully.', encryptionSalt })
})

app.post('/api/auth/login', async (req, res) => {
  const { username, email, password } = req.body
  const credentials = username || email

  if (!credentials || !password) {
    return res.status(400).json({ message: 'Username/email and password are required.' })
  }

  const user = await findUserByCredentials(credentials, password)

  if (!user) {
    return res.status(401).json({ message: 'Invalid username/email or password.' })
  }

  const token = createToken(user)
  res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    encryptionSalt: user.encryptionSalt,
  })
})

app.post('/api/auth/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully.' })
})

app.get('/api/user/sets', authenticate, async (req, res) => {
  try {
    const sets = await findAccessibleSetsForUser(req.user._id)
    res.json({ data: sets })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user sets.' })
  }
})

app.post('/api/user/sets', authenticate, async (req, res) => {
  const { title } = req.body
  if (!title) {
    return res.status(400).json({ message: 'Set title is required.' })
  }

  try {
    const setItem = {
      userId: req.user._id,
      ownerId: req.user._id,
      sharedWith: [],
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await insertSet(setItem)
    res.status(201).json({ data: { ...setItem, _id: result.insertedId } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to save set.' })
  }
})

app.get('/api/user/folders', authenticate, async (req, res) => {
  try {
    const folders = await findAccessibleFoldersForUser(req.user._id)
    res.json({ data: folders })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user folders.' })
  }
})

app.post('/api/user/folders', authenticate, async (req, res) => {
  const { title, setId } = req.body
  if (!title) {
    return res.status(400).json({ message: 'Folder title is required.' })
  }

  try {
    const folder = {
      userId: req.user._id,
      ownerId: req.user._id,
      sharedWith: [],
      setId: setId || null,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await insertFolder(folder)
    res.status(201).json({ data: { ...folder, _id: result.insertedId } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to save folder.' })
  }
})

app.get('/api/user/documents', authenticate, async (req, res) => {
  try {
    if (mongoConnected && docsCollection) {
      const documents = await docsCollection
        .find({
          $or: [
            { ownerId: new ObjectId(req.user._id) },
            { sharedWith: new ObjectId(req.user._id) },
            { userId: new ObjectId(req.user._id) },
          ],
        })
        .project({ file: 0 })
        .toArray()
      res.json({ data: documents })
      return
    }

    const documents = await findAccessibleDocumentsForUser(req.user._id)
    const safeDocs = documents.map(({ file, ...doc }) => doc)
    res.json({ data: safeDocs })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user documents.' })
  }
})

app.post('/api/user/documents', authenticate, upload.single('file'), async (req, res) => {
  const { title: rawTitle, content, folderId, setId } = req.body
  const file = req.file
  const title = rawTitle || (file ? file.originalname : '')

  if (!title) {
    return res.status(400).json({ message: 'Document title is required.' })
  }

  try {
    const document = {
      userId: req.user._id,
      ownerId: req.user._id,
      sharedWith: [],
      title,
      content: content || '',
      folderId: folderId || null,
      setId: setId || null,
      tags: [],
      file: file
        ? {
            data: file.buffer,
            originalName: file.originalname,
            contentType: file.mimetype,
            size: file.size,
          }
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await insertDocument(document)
    res.status(201).json({ data: { ...document, _id: result.insertedId } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to save document.' })
  }
})

app.get('/api/user/documents/:id/download', authenticate, async (req, res) => {
  const documentId = req.params.id

  try {
    let document
    if (mongoConnected && docsCollection) {
      document = await docsCollection.findOne({
        _id: new ObjectId(documentId),
        $or: [
          { ownerId: new ObjectId(req.user._id) },
          { sharedWith: new ObjectId(req.user._id) },
          { userId: new ObjectId(req.user._id) },
        ],
      })
    } else {
      document = fallbackDocs.find(
        (doc) =>
          String(doc._id) === String(documentId) &&
          (String(doc.ownerId) === String(req.user._id) ||
            String(doc.userId) === String(req.user._id) ||
            (doc.sharedWith || []).includes(String(req.user._id))),
      )
    }

    if (!document) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    if (!document.file || !document.file.data) {
      return res.status(404).json({ message: 'No file attached to this document.' })
    }

    let fileData = document.file.data
    if (!Buffer.isBuffer(fileData)) {
      fileData = Buffer.from(fileData.buffer || fileData)
    }
    const filename = document.file.originalName || document.title || 'document'

    res.setHeader('Content-Type', document.file.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '\"')}"`)
    res.send(fileData)
  } catch (error) {
    res.status(500).json({ message: 'Unable to download document.' })
  }
})

app.put('/api/user/documents/:id', authenticate, async (req, res) => {
  const documentId = req.params.id
  const { tags } = req.body

  if (!Array.isArray(tags)) {
    return res.status(400).json({ message: 'Document tags must be an array.' })
  }

  try {
    const existingDoc = mongoConnected
      ? await docsCollection.findOne({ _id: new ObjectId(documentId), ownerId: new ObjectId(req.user._id) })
      : fallbackDocs.find((doc) => String(doc._id) === String(documentId) && String(doc.ownerId) === String(req.user._id))

    if (!existingDoc) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    const sanitizedTags = tags.map(String)
    const result = await updateDocument(documentId, {
      tags: sanitizedTags,
      updatedAt: new Date(),
    })

    res.json({ data: result.value || result })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update document tags.' })
  }
})

app.get('/api/user/tags', authenticate, async (req, res) => {
  try {
    const tags = await findTagsForUser(req.user._id)
    res.json({ data: tags })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load tags.' })
  }
})

app.post('/api/user/tags', authenticate, async (req, res) => {
  const { name, color } = req.body
  if (!name || !color) {
    return res.status(400).json({ message: 'Tag name and color are required.' })
  }

  try {
    const tag = {
      userId: req.user._id,
      ownerId: req.user._id,
      name: name.trim(),
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await insertTag(tag)
    res.status(201).json({ data: { ...tag, _id: result.insertedId } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to create tag.' })
  }
})

app.put('/api/user/tags/:id', authenticate, async (req, res) => {
  const { name, color } = req.body
  const tagId = req.params.id
  if (!name || !color) {
    return res.status(400).json({ message: 'Tag name and color are required.' })
  }

  try {
    const existingTag = mongoConnected
      ? await tagsCollection.findOne({ _id: new ObjectId(tagId), ownerId: new ObjectId(req.user._id) })
      : fallbackTags.find((tag) => String(tag._id) === String(tagId) && String(tag.ownerId) === String(req.user._id))
    if (!existingTag) {
      return res.status(404).json({ message: 'Tag not found.' })
    }

    const result = await updateTag(tagId, {
      name: name.trim(),
      color,
      updatedAt: new Date(),
    })
    res.json({ data: result.value || result })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update tag.' })
  }
})

app.delete('/api/user/tags/:id', authenticate, async (req, res) => {
  const tagId = req.params.id
  try {
    const existingTag = mongoConnected
      ? await tagsCollection.findOne({ _id: new ObjectId(tagId), ownerId: new ObjectId(req.user._id) })
      : fallbackTags.find((tag) => String(tag._id) === String(tagId) && String(tag.ownerId) === String(req.user._id))
    if (!existingTag) {
      return res.status(404).json({ message: 'Tag not found.' })
    }

    const result = await deleteTag(tagId)
    if (mongoConnected && result.deletedCount === 0) {
      return res.status(404).json({ message: 'Tag not found.' })
    }
    res.json({ message: 'Tag deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete tag.' })
  }
})

app.post('/api/user/documents/:id/share', authenticate, async (req, res) => {
  const { targetEmail } = req.body
  if (!targetEmail) {
    return res.status(400).json({ message: 'Target email is required to share a document.' })
  }

  const userToShare = await findUserByUsernameOrEmail(targetEmail)
  if (!userToShare) {
    return res.status(404).json({ message: 'Target user not found.' })
  }

  const itemId = req.params.id
  try {
    const item = mongoConnected
      ? await docsCollection.findOne({ _id: new ObjectId(itemId) })
      : fallbackDocs.find((item) => String(item._id) === String(itemId))

    if (!item) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    if (String(item.ownerId || item.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can share this document.' })
    }

    const update = await addSharedAccess(docsCollection, itemId, userToShare._id)
    if (mongoConnected && update && update.matchedCount === 0) {
      return res.status(404).json({ message: 'Document not found.' })
    }
    const fallbackIndex = fallbackDocs.findIndex((item) => String(item._id) === String(itemId))
    if (!mongoConnected && fallbackIndex >= 0) {
      const fallbackDoc = fallbackDocs[fallbackIndex]
      fallbackDoc.sharedWith = fallbackDoc.sharedWith || []
      if (!fallbackDoc.sharedWith.includes(String(userToShare._id))) {
        fallbackDoc.sharedWith.push(String(userToShare._id))
      }
    }
    res.json({ message: 'Document shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share document.' })
  }
})

app.post('/api/user/folders/:id/share', authenticate, async (req, res) => {
  const { targetEmail } = req.body
  if (!targetEmail) {
    return res.status(400).json({ message: 'Target email is required to share a folder.' })
  }

  const userToShare = await findUserByUsernameOrEmail(targetEmail)
  if (!userToShare) {
    return res.status(404).json({ message: 'Target user not found.' })
  }

  const itemId = req.params.id
  try {
    const item = mongoConnected
      ? await foldersCollection.findOne({ _id: new ObjectId(itemId) })
      : fallbackFolders.find((item) => String(item._id) === String(itemId))

    if (!item) {
      return res.status(404).json({ message: 'Folder not found.' })
    }

    if (String(item.ownerId || item.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can share this folder.' })
    }

    const update = await addSharedAccess(foldersCollection, itemId, userToShare._id)
    if (mongoConnected && update && update.matchedCount === 0) {
      return res.status(404).json({ message: 'Folder not found.' })
    }
    const fallbackIndex = fallbackFolders.findIndex((item) => String(item._id) === String(itemId))
    if (!mongoConnected && fallbackIndex >= 0) {
      const fallbackFolder = fallbackFolders[fallbackIndex]
      fallbackFolder.sharedWith = fallbackFolder.sharedWith || []
      if (!fallbackFolder.sharedWith.includes(String(userToShare._id))) {
        fallbackFolder.sharedWith.push(String(userToShare._id))
      }
    }
    res.json({ message: 'Folder shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share folder.' })
  }
})

app.post('/api/user/sets/:id/share', authenticate, async (req, res) => {
  const { targetEmail } = req.body
  if (!targetEmail) {
    return res.status(400).json({ message: 'Target email is required to share a set.' })
  }

  const userToShare = await findUserByUsernameOrEmail(targetEmail)
  if (!userToShare) {
    return res.status(404).json({ message: 'Target user not found.' })
  }

  const itemId = req.params.id
  try {
    const item = mongoConnected
      ? await setsCollection.findOne({ _id: new ObjectId(itemId) })
      : fallbackSets.find((item) => String(item._id) === String(itemId))

    if (!item) {
      return res.status(404).json({ message: 'Set not found.' })
    }

    if (String(item.ownerId || item.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can share this set.' })
    }

    const update = await addSharedAccess(setsCollection, itemId, userToShare._id)
    if (mongoConnected && update && update.matchedCount === 0) {
      return res.status(404).json({ message: 'Set not found.' })
    }
    const fallbackIndex = fallbackSets.findIndex((item) => String(item._id) === String(itemId))
    if (!mongoConnected && fallbackIndex >= 0) {
      const fallbackSet = fallbackSets[fallbackIndex]
      fallbackSet.sharedWith = fallbackSet.sharedWith || []
      if (!fallbackSet.sharedWith.includes(String(userToShare._id))) {
        fallbackSet.sharedWith.push(String(userToShare._id))
      }
    }
    res.json({ message: 'Set shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share set.' })
  }
})

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../build')
  app.use(express.static(frontendDist))

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

const startServer = async () => {
  try {
    await connectMongo()
    app.listen(port, () => {
      console.log(`Backend server listening on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
