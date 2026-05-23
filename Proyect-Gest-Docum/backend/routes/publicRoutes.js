const express = require('express')
const { isMongoConnected, collections } = require('../config/mongo')

const router = express.Router()

router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
