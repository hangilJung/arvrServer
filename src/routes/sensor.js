const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const moment = require("moment");
const logger = require("../config/logger");
const headerErrorCode = require("../headerErrorCode");

function dateChecker(start_date, end_date) {
  return (
    moment(start_date).format("YYYYMMDD") === "Invalid date" ||
    moment(end_date).format("YYYYMMDD") === "Invalid date" ||
    Number(moment(start_date).format("YYYYMMDD")) >
      Number(moment(end_date).format("YYYYMMDD"))
  );
}

async function sensorSearch(req) {
  logger.info(`/sensor${req.url} access`);
  const { place_id, start_date } = req.body;

  let { end_date } = req.body;
  end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
  let condition = [];
  let response = {
    header: {},
  };
  let sql = `
  select
    cast(cast((precipitation) as decimal(3, 1)) as float) as precipitation,
    cast(cast((water_level) as decimal(3, 1)) as float) as water_level,
    cast(cast((temperature) as decimal(3, 1)) as float) as temperature,
    cast(cast((humidity) as decimal(3, 1)) as float) as humidity,
    created_at
  from
    sensor_data
  where
    1 = 1 `;

  if (dateChecker(start_date, end_date)) {
    response.header = headerErrorCode.invalidRequestParameterError;

    return response;
  }

  try {
    if (place_id) {
      sql += " and place_id = ?";
      condition.push(place_id);
    }
    if (start_date && end_date) {
      if (req.url === "/test") {
        sql +=
          " and water_level < 9 and created_at >= ? and created_at < ? order by created_at ";
      } else if (req.url === "/year") {
        sql +=
          " and created_at >= ? and created_at < ? group by year(created_at)";
      } else if (req.url === "/month") {
        sql +=
          " and created_at >= ? and created_at < ? group by month(created_at) order by created_at";
      } else if (req.url === "/daily") {
        sql +=
          " and created_at >= ? and created_at < ? group by day(created_at) order by created_at";
      } else if (req.url === "/hour") {
        sql +=
          " and created_at >= ? and created_at < ? group by hour(created_at) order by created_at";
      } else if (req.url === "/minute") {
        sql +=
          " and water_level < 9 and created_at >= ? and created_at < ? order by created_at ";
      }
      condition.push(start_date);
      condition.push(end_date);
    }

    const databaseOnLoadResult = await pool.query(sql, condition);

    response.header = headerErrorCode.normalService;
    response.body = databaseOnLoadResult[0];

    return response;
  } catch (error) {
    logger.error(`/sensor${req.url} error message: ${error}`);
    response.header = headerErrorCode.invalidRequestParameterError;

    return response;
  }
}

router.post("/", async (req, res) => {
  logger.info("/sensor access");
  const { place_id } = req.body;

  let response = {
    header: {},
  };

  try {
    let sql = `
    select 
      * 
    from 
      sensor_data
    where 
      1 = 1 
    and 
      place_id = ? 
    and 
      created_at =
                  (
                    select 
                      max(created_at) 
                    from 
                      sensor_data 
                    where 
                      place_id = ${place_id}
                  )`;

    const databaseOnLoadResult = await pool.query(sql, [place_id]);

    response.header = headerErrorCode.normalService;
    response.body = databaseOnLoadResult[0];

    res.json(response);
  } catch (error) {
    logger.error("/sensor url error message:", error);

    response.header = headerErrorCode.invalidRequestParameterError;

    res.status(400).json(response);
  }
});

router.post("/year", async (req, res) => {
  try {
    res.json(await sensorSearch(req));
  } catch (error) {
    res.status(400).json(await sensorSearch(req));
  }
});

router.post("/month", async (req, res) => {
  try {
    res.json(await sensorSearch(req));
  } catch (error) {
    res.status(400).json(await sensorSearch(req));
  }
});

router.post("/daily", async (req, res) => {
  try {
    res.json(await sensorSearch(req));
  } catch (error) {
    res.status(400).json(sensorSearch(req));
  }
});

router.post("/hour", async (req, res) => {
  try {
    res.json(await sensorSearch(req));
  } catch (error) {
    res.status(400).json(await sensorSearch(req));
  }
});

router.post("/minute", async (req, res) => {
  try {
    res.json(await sensorSearch(req));
  } catch (error) {
    res.status(400).json(await sensorSearch(req));
  }
});

// router.post("/yearly", async (req, res) => {
//   logger.info("/sensor/year access");
//   const { place_id, start_date } = req.body;
//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");

//   let sql = `select cast(avg(precipitation) as signed integer) as precipitation,
//   cast(avg(water_level) as signed integer) as water_level,
//   cast(avg(temperature) as signed integer) as temperature,
//   cast(avg(humidity) as signed integer) as humidity, date_format(created_at, '%Y-%m-%d %T') as created_at
//   from sensor where 1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }

//   try {
//     if (place_id) {
//       sql += " and place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and created_at >= ? and created_at < ? group by year(created_at)";

//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/yearerror message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }
// });

// router.post("/year", async (req, res) => {
//   logger.info("/sensor/month access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");

//   let sql = `select
//   concat(month(s.created_at), '월') as month,
//   cast(avg(precipitation) as signed integer) as precipitation,
//   cast(avg(water_level) as signed integer) as water_level,
//   cast(avg(temperature) as signed integer) as temperature,
//   cast(avg(humidity) as signed integer) as humidity,
//   date_format(s.created_at, '%Y-%m-%d %T') as created_at, r.water_level_caution, r.water_level_warning, r.water_level_danger
//   from sensor s
//   join risk_detection r
//   on s.place_id = r.id
//   where 1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }

//   try {
//     if (place_id) {
//       sql += " and s.place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and s.created_at >= ? and s.created_at < ? group by month(s.created_at)";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const result = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = result[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/year error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }
// });

// router.post("/month", async (req, res) => {
//   logger.info("/sensor/daily access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
//   let sql = `
//   select
//     cast(avg(precipitation) as signed integer) as precipitation,
//     cast(avg(water_level) as signed integer) as water_level,
//     cast(avg(temperature) as signed integer) as temperature,
//     cast(avg(humidity) as signed integer) as humidity,
//     date_format(s.created_at, '%Y-%m-%d %T') as created_at,
//     r.water_level_caution,
//     r.water_level_warning,
//     r.water_level_danger
//   from
// 	  sensor s
//   join
// 	  risk_detection r
//   on
// 	  s.place_id = r.id
//   where
// 	  1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }

//   try {
//     if (place_id) {
//       sql += " and s.place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and s.created_at >= ? and s.created_at < ? group by day(s.created_at) order by s.created_at";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/hour error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
// });

// router.post("/daily", async (req, res) => {
//   logger.info("/sensor/hour access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
//   let sql = `
//   select
//     cast(avg(precipitation) as signed integer) as precipitation,
//     cast(avg(water_level) as signed integer) as water_level,
//     cast(avg(temperature) as signed integer) as temperature,
//     cast(avg(humidity) as signed integer) as humidity,
//     date_format(s.created_at, '%Y-%m-%d %T') as created_at,
//     r.water_level_caution,
//     r.water_level_warning,
//     r.water_level_danger
//   from
//     sensor s
//   join
//     risk_detection r
//   on
//     s.place_id = r.id
//   where
//     1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
//   try {
//     if (place_id) {
//       sql += " and s.place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and s.created_at >= ? and s.created_at < ? group by day(s.created_at), hour(s.created_at) order by s.created_at";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/hour error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
// });

// router.post("/risk", async (req, res) => {
//   logger.info("/sensor/risk access");
//   const data = req.body;
//   let response = {
//     header: {},
//   };
//   let cnt = 0;

//   try {
//     for (let i = 0; i < data.length; i++) {
//       const databaseOnSaveResult = await pool.query(
//         "update risk_detection set water_level_danger = ? where id = ?",
//         [Number(data[i].water_level_danger), data[i].place_id]
//       );

//       if (databaseOnSaveResult[0].affectedRows > 0) {
//         cnt = cnt + 1;
//       }
//     }

//     if (cnt >= data.length) {
//       response.header = headerErrorCode.normalService;
//     } else {
//       response.header = headerErrorCode.invalidRequestParameterError;
//     }

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/risk error message:", error);
//     console.log(error);
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }
// });

// router.post("/readrisk", async (req, res) => {
//   let response = {
//     header: {},
//   };
//   try {
//     const databaseOnLoadResult = await pool.query(
//       "select * from risk_detection"
//     );
//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/readrisk error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }
// });

// router.post("/test", async (req, res) => {
//   try {
//     const databaseOnLoadResult = await pool.query("select * from sensor");
//     res.json(databaseOnLoadResult[0]);
//   } catch (error) {}
// });

// router.post("/yearly", async (req, res) => {
//   logger.info("/sensor/year access");
//   const { place_id, start_date } = req.body;
//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");

//   let sql = `select cast(avg(precipitation) as signed integer) as precipitation,
//   cast(avg(water_level) as signed integer) as water_level,
//   cast(avg(temperature) as signed integer) as temperature,
//   cast(avg(humidity) as signed integer) as humidity, date_format(created_at, '%Y-%m-%d %T') as created_at
//   from sensor_data where 1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }

//   try {
//     if (place_id) {
//       sql += " and place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and created_at >= ? and created_at < ? group by year(created_at)";

//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/yearerror message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }
// });

router.post("/insert", async (req, res) => {
  logger.info("/sensor/insert access");
  const { place_id, precipitation, water_level, temperature, humidity } =
    req.body.dataList;
  let response = {
    header: {},
  };

  try {
    const databaseOnSaveResult = await pool.query(
      "insert into sensor_data (place_id, precipitation, water_level, temperature, humidity) values (?, ?, ?, ?, ?)", //여러 PLC 에서 값이 들어오면 수정해야함
      [place_id, precipitation, water_level, temperature, humidity]
    );
    if (databaseOnSaveResult[0].affectedRows > 0) {
      response.header = headerErrorCode.normalService;
      res.json(response);
    } else {
      response.header = headerErrorCode.invalidRequestParameterError;
      res.status(400).json(response);
    }
  } catch (error) {
    logger.error("/sensor/insert error message:", error);
    console.log(error);
    response.header = headerErrorCode.noDataError;
    res.status(400).json(response);
  }
});

// router.post("/year", async (req, res) => {
//   logger.info("/sensor/month access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");

//   let sql = `
//   select
//     cast(avg(precipitation) as signed integer) as precipitation,
//     cast(avg(water_level) as signed integer) as water_level,
//     cast(avg(temperature) as signed integer) as temperature,
//     cast(avg(humidity) as signed integer) as humidity,
//     date_format(s.created_at, '%Y') as created_at,
//     r.water_level_caution,
//     r.water_level_warning,
//     r.water_level_danger
//   from
//     sensor_data s
//   join
//     risk_detection r
//   on
//     s.place_id = r.id
//   where
//     1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }

//   try {
//     if (place_id) {
//       sql += " and s.place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and s.created_at >= ? and s.created_at < ? group by year(s.created_at)";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const result = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = result[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/year error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }
// });

// router.post("/month", async (req, res) => {
//   logger.info("/sensor/daily access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
//   let sql = `
//   select
//     cast(cast((precipitation) as decimal(3, 1)) as float) as precipitation,
//     cast(cast((water_level) as decimal(3, 1)) as float) as water_level,
//     cast(cast((temperature) as decimal(3, 1)) as float) as temperature,
//     cast(cast((humidity) as decimal(3, 1)) as float) as humidity,
//     date_format(s.created_at, '%Y-%m') as created_at,
//     r.water_level_caution,
//     r.water_level_warning,
//     r.water_level_danger
//   from
// 	  sensor_data s
//   join
// 	  risk_detection r
//   on
// 	  s.place_id = r.id
//   where
// 	  1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;
//     res.status(400).json(response);
//   }

//   try {
//     if (place_id) {
//       sql += " and s.place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and s.created_at >= ? and s.created_at < ? group by month(s.created_at) order by s.created_at";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/hour error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
// });

// router.post("/daily", async (req, res) => {
//   logger.info("/sensor/daily access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
//   let sql = `
//   select
//     cast(cast((precipitation) as decimal(3, 1)) as float) as precipitation,
//     cast(cast((water_level) as decimal(3, 1)) as float) as water_level,
//     cast(cast((temperature) as decimal(3, 1)) as float) as temperature,
//     cast(cast((humidity) as decimal(3, 1)) as float) as humidity,
//     date_format(s.created_at, '%Y-%m-%d') as created_at,
//     r.water_level_caution,
//     r.water_level_warning,
//     r.water_level_danger
//   from
//     sensor_data s
//   join
//     risk_detection r
//   on
//     s.place_id = r.id
//   where
//     1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
//   try {
//     if (place_id) {
//       sql += " and s.place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and s.created_at >= ? and s.created_at < ? group by day(s.created_at) order by s.created_at";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/hour error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
// });

// router.post("/hour", async (req, res) => {
//   logger.info("/sensor/hour access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
//   let sql = `
//   select
//     cast(cast(avg(precipitation) as decimal(3, 1)) as float) as precipitation,
//     cast(cast(avg(water_level) as decimal(3, 1)) as float) as water_level,
//     cast(cast(avg(temperature) as decimal(3, 1)) as float) as temperature,
//     cast(cast(avg(humidity) as decimal(3, 1)) as float) as humidity,
//     date_format(s.created_at, '%Y-%m-%d %T') as created_at,
//     r.water_level_caution,
//     r.water_level_warning,
//     r.water_level_danger
//   from
//     sensor_data s
//   join
//     risk_detection r
//   on
//     s.place_id = r.id
//   where
//     1 = 1`;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
//   try {
//     if (place_id) {
//       sql += " and s.place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and s.created_at >= ? and s.created_at < ? group by hour(s.created_at) order by s.created_at";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/hour error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
// });

// router.post("/minute", async (req, res) => {
//   logger.info("/sensor/hour access");
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
//   let sql = `
//   select
//     cast(cast((precipitation) as decimal(3, 1)) as float) as precipitation,
//     cast(cast((water_level) as decimal(3, 1)) as float) as water_level,
//     cast(cast((temperature) as decimal(3, 1)) as float) as temperature,
//     cast(cast((humidity) as decimal(3, 1)) as float) as humidity,
//     created_at
//   from
//     sensor_data
//   where
//     1 = 1 `;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
//   try {
//     if (place_id) {
//       sql += " and place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and water_level < 9 and created_at >= ? and created_at < ? order by created_at ";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/hour error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
// });

// router.post("/test", async (req, res) => {
//   logger.info("/sensor/hour access");
//   logger.info("method" + req.method);
//   logger.info("url:" + req.url);
//   const { place_id, start_date } = req.body;

//   let { end_date } = req.body;
//   end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
//   let sql = `
//   select
//     cast(cast((precipitation) as decimal(3, 1)) as float) as precipitation,
//     cast(cast((water_level) as decimal(3, 1)) as float) as water_level,
//     cast(cast((temperature) as decimal(3, 1)) as float) as temperature,
//     cast(cast((humidity) as decimal(3, 1)) as float) as humidity,
//     created_at
//   from
//     sensor_data
//   where
//     1 = 1 `;
//   let condition = [];
//   let response = {
//     header: {},
//   };

//   if (dateChecker(start_date, end_date)) {
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
//   try {
//     if (place_id) {
//       sql += " and place_id = ?";
//       condition.push(place_id);
//     }

//     if (start_date && end_date) {
//       sql +=
//         " and water_level < 9 and created_at >= ? and created_at < ? order by created_at ";
//       condition.push(start_date);
//       condition.push(end_date);
//     }

//     const databaseOnLoadResult = await pool.query(sql, condition);

//     response.header = headerErrorCode.normalService;
//     response.body = databaseOnLoadResult[0];

//     res.json(response);
//   } catch (error) {
//     logger.error("/sensor/hour error message:", error);
//     response.header = headerErrorCode.invalidRequestParameterError;

//     res.status(400).json(response);
//   }
// });

module.exports = router;
