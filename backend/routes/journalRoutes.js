const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

const {
    analyzeJournal,
    getJournalHistory,
    deleteJournal
} = require("../controllers/journalController");


router.post("/analyze", requireAuth, requireRole("student"), analyzeJournal)


router.get(
    "/history" , requireAuth, requireRole("student"),
    getJournalHistory
);


router.delete(
    "/:journal_id" , requireAuth, requireRole("student"),
    deleteJournal
);


module.exports = router;