require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const { connectMongo } = require('./config/mongo')
const apiRoutes = require('./routes/apiRoutes')

const app = express()
const port = process.env.PORT || 4000
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://localhost:2200',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:2200',
].filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }

      const localHostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
      if (allowedOrigins.includes(origin) || localHostPattern.test(origin)) {
        return callback(null, true)
      }

      callback(new Error(`CORS origin not allowed: ${origin}`))
    },
    credentials: true,
  }),
)

app.use(express.json())
app.use('/', apiRoutes)

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../build')
  app.use(express.static(frontendDist))

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

const startServer = async () => {
  try {
    await connectMongo()
    app.listen(port, () => {
      console.log(`Backend server listening on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
