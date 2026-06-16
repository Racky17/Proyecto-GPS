const express = require('express')
const { authenticate } = require('../../utils/auth')
const { findOrganizationById, getOrganizationMembersExpanded } = require('../../services/orgService')
const { findSetById, findFolderById, getSharedRoleForUser } = require('../../services/dataService')
const {
  findDocumentsForOrg,
  findDocumentsForSet,
  findDocumentsForFolder,
  getDocumentSummary,
  getUserSummary,
  getOrgSummary,
  buildTrend,
} = require('../../services/analyticsService')

const router = express.Router()

const isUserOrgMember = async (org, userId) => {
  if (!org) return false
  if (String(org.ownerId) === String(userId)) return true
  const members = await getOrganizationMembersExpanded(org)
  return members.some((member) => member.type === 'user' && String(member.user?._id || member.user?.id || member.id) === String(userId))
}

const requireOwnershipOrAccess = async (item, userId) => {
  if (!item) return false
  if (String(item.ownerId || item.userId) === String(userId)) return true
  const role = await getSharedRoleForUser(item, userId)
  return !!role
}

router.get('/api/user/analytics/organizations/:orgId/summary', authenticate, async (req, res) => {
  const orgId = req.params.orgId
  try {
    const org = await findOrganizationById(orgId)
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' })
    }
    if (!await isUserOrgMember(org, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view organization analytics.' })
    }

    const summary = await getOrgSummary(orgId)
    res.json({ data: summary })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load organization analytics.' })
  }
})

router.get('/api/user/analytics/organizations/:orgId/documents/summary', authenticate, async (req, res) => {
  const orgId = req.params.orgId
  try {
    const org = await findOrganizationById(orgId)
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' })
    }
    if (!await isUserOrgMember(org, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view organization document analytics.' })
    }

    const docs = await findDocumentsForOrg(orgId)
    const summary = {
      totalDocuments: docs.length,
      pinnedDocuments: docs.filter((doc) => doc.pinnedAt).length,
      tagCounts: docs.reduce((acc, doc) => {
        if (Array.isArray(doc.tags)) {
          doc.tags.forEach((tag) => {
            if (tag === undefined || tag === null) return
            const id = String(tag)
            acc[id] = (acc[id] || 0) + 1
          })
        }
        return acc
      }, {}),
      documentsBySet: docs.reduce((acc, doc) => {
        const key = doc.setId ? String(doc.setId) : 'none'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
      documentsByFolder: docs.reduce((acc, doc) => {
        const key = doc.folderId ? String(doc.folderId) : 'none'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
    }

    res.json({ data: summary })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load organization document analytics.' })
  }
})

router.get('/api/user/analytics/organizations/:orgId/documents/trend', authenticate, async (req, res) => {
  const orgId = req.params.orgId
  const interval = ['daily', 'weekly', 'monthly'].includes(req.query.interval) ? req.query.interval : 'daily'

  try {
    const org = await findOrganizationById(orgId)
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' })
    }
    if (!await isUserOrgMember(org, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view organization document trends.' })
    }

    const docs = await findDocumentsForOrg(orgId)
    const trend = buildTrend(docs, interval, 'createdAt')
    res.json({ data: { interval, trend } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load organization document trend.' })
  }
})

router.get('/api/user/analytics/users/:userId/summary', authenticate, async (req, res) => {
  const userId = req.params.userId
  if (String(userId) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized to view this user analytics.' })
  }

  try {
    const summary = await getUserSummary(userId)
    res.json({ data: summary })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user analytics.' })
  }
})

router.get('/api/user/analytics/users/:userId/documents/summary', authenticate, async (req, res) => {
  const userId = req.params.userId
  if (String(userId) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not authorized to view this user document analytics.' })
  }

  try {
    const summary = await getUserSummary(userId)
    res.json({ data: {
      totalDocuments: summary.totalDocuments,
      pinnedDocuments: summary.pinnedDocuments,
      sharedDocuments: summary.sharedDocuments,
      uniqueSets: summary.uniqueSets,
      uniqueFolders: summary.uniqueFolders,
      tagCounts: summary.tagCounts,
    } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load user document analytics.' })
  }
})

router.get('/api/user/analytics/documents/:documentId/summary', authenticate, async (req, res) => {
  const { documentId } = req.params
  try {
    const document = await getDocumentSummary(documentId, req.user._id)
    if (!document) {
      return res.status(404).json({ message: 'Document not found or not accessible.' })
    }
    res.json({ data: document })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load document analytics.' })
  }
})

router.get('/api/user/analytics/sets/:setId/summary', authenticate, async (req, res) => {
  const { setId } = req.params
  try {
    const setItem = await findSetById(setId)
    if (!setItem) {
      return res.status(404).json({ message: 'Set not found.' })
    }
    if (!await requireOwnershipOrAccess(setItem, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to access this set.' })
    }

    const docs = await findDocumentsForSet(setId)
    const totals = docs.reduce((acc, doc) => {
      acc.totalDocuments += 1
      if (doc.pinnedAt) acc.pinnedDocuments += 1
      return acc
    }, { totalDocuments: 0, pinnedDocuments: 0 })

    res.json({ data: {
      setId: String(setItem._id),
      title: setItem.title || null,
      totalDocuments: totals.totalDocuments,
      pinnedDocuments: totals.pinnedDocuments,
      documentsByFolder: docs.reduce((acc, doc) => {
        const key = doc.folderId ? String(doc.folderId) : 'none'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
    } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load set analytics.' })
  }
})

router.get('/api/user/analytics/folders/:folderId/summary', authenticate, async (req, res) => {
  const { folderId } = req.params
  try {
    const folder = await findFolderById(folderId)
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' })
    }
    if (!await requireOwnershipOrAccess(folder, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to access this folder.' })
    }

    const docs = await findDocumentsForFolder(folderId)
    const totals = docs.reduce((acc, doc) => {
      acc.totalDocuments += 1
      if (doc.pinnedAt) acc.pinnedDocuments += 1
      return acc
    }, { totalDocuments: 0, pinnedDocuments: 0 })

    res.json({ data: {
      folderId: String(folder._id),
      title: folder.title || null,
      totalDocuments: totals.totalDocuments,
      pinnedDocuments: totals.pinnedDocuments,
      tagCounts: docs.reduce((acc, doc) => {
        if (Array.isArray(doc.tags)) {
          doc.tags.forEach((tag) => {
            if (tag === undefined || tag === null) return
            const id = String(tag)
            acc[id] = (acc[id] || 0) + 1
          })
        }
        return acc
      }, {}),
    } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load folder analytics.' })
  }
})

module.exports = router
