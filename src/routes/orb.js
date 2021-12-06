const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const logger = require('../config/logger')

router.post('/', async (req, res) => {
    logger.info('/orb access')
    try {
        const result = await pool.query(
            `       
            select
              b.*, 
              case
                when s.pty = 0 then
                  case			
                    when s.sky = 1 then
                      '맑음'
                    when s.sky = 3 then
                      '구름많음'
                    when s.sky = 4 then
                      '흐림'
                  end
                  when s.pty = 1 then
                    '비'
                  when s.pty = 2 then
                    '비/눈'
                  when s.pty = 3 then
                    '눈'
                  when s.pty = 5 then
                    '빗방울'
                  when s.pty = 6 then
                    '빗방울눈날림'
                  when s.pty = 7 then
                    '눈날림'
              end as weatherName
                from vw_apd b, (
                      select 
                        *
                      from 
                        short_term_forecast
                      where
                        created_at = (
                              select
                                max(created_at)
                              from
                                short_term_forecast
                              )
                      )as s
          
      `
        )

        response = {
            resCode: '00',
            resMsg: 'NORMAL_SERVICE',
            description: ' ',
        }
        response.dataList = result[0]
        res.json(response)
    } catch (error) {
        logger.error('/orb error message:', error)
        response = {
            resCode: '00',
            resMsg: 'NORMAL_SERVICE',
            description: '',
        }
    }
})

module.exports = router
