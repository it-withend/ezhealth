
const router = require("express").Router();

router.post("/", (req, res) => {
  res.json({ status: "alert sent" });
});

module.exports = router;
