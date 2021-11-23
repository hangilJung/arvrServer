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
      Number(moment(end_date).format("YYYYMMDD")) ||
    Number(moment(start_date).format("YYYYMMDD")) >
      Number(moment().format("YYYYMMDD"))
  );
}

const leach = (list) => {
  let setList = [];

  for (let data of list) {
    if (data.water_level_attention === "") {
      delete data.water_level_attention;
    }
    if (data.water_level_boundary === "") {
      delete data.water_level_boundary;
    }
    if (data.water_level_caution === "") {
      delete data.water_level_caution;
    }
    if (data.water_level_danger === "") {
      delete data.water_level_danger;
    }
  }

  for (let data of list) {
    console.log(Object.keys(data).length);
    if (Object.keys(data).length > 1) {
      setList.push(data);
    }
  }
  return setList;
};

async function sensorSearch(req) {
  logger.info(`/sensor${req.url} access`);
  const { place_id, start_date } = req.body;

  let { end_date } = req.body;
  end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
  let condition = [];
  let response = {
    header: {},
  };
  let precipitationOperator;
  let waterLevelOperator;
  let temperauterOperator;
  let humidityOperator;

  if (req.url === "/year" || req.url === "/month") {
    precipitationOperator = "sum((s.precipitation))";
    waterLevelOperator = "avg((s.water_level))";
    temperauterOperator = "avg((s.temperature))";
    humidityOperator = "avg((s.humidity))";
  } else if (req.url === "/minute") {
    precipitationOperator = "(s.precipitation)";
    waterLevelOperator = "(s.water_level)";
    temperauterOperator = "(s.temperature)";
    humidityOperator = "(s.humidity)";
  }

  let sql = `
  select
    cast(cast(${precipitationOperator} as decimal(6, 1)) as float) as precipitation,
    cast(cast(${waterLevelOperator} as decimal(6, 1)) as float) as water_level,
    cast(cast(${temperauterOperator} as decimal(6, 1)) as float) as temperature,
    cast(cast(${humidityOperator} as decimal(6, 1)) as float) as humidity,
    cast(cast((p.water_level_attention) as decimal(6, 1)) as float) as water_level_attention,    
    cast(cast((p.water_level_attention) as decimal(6, 1)) as float) as water_level_boundary,
    p.water_level_caution,
    p.water_level_boundary,    
    p.water_level_danger,
    s.created_at    
  from
    sensor_data as s
  join 
    place as p
  on
    s.place_id = p.id
  where
    1 = 1`;

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
      if (req.url === "/year") {
        sql +=
          " and s.created_at >= ? and s.created_at < ? group by month(s.created_at)";
      } else if (req.url === "/month") {
        sql +=
          " and s.created_at >= ? and s.created_at < ? group by day(s.created_at)  order by s.created_at";
      } else if (req.url === "/minute") {
        sql +=
          " and s.water_level < 9 and s.created_at >= ? and s.created_at < ? order by s.created_at ";
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

router.post("/daily", async (req, res) => {
  logger.info(`/sensor/daily access`);
  const { place_id, start_date } = req.body;

  let { end_date } = req.body;
  end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
  let condition = [];
  let response = {
    header: {},
  };

  let sql = `
    select
      c.precipitation,  
      d.water_level,
      d.temperature,
      d.humidity,
      d.water_level_attention,
    	d.water_level_caution,
      d.water_level_boundary,
      d.water_level_danger,
      date_format(d.created_at, '%H') as created_at
    from
      (
      select
        cast(cast((a.precipitation) as decimal(3, 1)) as float) as precipitation,
        date_format(b.created_at, '%Y-%m-%d %H') as created_at
      from
        sensor_data as a
      join
        (
        select
          max(created_at) as created_at
        from
          sensor_data
        where
          place_id = ?
        and
          created_at >= ?
        and
          created_at < ?
        group by
          day(created_at),
          hour(created_at)
        ) as b
      on
        a.created_at = b.created_at
      where
          place_id = ?
      ) as c
    join
      (	
      select
        cast(cast(avg((s.water_level)) as decimal(6, 1)) as float) as water_level,
        cast(cast(avg((s.temperature)) as decimal(6, 1)) as float) as temperature,
        cast(cast(avg((s.humidity)) as decimal(6, 1)) as float) as humidity,
        cast(cast((p.water_level_attention) as decimal(3, 1)) as float) as water_level_attention,
        cast(cast((p.water_level_caution) as decimal(3, 1)) as float) as water_level_caution,
        cast(cast((p.water_level_boundary) as decimal(3, 1)) as float) as water_level_boundary,
        cast(cast((p.water_level_danger) as decimal(3, 1)) as float) as water_level_danger,
        date_format(s.created_at, '%Y-%m-%d %H') as created_at
      from
        sensor_data as s
      join 
        place as p
      on
        s.place_id = p.id
      where
        1 = 1
      and
        place_id = ?
      and
        s.created_at >= ?
      and
        s.created_at < ?
      group by
        day(created_at),
        hour(s.created_at)
      order by 
        s.created_at
      ) as d
    on
      d.created_at = c.created_at
  `;
  condition = [
    place_id,
    start_date,
    end_date,
    place_id,
    place_id,
    start_date,
    end_date,
  ];

  const databaseOnLoadResult = await pool.query(sql, condition);

  response.header = headerErrorCode.normalService;
  response.body = databaseOnLoadResult[0];

  res.json(response);

  try {
  } catch (error) {
    logger.error(`/sensor/daily error message: ${error}`);
    response.header = headerErrorCode.invalidRequestParameterError;

    res.status(400).json(response);
  }
});

router.post("/month", async (req, res) => {
  logger.info(`/sensor/month access`);
  console.log(req.body);
  const { place_id, start_date } = req.body;

  let { end_date } = req.body;
  end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
  let condition = [];
  let response = {
    header: {},
  };

  let sql = `
    select
      i.precipitation,
      j.water_level,
      j.temperature,
      j.humidity,
      j.water_level_attention,
      j.water_level_caution,
      j.water_level_boundary,
      j.water_level_danger,
      date_format(j.created_at, '%d') as  created_at
    from
      (
        select
        cast(sum((c.precipitation)) as float) as precipitation,
        date_format(c.created_at, '%Y-%m-%d') as created_at
      from
        sensor_data as c
      join
        (
        select
          max(a.created_at) as created_at
        from
          sensor_data as a
        where
          place_id = ?
        and
          created_at >= ?
        and
          created_at < ?
        group by
          day(created_at), hour(created_at)
        ) as b
      on
        b.created_at = c.created_at
      where
        place_id = ?
      group by
        day(c.created_at)
        ) as i
    join
      (
        select
        cast(cast(avg((d.water_level)) as decimal(6, 1)) as float) as water_level,
        cast(cast(avg((d.temperature)) as decimal(6, 1)) as float) as temperature,
        cast(cast(avg((D.humidity)) as decimal(6, 1)) as float) as humidity,
        cast(cast((p.water_level_attention) as decimal(3, 1)) as float) as water_level_attention,
        cast(cast((p.water_level_caution) as decimal(3, 1)) as float) as water_level_caution,
        cast(cast((p.water_level_boundary) as decimal(3, 1)) as float) as water_level_boundary,
        cast(cast((p.water_level_danger) as decimal(3, 1)) as float) as water_level_danger,
        date_format(d.created_at, '%Y-%m-%d') as created_at
      from
        sensor_data as d
      join
        place as p
      on
        d.place_id = p.id
      where
        created_at >= ?
      and
        created_at < ?
      and
        place_id = ?
      group by
        day(d.created_at)
      ) as j
    on
      i.created_at = j.created_at
  `;
  condition = [
    place_id,
    start_date,
    end_date,
    place_id,
    start_date,
    end_date,
    place_id,
  ];

  const databaseOnLoadResult = await pool.query(sql, condition);

  response.header = headerErrorCode.normalService;
  response.body = databaseOnLoadResult[0];

  res.json(response);

  try {
  } catch (error) {
    logger.error(`/sensor/month error message: ${error}`);
    response.header = headerErrorCode.invalidRequestParameterError;

    res.status(400).json(response);
  }
});

router.post("/year", async (req, res) => {
  logger.info(`/sensor/year access`);
  console.log(req.body);
  const { place_id, start_date } = req.body;

  let { end_date } = req.body;
  end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
  let condition = [];
  let response = {
    header: {},
  };

  let sql = `
    select     
      cast(SUM(x) as float) as  precipitation,
      cast(cast(avg(water) as decimal(6, 1)) as float) as water_level, 
      cast(cast(avg(temp) as decimal(6, 1)) as float) as  temperature,
      cast(cast(avg(humi) as  decimal(6, 1)) as float) as humidity,
      cast(cast(p.water_level_attention as decimal(6, 1)) as float) as water_level_attention,
      cast(cast(p.water_level_caution as decimal(6, 1)) as float) as water_level_caution,
      cast(cast(p.water_level_boundary as decimal(6, 1)) as float) as water_level_boundary,
      cast(cast(p.water_level_danger as decimal(6, 1)) as float) as water_level_danger,
      date_format(created_at, '%m') as  created_at
    from ( 
        select
          month(created_at) as months, 
          day(created_at) as days, 
          hour(created_at) as hours,
          MAX(precipitation) as x,
          avg(water_level) as water,
          avg(temperature) as temp,
          avg(humidity) as humi,
          created_at,
          place_id
        from 
          sensor_data
        where 
          1 = 1 
        and
          place_id = ?
        and 
          created_at >= ?
        and 
          created_at < ?
        group by
          month(created_at), 
          day(created_at), 
          hour(created_at)
        ) a
    join
      place p
    on
      a.place_id = p.id  
    group by months;
  `;
  condition = [place_id, start_date, end_date];

  const databaseOnLoadResult = await pool.query(sql, condition);

  response.header = headerErrorCode.normalService;
  response.body = databaseOnLoadResult[0];

  res.json(response);

  try {
  } catch (error) {
    logger.error(`/sensor/year error message: ${error}`);
    response.header = headerErrorCode.invalidRequestParameterError;

    res.status(400).json(response);
  }
});

async function sensorSearch(req) {
  logger.info(`/sensor${req.url} access`);
  const { place_id, start_date } = req.body;

  let { end_date } = req.body;
  end_date = moment(end_date).add(1, "days").format("YYYY-MM-DD");
  let condition = [];
  let response = {
    header: {},
  };
  let precipitationOperator;
  let waterLevelOperator;
  let temperauterOperator;
  let humidityOperator;

  if (req.url === "/year" || req.url === "/daily") {
    precipitationOperator = "sum((s.precipitation))";
    waterLevelOperator = "avg((s.water_level))";
    temperauterOperator = "avg((s.temperature))";
    humidityOperator = "avg((s.humidity))";
  } else if (req.url === "/minute") {
    precipitationOperator = "(s.precipitation)";
    waterLevelOperator = "(s.water_level)";
    temperauterOperator = "(s.temperature)";
    humidityOperator = "(s.humidity)";
  }

  let sql = `
  select
    cast(cast(${precipitationOperator} as decimal(3, 1)) as float) as precipitation,
    cast(cast(${waterLevelOperator} as decimal(3, 1)) as float) as water_level,
    cast(cast(${temperauterOperator} as decimal(3, 1)) as float) as temperature,
    cast(cast(${humidityOperator} as decimal(3, 1)) as float) as humidity,
    p.water_level_attention,
    p.water_level_caution,
    p.water_level_boundary,    
    p.water_level_danger,
    s.created_at    
  from
    sensor_data as s
  join 
    place as p
  on
    s.place_id = p.id
  where
    1 = 1`;

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
      if (req.url === "/year") {
        sql +=
          " and s.created_at >= ? and s.created_at < ? group by month(s.created_at)";
      } else if (req.url === "/month") {
        sql +=
          " and s.created_at >= ? and s.created_at < ? group by day(s.created_at)  order by s.created_at";
      } else if (req.url === "/daily") {
        sql +=
          " and s.created_at >= ? and s.created_at < ? group by hour(s.created_at) order by s.created_at";
      } else if (req.url === "/minute") {
        sql +=
          " and s.water_level < 9 and s.created_at >= ? and s.created_at < ? order by s.created_at ";
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

// router.post("/year", async (req, res) => {
//   try {
//     res.json(await sensorSearch(req));
//   } catch (error) {
//     res.status(400).json(await sensorSearch(req));
//   }
// });

// router.post("/month", async (req, res) => {
//   try {
//     res.json(await sensorSearch(req));
//   } catch (error) {
//     res.status(400).json(await sensorSearch(req));
//   }
// });

// router.post("/daily", async (req, res) => {
//   try {
//     res.json(await sensorSearch(req));
//   } catch (error) {
//     res.status(400).json(sensorSearch(req));
//   }
// });

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

router.post("/test", async (req, res) => {
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

router.post("/riskinformation", async (req, res) => {
  logger.info("/sensor/riskInfomation/access");

  let response = {
    header: {},
  };

  try {
    const databaseOnLoadResult = await pool.query(
      `
      select 
        id as place_id, 
        water_level_attention, 
        water_level_caution, 
        water_level_boundary, 
        water_level_danger 
      from 
        place`
    );

    response.header = headerErrorCode.normalService;
    response.body = databaseOnLoadResult[0];

    res.json(response);
  } catch (error) {
    response.header = headerErrorCode.invalidRequestParameterError;

    res.status(400).json(response);
  }
});

router.post("/risk", async (req, res) => {
  logger.info("/sensor/risk access");
  const data = req.body;

  let response = {
    header: {},
  };
  let cnt = 0;
  let sql;
  let condition = [];

  const riskUpdateData = leach(data);

  try {
    for (let i = 0; i < riskUpdateData.length; i++) {
      sql = `update place set`;

      console.log("배열에서의 값" + riskUpdateData[i].water_level_boundary);
      if (riskUpdateData[i].water_level_attention) {
        sql += " water_level_attention = ?";
        if (
          riskUpdateData[i].water_level_caution ||
          riskUpdateData[i].water_level_boundary ||
          riskUpdateData[i].water_level_danger
        ) {
          sql += ",";
        }
        condition.push(riskUpdateData[i].water_level_attention);
      }
      if (riskUpdateData[i].water_level_caution) {
        sql += " water_level_caution = ?";
        if (
          riskUpdateData[i].water_level_boundary ||
          riskUpdateData[i].water_level_danger
        ) {
          sql += ",";
        }
        condition.push(riskUpdateData[i].water_level_caution);
      }
      if (riskUpdateData[i].water_level_boundary) {
        sql += " water_level_boundary = ?";
        if (riskUpdateData[i].water_level_danger) {
          sql += ",";
        }
        condition.push(riskUpdateData[i].water_level_boundary);
      }
      if (riskUpdateData[i].water_level_danger) {
        sql += " water_level_danger = ?";
        condition.push(riskUpdateData[i].water_level_danger);
      }
      if (riskUpdateData[i].place_id) {
        sql += " where id = ?";
        condition.push(riskUpdateData[i].place_id);
      }
      console.log(sql);
      console.log(condition);

      const databaseOnSaveResult = await pool.query(sql, condition);

      condition = [];
      sql = `update place set`;
      if (databaseOnSaveResult[0].affectedRows > 0) {
        cnt = cnt + 1;
      }
    }

    if (cnt >= riskUpdateData.length) {
      response.header = headerErrorCode.normalService;
    } else {
      response.header = headerErrorCode.invalidRequestParameterError;
    }

    res.json(response);
  } catch (error) {
    logger.error("/sensor/risk error message:", error);
    console.log(error);
    response.header = headerErrorCode.invalidRequestParameterError;
    res.status(400).json(response);
  }
});

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
