const express = require('express')
const { authenticate } = require('../../utils/auth')
const { isMongoConnected, ObjectId, collections } = require('../../config/mongo')
const {
  findTagsForUser,
  insertTag,
  updateTag,
  deleteTag,
  findUserDocumentTags,
  upsertUserDocumentTags,
  findDocumentById,
} = require('../../services/dataService')

const router = express.Router()

const findOwnedTag = async (tagId, userId) => {
  if (isMongoConnected() && collections.tags) {
    return collections.tags.findOne({ _id: new ObjectId(tagId), ownerId: new ObjectId(userId) })
  }
  const tags = await findTagsForUser(userId)
  return tags.find((tag) => String(tag._id) === String(tagId))
}

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
    const ownedTag = await findOwnedTag(tagId, req.user._id)
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
    const ownedTag = await findOwnedTag(tagId, req.user._id)
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

module.exports = router
