const { ObjectId, isMongoConnected, collections, fallbackDocs, fallbackFolders, fallbackSets, fallbackTags, fallbackUserDocumentTags } = require('../config/mongo')
const { findOrganizationById, getOrganizationMembersExpanded } = require('./orgService')

const normalizeSharedWithEntries = (sharedWith) => {
  if (!Array.isArray(sharedWith)) {
    return []
  }

  return sharedWith
    .map((entry) => {
      if (!entry) return null
      // plain string -> user id
      if (typeof entry === 'string' || typeof entry === 'number') {
        return { type: 'user', userId: String(entry), role: 'read-only' }
      }
      // explicit user entry
      if (entry.userId || entry.user) {
        const userId = String(entry.userId || entry.user || entry.id || '')
        if (!userId) return null
        return { type: 'user', userId, role: entry.role || 'read-only' }
      }
      // explicit org entry
      if (entry.orgId || entry.organization || entry.org) {
        const orgId = String(entry.orgId || (entry.organization && entry.organization._id) || entry.org || entry.id || '')
        if (!orgId) return null
        return { type: 'org', orgId, role: entry.role || null }
      }
      return null
    })
    .filter(Boolean)
}

const getSharedWithList = async (item) => {
  if (!item || !Array.isArray(item.sharedWith)) return []
  const entries = normalizeSharedWithEntries(item.sharedWith)
  const result = new Set()
  for (const e of entries) {
    if (e.type === 'user') result.add(String(e.userId))
    else if (e.type === 'org') {
      // expand org members to user ids
      const org = await findOrganizationById(e.orgId)
      const members = await getOrganizationMembersExpanded(org)
      for (const m of members) {
        if (m.type === 'user' && m.user && (m.user._id || m.user.id)) {
          result.add(String(m.user._id || m.user.id))
        }
        // nested orgs will be represented as org entries; their members expansion handled by getOrganizationMembersExpanded
      }
    }
  }
  return Array.from(result)
}

const sharedWithContainsUser = async (sharedWith, userId) => {
  const entries = normalizeSharedWithEntries(sharedWith)
  for (const entry of entries) {
    if (entry.type === 'user' && String(entry.userId) === String(userId)) return true
    if (entry.type === 'org') {
      const org = await findOrganizationById(entry.orgId)
      const members = await getOrganizationMembersExpanded(org)
      if (members.some((m) => m.type === 'user' && String((m.user && (m.user._id || m.user.id)) || '') === String(userId))) return true
    }
  }
  return false
}

const findAccessibleDocumentsForUser = async (userId) => {
  if (isMongoConnected() && collections.documents) {
    // also include org-based shares by finding organizations where the user is a member
    const orgIds = []
    if (collections.organizations) {
      const orgDocs = await collections.organizations
        .find({ $or: [ { ownerId: new ObjectId(userId) }, { 'members.type': 'user', 'members.id': new ObjectId(userId) } ] })
        .project({ _id: 1 })
        .toArray()
      orgDocs.forEach((o) => orgIds.push(o._id))
    }

    const orClauses = [
      { ownerId: new ObjectId(userId) },
      { userId: new ObjectId(userId) },
      { sharedWith: new ObjectId(userId) },
      { 'sharedWith.userId': new ObjectId(userId) },
    ]
    if (orgIds.length > 0) {
      orClauses.push({ 'sharedWith.orgId': { $in: orgIds } })
    }

    return collections.documents.find({
      $and: [
        { deletedAt: { $exists: false } },
        { $or: orClauses },
      ],
    }).toArray()
  }

  // fallback: check direct or org-based membership
  return Promise.all(fallbackDocs.map(async (doc) => ({ doc, ok: await sharedWithContainsUser(doc.sharedWith, userId) })))
    .then((arr) => arr
      .filter((r) => !r.doc.deletedAt && (String(r.doc.ownerId) === String(userId) || String(r.doc.userId) === String(userId) || r.ok))
      .map((r) => r.doc),
    )
}

const findAccessibleFoldersForUser = async (userId) => {
  if (isMongoConnected() && collections.folders) {
    const orgIds = []
    if (collections.organizations) {
      const orgDocs = await collections.organizations
        .find({ $or: [ { ownerId: new ObjectId(userId) }, { 'members.type': 'user', 'members.id': new ObjectId(userId) } ] })
        .project({ _id: 1 })
        .toArray()
      orgDocs.forEach((o) => orgIds.push(o._id))
    }

    const orClauses = [ { ownerId: new ObjectId(userId) }, { sharedWith: new ObjectId(userId) }, { 'sharedWith.userId': new ObjectId(userId) } ]
    if (orgIds.length > 0) orClauses.push({ 'sharedWith.orgId': { $in: orgIds } })
    return collections.folders.find({ deletedAt: { $exists: false }, $or: orClauses }).toArray()
  }

  return Promise.all(fallbackFolders.map(async (folder) => ({ folder, ok: await sharedWithContainsUser(folder.sharedWith, userId) })))
    .then((arr) => arr.filter((r) => !r.folder.deletedAt && (String(r.folder.ownerId) === String(userId) || r.ok)).map((r) => r.folder))
}

const findAccessibleSetsForUser = async (userId) => {
  if (isMongoConnected() && collections.sets) {
    const orgIds = []
    if (collections.organizations) {
      const orgDocs = await collections.organizations
        .find({ $or: [ { ownerId: new ObjectId(userId) }, { 'members.type': 'user', 'members.id': new ObjectId(userId) } ] })
        .project({ _id: 1 })
        .toArray()
      orgDocs.forEach((o) => orgIds.push(o._id))
    }

    const orClauses = [ { ownerId: new ObjectId(userId) }, { sharedWith: new ObjectId(userId) }, { 'sharedWith.userId': new ObjectId(userId) } ]
    if (orgIds.length > 0) orClauses.push({ 'sharedWith.orgId': { $in: orgIds } })
    return collections.sets.find({ deletedAt: { $exists: false }, $or: orClauses }).toArray()
  }

  return Promise.all(fallbackSets.map(async (setItem) => ({ setItem, ok: await sharedWithContainsUser(setItem.sharedWith, userId) })))
    .then((arr) => arr.filter((r) => !r.setItem.deletedAt && (String(r.setItem.ownerId) === String(userId) || r.ok)).map((r) => r.setItem))
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
      deletedAt: { $exists: false },
      $or: [
        { ownerId: new ObjectId(userId) },
        { userId: new ObjectId(userId) },
        { sharedWith: new ObjectId(userId) },
        { 'sharedWith.userId': new ObjectId(userId) },
      ],
    })
  }

  const candidate = await Promise.all(
    fallbackDocs.map(async (doc) => ({
      doc,
      ok: !doc.deletedAt && String(doc._id) === String(documentId) &&
        (String(doc.ownerId) === String(userId) ||
          String(doc.userId) === String(userId) ||
          await sharedWithContainsUser(doc.sharedWith, userId)),
    })),
  )
  const matched = candidate.find((result) => result.ok && String(result.doc._id) === String(documentId))
  return matched ? matched.doc : null
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

const updateFolder = async (folderId, updateFields) => {
  if (isMongoConnected() && collections.folders) {
    return collections.folders.findOneAndUpdate(
      { _id: new ObjectId(folderId) },
      { $set: updateFields },
      { returnDocument: 'after' },
    )
  }

  const fallbackIndex = fallbackFolders.findIndex((folder) => String(folder._id) === String(folderId))
  if (fallbackIndex === -1) {
    return { value: null }
  }

  fallbackFolders[fallbackIndex] = { ...fallbackFolders[fallbackIndex], ...updateFields }
  return { value: fallbackFolders[fallbackIndex] }
}

const deleteFolder = async (folderId, deletedBy = null) => {
  const deleteFields = {
    deletedAt: new Date(),
    deletedBy: deletedBy ? String(deletedBy) : null,
    updatedAt: new Date(),
  }

  if (isMongoConnected() && collections.folders && collections.documents) {
    const folderObjectId = new ObjectId(folderId)
    const existingFolder = await collections.folders.findOne({ _id: folderObjectId })
    if (!existingFolder) {
      return { value: null }
    }

    await collections.documents.updateMany(
      { folderId: folderObjectId },
      { $set: deleteFields },
    )

    return collections.folders.findOneAndUpdate(
      { _id: folderObjectId },
      { $set: deleteFields },
      { returnDocument: 'after' },
    )
  }

  const fallbackIndex = fallbackFolders.findIndex((folder) => String(folder._id) === String(folderId))
  if (fallbackIndex === -1) {
    return { value: null }
  }

  fallbackFolders[fallbackIndex] = { ...fallbackFolders[fallbackIndex], ...deleteFields }
  fallbackDocs.forEach((doc) => {
    if (String(doc.folderId) === String(folderId)) {
      Object.assign(doc, deleteFields)
    }
  })
  return { value: fallbackFolders[fallbackIndex] }
}

const deleteSet = async (setId, deletedBy = null) => {
  const deleteFields = {
    deletedAt: new Date(),
    deletedBy: deletedBy ? String(deletedBy) : null,
    updatedAt: new Date(),
  }

  if (isMongoConnected() && collections.sets && collections.folders && collections.documents) {
    const setObjectId = new ObjectId(setId)
    const existingSet = await collections.sets.findOne({ _id: setObjectId })
    if (!existingSet) {
      return { value: null }
    }

    const foldersInSet = await collections.folders.find({ setId: setObjectId }).project({ _id: 1 }).toArray()
    const folderIds = foldersInSet.map((folder) => folder._id)

    if (folderIds.length > 0) {
      await collections.documents.updateMany(
        { $or: [{ setId: setObjectId }, { folderId: { $in: folderIds } }] },
        { $set: deleteFields },
      )
    } else {
      await collections.documents.updateMany(
        { setId: setObjectId },
        { $set: deleteFields },
      )
    }

    await collections.folders.updateMany(
      { setId: setObjectId },
      { $set: deleteFields },
    )

    return collections.sets.findOneAndUpdate(
      { _id: setObjectId },
      { $set: deleteFields },
      { returnDocument: 'after' },
    )
  }

  const fallbackIndex = fallbackSets.findIndex((setItem) => String(setItem._id) === String(setId))
  if (fallbackIndex === -1) {
    return { value: null }
  }

  fallbackSets[fallbackIndex] = { ...fallbackSets[fallbackIndex], ...deleteFields }
  const folderIds = fallbackFolders
    .filter((folder) => String(folder.setId) === String(setId))
    .map((folder) => String(folder._id))

  fallbackFolders.forEach((folder) => {
    if (String(folder.setId) === String(setId)) {
      Object.assign(folder, deleteFields)
    }
  })

  fallbackDocs.forEach((doc) => {
    if (String(doc.setId) === String(setId) || folderIds.includes(String(doc.folderId))) {
      Object.assign(doc, deleteFields)
    }
  })

  return { value: fallbackSets[fallbackIndex] }
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

const findUserDocumentTagsForDocuments = async (userId, documentIds = []) => {
  const normalizedDocumentIds = [...new Set((Array.isArray(documentIds) ? documentIds : []).map(String).filter(Boolean))]
  if (normalizedDocumentIds.length === 0) return {}

  if (isMongoConnected() && collections.userDocumentTags) {
    const records = await collections.userDocumentTags.find({
      userId: new ObjectId(userId),
      documentId: { $in: normalizedDocumentIds.map((id) => new ObjectId(id)) },
    }).toArray()

    return records.reduce((acc, record) => {
      acc[String(record.documentId)] = Array.isArray(record.tags) ? record.tags.map(String) : []
      return acc
    }, {})
  }

  return fallbackUserDocumentTags.reduce((acc, record) => {
    if (String(record.userId) !== String(userId)) return acc
    if (!normalizedDocumentIds.includes(String(record.documentId))) return acc
    acc[String(record.documentId)] = Array.isArray(record.tags) ? record.tags.map(String) : []
    return acc
  }, {})
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

const getSharedRoleForUser = async (item, userId) => {
  const entries = normalizeSharedWithEntries(item?.sharedWith)
  // direct user entry
  const userEntry = entries.find((entry) => entry.type === 'user' && String(entry.userId) === String(userId))
  if (userEntry) return userEntry.role

  // check organizations: if item shared with an org, use the member's role in that org
  for (const entry of entries.filter((e) => e.type === 'org')) {
    const org = await findOrganizationById(entry.orgId)
    if (!org) continue
    const members = await getOrganizationMembersExpanded(org)
    for (const m of members) {
      if (m.type === 'user' && m.user && (String(m.user._id) === String(userId) || String(m.user.id) === String(userId))) {
        return m.role || entry.role || null
      }
      // nested orgs are handled by getOrganizationMembersExpanded
    }
  }
  return null
}

const removeSharedWithEntries = (sharedWith, userId, orgId) => {
  const normalizedUserId = userId ? String(userId) : null
  const normalizedOrgId = orgId ? String(orgId) : null
  return normalizeSharedWithEntries(sharedWith).filter((entry) => {
    if (normalizedUserId && entry.type === 'user') {
      return String(entry.userId) !== normalizedUserId
    }
    if (normalizedOrgId && entry.type === 'org') {
      return String(entry.orgId) !== normalizedOrgId
    }
    return true
  })
}

const shareDocumentWithOrg = async (docId, orgId, orgName = null, role = null) => {
  const normalizedOrgId = String(orgId)
  if (isMongoConnected() && collections.documents) {
    const existing = await collections.documents.findOne({ _id: new ObjectId(docId) })
    if (!existing) return null
    const sharedWith = normalizeSharedWithEntries(existing.sharedWith)
    const newSharedWith = sharedWith.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === normalizedOrgId))
    newSharedWith.push({ orgId: new ObjectId(normalizedOrgId), role, name: orgName })
    return collections.documents.updateOne(
      { _id: new ObjectId(docId) },
      { $set: { sharedWith: newSharedWith } },
    )
  }
  const fallbackIndex = fallbackDocs.findIndex((doc) => String(doc._id) === String(docId))
  if (fallbackIndex >= 0) {
    const sharedWith = normalizeSharedWithEntries(fallbackDocs[fallbackIndex].sharedWith)
    const newSharedWith = sharedWith.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === normalizedOrgId))
    newSharedWith.push({ orgId: normalizedOrgId, role, name: orgName })
    fallbackDocs[fallbackIndex].sharedWith = newSharedWith
  }
}

const shareFolderWithOrg = async (folderId, orgId, orgName = null, role = null) => {
  const normalizedOrgId = String(orgId)
  if (isMongoConnected() && collections.folders) {
    const existing = await collections.folders.findOne({ _id: new ObjectId(folderId) })
    if (!existing) return null
    const sharedWith = normalizeSharedWithEntries(existing.sharedWith)
    const newSharedWith = sharedWith.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === normalizedOrgId))
    newSharedWith.push({ orgId: new ObjectId(normalizedOrgId), role, name: orgName })
    return collections.folders.updateOne(
      { _id: new ObjectId(folderId) },
      { $set: { sharedWith: newSharedWith } },
    )
  }
  const fallbackIndex = fallbackFolders.findIndex((folder) => String(folder._id) === String(folderId))
  if (fallbackIndex >= 0) {
    const sharedWith = normalizeSharedWithEntries(fallbackFolders[fallbackIndex].sharedWith)
    const newSharedWith = sharedWith.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === normalizedOrgId))
    newSharedWith.push({ orgId: normalizedOrgId, role, name: orgName })
    fallbackFolders[fallbackIndex].sharedWith = newSharedWith
  }
}

const shareSetWithOrg = async (setId, orgId, orgName = null, role = null) => {
  const normalizedOrgId = String(orgId)
  if (isMongoConnected() && collections.sets) {
    const existing = await collections.sets.findOne({ _id: new ObjectId(setId) })
    if (!existing) return null
    const sharedWith = normalizeSharedWithEntries(existing.sharedWith)
    const newSharedWith = sharedWith.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === normalizedOrgId))
    newSharedWith.push({ orgId: new ObjectId(normalizedOrgId), role, name: orgName })
    return collections.sets.updateOne(
      { _id: new ObjectId(setId) },
      { $set: { sharedWith: newSharedWith } },
    )
  }
  const fallbackIndex = fallbackSets.findIndex((setItem) => String(setItem._id) === String(setId))
  if (fallbackIndex >= 0) {
    const sharedWith = normalizeSharedWithEntries(fallbackSets[fallbackIndex].sharedWith)
    const newSharedWith = sharedWith.filter((entry) => !(entry.type === 'org' && String(entry.orgId) === normalizedOrgId))
    newSharedWith.push({ orgId: normalizedOrgId, role, name: orgName })
    fallbackSets[fallbackIndex].sharedWith = newSharedWith
  }
}

const removeDocumentShare = async (docId, userId, orgId) => {
  if (isMongoConnected() && collections.documents) {
    const existing = await collections.documents.findOne({ _id: new ObjectId(docId) })
    if (!existing) return null
    const filtered = removeSharedWithEntries(existing.sharedWith, userId, orgId)
    return collections.documents.updateOne(
      { _id: new ObjectId(docId) },
      { $set: { sharedWith: filtered } },
    )
  }
  const fallbackIndex = fallbackDocs.findIndex((doc) => String(doc._id) === String(docId))
  if (fallbackIndex >= 0) {
    fallbackDocs[fallbackIndex].sharedWith = removeSharedWithEntries(fallbackDocs[fallbackIndex].sharedWith, userId, orgId)
  }
}

const removeFolderShare = async (folderId, userId, orgId) => {
  if (isMongoConnected() && collections.folders) {
    const existing = await collections.folders.findOne({ _id: new ObjectId(folderId) })
    if (!existing) return null
    const filtered = removeSharedWithEntries(existing.sharedWith, userId, orgId)
    return collections.folders.updateOne(
      { _id: new ObjectId(folderId) },
      { $set: { sharedWith: filtered } },
    )
  }
  const fallbackIndex = fallbackFolders.findIndex((folder) => String(folder._id) === String(folderId))
  if (fallbackIndex >= 0) {
    fallbackFolders[fallbackIndex].sharedWith = removeSharedWithEntries(fallbackFolders[fallbackIndex].sharedWith, userId, orgId)
  }
}

const removeSetShare = async (setId, userId, orgId) => {
  if (isMongoConnected() && collections.sets) {
    const existing = await collections.sets.findOne({ _id: new ObjectId(setId) })
    if (!existing) return null
    const filtered = removeSharedWithEntries(existing.sharedWith, userId, orgId)
    return collections.sets.updateOne(
      { _id: new ObjectId(setId) },
      { $set: { sharedWith: filtered } },
    )
  }
  const fallbackIndex = fallbackSets.findIndex((setItem) => String(setItem._id) === String(setId))
  if (fallbackIndex >= 0) {
    fallbackSets[fallbackIndex].sharedWith = removeSharedWithEntries(fallbackSets[fallbackIndex].sharedWith, userId, orgId)
  }
}

const shareDocumentWithUser = async (docId, userId, role = 'read-only', email = null, name = null) => {
  const normalizedUserId = String(userId)
  if (isMongoConnected() && collections.documents) {
    const existing = await collections.documents.findOne({ _id: new ObjectId(docId) })
    if (!existing) return null

    const sharedWith = normalizeSharedWithEntries(existing.sharedWith)
    const newSharedWith = sharedWith.filter((entry) => String(entry.userId) !== normalizedUserId)
    newSharedWith.push({ userId: new ObjectId(normalizedUserId), role, email, name })

    return collections.documents.updateOne(
      { _id: new ObjectId(docId) },
      { $set: { sharedWith: newSharedWith } },
    )
  }

  const fallbackIndex = fallbackDocs.findIndex((doc) => String(doc._id) === String(docId))
  if (fallbackIndex >= 0) {
    const sharedWith = normalizeSharedWithEntries(fallbackDocs[fallbackIndex].sharedWith)
    const newSharedWith = sharedWith.filter((entry) => String(entry.userId) !== normalizedUserId)
    newSharedWith.push({ userId: normalizedUserId, role, email, name })
    fallbackDocs[fallbackIndex].sharedWith = newSharedWith
  }
}

const shareFolderWithUser = async (folderId, userId, role = 'read-only', email = null, name = null) => {
  const normalizedUserId = String(userId)
  if (isMongoConnected() && collections.folders) {
    const existing = await collections.folders.findOne({ _id: new ObjectId(folderId) })
    if (!existing) return null

    const sharedWith = normalizeSharedWithEntries(existing.sharedWith)
    const newSharedWith = sharedWith.filter((entry) => String(entry.userId) !== normalizedUserId)
    newSharedWith.push({ userId: new ObjectId(normalizedUserId), role, email, name })

    return collections.folders.updateOne(
      { _id: new ObjectId(folderId) },
      { $set: { sharedWith: newSharedWith } },
    )
  }

  const fallbackIndex = fallbackFolders.findIndex((folder) => String(folder._id) === String(folderId))
  if (fallbackIndex >= 0) {
    const sharedWith = normalizeSharedWithEntries(fallbackFolders[fallbackIndex].sharedWith)
    const newSharedWith = sharedWith.filter((entry) => String(entry.userId) !== normalizedUserId)
    newSharedWith.push({ userId: normalizedUserId, role, email, name })
    fallbackFolders[fallbackIndex].sharedWith = newSharedWith
  }
}

const shareSetWithUser = async (setId, userId, role = 'read-only', email = null, name = null) => {
  const normalizedUserId = String(userId)
  if (isMongoConnected() && collections.sets) {
    const existing = await collections.sets.findOne({ _id: new ObjectId(setId) })
    if (!existing) return null

    const sharedWith = normalizeSharedWithEntries(existing.sharedWith)
    const newSharedWith = sharedWith.filter((entry) => String(entry.userId) !== normalizedUserId)
    newSharedWith.push({ userId: new ObjectId(normalizedUserId), role, email, name })

    return collections.sets.updateOne(
      { _id: new ObjectId(setId) },
      { $set: { sharedWith: newSharedWith } },
    )
  }

  const fallbackIndex = fallbackSets.findIndex((setItem) => String(setItem._id) === String(setId))
  if (fallbackIndex >= 0) {
    const sharedWith = normalizeSharedWithEntries(fallbackSets[fallbackIndex].sharedWith)
    const newSharedWith = sharedWith.filter((entry) => String(entry.userId) !== normalizedUserId)
    newSharedWith.push({ userId: normalizedUserId, role, email, name })
    fallbackSets[fallbackIndex].sharedWith = newSharedWith
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
  updateFolder,
  insertFolder,
  insertSet,
  deleteFolder,
  deleteSet,
  findTagsForUser,
  insertTag,
  updateTag,
  deleteTag,
  findUserDocumentTags,
  findUserDocumentTagsForDocuments,
  upsertUserDocumentTags,
  normalizeSharedWithEntries,
  sharedWithContainsUser,
  getSharedRoleForUser,
  shareDocumentWithOrg,
  shareFolderWithOrg,
  shareSetWithOrg,
  shareDocumentWithUser,
  shareFolderWithUser,
  shareSetWithUser,
  removeDocumentShare,
  removeFolderShare,
  removeSetShare,
  removeSharedWithEntries,
}
