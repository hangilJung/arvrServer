const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("./middlewares");
const moment = require("moment");
const logger = require("../config/logger");
const headerErrorCode = require("../headerErrorCode");

router.post("/v1", async (req, res) => {
  logger.info("/token/v1 access");
  const client_secret = req.headers.authorization;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  let response = {
    header: {},
  };
  try {
    const result = await pool.query(
      "select * from domain where client_secret = ?",
      [client_secret]
    );
    if (result[0].length > 0) {
      const accessToken = jwt.sign(
        {
          expires_at: moment().add(2, "h").format("YYYY-MM-DD HH:mm:ss"),
          issued_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "2h",
          issuer: "coporation sooin",
        }
      );

      response.header = headerErrorCode.tokenIssuanceSuccess;

      response.body = {
        accessToken,
        expires_at: moment().add(2, "h").format("YYYY-MM-DD HH:mm:ss"),
        issued_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      };

      res.json(response);
    } else {
      logger.error("/token/v1 error message: NOT_ALLOW_KEY");
      response.header = headerErrorCode.notAllowKey;

      res.status(400).json(response);
    }
  } catch (error) {
    logger.error("/token/v1 error message:", error);
    response.header = headerErrorCode.registraionInquiry;

    res.status(401).json(response);
  }
});

router.post("/test", verifyToken, (req, res) => {
  let response = {
    header: {},
  };

  response.header = headerErrorCode.normalService;
  response.body = { decoded: req.decoded };

  res.json(response);
});

module.exports = router;
