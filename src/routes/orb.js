const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");

router.post("/", async (req, res) => {
  logger.info("/orb access");
  try {
    const result = await pool.query(
      `select
      p.id as seqNo, 
      place_type as placeType, 
      place_name as placeName,
      contact_number as placeTelno,
      concat(precipitation, 'mm') as rainFall ,
      concat(water_level, 'M') as waterLevel,
      concat(temperature, '℃') as temperature,
      concat(humidity, '%') as humidity,
      image1 as imageUrl1,
      image2 as imageUrl2,
      image3 as imageUrl3,
      image4 as imageUrl4,
      image5 as imageUrl5,
      s.created_at as obsrvtnDt,
      address1,
      address2,
      address3,
      cast(latitude as char) as latitude,
      cast(longitude as char) as longitude,
      if( short_term_forecast.pty = 0, 
      case
      when short_term_forecast.sky = 1 then
        '맑음'
      when short_term_forecast.sky = 3 then
        '구름많음'
      when short_term_forecast.sky = 4 then
        '흐림'
      end    
      , 
      case
      when short_term_forecast.pty = 1 then
        '비'
      when short_term_forecast.pty = 2 then
        '비/눈'
      when short_term_forecast.pty = 3 then
        '눈'
      when short_term_forecast.pty = 5 then
        '빗방울'
      when short_term_forecast.pty = 6 then
        '빗방울눈날림'
      when short_term_forecast.pty = 7 then
        '눈날림'
    end  		
    ) as weatherName,    		
      case 
        when water_level > water_level_danger then 
          '위험'
        when water_level > water_level_warning then
          '경고'
        when water_level > water_level_caution then
          '주의'
        else
          '정상'
    end as riskStepName
    from place p 
    left outer join (
                      select
                        place_id,
                        water_level,
                        temperature,       
                        humidity,
                        precipitation,
                        created_at
                      from sensor, (select max(id) as id from sensor group by place_id) x
                      where
                        1 = 1 
                      and 
                        sensor.id = x.id
                    ) s
    on s.place_id = p.sensor_id 
    left outer join risk_detection r
    on p.sensor_id = r.id, (
                            select 
                              * 
                            from 
                              short_term_forecast 
                            where 
                              created_at = (select max(created_at) from short_term_forecast)) as short_term_forecast`
    );

    response = {
      resCode: "00",
      resMsg: "NORMAL_SERVICE",
      description: "test",
    };
    response.dataList = result[0];
    res.json(response);
  } catch (error) {
    logger.error("/orb error message:", error);
    response = {
      resCode: "00",
      resMsg: "NORMAL_SERVICE",
      description: "test",
    };
  }
});

router.post("/test", async (req, res) => {});

module.exports = router;
