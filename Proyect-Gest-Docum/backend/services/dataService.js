const { ObjectId, isMongoConnected, collections, fallbackDocs, fallbackFolders, fallbackSets, fallbackTags, fallbackUserDocumentTags } = require('../config/mongo')

const getSharedWithList = (item) => {
  if (!item) return []
  if (Array.isArray(item.sharedWith)) {
    return item.sharedWith.map((id) => String(id))
  }
  return []
}

const findAccessibleDocumentsForUser = async (userId) => {
  if (isMongoConnected() && collections.documents) {
    return collections.documents
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
  if (isMongoConnected() && collections.folders) {
    return collections.folders
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
  if (isMongoConnected() && collections.sets) {
    return collections.sets
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

const findDocumentById = async (documentId) => {
  if (isMongoConnected() && collections.documents) {
    return collections.documents.findOne({ _id: new ObjectId(documentId) })
  }

  return fallbackDocs.find((doc) => String(doc._id) === String(documentId))
}

const findDocumentForUser = async (documentId, userId) => {
  if (isMongoConnected() && collections.documents) {
    return collections.documents.findOne({
      _id: new ObjectId(documentId),
      $or: [
        { ownerId: new ObjectId(userId) },
        { sharedWith: new ObjectId(userId) },
        { userId: new ObjectId(userId) },
      ],
    })
  }

  return fallbackDocs.find(
    (doc) =>
      String(doc._id) === String(documentId) &&
      (String(doc.ownerId) === String(userId) ||
        String(doc.userId) === String(userId) ||
        (doc.sharedWith || []).includes(String(userId))),
  )
}

const findFolderById = async (folderId) => {
  if (isMongoConnected() && collections.folders) {
    return collections.folders.findOne({ _id: new ObjectId(folderId) })
  }

  return fallbackFolders.find((folder) => String(folder._id) === String(folderId))
}

const findSetById = async (setId) => {
  if (isMongoConnected() && collections.sets) {
    return collections.sets.findOne({ _id: new ObjectId(setId) })
  }

  return fallbackSets.find((setItem) => String(setItem._id) === String(setId))
}

const insertDocument = async (document) => {
  if (isMongoConnected() && collections.documents) {
    return collections.documents.insertOne(document)
  }

  const fallbackDoc = { ...document, _id: new ObjectId() }
  fallbackDocs.push(fallbackDoc)
  return { insertedId: fallbackDoc._id }
}

const updateDocument = async (documentId, updateFields) => {
  if (isMongoConnected() && collections.documents) {
    return collections.documents.findOneAndUpdate(
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
  if (isMongoConnected() && collections.folders) {
    return collections.folders.insertOne(folder)
  }

  const fallbackFolder = { ...folder, _id: new ObjectId() }
  fallbackFolders.push(fallbackFolder)
  return { insertedId: fallbackFolder._id }
}

const insertSet = async (setItem) => {
  if (isMongoConnected() && collections.sets) {
    return collections.sets.insertOne(setItem)
  }

  const fallbackSet = { ...setItem, _id: new ObjectId() }
  fallbackSets.push(fallbackSet)
  return { insertedId: fallbackSet._id }
}

const findTagsForUser = async (userId) => {
  if (isMongoConnected() && collections.tags) {
    return collections.tags.find({ ownerId: new ObjectId(userId) }).toArray()
  }

  return fallbackTags.filter((tag) => String(tag.ownerId) === String(userId))
}

const insertTag = async (tag) => {
  if (isMongoConnected() && collections.tags) {
    return collections.tags.insertOne(tag)
  }

  const fallbackTag = { ...tag, _id: new ObjectId() }
  fallbackTags.push(fallbackTag)
  return { insertedId: fallbackTag._id }
}

const updateTag = async (tagId, updateFields) => {
  if (isMongoConnected() && collections.tags) {
    return collections.tags.findOneAndUpdate(
      { _id: new ObjectId(tagId) },
      { $set: updateFields },
      { returnDocument: 'after' },
    )
  }

  const fallbackIndex = fallbackTags.findIndex((tag) => String(tag._id) === String(tagId))
  if (fallbackIndex === -1) {
    return { value: null }
  }

  fallbackTags[fallbackIndex] = { ...fallbackTags[fallbackIndex], ...updateFields }
  return { value: fallbackTags[fallbackIndex] }
}

const deleteTag = async (tagId) => {
  if (isMongoConnected() && collections.tags) {
    return collections.tags.deleteOne({ _id: new ObjectId(tagId) })
  }

  const fallbackIndex = fallbackTags.findIndex((tag) => String(tag._id) === String(tagId))
  if (fallbackIndex === -1) {
    return { deletedCount: 0 }
  }

  fallbackTags.splice(fallbackIndex, 1)
  return { deletedCount: 1 }
}

const findUserDocumentTags = async (userId, documentId) => {
  if (isMongoConnected() && collections.userDocumentTags) {
    return collections.userDocumentTags.findOne({
      userId: new ObjectId(userId),
      documentId: new ObjectId(documentId),
    })
  }

  return fallbackUserDocumentTags.find(
    (udt) => String(udt.userId) === String(userId) && String(udt.documentId) === String(documentId),
  )
}

const upsertUserDocumentTags = async (userId, documentId, tags) => {
  if (isMongoConnected() && collections.userDocumentTags) {
    return collections.userDocumentTags.findOneAndUpdate(
      { userId: new ObjectId(userId), documentId: new ObjectId(documentId) },
      {
        $set: {
          userId: new ObjectId(userId),
          documentId: new ObjectId(documentId),
          tags: tags.map((t) => (typeof t === 'string' ? t : String(t))),
          updatedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
  }

  const existing = fallbackUserDocumentTags.find(
    (udt) => String(udt.userId) === String(userId) && String(udt.documentId) === String(documentId),
  )

  const record = {
    userId: String(userId),
    documentId: String(documentId),
    tags: tags.map((t) => (typeof t === 'string' ? t : String(t))),
    updatedAt: new Date(),
  }

  if (existing) {
    Object.assign(existing, record)
  } else {
    fallbackUserDocumentTags.push(record)
  }

  return { value: record }
}

const shareDocumentWithUser = async (docId, userId) => {
  if (isMongoConnected() && collections.documents) {
    return collections.documents.updateOne(
      { _id: new ObjectId(docId) },
      { $addToSet: { sharedWith: new ObjectId(userId) } },
    )
  }

  const fallbackIndex = fallbackDocs.findIndex((doc) => String(doc._id) === String(docId))
  if (fallbackIndex >= 0) {
    fallbackDocs[fallbackIndex].sharedWith = fallbackDocs[fallbackIndex].sharedWith || []
    if (!fallbackDocs[fallbackIndex].sharedWith.includes(String(userId))) {
      fallbackDocs[fallbackIndex].sharedWith.push(String(userId))
    }
  }
}

const shareFolderWithUser = async (folderId, userId) => {
  if (isMongoConnected() && collections.folders) {
    return collections.folders.updateOne(
      { _id: new ObjectId(folderId) },
      { $addToSet: { sharedWith: new ObjectId(userId) } },
    )
  }

  const fallbackIndex = fallbackFolders.findIndex((folder) => String(folder._id) === String(folderId))
  if (fallbackIndex >= 0) {
    fallbackFolders[fallbackIndex].sharedWith = fallbackFolders[fallbackIndex].sharedWith || []
    if (!fallbackFolders[fallbackIndex].sharedWith.includes(String(userId))) {
      fallbackFolders[fallbackIndex].sharedWith.push(String(userId))
    }
  }
}

const shareSetWithUser = async (setId, userId) => {
  if (isMongoConnected() && collections.sets) {
    return collections.sets.updateOne(
      { _id: new ObjectId(setId) },
      { $addToSet: { sharedWith: new ObjectId(userId) } },
    )
  }

  const fallbackIndex = fallbackSets.findIndex((setItem) => String(setItem._id) === String(setId))
  if (fallbackIndex >= 0) {
    fallbackSets[fallbackIndex].sharedWith = fallbackSets[fallbackIndex].sharedWith || []
    if (!fallbackSets[fallbackIndex].sharedWith.includes(String(userId))) {
      fallbackSets[fallbackIndex].sharedWith.push(String(userId))
    }
  }
}

module.exports = {
  getSharedWithList,
  findAccessibleDocumentsForUser,
  findAccessibleFoldersForUser,
  findAccessibleSetsForUser,
  findDocumentById,
  findDocumentForUser,
  findFolderById,
  findSetById,
  insertDocument,
  updateDocument,
  insertFolder,
  insertSet,
  findTagsForUser,
  insertTag,
  updateTag,
  deleteTag,
  findUserDocumentTags,
  upsertUserDocumentTags,
  shareDocumentWithUser,
  shareFolderWithUser,
  shareSetWithUser,
}
