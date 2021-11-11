const express = require("express");
const router = express.Router();
const { verifyToken } = require("./middlewares");

const sensor = require("./sensor.js");
const token = require("./token.js");
const manager = require("./manager.js");
const weather = require("./weather.js");
const orb = require("./orb.js");

router.use("/sensor", sensor);
router.use("/token", token);
router.use("/manager", manager);
router.use("/weather", weather);
router.use("/orb", orb);

module.exports = router;
