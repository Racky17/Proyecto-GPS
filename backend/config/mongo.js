const { MongoClient, ObjectId } = require('mongodb')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const MONGODB_DB = process.env.MONGODB_DB || 'proyecto_gps'
const SALT_ROUNDS = 12

const client = new MongoClient(MONGODB_URI)

const collections = {
  users: null,
  documents: null,
  folders: null,
  sets: null,
  organizations: null,
  tags: null,
  userDocumentTags: null,
}

let connected = false

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
const fallbackOrganizations = []
const fallbackTags = []
const fallbackUserDocumentTags = []

const connectMongo = async () => {
  try {
    await client.connect()
    const database = client.db(MONGODB_DB)

    collections.users = database.collection('users')
    collections.documents = database.collection('documents')
    collections.folders = database.collection('folders')
    collections.sets = database.collection('sets')
    collections.tags = database.collection('tags')
    collections.userDocumentTags = database.collection('userDocumentTags')
    collections.organizations = database.collection('organizations')

    await collections.users.createIndex({ username: 1 }, { unique: true })
    await collections.users.createIndex({ email: 1 }, { unique: true })
    await collections.documents.createIndex({ ownerId: 1 })
    await collections.documents.createIndex({ sharedWith: 1 })
    await collections.documents.createIndex({ userId: 1 })
    await collections.folders.createIndex({ ownerId: 1 })
    await collections.folders.createIndex({ sharedWith: 1 })
    await collections.folders.createIndex({ userId: 1 })
    await collections.folders.createIndex({ setId: 1 })
    await collections.sets.createIndex({ ownerId: 1 })
    await collections.sets.createIndex({ sharedWith: 1 })
    await collections.sets.createIndex({ userId: 1 })
    await collections.organizations.createIndex({ ownerId: 1 })
    await collections.organizations.createIndex({ 'members.id': 1 })
    await collections.tags.createIndex({ ownerId: 1 })
    await collections.tags.createIndex({ userId: 1 })
    await collections.userDocumentTags.createIndex({ userId: 1, documentId: 1 })

    const admin = await collections.users.findOne({ username: 'admin' })
    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', SALT_ROUNDS)
      await collections.users.insertOne({
        username: 'admin',
        email: 'admin@example.com',
        passwordHash,
        encryptionSalt: crypto.randomBytes(16).toString('base64'),
        name: 'Administrador',
        createdAt: new Date(),
      })
    }

    connected = true
    console.log('Connected to MongoDB at', MONGODB_URI)
  } catch (error) {
    connected = false
    console.warn(
      'MongoDB unavailable. The backend will run with in-memory fallback data until MongoDB is started.',
    )
    console.warn(error.message)
  }
}

const isMongoConnected = () => connected

module.exports = {
  ObjectId,
  client,
  collections,
  connectMongo,
  isMongoConnected,
  fallbackUsers,
  fallbackDocs,
  fallbackFolders,
  fallbackSets,
  fallbackTags,
  fallbackUserDocumentTags,
  SALT_ROUNDS,
  fallbackOrganizations,
}
