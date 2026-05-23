const express = require('express')
const upload = require('../modules/multermodule')
const { authenticate } = require('../utils/auth')
const { encryptFile, decryptFile } = require('../utils/encryption')
const { isMongoConnected, ObjectId, collections, fallbackDocs, fallbackFolders } = require('../config/mongo')
const { findUserByUsernameOrEmail } = require('../services/userService')
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
  findDocumentById,
  findFolderById,
  findSetById,
  findTagsForUser,
  insertTag,
  updateTag,
  deleteTag,
  findUserDocumentTags,
  upsertUserDocumentTags,
  shareDocumentWithUser,
  shareFolderWithUser,
  shareSetWithUser,
} = require('../services/dataService')

const router = express.Router()

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
      if (folder) {
        sharedWith = getSharedWithList(folder)
        parentOwnerId = String(folder.ownerId || folder.userId || '')
      }
    } else if (setId) {
      const set = await findSetById(setId)
      if (set) {
        sharedWith = getSharedWithList(set)
        parentOwnerId = String(set.ownerId || set.userId || '')
      }
    }

    if (parentOwnerId && parentOwnerId !== String(req.user._id) && !sharedWith.includes(parentOwnerId)) {
      sharedWith.push(parentOwnerId)
    }

    const document = {
      userId: req.user._id,
      ownerId: req.user._id,
      sharedWith: sharedWith.map((id) => (isMongoConnected() ? new ObjectId(id) : id)),
      title,
      folderId: folderId || null,
      setId: setId || null,
      tags: [],
      file: fileData,
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
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '\"')}"`)
    res.send(fileData)
  } catch (error) {
    res.status(500).json({ message: 'Unable to download document.' })
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
    if (!existingDoc || String(existingDoc.ownerId) !== String(req.user._id)) {
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

router.get('/api/user/tags', authenticate, async (req, res) => {
  try {
    const tags = await findTagsForUser(req.user._id)
    res.json({ data: tags })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load tags.' })
  }
})

router.post('/api/user/tags', authenticate, async (req, res) => {
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

router.put('/api/user/tags/:id', authenticate, async (req, res) => {
  const { name, color } = req.body
  const tagId = req.params.id

  if (!name || !color) {
    return res.status(400).json({ message: 'Tag name and color are required.' })
  }

  try {
    const ownedTag = isMongoConnected() && collections.tags
      ? await collections.tags.findOne({ _id: new ObjectId(tagId), ownerId: new ObjectId(req.user._id) })
      : (await findTagsForUser(req.user._id)).find((tag) => String(tag._id) === String(tagId))

    if (!ownedTag) {
      return res.status(404).json({ message: 'Tag not found.' })
    }

    const result = await updateTag(tagId, {
      name: name.trim(),
      color,
      updatedAt: new Date(),
    })

    if (!result.value) {
      return res.status(404).json({ message: 'Tag not found.' })
    }

    res.json({ data: result.value })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update tag.' })
  }
})

router.delete('/api/user/tags/:id', authenticate, async (req, res) => {
  const tagId = req.params.id

  try {
    const ownedTag = isMongoConnected() && collections.tags
      ? await collections.tags.findOne({ _id: new ObjectId(tagId), ownerId: new ObjectId(req.user._id) })
      : (await findTagsForUser(req.user._id)).find((tag) => String(tag._id) === String(tagId))

    if (!ownedTag) {
      return res.status(404).json({ message: 'Tag not found.' })
    }

    const result = await deleteTag(tagId)
    if (isMongoConnected() && result.deletedCount === 0) {
      return res.status(404).json({ message: 'Tag not found.' })
    }

    res.json({ message: 'Tag deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete tag.' })
  }
})

router.get('/api/user/documents/:id/my-tags', authenticate, async (req, res) => {
  const documentId = req.params.id
  try {
    const userTags = await findUserDocumentTags(req.user._id, documentId)
    res.json({ data: userTags?.tags || [] })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load document tags.' })
  }
})

router.put('/api/user/documents/:id/my-tags', authenticate, async (req, res) => {
  const documentId = req.params.id
  const { tags } = req.body

  if (!Array.isArray(tags)) {
    return res.status(400).json({ message: 'Tags must be an array.' })
  }

  try {
    const doc = await findDocumentById(documentId)
    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    const sanitizedTags = tags.map(String)
    await upsertUserDocumentTags(req.user._id, documentId, sanitizedTags)
    res.json({ data: { tags: sanitizedTags } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to update document tags.' })
  }
})

router.post('/api/user/documents/:id/share', authenticate, async (req, res) => {
  const { targetEmail } = req.body
  if (!targetEmail) {
    return res.status(400).json({ message: 'Target email is required to share a document.' })
  }

  const userToShare = await findUserByUsernameOrEmail(targetEmail)
  if (!userToShare) {
    return res.status(404).json({ message: 'Target user not found.' })
  }

  const itemId = req.params.id
  const userIdToShare = isMongoConnected() ? new ObjectId(userToShare._id) : String(userToShare._id)

  try {
    const item = await findDocumentById(itemId)
    if (!item) {
      return res.status(404).json({ message: 'Document not found.' })
    }

    if (String(item.ownerId || item.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can share this document.' })
    }

    await shareDocumentWithUser(itemId, userIdToShare)
    res.json({ message: 'Document shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share document.' })
  }
})

router.post('/api/user/folders/:id/share', authenticate, async (req, res) => {
  const { targetEmail } = req.body
  if (!targetEmail) {
    return res.status(400).json({ message: 'Target email is required to share a folder.' })
  }

  const userToShare = await findUserByUsernameOrEmail(targetEmail)
  if (!userToShare) {
    return res.status(404).json({ message: 'Target user not found.' })
  }

  const itemId = req.params.id
  const userIdToShare = isMongoConnected() ? new ObjectId(userToShare._id) : String(userToShare._id)

  try {
    const item = await findFolderById(itemId)
    if (!item) {
      return res.status(404).json({ message: 'Folder not found.' })
    }

    if (String(item.ownerId || item.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can share this folder.' })
    }

    await shareFolderWithUser(itemId, userIdToShare)

    if (item.setId) {
      await shareSetWithUser(item.setId, userIdToShare)
    }

    if (isMongoConnected() && collections.documents) {
      await collections.documents.updateMany(
        { folderId: new ObjectId(itemId) },
        { $addToSet: { sharedWith: new ObjectId(userToShare._id) } },
      )
    } else {
      const shareWithString = String(userToShare._id)
      fallbackDocs.forEach((doc) => {
        if (String(doc.folderId) === String(itemId)) {
          doc.sharedWith = doc.sharedWith || []
          if (!doc.sharedWith.includes(shareWithString)) {
            doc.sharedWith.push(shareWithString)
          }
        }
      })
    }

    res.json({ message: 'Folder shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share folder.' })
  }
})

router.post('/api/user/sets/:id/share', authenticate, async (req, res) => {
  const { targetEmail } = req.body
  if (!targetEmail) {
    return res.status(400).json({ message: 'Target email is required to share a set.' })
  }

  const userToShare = await findUserByUsernameOrEmail(targetEmail)
  if (!userToShare) {
    return res.status(404).json({ message: 'Target user not found.' })
  }

  const itemId = req.params.id
  const userIdToShare = isMongoConnected() ? new ObjectId(userToShare._id) : String(userToShare._id)

  try {
    const item = await findSetById(itemId)
    if (!item) {
      return res.status(404).json({ message: 'Set not found.' })
    }

    if (String(item.ownerId || item.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can share this set.' })
    }

    await shareSetWithUser(itemId, userIdToShare)

    if (isMongoConnected() && collections.folders) {
      await collections.folders.updateMany(
        { setId: new ObjectId(itemId) },
        { $addToSet: { sharedWith: new ObjectId(userToShare._id) } },
      )
    } else {
      const shareWithString = String(userToShare._id)
      fallbackFolders.forEach((folder) => {
        if (String(folder.setId) === String(itemId)) {
          folder.sharedWith = folder.sharedWith || []
          if (!folder.sharedWith.includes(shareWithString)) {
            folder.sharedWith.push(shareWithString)
          }
        }
      })
    }

    if (isMongoConnected() && collections.documents) {
      await collections.documents.updateMany(
        { setId: new ObjectId(itemId) },
        { $addToSet: { sharedWith: new ObjectId(userToShare._id) } },
      )
    } else {
      const shareWithString = String(userToShare._id)
      fallbackDocs.forEach((doc) => {
        if (String(doc.setId) === String(itemId)) {
          doc.sharedWith = doc.sharedWith || []
          if (!doc.sharedWith.includes(shareWithString)) {
            doc.sharedWith.push(shareWithString)
          }
        }
      })
    }

    res.json({ message: 'Set shared successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to share set.' })
  }
})

module.exports = router
