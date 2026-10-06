const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Please login first" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        if (!req.user?.user_id) throw new Error("Invalid token");
        const result = await pool.query("SELECT user_id, role, account_status FROM users WHERE user_id = $1", [req.user.user_id]);
        if (!result.rows.length || result.rows[0].account_status !== "active") return res.status(403).json({ success: false, error: "Account is disabled" });
        req.user.role = result.rows[0].role;
        if (result.rows[0].role === "student") {
            pool.query("UPDATE users SET last_active_at = NOW() WHERE user_id = $1", [req.user.user_id]).catch(() => {});
            const path = req.path || req.originalUrl || "";
            const activityType = path.includes("journal") ? "JOURNAL" : path.includes("face") ? "FACE_SCAN" : path.includes("analysis") ? "AI_ANALYSIS" : path.includes("tasks") ? "DAILY_TASKS" : path.includes("profile") ? "PROFILE" : "APP_ACTIVITY";
            pool.query("INSERT INTO user_activity (user_id, activity_type, metadata) VALUES ($1, $2, $3)", [req.user.user_id, activityType, JSON.stringify({ method: req.method })]).catch(() => {});
        }
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: "Session expired. Please login again" });
    }
};

const requireRole = (role) => (req, res, next) => {
    if (!req.user || req.user.role !== role) return res.status(403).json({ success: false, error: "Not allowed" });
    next();
};

const requirePermission = (permission) => async (req, res, next) => {
    try {
        if (req.user?.role !== "admin") return res.status(403).json({ success: false, error: "Not allowed" });
        const result = await pool.query("SELECT admin_permissions FROM users WHERE user_id = $1", [req.user.user_id]);
        const permissions = result.rows[0]?.admin_permissions || {};
        if (permissions[permission] !== true) return res.status(403).json({ success: false, error: "You do not have permission for this action" });
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: "Unable to verify permissions" });
    }
};

module.exports = { requireAuth, requireRole, requirePermission };
