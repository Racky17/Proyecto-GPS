const { findUserByIdAndUsername } = require('../services/userService')
const { isMongoConnected, ObjectId } = require('../config/mongo')

const createToken = (user) => {
  const id = user._id || user.id || user.username
  return Buffer.from(`${id}:${user.username}:${Date.now()}`).toString('base64')
}

const getUserFromToken = async (token) => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const [id, username] = decoded.split(':')

    if (!id || !username) {
      return null
    }

    if (isMongoConnected() && !ObjectId.isValid(id)) {
      return null
    }

    return findUserByIdAndUsername(id, username)
  } catch (error) {
    return null
  }
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid.' })
  }

  const token = authHeader.split(' ')[1]
  const user = await getUserFromToken(token)

  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }

  req.user = user
  next()
}

module.exports = {
  createToken,
  getUserFromToken,
  authenticate,
}
