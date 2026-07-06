const { ObjectId, isMongoConnected, collections, fallbackDocs } = require('../config/mongo')
const { findOrganizationById, getOrganizationMembersExpanded } = require('./orgService')
const { findAccessibleDocumentsForUser, normalizeSharedWithEntries } = require('./dataService')

const toObjectId = (value) => {
  if (!value) return null
  if (!isMongoConnected()) return String(value)
  try {
    return new ObjectId(value)
  } catch (error) {
    return String(value)
  }
}

const normalizeId = (value) => (value === undefined || value === null ? null : String(value))

const uniqueStrings = (items = []) => [...new Set(items.filter(Boolean).map(String))]

const collectOrgUserIds = async (org) => {
  const resolved = new Set()
  if (!org) return []

  const addUserId = (id) => {
    if (id !== undefined && id !== null) {
      resolved.add(String(id))
    }
  }

  const collectMembers = async (organization, seen = new Set()) => {
    if (!organization || !organization._id) return
    const orgId = String(organization._id)
    if (seen.has(orgId)) return
    seen.add(orgId)

    if (organization.ownerId) {
      addUserId(organization.ownerId)
    }

    const members = Array.isArray(organization.members) ? organization.members : []
    for (const member of members) {
      if (!member) continue
      if (member.type === 'user') {
        addUserId(member.id || (member.user && (member.user._id || member.user.id)))
      } else if (member.type === 'org') {
        const nested = await findOrganizationById(member.id || member.orgId)
        await collectMembers(nested, seen)
      }
    }
  }

  await collectMembers(org)
  return Array.from(resolved)
}

const hasOrgShare = (sharedWith, orgId) => {
  const normalizedOrgId = String(orgId)
  return normalizeSharedWithEntries(sharedWith).some(
    (entry) => entry.type === 'org' && String(entry.orgId) === normalizedOrgId,
  )
}

const getOrgSharedPlacementIds = async (orgId) => {
  const organizationId = String(orgId)

  if (isMongoConnected()) {
    const [sharedSets, sharedFolders] = await Promise.all([
      collections.sets
        ? collections.sets.find({ deletedAt: { $exists: false }, 'sharedWith.orgId': new ObjectId(organizationId) }).project({ _id: 1 }).toArray()
        : [],
      collections.folders
        ? collections.folders.find({ deletedAt: { $exists: false }, 'sharedWith.orgId': new ObjectId(organizationId) }).project({ _id: 1, setId: 1 }).toArray()
        : [],
    ])

    const sharedSetIds = sharedSets.map((setItem) => String(setItem._id))
    const sharedFolderIds = sharedFolders.map((folder) => String(folder._id))
    const sharedFolderSetIds = sharedFolders
      .filter((folder) => folder.setId)
      .map((folder) => String(folder.setId))

    return {
      sharedSetIds,
      sharedFolderIds,
      sharedFolderSetIds,
    }
  }

  const sharedSets = fallbackSets.filter(
    (setItem) => !setItem.deletedAt && hasOrgShare(setItem.sharedWith, organizationId),
  )
  const sharedFolders = fallbackFolders.filter(
    (folder) => !folder.deletedAt && hasOrgShare(folder.sharedWith, organizationId),
  )

  return {
    sharedSetIds: sharedSets.map((setItem) => String(setItem._id)),
    sharedFolderIds: sharedFolders.map((folder) => String(folder._id)),
    sharedFolderSetIds: sharedFolders.filter((folder) => folder.setId).map((folder) => String(folder.setId)),
  }
}

const getDateBucket = (date, interval = 'daily') => {
  if (!date || Number.isNaN(date.getTime())) return null
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  if (interval === 'weekly') {
    const firstDay = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()))
    const dayOfWeek = firstDay.getUTCDay() || 7
    firstDay.setUTCDate(firstDay.getUTCDate() - dayOfWeek + 1)
    const weekYear = firstDay.getUTCFullYear()
    const week = String(Math.ceil((((firstDay - Date.UTC(weekYear, 0, 1)) / 86400000 + 1) / 7))).padStart(2, '0')
    return `${weekYear}-W${week}`
  }

  if (interval === 'monthly') {
    return `${year}-${month}`
  }

  return `${year}-${month}-${day}`
}

const sortKeys = (obj) => {
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {})
}

const summarizeDocuments = (docs) => {
  const totals = {
    totalDocuments: docs.length,
    pinnedDocuments: 0,
    sharedDocuments: 0,
    ownedDocuments: 0,
    uniqueFolders: 0,
    uniqueSets: 0,
    tagCounts: {},
    documentsByFolder: {},
    documentsBySet: {},
  }

  const folderIds = new Set()
  const setIds = new Set()

  for (const doc of docs) {
    if (doc.pinnedAt) totals.pinnedDocuments += 1
    if (Array.isArray(doc.sharedWith) && normalizeSharedWithEntries(doc.sharedWith).length > 0) totals.sharedDocuments += 1
    if (doc.ownerId) totals.ownedDocuments += 1

    if (doc.folderId) folderIds.add(String(doc.folderId))
    if (doc.setId) setIds.add(String(doc.setId))

    const folderKey = doc.folderId ? String(doc.folderId) : 'none'
    const setKey = doc.setId ? String(doc.setId) : 'none'
    totals.documentsByFolder[folderKey] = (totals.documentsByFolder[folderKey] || 0) + 1
    totals.documentsBySet[setKey] = (totals.documentsBySet[setKey] || 0) + 1

    if (Array.isArray(doc.tags)) {
      doc.tags.forEach((tag) => {
        if (tag === undefined || tag === null) return
        const tagKey = String(tag)
        totals.tagCounts[tagKey] = (totals.tagCounts[tagKey] || 0) + 1
      })
    }
  }

  totals.uniqueFolders = folderIds.size
  totals.uniqueSets = setIds.size
  return totals
}

const buildTrend = (docs, interval = 'daily', dateField = 'createdAt') => {
  const counts = {}
  for (const doc of docs) {
    const rawDate = doc[dateField] || doc.updatedAt || doc.createdAt
    const date = rawDate ? new Date(rawDate) : null
    const bucket = getDateBucket(date, interval)
    if (!bucket) continue
    counts[bucket] = (counts[bucket] || 0) + 1
  }
  return sortKeys(counts)
}

const findDocumentsForOrg = async (orgId) => {
  const org = await findOrganizationById(orgId)
  if (!org) return []
  const organizationId = String(orgId)
  const { sharedSetIds, sharedFolderIds, sharedFolderSetIds } = await getOrgSharedPlacementIds(orgId)

  if (isMongoConnected() && collections.documents) {
    const sharedSetObjectIds = sharedSetIds
      .filter((id) => ObjectId.isValid(String(id)))
      .map((id) => new ObjectId(id))
    const sharedFolderObjectIds = sharedFolderIds
      .filter((id) => ObjectId.isValid(String(id)))
      .map((id) => new ObjectId(id))
    const sharedFolderSetObjectIds = sharedFolderSetIds
      .filter((id) => ObjectId.isValid(String(id)))
      .map((id) => new ObjectId(id))

    const orClauses = [
      { 'sharedWith.orgId': new ObjectId(organizationId) },
    ]

    if (sharedSetObjectIds.length > 0) {
      orClauses.push({ setId: { $in: sharedSetObjectIds } })
    }
    if (sharedFolderObjectIds.length > 0) {
      orClauses.push({ folderId: { $in: sharedFolderObjectIds } })
    }
    if (sharedFolderSetObjectIds.length > 0) {
      orClauses.push({ setId: { $in: sharedFolderSetObjectIds } })
    }

    return collections.documents.find({
      $and: [
        { deletedAt: { $exists: false } },
        { $or: orClauses },
      ],
    }).toArray()
  }

  return fallbackDocs.filter((doc) => {
    if (doc.deletedAt) return false
    const sharedEntries = normalizeSharedWithEntries(doc.sharedWith)
    const orgMatch = sharedEntries.some((entry) => entry.type === 'org' && String(entry.orgId) === organizationId)
    const setMatch = sharedSetIds.includes(String(doc.setId)) || sharedFolderSetIds.includes(String(doc.setId))
    const folderMatch = sharedFolderIds.includes(String(doc.folderId))
    return orgMatch || setMatch || folderMatch
  })
}

const findDocumentsForSet = async (setId) => {
  if (!setId) return []
  if (isMongoConnected() && collections.documents) {
    return collections.documents.find({ setId: toObjectId(setId), deletedAt: { $exists: false } }).toArray()
  }
  return fallbackDocs.filter((doc) => !doc.deletedAt && String(doc.setId) === String(setId))
}

const findDocumentsForFolder = async (folderId) => {
  if (!folderId) return []
  if (isMongoConnected() && collections.documents) {
    return collections.documents.find({ folderId: toObjectId(folderId), deletedAt: { $exists: false } }).toArray()
  }
  return fallbackDocs.filter((doc) => !doc.deletedAt && String(doc.folderId) === String(folderId))
}

const getDocumentSummary = async (documentId, userId) => {
  const accessibleDocs = await findAccessibleDocumentsForUser(userId)
  const document = accessibleDocs.find((doc) => String(doc._id) === String(documentId))
  if (!document) return null

  const sharedWith = normalizeSharedWithEntries(document.sharedWith)
  const accessRole = String(document.ownerId) === String(userId)
    ? 'owner'
    : (sharedWith.find((entry) => entry.type === 'user' && String(entry.userId) === String(userId)) || {}).role || 'reader'

  return {
    _id: document._id,
    title: document.title,
    folderId: document.folderId || null,
    setId: document.setId || null,
    ownerId: document.ownerId || document.userId || null,
    createdAt: document.createdAt || null,
    updatedAt: document.updatedAt || null,
    pinned: Boolean(document.pinnedAt),
    tagCount: Array.isArray(document.tags) ? document.tags.length : 0,
    sharedWithCount: sharedWith.length,
    versionCount: Array.isArray(document.versions) ? document.versions.length : 0,
    revisionCount: Array.isArray(document.revisionHistory) ? document.revisionHistory.length : 0,
    accessRole,
  }
}

const getUserSummary = async (userId) => {
  const docs = await findAccessibleDocumentsForUser(userId)
  const memberId = String(userId)
  const totals = summarizeDocuments(docs)
  const ownedDocuments = docs.filter((doc) => String(doc.ownerId) === memberId).length
  const accessibleSets = uniqueStrings(docs.filter((doc) => doc.setId).map((doc) => doc.setId))
  const accessibleFolders = uniqueStrings(docs.filter((doc) => doc.folderId).map((doc) => doc.folderId))

  return {
    userId: memberId,
    totalDocuments: totals.totalDocuments,
    pinnedDocuments: totals.pinnedDocuments,
    sharedDocuments: totals.sharedDocuments,
    ownedDocuments,
    uniqueSets: accessibleSets.length,
    uniqueFolders: accessibleFolders.length,
    tagCounts: totals.tagCounts,
    documentsBySet: totals.documentsBySet,
    documentsByFolder: totals.documentsByFolder,
    createdTrend: buildTrend(docs, 'weekly', 'createdAt'),
    updatedTrend: buildTrend(docs, 'weekly', 'updatedAt'),
  }
}

const getOrgSummary = async (orgId) => {
  const org = await findOrganizationById(orgId)
  if (!org) return null
  const docs = await findDocumentsForOrg(orgId)
  const memberIds = await collectOrgUserIds(org)
  const totals = summarizeDocuments(docs)

  return {
    organizationId: String(org._id),
    name: org.name || org.title || null,
    memberCount: memberIds.length,
    totalDocuments: totals.totalDocuments,
    pinnedDocuments: totals.pinnedDocuments,
    sharedDocuments: totals.sharedDocuments,
    uniqueSets: totals.uniqueSets,
    uniqueFolders: totals.uniqueFolders,
    tagCounts: totals.tagCounts,
    documentsBySet: totals.documentsBySet,
    documentsByFolder: totals.documentsByFolder,
    createdTrend: buildTrend(docs, 'weekly', 'createdAt'),
    updatedTrend: buildTrend(docs, 'weekly', 'updatedAt'),
  }
}

module.exports = {
  findDocumentsForOrg,
  findDocumentsForSet,
  findDocumentsForFolder,
  getDocumentSummary,
  getUserSummary,
  getOrgSummary,
  summarizeDocuments,
  buildTrend,
}
