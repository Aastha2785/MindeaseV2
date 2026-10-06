const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const {
    registerUser,
    loginUser,
    updateConsentShare,
    getConsentShare
} = require("../controllers/authController");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/consent", requireAuth, getConsentShare);
router.patch("/consent", requireAuth, updateConsentShare);

module.exports = router;