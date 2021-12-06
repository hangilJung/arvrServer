const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const logger = require('../config/logger')
const bcrypt = require('bcrypt')
const headerErrorCode = require('../headerErrorCode')

router.post('/login', async (req, res) => {
    logger.info('/manager/login access')
    const { user_id, user_pw } = req.body

    let response = {
        header: {},
    }

    try {
        const exUser = await pool.query('select * from manager where user_id = ?', [user_id])

        const result = await bcrypt.compare(user_pw, exUser[0][0].user_pw)

        if (exUser[0].length > 0 && result) {
            response.header = headerErrorCode.normalService
            res.json(response)
        } else {
            response.header = headerErrorCode.invalidRequestParameterError
            res.status(400).json(response)
        }
    } catch (error) {
        logger.error('manager login error message:', error)

        response.header = headerErrorCode.invalidRequestParameterError

        res.status(400).json(response)
    }
})

router.post('/join', async (req, res) => {
    2
    const { user_id, user_pw, nickname } = req.body
    const hash = await bcrypt.hash(user_pw, 12)

    let response = {
        header: {},
    }

    try {
        const result = await pool.query('insert into manager (user_id, user_pw, nickname, updated_at) values(?, ?, ?, now())', [
            user_id,
            hash,
            nickname,
        ])

        res.json('조인')
    } catch (error) {
        logger.error('/manager/join error message:', error)
        console.log(error)
        response.header = headerErrorCode.invalidRequestParameterError

        res.status(400).json(response)
    }
})

router.post('/update', async (req, res) => {
    logger.info('/manager/update access')

    const { user_id, user_pw } = req.body
    const hash = await bcrypt.hash(user_pw, 12)

    let response = {
        header: {},
    }
    try {
        const result = await pool.query('update manager set user_pw = ? where user_id = ?', [hash, user_id])

        if (result[0].affectedRows > 0) {
            response.header = headerErrorCode.normalService
        } else {
            response.header = headerErrorCode.invalidRequestParameterError
        }

        res.json(response)
    } catch (error) {
        logger.error('/manager/update error message:', error)
        console.log(error)
        response.header = headerErrorCode.invalidRequestParameterError

        res.status(400).json(response)
    }
})

module.exports = router
