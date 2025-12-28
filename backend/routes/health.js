import express from "express";

const router = express.Router();

/**
 * GET /api/health
 */
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "health",
    endpoints: {
      summary: "/api/health/summary",
      metrics: "/api/health/metrics"
    }
  });
});

/**
 * GET /api/health/summary
 */
router.get("/summary", (req, res) => {
  res.json({
    appointments: [
      {
        id: 1,
        doctor: "Dr. Darius Klaine",
        specialty: "Dentist",
        date: "Tomorrow",
        time: "10:00"
      }
    ],
    nearby: [
      {
        id: 1,
        name: "St. John Hospital",
        distance: "200m"
      }
    ],
    alerts: [
      {
        id: 1,
        text: "Latest health alerts and AI tips"
      }
    ]
  });
});

/**
 * GET /api/health/metrics
 */
router.get("/metrics", (req, res) => {
  res.json({
    pulse: 72,
    sleep: 7.4,
    pressure: "120/80",
    sugar: 5.2,
    weight: 74
  });
});

export default router;
