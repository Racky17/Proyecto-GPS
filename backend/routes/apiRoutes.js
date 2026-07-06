const express = require('express')
const authRoutes = require('./authRoutes')
const userRoutes = require('./userRoutes')
const tagsRoutes = require('./user/tagsRoutes')
const analyticsRoutes = require('./user/analyticsRoutes')
const organizationRoutes = require('./organizationRoutes')
const publicRoutes = require('./publicRoutes')

const router = express.Router()

router.use(authRoutes)
router.use(userRoutes)
router.use(tagsRoutes)
router.use(analyticsRoutes)
router.use(organizationRoutes)
router.use(publicRoutes)

module.exports = router
