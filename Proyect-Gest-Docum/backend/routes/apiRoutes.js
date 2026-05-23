const express = require('express')
const authRoutes = require('./authRoutes')
const userRoutes = require('./userRoutes')
const organizationRoutes = require('./organizationRoutes')
const publicRoutes = require('./publicRoutes')

const router = express.Router()

router.use(authRoutes)
router.use(userRoutes)
router.use(organizationRoutes)
router.use(publicRoutes)

module.exports = router
