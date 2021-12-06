const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const logger = require('../config/logger')
const headerErrorCode = require('../headerErrorCode')

router.post('/', async (req, res) => {
    logger.info('/insert access')
    const { place_id, precipitation, water_level, temperature, humidity } = req.body.dataList
    let response = {
        header: {},
    }

    try {
        const databaseOnSaveResult = await pool.query(
            'insert into sensor_data (place_id, precipitation, water_level, temperature, humidity) values (?, ?, ?, ?, ?)',
            [place_id, precipitation, water_level, temperature, humidity]
        )
        if (databaseOnSaveResult[0].affectedRows > 0) {
            response.header = headerErrorCode.normalService
            res.json(response)
        } else {
            response.header = headerErrorCode.invalidRequestParameterError
            res.status(400).json(response)
        }
    } catch (error) {
        logger.error('/insert error message:', error)
        console.log(error)
        response.header = headerErrorCode.noDataError
        res.status(400).json(response)
    }
})

module.exports = router
