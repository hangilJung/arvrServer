const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const logger = require('../config/logger')
const axios = require('axios')

require('dotenv').config()

router.post('/', (req, res) => {
    logger.info('AppPush access')
    console.log('AppPush Access')
    const firebaseKey = process.env.FIREBASE_KEY

    pool.query(
        `
            SELECT
                W.ID, W.PLACE_ID, P.PLACE_NAME
            FROM 
                WATER_LEVEL_NOTIFICATION_QUEUE W
            JOIN
                PLACE P
            ON
                P.ID = W.PLACE_ID
            `,
        (err, queryResult) => {
            if (!err && queryResult.length) {
                const axiosPromises = queryResult.map((row) => {
                    switch (row.PLACE_ID) {
                        case 1:
                            rPlaceName = '순천만습지'
                            break
                        case 2:
                            rPlaceName = '조곡교'
                            break
                        case 3:
                            rPlaceName = '용당교'
                            break
                        case 4:
                            rPlaceName = '원용당교'
                            break
                        case 5:
                            rPlaceName = '고수부지'
                            break
                        case 6:
                            rPlaceName = '조곡교 주차장'
                            break
                    }
                    try {
                        if (row.PLACE_ID === 2 || row.PLACE_ID === 3 || row.PLACE_ID === 4) {
                            pool.query(
                                `
                                select
                                    criteria_of_evacuation_flag
                                from
                                    bscd_water_level_notification
                                where
                                    place_id = ${row.PLACE_ID}                                
                            `,
                                (err, queryResult) => {
                                    console.log('@', queryResult[0].criteria_of_evacuation_flag)
                                    if (queryResult[0].criteria_of_evacuation_flag === 'Y') {
                                        axios.post(
                                            'https://fcm.googleapis.com/fcm/send',
                                            {
                                                to: '/topics/5',
                                                priority: 'high',
                                                content_available: true,
                                                notification: {
                                                    title: '[긴급 알림] 동천 위험 수위 도달',
                                                    body: `현재 ${rPlaceName} 수위가 위험 수위에 도달하여 하천의 범람이 우려되오니 차량을 이동시켜 주시기 바랍니다.`,
                                                },
                                            },
                                            {
                                                headers: {
                                                    Authorization: firebaseKey,
                                                },
                                            }
                                        )
                                    } else if (queryResult[0].criteria_of_evacuation_flag === 'N') {
                                        axios.post(
                                            'https://fcm.googleapis.com/fcm/send',
                                            {
                                                to: '/topics/5',
                                                priority: 'high',
                                                content_available: true,
                                                notification: {
                                                    title: '[위험 해제] 동천 위험 수위 해제',
                                                    body: `현재 ${rPlaceName} 수위가 위험 해제되었습니다.`,
                                                },
                                            },
                                            {
                                                headers: {
                                                    Authorization: firebaseKey,
                                                },
                                            }
                                        )
                                    }
                                }
                            )
                        } else if (row.PLACE_ID === 1) {
                            pool.query(
                                `
                                select
                                    criteria_of_evacuation_flag
                                from
                                    bscd_water_level_notification
                                where
                                    place_id = ${row.PLACE_ID}                                
                            `,
                                (err, queryResult) => {
                                    if (queryResult[0].criteria_of_evacuation_flag === 'Y') {
                                        axios.post(
                                            'https://fcm.googleapis.com/fcm/send',
                                            {
                                                to: '/topics/6',
                                                priority: 'high',
                                                content_available: true,
                                                notification: {
                                                    title: '[긴급 알림] 순천만습지 위험 수위 도달',
                                                    body: '현재 순천만습지 수위가 위험 수위에 도달하여 하천의 범람이 우려되오니 차량을 이동시켜 주시기 바랍니다.',
                                                },
                                            },
                                            {
                                                headers: {
                                                    Authorization: firebaseKey,
                                                },
                                            }
                                        )
                                    } else if (queryResult[0].criteria_of_evacuation_flag === 'N') {
                                        axios.post(
                                            'https://fcm.googleapis.com/fcm/send',
                                            {
                                                to: '/topics/6',
                                                priority: 'high',
                                                content_available: true,
                                                notification: {
                                                    title: '[위험 해제] 순천만습지 위험 수위 해제',
                                                    body: '현재 순천만습지 수위가 위험 해제되었습니다.',
                                                },
                                            },
                                            {
                                                headers: {
                                                    Authorization: firebaseKey,
                                                },
                                            }
                                        )
                                    }
                                }
                            )
                        }

                        return row['ID'] || 0
                    } catch (err) {
                        console.log('error 처리 따로 할 것')
                        console.log(err)
                    }
                })
                if (!err && queryResult.length) {
                    Promise.all(axiosPromises).then((rowIdArray) => {
                        pool.query(
                            `
                                    DELETE FROM WATER_LEVEL_NOTIFICATION_QUEUE
                                    WHERE 1 = 1
                                    AND ID IN(${rowIdArray.join(',')})
                                    `,
                            (err, queryResult) => {
                                console.log(queryResult)
                            }
                        )
                    })
                }
            }
        }
    )

    res.json('푸시에 접근')
})

module.exports = router
