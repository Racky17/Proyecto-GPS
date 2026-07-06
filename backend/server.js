const app = require('./app')
const { connectMongo } = require('./config/mongo')

const port = process.env.PORT || 4000

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
