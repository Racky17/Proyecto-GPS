const express = require('express')
const { authenticate } = require('../utils/auth')
const { ObjectId, isMongoConnected } = require('../config/mongo')
const { findUserByUsernameOrEmail } = require('../services/userService')
const {
  insertOrganization,
  findOrganizationById,
  findOrganizationsForUser,
  addUserMember,
  addOrgMember,
  getOrganizationMembersExpanded,
} = require('../services/orgService')

const router = express.Router()

// Create organization and assign creator as administrator
router.post('/api/organizations', authenticate, async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ message: 'Organization name is required.' })

  try {
    const org = {
      name: name.trim(),
      ownerId: req.user._id,
      members: [ { type: 'user', id: req.user._id, role: 'administrator' } ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await insertOrganization(org)
    res.status(201).json({ data: { ...org, _id: result.insertedId } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to create organization.' })
  }
})

// Add member (user by email or organization by id) with role
router.post('/api/organizations/:id/members', authenticate, async (req, res) => {
  const orgId = req.params.id
  const { userEmail, organizationId, role } = req.body
  if (!role) return res.status(400).json({ message: 'Role is required for member.' })

  try {
    const org = await findOrganizationById(orgId)
    if (!org) return res.status(404).json({ message: 'Organization not found.' })

    // Only owner or administrators can add members
    const requesterId = String(req.user._id)
    const isOwner = String(org.ownerId) === requesterId
    const isAdmin = Array.isArray(org.members) && org.members.some((m) => m.type === 'user' && String(m.id) === requesterId && m.role === 'administrator')
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Only owners or administrators can add members.' })

    if (userEmail) {
      const user = await findUserByUsernameOrEmail(userEmail)
      if (!user) return res.status(404).json({ message: 'User to add not found.' })
      await addUserMember(orgId, user._id, role)
      return res.json({ message: 'User added to organization.' })
    }

    if (organizationId) {
      const memberOrg = await findOrganizationById(organizationId)
      if (!memberOrg) return res.status(404).json({ message: 'Organization to add not found.' })
      await addOrgMember(orgId, memberOrg._id, role)
      return res.json({ message: 'Organization added as member.' })
    }

    res.status(400).json({ message: 'Provide userEmail or organizationId to add.' })
  } catch (error) {
    res.status(500).json({ message: 'Unable to add member.' })
  }
})

// Get organizations the user belongs to
router.get('/api/organizations', authenticate, async (req, res) => {
  try {
    const orgs = await findOrganizationsForUser(req.user._id)
    res.json({ data: orgs })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load organizations.' })
  }
})

// Get a single organization with expanded members
router.get('/api/organizations/:id', authenticate, async (req, res) => {
  const orgId = req.params.id
  try {
    const org = await findOrganizationById(orgId)
    if (!org) return res.status(404).json({ message: 'Organization not found.' })

    // Ensure requester is a member
    const requesterId = String(req.user._id)
    const isMember = String(org.ownerId) === requesterId || (Array.isArray(org.members) && org.members.some((m) => String(m.id) === requesterId && m.type === 'user'))
    if (!isMember) return res.status(403).json({ message: 'Not a member of this organization.' })

    const membersExpanded = await getOrganizationMembersExpanded(org)
    res.json({ data: { ...org, members: membersExpanded } })
  } catch (error) {
    res.status(500).json({ message: 'Unable to load organization.' })
  }
})

module.exports = router
