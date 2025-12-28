const router = require("express").Router();

router.post("/", async (req, res) => {
  const { type, value, userId } = req.body;

  // дальше — SMS / email / trusted contacts
  res.json({
    status: "alert_sent",
    type,
    value,
    userId
  });
});

module.exports = router;
