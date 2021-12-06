const express = require('express')
const router = express.Router()
const { verifyToken } = require('./middlewares')

const sensor = require('./sensor.js')
const token = require('./token.js')
const manager = require('./manager.js')
const weather = require('./weather.js')
const orb = require('./orb.js')
const dataInsert = require('./dataInsert')
const appPush = require('./appPush')

router.use('/sensor', verifyToken, sensor)
router.use('/token', token)
router.use('/manager', manager)
router.use('/weather', weather)
router.use('/orb', verifyToken, orb)
router.use('/datainsert', dataInsert)
router.use('/push', appPush)

module.exports = router
