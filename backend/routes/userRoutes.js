const express = require('express')
const upload = require('../modules/multermodule')
const { authenticate } = require('../utils/auth')
const { encryptFile, decryptFile } = require('../utils/encryption')
const { isMongoConnected, ObjectId, collections, fallbackDocs, fallbackFolders } = require('../config/mongo')
const { findUserByUsernameOrEmail, findUserById } = require('../services/userService')
const { findOrganizationById } = require('../services/orgService')
const {
  getSharedWithList,
  findAccessibleSetsForUser,
  insertSet,
  findAccessibleFoldersForUser,
  insertFolder,
  findAccessibleDocumentsForUser,
  insertDocument,
  findDocumentForUser,
  updateDocument,
  updateFolder,
  deleteFolder,
  deleteSet,
  findDocumentById,
  findFolderById,
  findSetById,
  findTagsForUser,
  insertTag,
  updateTag,
  deleteTag,
  findUserDocumentTags,
  upsertUserDocumentTags,
  normalizeSharedWithEntries,
  sharedWithContainsUser,
  getSharedRoleForUser,
  shareDocumentWithUser,
  shareFolderWithUser,
  shareSetWithUser,
  shareDocumentWithOrg,
  shareFolderWithOrg,
  shareSetWithOrg,
  removeDocumentShare,
  removeFolderShare,
  removeSetShare,
  removeSharedWithEntries,
} = require('../services/dataService')

const router = express.Router()

const validShareRoles = ['admin', 'write', 'read-only']

// Content-Disposition header values must not contain quotes or CR/LF characters
const sanitizeFilename = (filename) => String(filename).replace(/["\\\r\n]/g, '_')

// Obtiene el contenido de un archivo (descifrado si es necesario) o null
const getFileBuffer = (file) => {
  if (!file) return null
  if (file.encryptedData && file.iv && file.authTag) {
    return decryptFile(file)
  }
  if (file.data) {
    return Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data.buffer || file.data)
  }
  return null
}

const isVerifiedUser = (user) => user && user.verified !== false

const resolveShareTarget = async ({ targetEmail, targetUserId, targetOrgId }) => {
  if (targetOrgId) {
    const org = await findOrganizationById(targetOrgId)
    if (org) return { type: 'org', organization: org }
    return null
  }
  if (targetUserId) {
    const user = await findUserById(targetUserId)
    if (user) return { type: 'user', user }
    return null
  }
  if (targetEmail) {
    const user = await findUserByUsernameOrEmail(targetEmail)
    if (user) return { type: 'user', user }
  }
  return null
}

const canPerformWriteAction = async (item, user) => {
  if (!item || !user) return false
  if (String(item.ownerId) === String(user._id)) {
    return isVerifiedUser(user)
  }
  const role = await getSharedRoleForUser(item, user._id)
  return isVerifiedUser(user) && (role === 'admin' || role === 'write')
}

const canManageSharedAccess = async (item, user) => {
  if (!item || !user) return false
  if (String(item.ownerId || item.userId) === String(user._id)) return true
  const role = await getSharedRoleForUser(item, user._id)
  return role === 'admin'
}

const canAccessItem = async (item, user) => {
  if (!item || !user) return false
  if (String(item.ownerId) === String(user._id)) return true
  if (String(item.userId) === String(user._id)) return true
  const role = await getSharedRoleForUser(item, user._id)
  return !!role
}

const createRevisionEntry = (user, action, details = {}) => ({
  _id: isMongoConnected() ? new ObjectId() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  action,
  userId: String(user._id),
  userName: user.name || user.username || user.email || 'Unknown',
  userEmail: user.email || null,
  timestamp: new Date(),
  details,
})

const createDocumentVersion = (doc) => {
  if (!doc || !doc.file) return null
  return {
    _id: isMongoConnected() ? new ObjectId() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file: { ...doc.file },
    title: doc.title,
    tags: Array.isArray(doc.tags) ? [...doc.tags] : [],
    originalName: doc.file.originalName || doc.title || null,
    contentType: doc.file.contentType || null,
    size: doc.file.originalSize || null,
    archivedAt: new Date(),
    sourceUpdatedAt: doc.updatedAt || doc.createdAt || new Date(),
  }
}

const summarizeVersion = (version) => ({
  _id: version._id,
  title: version.title,
  originalName: version.originalName,
  contentType: version.contentType,
  size: version.size,
  archivedAt: version.archivedAt,
  sourceUpdatedAt: version.sourceUpdatedAt,
})

const findVersionById = (document, versionId) => {
  if (!document || !Array.isArray(document.versions)) return null
  return document.versions.find((version) => String(version._id) === String(versionId))
}

router.get('/api/user/sets', authenticate, async (req, res) => {
  try {
    const sets = await findAccessibleSetsForUser(req.user._id)
    res.json({ data: sets })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user sets.' })
  }
})

router.post('/api/user/sets', authenticate, async (req, res) => {
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

router.get('/api/user/folders', authenticate, async (req, res) => {
  try {
    const folders = await findAccessibleFoldersForUser(req.user._id)
    res.json({ data: folders })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user folders.' })
  }
})

router.post('/api/user/folders', authenticate, async (req, res) => {
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

router.get('/api/user/documents', authenticate, async (req, res) => {
  try {
    const documents = await findAccessibleDocumentsForUser(req.user._id)
    const safeDocs = documents.map(({ file, ...doc }) => doc)
    res.json({ data: safeDocs })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user documents.' })
  }
})

router.post('/api/user/documents', authenticate, upload.single('file'), async (req, res) => {
  const { title: rawTitle, folderId, setId } = req.body
  const file = req.file
  const title = rawTitle || (file ? file.originalname : '')

  if (!title) {
    return res.status(400).json({ message: 'Document title is required.' })
  }

  try {
    let fileData
    if (file) {
      const encrypted = encryptFile(file.buffer)
      fileData = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        originalName: file.originalname,
        contentType: file.mimetype,
        originalSize: file.size,
      }
    }

    let sharedWith = []
    let parentOwnerId = null

    if (folderId) {
      const folder = await findFolderById(folderId)
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found.' })
      }
      const setParent = folder.setId ? await findSetById(folder.setId) : null
      if (!(await canPerformWriteAction(folder, req.user)) && !(setParent && await canPerformWriteAction(setParent, req.user))) {
        return res.status(403).json({ message: 'You do not have permission to upload to this folder.' })
      }

      sharedWith = normalizeSharedWithEntries(folder.sharedWith)
      if (setParent) {
        normalizeSharedWithEntries(setParent.sharedWith).forEach((entry) => {
          if (!sharedWith.some((existing) => String(existing.userId) === String(entry.userId))) {
            sharedWith.push(entry)
          }
        })
      }
      parentOwnerId = String(folder.ownerId || folder.userId || '')
      if (!parentOwnerId && setParent) {
        parentOwnerId = String(setParent.ownerId || setParent.userId || '')
      }
    } else if (setId) {
      const set = await findSetById(setId)
      if (!set) {
        return res.status(404).json({ message: 'Set not found.' })
      }
      if (!(await canPerformWriteAction(set, req.user))) {
        return res.status(403).json({ message: 'You do not have permission to upload to this set.' })
      }

      sharedWith = normalizeSharedWithEntries(set.sharedWith)
      parentOwnerId = String(set.ownerId || set.userId || '')
    }

    if (parentOwnerId && parentOwnerId !== String(req.user._id) && !sharedWith.some((entry) => String(entry.userId) === parentOwnerId)) {
      sharedWith.push({ userId: parentOwnerId, role: 'admin' })
    }

    const revisionEntry = createRevisionEntry(req.user, 'created', {
      title,
      folderId: folderId || null,
      setId: setId || null,
    })

    const document = {
      userId: req.user._id,
      ownerId: req.user._id,
      sharedWith: sharedWith.map((entry) => {
        if (entry.type === 'org') {
          return isMongoConnected()
            ? { orgId: new ObjectId(entry.orgId), role: entry.role, name: entry.name || null }
            : { orgId: String(entry.orgId), role: entry.role, name: entry.name || null }
        }

        return isMongoConnected()
          ? { userId: new ObjectId(entry.userId), role: entry.role, email: entry.email || null, name: entry.name || null }
          : { userId: String(entry.userId), role: entry.role, email: entry.email || null, name: entry.name || null }
      }),
      title,
      folderId: folderId || null,
      setId: setId || null,
      tags: [],
      file: fileData,
      versions: [],
      revisionHistory: [revisionEntry],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await insertDocument(document)
    res.status(201).json({ data: { ...document, _id: result.insertedId } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to save document.' })
  }
})

router.get('/api/user/documents/:id/download', authenticate, async (req, res) => {
  const documentId = req.params.id

  try {
    const document = await findDocumentForUser(documentId, req.user._id)
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    if (!document.file) {
      return res.status(404).json({ message: 'No file attached to this document.' })
    }

    let fileData
    if (document.file.encryptedData && document.file.iv && document.file.authTag) {
      try {
        fileData = decryptFile(document.file)
      } catch (decryptError) {
        return res.status(500).json({ message: 'Unable to decrypt document file.' })
      }
    } else if (document.file.data) {
      fileData = document.file.data
      if (!Buffer.isBuffer(fileData)) {
        fileData = Buffer.from(fileData.buffer || fileData)
      }
    } else {
      return res.status(404).json({ message: 'No file data found.' })
    }

    const filename = document.file.originalName || document.title || 'document'
    res.setHeader('Content-Type', document.file.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`)
    res.send(fileData)
  } catch (error) {
    res.status(500).json({ message: 'Unable to download document.' })
  }
})

// Igual que /download pero sirve el archivo "inline" para que el navegador
// pueda renderizarlo (imágenes, PDF, texto, audio, vídeo...).
router.get('/api/user/documents/:id/preview', authenticate, async (req, res) => {
  const documentId = req.params.id

  try {
    const document = await findDocumentForUser(documentId, req.user._id)
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    if (!document.file) {
      return res.status(404).json({ message: 'No file attached to this document.' })
    }

    let fileData
    try {
      fileData = getFileBuffer(document.file)
    } catch (decryptError) {
      return res.status(500).json({ message: 'Unable to decrypt document file.' })
    }
    if (!fileData) {
      return res.status(404).json({ message: 'No file data found.' })
    }

    const filename = document.file.originalName || document.title || 'document'
    res.setHeader('Content-Type', document.file.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeFilename(filename)}"`)
    res.send(fileData)
  } catch (error) {
    res.status(500).json({ message: 'Unable to preview document.' })
  }
})

router.post('/api/user/documents/:id/versions', authenticate, upload.single('file'), async (req, res) => {
  const documentId = req.params.id
  const file = req.file
  const { title: rawTitle } = req.body

  if (!file) {
    return res.status(400).json({ message: 'A file is required to upload a new document version.' })
  }

  try {
    const existingDoc = await findDocumentById(documentId)
    if (!existingDoc || existingDoc.deletedAt) {
      return res.status(404).json({ message: 'Document not found.' })
    }
    if (!(await canPerformWriteAction(existingDoc, req.user))) {
      return res.status(403).json({ message: 'You do not have permission to upload a new version for this document.' })
    }

    const encrypted = encryptFile(file.buffer)
    const fileData = {
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      originalName: file.originalname,
      contentType: file.mimetype,
      originalSize: file.size,
    }

    const newTitle = rawTitle || existingDoc.title || file.originalname
    const previousVersion = createDocumentVersion(existingDoc)
    const existingVersions = Array.isArray(existingDoc.versions) ? [...existingDoc.versions] : []
    if (previousVersion) {
      existingVersions.push(previousVersion)
    }

    const revisionEntry = createRevisionEntry(req.user, 'version-uploaded', {
      title: newTitle,
      previousVersionId: previousVersion ? previousVersion._id : null,
    })

    const result = await updateDocument(documentId, {
      title: newTitle,
      file: fileData,
      updatedAt: new Date(),
      versions: existingVersions,
      revisionHistory: [
        ...(existingDoc.revisionHistory || []),
        revisionEntry,
      ],
    })

    res.json({ data: result.value || result })
  } catch (error) {
    res.status(500).json({ message: 'Unable to upload new document version.' })
  }
})

router.get('/api/user/documents/:id/revisions', authenticate, async (req, res) => {
  const documentId = req.params.id

  try {
    const document = await findDocumentForUser(documentId, req.user._id)
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    res.json({
      data: {
        versions: (document.versions || []).map(summarizeVersion),
        revisionHistory: document.revisionHistory || [],
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load document revisions.' })
  }
})

router.get('/api/user/documents/:id/revisions/:versionId/download', authenticate, async (req, res) => {
  const documentId = req.params.id
  const { versionId } = req.params

  try {
    const document = await findDocumentForUser(documentId, req.user._id)
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    const version = findVersionById(document, versionId)
    if (!version || !version.file) {
      return res.status(404).json({ message: 'Document version not found.' })
    }

    let fileData
    if (version.file.encryptedData && version.file.iv && version.file.authTag) {
      try {
        fileData = decryptFile(version.file)
      } catch (decryptError) {
        return res.status(500).json({ message: 'Unable to decrypt version file.' })
      }
    } else if (version.file.data) {
      fileData = version.file.data
      if (!Buffer.isBuffer(fileData)) {
        fileData = Buffer.from(fileData.buffer || fileData)
      }
    } else {
      return res.status(404).json({ message: 'No file data found for this version.' })
    }

    const filename = version.file.originalName || version.title || 'document'
    res.setHeader('Content-Type', version.file.contentType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`)
    res.send(fileData)
  } catch (error) {
    res.status(500).json({ message: 'Unable to download document version.' })
  }
})

router.post('/api/user/documents/:id/revisions/:versionId/revert', authenticate, async (req, res) => {
  const documentId = req.params.id
  const { versionId } = req.params

  try {
    const existingDoc = await findDocumentById(documentId)
    if (!existingDoc || existingDoc.deletedAt) {
      return res.status(404).json({ message: 'Document not found.' })
    }
    if (!(await canPerformWriteAction(existingDoc, req.user))) {
      return res.status(403).json({ message: 'You do not have permission to revert this document.' })
    }

    const version = findVersionById(existingDoc, versionId)
    if (!version) {
      return res.status(404).json({ message: 'Document version not found.' })
    }

    const archivedCurrentVersion = createDocumentVersion(existingDoc)
    const remainingVersions = (existingDoc.versions || []).filter((v) => String(v._id) !== String(versionId))
    if (archivedCurrentVersion) {
      remainingVersions.push(archivedCurrentVersion)
    }

    const revisionEntry = createRevisionEntry(req.user, 'reverted', {
      revertedVersionId: version._id,
      revertedVersionTitle: version.originalName || version.title,
    })

    const result = await updateDocument(documentId, {
      title: version.title || existingDoc.title,
      tags: Array.isArray(version.tags) ? [...version.tags] : existingDoc.tags,
      file: version.file,
      updatedAt: new Date(),
      versions: remainingVersions,
      revisionHistory: [
        ...(existingDoc.revisionHistory || []),
        revisionEntry,
      ],
    })

    res.json({ data: result.value || result })
  } catch (error) {
    res.status(500).json({ message: 'Unable to revert document to previous version.' })
  }
})

router.delete('/api/user/documents/:id', authenticate, async (req, res) => {
  const documentId = req.params.id

  try {
    const existingDoc = await findDocumentById(documentId)
    if (!existingDoc || existingDoc.deletedAt || String(existingDoc.ownerId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    const revisionEntry = createRevisionEntry(req.user, 'deleted', {
      title: existingDoc.title,
    })

    const result = await updateDocument(documentId, {
      deletedAt: new Date(),
      deletedBy: String(req.user._id),
      updatedAt: new Date(),
      revisionHistory: [
        ...(existingDoc.revisionHistory || []),
        revisionEntry,
      ],
    })

    if (isMongoConnected() && !result.value) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    res.json({ message: 'Document deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete document.' })
  }
})

router.delete('/api/user/folders/:id', authenticate, async (req, res) => {
  const folderId = req.params.id

  try {
    const existingFolder = await findFolderById(folderId)
    if (!existingFolder || existingFolder.deletedAt || String(existingFolder.ownerId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Folder not found.' })
    }

    const result = await deleteFolder(folderId, req.user._id)
    if (isMongoConnected() && !result.value) {
      return res.status(404).json({ message: 'Folder not found.' })
    }

    res.json({ message: 'Folder deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete folder.' })
  }
})

router.delete('/api/user/sets/:id', authenticate, async (req, res) => {
  const setId = req.params.id

  try {
    const existingSet = await findSetById(setId)
    if (!existingSet || existingSet.deletedAt || String(existingSet.ownerId) !== String(req.user._id)) {
      return res.status(404).json({ message: 'Set not found.' })
    }

    const result = await deleteSet(setId, req.user._id)
    if (isMongoConnected() && !result.value) {
      return res.status(404).json({ message: 'Set not found.' })
    }

    res.json({ message: 'Set deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete set.' })
  }
})

router.put('/api/user/documents/:id', authenticate, async (req, res) => {
  const documentId = req.params.id
  const { tags } = req.body

  if (!Array.isArray(tags)) {
    return res.status(400).json({ message: 'Document tags must be an array.' })
  }

  try {
    const existingDoc = await findDocumentById(documentId)
    if (!existingDoc || String(existingDoc.ownerId) !== String(req.user._id) || existingDoc.deletedAt) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    const sanitizedTags = tags.map(String)
    const revisionEntry = createRevisionEntry(req.user, 'updated-tags', { tags: sanitizedTags })
    const result = await updateDocument(documentId, {
      tags: sanitizedTags,
      updatedAt: new Date(),
      revisionHistory: [
        ...(existingDoc.revisionHistory || []),
        revisionEntry,
      ],
    })

    res.json({ data: result.value || result })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update document tags.' })
  }
})

router.put('/api/user/documents/:id/pin', authenticate, async (req, res) => {
  const documentId = req.params.id
  const { pinned } = req.body

  if (typeof pinned !== 'boolean') {
    return res.status(400).json({ message: 'Pinned must be true or false.' })
  }

  try {
    const existingDoc = await findDocumentById(documentId)
    if (!existingDoc || existingDoc.deletedAt) {
      return res.status(404).json({ message: 'Document not found.' })
    }
    if (!(await canPerformWriteAction(existingDoc, req.user))) {
      return res.status(403).json({ message: 'You do not have permission to pin this document.' })
    }

    const result = await updateDocument(documentId, {
      pinnedAt: pinned ? new Date() : null,
      updatedAt: new Date(),
    })

    res.json({ data: result.value || result })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update document pin state.' })
  }
})

router.put('/api/user/folders/:id/pin', authenticate, async (req, res) => {
  const folderId = req.params.id
  const { pinned } = req.body

  if (typeof pinned !== 'boolean') {
    return res.status(400).json({ message: 'Pinned must be true or false.' })
  }

  try {
    const existingFolder = await findFolderById(folderId)
    if (!existingFolder) {
      return res.status(404).json({ message: 'Folder not found.' })
    }
    if (!(await canPerformWriteAction(existingFolder, req.user))) {
      return res.status(403).json({ message: 'You do not have permission to pin this folder.' })
    }

    const result = await updateFolder(folderId, {
      pinnedAt: pinned ? new Date() : null,
      updatedAt: new Date(),
    })

    res.json({ data: result.value || result })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update folder pin state.' })
  }
})

router.post('/api/user/documents/:id/share', authenticate, async (req, res) => {
  const { targetEmail, targetUserId, role, targetOrgId } = req.body
  if (!targetEmail && !targetUserId && !targetOrgId) return res.status(400).json({ message: 'Target email, user ID or organization ID is required to share a document.' })
  if (!role || !validShareRoles.includes(role)) return res.status(400).json({ message: 'Role is required and must be admin, write, or read-only.' })

  const target = await resolveShareTarget({ targetEmail, targetUserId, targetOrgId })
  if (!target) return res.status(404).json({ message: 'Target not found.' })

  const itemId = req.params.id
  try {
    const item = await findDocumentById(itemId)
    if (!item) return res.status(404).json({ message: 'Document not found.' })
    if (String(item.ownerId || item.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Only the owner can share this document.' })

    if (target.type === 'user') {
      const userIdToShare = isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id)
      const userEmail = target.user.email || target.user.username || null
      const userName = target.user.name || target.user.username || target.user.email || null
      await shareDocumentWithUser(itemId, userIdToShare, role, userEmail, userName)
    } else if (target.type === 'org') {
      const orgName = target.organization.name || target.organization.title || null
      await shareDocumentWithOrg(itemId, target.organization._id, orgName, role)
    }

    res.json({ message: 'Document shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share document.' })
  }
})

router.delete('/api/user/documents/:id/share', authenticate, async (req, res) => {
  const { targetEmail, targetUserId, targetOrgId } = req.body
  if (!targetEmail && !targetUserId && !targetOrgId) return res.status(400).json({ message: 'Target email, user ID or organization ID is required to remove document sharing.' })

  const target = await resolveShareTarget({ targetEmail, targetUserId, targetOrgId })
  if (!target) return res.status(404).json({ message: 'Target not found.' })

  const itemId = req.params.id
  try {
    const item = await findDocumentById(itemId)
    if (!item) return res.status(404).json({ message: 'Document not found.' })
    if (!await canManageSharedAccess(item, req.user)) return res.status(403).json({ message: 'Not authorized to modify sharing for this document.' })

    if (target.type === 'user') {
      const userIdToRemove = isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id)
      await removeDocumentShare(itemId, userIdToRemove, null)
    } else if (target.type === 'org') {
      await removeDocumentShare(itemId, null, target.organization._id)
    }

    res.json({ message: 'Document sharing removed successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to remove document sharing.' })
  }
})

router.post('/api/user/folders/:id/share', authenticate, async (req, res) => {
  const { targetEmail, targetUserId, role, targetOrgId } = req.body
  if (!targetEmail && !targetUserId && !targetOrgId) return res.status(400).json({ message: 'Target email, user ID or organization ID is required to share a folder.' })
  if (!role || !validShareRoles.includes(role)) return res.status(400).json({ message: 'Role is required and must be admin, write, or read-only.' })

  const target = await resolveShareTarget({ targetEmail, targetUserId, targetOrgId })
  if (!target) return res.status(404).json({ message: 'Target not found.' })

  const itemId = req.params.id
  try {
    const item = await findFolderById(itemId)
    if (!item) return res.status(404).json({ message: 'Folder not found.' })
    if (String(item.ownerId || item.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Only the owner can share this folder.' })

    if (target.type === 'user') {
      const userIdToShare = isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id)
      const userEmail = target.user.email || target.user.username || null
      const userName = target.user.name || target.user.username || target.user.email || null
      await shareFolderWithUser(itemId, userIdToShare, role, userEmail, userName)
      if (item.setId) await shareSetWithUser(item.setId, userIdToShare, role, userEmail, userName)

      if (isMongoConnected() && collections.documents) {
        const folderDocs = await collections.documents.find({ folderId: new ObjectId(itemId) }).toArray()
        for (const doc of folderDocs) {
          const sharedWithEntries = normalizeSharedWithEntries(doc.sharedWith)
          const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'user' && String(entry.userId) === String(userIdToShare)))
          filtered.push({ userId: userIdToShare, role, email: userEmail, name: userName })
          await collections.documents.updateOne({ _id: doc._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        const targetIdString = String(target.user._id)
        fallbackDocs.forEach((doc) => {
          if (String(doc.folderId) === String(itemId)) {
            const sharedWithEntries = normalizeSharedWithEntries(doc.sharedWith)
            const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'user' && String(entry.userId) === targetIdString))
            filtered.push({ userId: targetIdString, role, email: target.user.email || target.user.username || null, name: target.user.name || target.user.username || target.user.email || null })
            doc.sharedWith = filtered
          }
        })
      }
    } else if (target.type === 'org') {
      const orgName = target.organization.name || target.organization.title || null
      await shareFolderWithOrg(itemId, target.organization._id, orgName, role)
      if (item.setId) await shareSetWithOrg(item.setId, target.organization._id, orgName, role)

      if (isMongoConnected() && collections.documents) {
        const folderDocs = await collections.documents.find({ folderId: new ObjectId(itemId) }).toArray()
        for (const doc of folderDocs) {
          const sharedWithEntries = normalizeSharedWithEntries(doc.sharedWith)
          const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === String(target.organization._id)))
          filtered.push({ orgId: target.organization._id, role, name: orgName })
          await collections.documents.updateOne({ _id: doc._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        const targetIdString = String(target.organization._id)
        fallbackDocs.forEach((doc) => {
          if (String(doc.folderId) === String(itemId)) {
            const sharedWithEntries = normalizeSharedWithEntries(doc.sharedWith)
            const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === targetIdString))
            filtered.push({ orgId: targetIdString, role, name: target.organization.name || target.organization.title || null })
            doc.sharedWith = filtered
          }
        })
      }
    }

    res.json({ message: 'Folder shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share folder.' })
  }
})

router.delete('/api/user/folders/:id/share', authenticate, async (req, res) => {
  const { targetEmail, targetUserId, targetOrgId } = req.body
  if (!targetEmail && !targetUserId && !targetOrgId) return res.status(400).json({ message: 'Target email, user ID or organization ID is required to remove folder sharing.' })

  const target = await resolveShareTarget({ targetEmail, targetUserId, targetOrgId })
  if (!target) return res.status(404).json({ message: 'Target not found.' })

  const itemId = req.params.id
  try {
    const item = await findFolderById(itemId)
    if (!item) return res.status(404).json({ message: 'Folder not found.' })
    if (!await canManageSharedAccess(item, req.user)) return res.status(403).json({ message: 'Not authorized to modify sharing for this folder.' })

    if (target.type === 'user') {
      const userIdToRemove = isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id)
      await removeFolderShare(itemId, userIdToRemove, null)
      if (isMongoConnected() && collections.documents) {
        const folderDocs = await collections.documents.find({ folderId: new ObjectId(itemId) }).toArray()
        for (const doc of folderDocs) {
          const filtered = removeSharedWithEntries(doc.sharedWith, userIdToRemove, null)
          await collections.documents.updateOne({ _id: doc._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        fallbackDocs.forEach((doc) => {
          if (String(doc.folderId) === String(itemId)) {
            doc.sharedWith = removeSharedWithEntries(doc.sharedWith, target.user._id, null)
          }
        })
      }
    } else if (target.type === 'org') {
      await removeFolderShare(itemId, null, target.organization._id)
      if (isMongoConnected() && collections.documents) {
        const folderDocs = await collections.documents.find({ folderId: new ObjectId(itemId) }).toArray()
        for (const doc of folderDocs) {
          const filtered = removeSharedWithEntries(doc.sharedWith, null, target.organization._id)
          await collections.documents.updateOne({ _id: doc._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        fallbackDocs.forEach((doc) => {
          if (String(doc.folderId) === String(itemId)) {
            doc.sharedWith = removeSharedWithEntries(doc.sharedWith, null, target.organization._id)
          }
        })
      }
    }

    res.json({ message: 'Folder sharing removed successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to remove folder sharing.' })
  }
})

router.post('/api/user/sets/:id/share', authenticate, async (req, res) => {
  const { targetEmail, targetUserId, role, targetOrgId } = req.body
  if (!targetEmail && !targetUserId && !targetOrgId) return res.status(400).json({ message: 'Target email, user ID or organization ID is required to share a set.' })
  if (!role || !validShareRoles.includes(role)) return res.status(400).json({ message: 'Role is required and must be admin, write, or read-only.' })

  const target = await resolveShareTarget({ targetEmail, targetUserId, targetOrgId })
  if (!target) return res.status(404).json({ message: 'Target not found.' })

  const itemId = req.params.id
  try {
    const item = await findSetById(itemId)
    if (!item) return res.status(404).json({ message: 'Set not found.' })
    if (String(item.ownerId || item.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Only the owner can share this set.' })

    if (target.type === 'user') {
      const userIdToShare = isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id)
      const userEmail = target.user.email || target.user.username || null
      const userName = target.user.name || target.user.username || target.user.email || null
      await shareSetWithUser(itemId, userIdToShare, role, userEmail, userName)

      if (isMongoConnected() && collections.folders) {
        const folderDocs = await collections.folders.find({ setId: new ObjectId(itemId) }).toArray()
        for (const folder of folderDocs) {
          const sharedWithEntries = normalizeSharedWithEntries(folder.sharedWith)
          const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'user' && String(entry.userId) === String(userIdToShare)))
          filtered.push({ userId: userIdToShare, role, email: userEmail, name: userName })
          await collections.folders.updateOne({ _id: folder._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        const targetIdString = String(target.user._id)
        fallbackFolders.forEach((folder) => {
          if (String(folder.setId) === String(itemId)) {
            const sharedWithEntries = normalizeSharedWithEntries(folder.sharedWith)
            const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'user' && String(entry.userId) === targetIdString))
            filtered.push({ userId: targetIdString, role, email: target.user.email || target.user.username || null, name: target.user.name || target.user.username || target.user.email || null })
            folder.sharedWith = filtered
          }
        })
      }
    } else if (target.type === 'org') {
      const orgName = target.organization.name || target.organization.title || null
      await shareSetWithOrg(itemId, target.organization._id, orgName, role)

      if (isMongoConnected() && collections.folders) {
        const folderDocs = await collections.folders.find({ setId: new ObjectId(itemId) }).toArray()
        for (const folder of folderDocs) {
          const sharedWithEntries = normalizeSharedWithEntries(folder.sharedWith)
          const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === String(target.organization._id)))
          filtered.push({ orgId: target.organization._id, role, name: orgName })
          await collections.folders.updateOne({ _id: folder._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        const targetIdString = String(target.organization._id)
        fallbackFolders.forEach((folder) => {
          if (String(folder.setId) === String(itemId)) {
            const sharedWithEntries = normalizeSharedWithEntries(folder.sharedWith)
            const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === targetIdString))
            filtered.push({ orgId: targetIdString, role, name: target.organization.name || target.organization.title || null })
            folder.sharedWith = filtered
          }
        })
      }
    }

    // propagate to documents in set
    if (isMongoConnected() && collections.documents) {
      const docs = await collections.documents.find({ setId: new ObjectId(itemId) }).toArray()
      for (const doc of docs) {
        const sharedWithEntries = normalizeSharedWithEntries(doc.sharedWith)
        if (target.type === 'user') {
          const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'user' && String(entry.userId) === String(target.user._id)))
          filtered.push({ userId: isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id), role })
          await collections.documents.updateOne({ _id: doc._id }, { $set: { sharedWith: filtered } })
        } else if (target.type === 'org') {
          const filtered = sharedWithEntries.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === String(target.organization._id)))
          filtered.push({ orgId: isMongoConnected() ? new ObjectId(target.organization._id) : String(target.organization._id), role, name: target.organization.name || target.organization.title || null })
          await collections.documents.updateOne({ _id: doc._id }, { $set: { sharedWith: filtered } })
        }
      }
    } else {
      const targetIdString = target.type === 'user' ? String(target.user._id) : String(target.organization._id)
      fallbackDocs.forEach((doc) => {
        if (String(doc.setId) === String(itemId)) {
          const sharedWithEntries = normalizeSharedWithEntries(doc.sharedWith)
          const filtered = sharedWithEntries.filter((entry) => {
            if (target.type === 'user') return !(entry.type === 'user' && String(entry.userId) === targetIdString)
            return !(entry.type === 'org' && String(entry.orgId) === targetIdString)
          })
          if (target.type === 'user') filtered.push({ userId: targetIdString, role, email: target.user.email || target.user.username || null, name: target.user.name || target.user.username || target.user.email || null })
          else filtered.push({ orgId: targetIdString, role, name: target.organization.name || target.organization.title || null })
          doc.sharedWith = filtered
        }
      })
    }

    res.json({ message: 'Set shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share set.' })
  }
})

router.delete('/api/user/sets/:id/share', authenticate, async (req, res) => {
  const { targetEmail, targetUserId, targetOrgId } = req.body
  if (!targetEmail && !targetUserId && !targetOrgId) return res.status(400).json({ message: 'Target email, user ID or organization ID is required to remove set sharing.' })

  const target = await resolveShareTarget({ targetEmail, targetUserId, targetOrgId })
  if (!target) return res.status(404).json({ message: 'Target not found.' })

  const itemId = req.params.id
  try {
    const item = await findSetById(itemId)
    if (!item) return res.status(404).json({ message: 'Set not found.' })
    if (!await canManageSharedAccess(item, req.user)) return res.status(403).json({ message: 'Not authorized to modify sharing for this set.' })

    if (target.type === 'user') {
      const userIdToRemove = isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id)
      await removeSetShare(itemId, userIdToRemove, null)
      if (isMongoConnected() && collections.folders) {
        const folders = await collections.folders.find({ setId: new ObjectId(itemId) }).toArray()
        for (const folder of folders) {
          const filtered = removeSharedWithEntries(folder.sharedWith, userIdToRemove, null)
          await collections.folders.updateOne({ _id: folder._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        fallbackFolders.forEach((folder) => {
          if (String(folder.setId) === String(itemId)) {
            folder.sharedWith = removeSharedWithEntries(folder.sharedWith, target.user._id, null)
          }
        })
      }
    } else if (target.type === 'org') {
      await removeSetShare(itemId, null, target.organization._id)
      if (isMongoConnected() && collections.folders) {
        const folders = await collections.folders.find({ setId: new ObjectId(itemId) }).toArray()
        for (const folder of folders) {
          const filtered = removeSharedWithEntries(folder.sharedWith, null, target.organization._id)
          await collections.folders.updateOne({ _id: folder._id }, { $set: { sharedWith: filtered } })
        }
      } else {
        fallbackFolders.forEach((folder) => {
          if (String(folder.setId) === String(itemId)) {
            folder.sharedWith = removeSharedWithEntries(folder.sharedWith, null, target.organization._id)
          }
        })
      }
    }

    if (isMongoConnected() && collections.documents) {
      const docs = await collections.documents.find({ setId: new ObjectId(itemId) }).toArray()
      for (const doc of docs) {
        const filtered = removeSharedWithEntries(doc.sharedWith, target.type === 'user' ? (isMongoConnected() ? new ObjectId(target.user._id) : String(target.user._id)) : null, target.type === 'org' ? target.organization._id : null)
        await collections.documents.updateOne({ _id: doc._id }, { $set: { sharedWith: filtered } })
      }
    } else {
      const targetIdString = target.type === 'user' ? String(target.user._id) : String(target.organization._id)
      fallbackDocs.forEach((doc) => {
        if (String(doc.setId) === String(itemId)) {
          doc.sharedWith = removeSharedWithEntries(doc.sharedWith, target.type === 'user' ? target.user._id : null, target.type === 'org' ? target.organization._id : null)
        }
      })
    }

    res.json({ message: 'Set sharing removed successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to remove set sharing.' })
  }
})

router.get('/api/user/account/:id', authenticate, async (req, res) => {
  const userId = req.params.id
  try {
    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    res.json({ username: user.username || null, email: user.email || null })
  } catch (error) {
    res.status(500).json({ message: 'Unable to get user.' })
  }
})

module.exports = router
