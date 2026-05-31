const bcrypt = require('bcrypt')
const {
  ObjectId,
  isMongoConnected,
  collections,
  fallbackUsers,
  SALT_ROUNDS,
} = require('../config/mongo')

const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS)
const comparePassword = async (password, hash) => bcrypt.compare(password, hash)

const findUserByUsernameOrEmail = async (value) => {
  if (isMongoConnected() && collections.users) {
    return collections.users.findOne({ $or: [{ username: value }, { email: value }] })
  }

  return fallbackUsers.find((user) => user.username === value || user.email === value) || null
}

const findUserById = async (id) => {
  if (isMongoConnected() && collections.users) {
    if (!ObjectId.isValid(id)) return null
    return collections.users.findOne({ _id: new ObjectId(id) })
  }

  return fallbackUsers.find((user) => String(user._id) === String(id)) || null
}

const findUserByIdAndUsername = async (id, username) => {
  if (isMongoConnected() && collections.users) {
    return collections.users.findOne({ _id: new ObjectId(id), username })
  }

  return fallbackUsers.find(
    (user) => String(user._id) === String(id) && user.username === username,
  )
}

const findUserByCredentials = async (value, password) => {
  const user = await findUserByUsernameOrEmail(value)
  if (!user) {
    return null
  }

  const validPassword = await comparePassword(password, user.passwordHash)
  return validPassword ? user : null
}

const insertUser = async (user) => {
  if (isMongoConnected() && collections.users) {
    return collections.users.insertOne(user)
  }

  fallbackUsers.push(user)
  return { insertedId: user._id || user.username }
}

module.exports = {
  hashPassword,
  comparePassword,
  findUserByUsernameOrEmail,
  findUserById,
  findUserByIdAndUsername,
  findUserByCredentials,
  insertUser,
}
