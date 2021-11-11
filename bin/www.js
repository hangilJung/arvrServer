const app = require("../app");
const logger = require("../src/config/logger");
const PORT = process.env.PORT || 3200;

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`DATA BASE 서버 가동 ${PORT}`);
});
