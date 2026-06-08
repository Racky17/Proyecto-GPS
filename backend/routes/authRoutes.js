const express = require('express')
const crypto = require('crypto')
const { authenticate, createToken } = require('../utils/auth')
const { findUserByUsernameOrEmail, findUserByCredentials, insertUser, hashPassword } = require('../services/userService')

const router = express.Router()

router.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' })
  }

  const existingUser = await findUserByUsernameOrEmail(username) || await findUserByUsernameOrEmail(email)
  if (existingUser) {
    return res.status(409).json({ message: 'Username or email already exists.' })
  }

  const passwordHash = await hashPassword(password)
  const encryptionSalt = crypto.randomBytes(16).toString('base64')
  const newUser = {
    username,
    email,
    passwordHash,
    encryptionSalt,
    name: username,
    createdAt: new Date(),
  }

  const result = await insertUser(newUser)
  if (!result.insertedId) {
    return res.status(500).json({ message: 'Unable to create user.' })
  }

  res.status(201).json({ message: 'User created successfully.', encryptionSalt })
})

router.post('/api/auth/login', async (req, res) => {
  const { username, email, password } = req.body
  const credentials = username || email

  if (!credentials || !password) {
    return res.status(400).json({ message: 'Username/email and password are required.' })
  }

  const user = await findUserByCredentials(credentials, password)
  if (!user) {
    return res.status(401).json({ message: 'Invalid username/email or password.' })
  }

  const token = createToken(user)
  res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    encryptionSalt: user.encryptionSalt,
  })
})

router.post('/api/auth/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully.' })
})

module.exports = router
