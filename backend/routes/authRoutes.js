const express = require('express')
const crypto = require('crypto')
const { OAuth2Client } = require('google-auth-library')
const { authenticate, createToken } = require('../utils/auth')
const { findUserByUsernameOrEmail, findUserByCredentials, insertUser, hashPassword } = require('../services/userService')

const router = express.Router()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

router.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' })
  }

  try {
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
  } catch (error) {
    res.status(500).json({ message: 'Unable to register user.' })
  }
})

router.post('/api/auth/login', async (req, res) => {
  const { username, email, password } = req.body
  const credentials = username || email

  if (!credentials || !password) {
    return res.status(400).json({ message: 'Username/email and password are required.' })
  }

  try {
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
  } catch (error) {
    res.status(500).json({ message: 'Unable to log in.' })
  }
})

// Inicio de sesión con Google: el frontend envía el ID token (credential)
// emitido por Google Identity Services y aquí se verifica su firma.
router.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body

  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required.' })
  }

  if (!googleClient) {
    return res.status(503).json({
      message: 'Google sign-in is not configured on the server (GOOGLE_CLIENT_ID missing).',
    })
  }

  try {
    let payload
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch (verifyError) {
      return res.status(401).json({ message: 'Invalid Google credential.' })
    }

    if (!payload || !payload.email || payload.email_verified === false) {
      return res.status(401).json({ message: 'Google account email is not verified.' })
    }

    let user = await findUserByUsernameOrEmail(payload.email)
    if (!user) {
      // Genera un username a partir del correo, evitando colisiones
      let username = payload.email.split('@')[0]
      if (await findUserByUsernameOrEmail(username)) {
        username = `${username}-${crypto.randomBytes(3).toString('hex')}`
      }

      const newUser = {
        username,
        email: payload.email,
        googleId: payload.sub,
        authProvider: 'google',
        encryptionSalt: crypto.randomBytes(16).toString('base64'),
        name: payload.name || username,
        createdAt: new Date(),
      }

      const result = await insertUser(newUser)
      if (!result.insertedId) {
        return res.status(500).json({ message: 'Unable to create user.' })
      }
      user = { ...newUser, _id: result.insertedId }
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
  } catch (error) {
    res.status(500).json({ message: 'Unable to sign in with Google.' })
  }
})

router.post('/api/auth/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out successfully.' })
})

module.exports = router
