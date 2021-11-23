const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");
const headerErrorCode = require("../headerErrorCode");

router.post("/", async (req, res) => {
  logger.info("/short_term_live access");
  const { pty, reh, rn1, t1h, uuu, vec, vvv, wsd } = req.body.apiServerPassData;
  let response = {
    header: {},
  };
  try {
    const databaseOnSaveResult = await pool.query(
      "insert into short_term_live (pty, reh, rn1, t1h, uuu, vec, vvv, wsd) values (?, ?, ?, ?, ?, ?, ?, ?) ",
      [pty, reh, rn1, t1h, uuu, vec, vvv, wsd]
    );

    if (databaseOnSaveResult[0].affectedRows > 0) {
      response.header = headerErrorCode.normalService;
    } else {
      response.header = headerErrorCode.invalidRequestParameterError;

      res.status(400);
    }

    res.json(response);
  } catch (error) {
    logger.error("/short_term_live error message:", error);
  }
});

router.post("/read", async (req, res) => {
  logger.info("/short_term_live read access");
  let response = {
    header: {},
  };

  try {
    const databaseOnLoadResult = await pool.query(
      "select * from short_term_live where id = (select max(id) as id from short_term_live);"
    );

    response.header = headerErrorCode.normalService;
    response.body = databaseOnLoadResult[0];
  } catch (error) {
    logger.error("/short_term_live/read error message:", error);

    response.header = headerErrorCode.invalidRequestParameterError;

    res.status(400);
  } finally {
    res.json(response);
  }
});

router.post("/daily/temp", async (req, res) => {
  logger.info("/daily/temp access");
  const { tmn, tmx } = req.body.apiServerPassData;

  let response = {
    header: {},
  };
  try {
    const databaseOnSaveResult = await pool.query(
      "insert into daily_max_min_temp (tmn, tmx) values (?, ?)",
      [tmn, tmx]
    );

    if (databaseOnSaveResult[0].affectedRows > 0) {
      response.header = headerErrorCode.normalService;

      res.json(response);
    } else {
      logger.error("/daily/temp error message: INVAID_REQUEST_PARAMETER_ERROR");
      response.header = headerErrorCode.invalidRequestParameterError;

      res.status(400).json(response);
    }
  } catch (error) {
    logger.error("/daily/temp error message:", error);
    response.header = headerErrorCode.invalidRequestParameterError;

    res.status(400).json(response);
  }
});

router.post("/short", async (req, res) => {
  logger.info("/weather/short insert access");
  const { tmp, uuu, vvv, vec, wsd, sky, pty, pop, pcp, reh, sno } =
    req.body.apiServerPassData;
  let response = {
    header: {},
  };

  try {
    const databaseOnSaveResult = await pool.query(
      "insert into short_term_forecast (tmp, uuu, vvv, vec, wsd, sky, pty, pop, pcp, reh, sno) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [tmp, uuu, vvv, vec, wsd, sky, pty, pop, pcp, reh, sno]
    );

    if (databaseOnSaveResult[0].affectedRows > 0) {
      response.header = headerErrorCode.normalService;

      res.json(response);
    } else {
      logger.error(
        "/weather/short error message: INVAID_REQUEST_PARAMETER_ERROR"
      );
      response.header = headerErrorCode.invalidRequestParameterError;

      res.status(400).json(response);
    }
  } catch (error) {
    logger.error("/weather/short insert error message:", error);

    response.header = headerErrorCode.invalidRequestParameterError;
    res.status(400).json(response);
  }
});

router.post("/short/read", async (req, res) => {
  logger.info("/short/read access");
  try {
    const databaseOnLoadResult = await pool.query(
      "select * from short_term_forecast where short_term_forecast_id = (select max(short_term_forecast_id) from short_term_forecast)"
    );

    console.log(databaseOnLoadResult[0]);
    res.json(databaseOnLoadResult[0]);
  } catch (error) {
    logger.error("/short/read error message: ", error);
  }
});

router.post("/header", async (req, res) => {
  logger.info("/header access");

  let response = {
    header: {},
  };

  try {
    const databaseOnLoadResult = await pool.query(`
    select 
    if( s.pty = 0, 
    case
		when s.sky = 1 then
			'맑음'
		when s.sky = 3 then
			'구름많음'
		when s.sky = 4 then
			'흐림'
    end    
    , 
    case
		when s.pty = 1 then
			'비'
		when s.pty = 2 then
			'비/눈'
		when s.pty = 3 then
			'눈'
    when s.pty = 4 then
			'소나기'
	end	
	) as weatherName,
  s.tmp,
  s.pop,
  d.tmn,
  d.tmx, 
  s.wsd,
  s.reh,
  s.created_at    
    from (
		      select * 
		      from short_term_forecast 
          where created_at = (
							                select max(created_at) 
							                from short_term_forecast)
                              ) as s, 
	      (
		      select *
          from daily_max_min_temp
          where created_at = (
							                select max(created_at) 
                              from daily_max_min_temp)
                              ) as d;`);

    response.header = headerErrorCode.normalService;
    response.body = databaseOnLoadResult[0];

    res.json(response);
  } catch (error) {
    logger.error("/header error message:", error);

    response.header = headerErrorCode.invalidRequestParameterError;
    res.status(400).json(response);
  }
});

module.exports = router;
