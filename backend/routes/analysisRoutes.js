const express = require("express");
const {
  requireAuth,
  requireRole,
} = require("../middleware/auth");

const {
  analyzeOverallMood,
  getWeeklyMood,
} = require("../controllers/analysisController");

const router = express.Router();

/*
 * Analyze the user's overall mood.
 * Student-only route.
 */
router.post(
  "/overall",
  requireAuth,
  requireRole("student"),
  analyzeOverallMood
);

/*
 * Get the user's weekly mood data.
 * Student-only route.
 */
router.get(
  "/weekly",
  requireAuth,
  requireRole("student"),
  getWeeklyMood
);

module.exports = router;