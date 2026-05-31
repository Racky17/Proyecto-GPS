const { ObjectId, isMongoConnected, collections, fallbackOrganizations } = require('../config/mongo')
const { findUserByUsernameOrEmail } = require('./userService')

const insertOrganization = async (org) => {
  if (isMongoConnected() && collections.organizations) {
    return collections.organizations.insertOne(org)
  }
  const fallbackOrg = { ...org, _id: new ObjectId() }
  fallbackOrganizations.push(fallbackOrg)
  return { insertedId: fallbackOrg._id }
}

const findOrganizationById = async (orgId) => {
  if (isMongoConnected() && collections.organizations) {
    return collections.organizations.findOne({ _id: new ObjectId(orgId) })
  }
  return fallbackOrganizations.find((o) => String(o._id) === String(orgId))
}

const findOrganizationsForUser = async (userId) => {
  if (isMongoConnected() && collections.organizations) {
    return collections.organizations
      .find({ $or: [ { ownerId: new ObjectId(userId) }, { 'members.type': 'user', 'members.id': new ObjectId(userId) }, { 'members.type': 'org', 'members.id': new ObjectId(userId) } ] })
      .toArray()
  }

  return fallbackOrganizations.filter((org) => {
    if (String(org.ownerId) === String(userId)) return true
    if (!Array.isArray(org.members)) return false
    return org.members.some((m) => String(m.id) === String(userId) && m.type === 'user')
  })
}

const addUserMember = async (orgId, userId, role) => {
  if (isMongoConnected() && collections.organizations) {
    return collections.organizations.updateOne(
      { _id: new ObjectId(orgId) },
      { $addToSet: { members: { type: 'user', id: new ObjectId(userId), role } } },
    )
  }

  const idx = fallbackOrganizations.findIndex((o) => String(o._id) === String(orgId))
  if (idx === -1) return null
  const members = fallbackOrganizations[idx].members || []
  if (!members.some((m) => m.type === 'user' && String(m.id) === String(userId))) {
    members.push({ type: 'user', id: String(userId), role })
    fallbackOrganizations[idx].members = members
  }
  return { value: fallbackOrganizations[idx] }
}

const addOrgMember = async (orgId, memberOrgId, role) => {
  if (isMongoConnected() && collections.organizations) {
    return collections.organizations.updateOne(
      { _id: new ObjectId(orgId) },
      { $addToSet: { members: { type: 'org', id: new ObjectId(memberOrgId), role } } },
    )
  }

  const idx = fallbackOrganizations.findIndex((o) => String(o._id) === String(orgId))
  if (idx === -1) return null
  const members = fallbackOrganizations[idx].members || []
  if (!members.some((m) => m.type === 'org' && String(m.id) === String(memberOrgId))) {
    members.push({ type: 'org', id: String(memberOrgId), role })
    fallbackOrganizations[idx].members = members
  }
  return { value: fallbackOrganizations[idx] }
}

const removeOrganizationMember = async (orgId, memberId, memberType = 'user') => {
  if (isMongoConnected() && collections.organizations) {
    return collections.organizations.updateOne(
      { _id: new ObjectId(orgId) },
      { $pull: { members: { type: memberType, id: new ObjectId(memberId) } } },
    )
  }

  const idx = fallbackOrganizations.findIndex((o) => String(o._id) === String(orgId))
  if (idx === -1) return null
  fallbackOrganizations[idx].members = (fallbackOrganizations[idx].members || []).filter(
    (m) => !(m.type === memberType && String(m.id) === String(memberId)),
  )
  return { value: fallbackOrganizations[idx] }
}

const getOrganizationMembersExpanded = async (org) => {
  // org is organization doc
  if (!org || !Array.isArray(org.members)) return []
  const expanded = []
  for (const m of org.members) {
    if (m.type === 'user') {
      if (isMongoConnected() && collections.users) {
        const user = await collections.users.findOne({ _id: new ObjectId(m.id) })
        if (user) expanded.push({ type: 'user', user, role: m.role })
      } else {
        const user = await findUserByUsernameOrEmail(m.id) // fallback: try lookup by username/email
        expanded.push({ type: 'user', user: user || { id: m.id }, role: m.role })
      }
    } else if (m.type === 'org') {
      if (isMongoConnected() && collections.organizations) {
        const orgDoc = await collections.organizations.findOne({ _id: new ObjectId(m.id) })
        if (orgDoc) expanded.push({ type: 'org', organization: orgDoc, role: m.role })
      } else {
        const orgDoc = fallbackOrganizations.find((o) => String(o._id) === String(m.id))
        expanded.push({ type: 'org', organization: orgDoc || { id: m.id }, role: m.role })
      }
    }
  }
  return expanded
}

module.exports = {
  insertOrganization,
  findOrganizationById,
  findOrganizationsForUser,
  addUserMember,
  addOrgMember,
  removeOrganizationMember,
  getOrganizationMembersExpanded,
}
