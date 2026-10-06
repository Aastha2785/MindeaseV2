const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

const { analyzeFace } = require("../controllers/faceController");

router.post("/analyze" , requireAuth, requireRole("student"), analyzeFace);

module.exports = router;
