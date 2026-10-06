const pool = require("../config/db");

const DEFAULT_MIN_COHORT = Number(process.env.MIN_COHORT || 2);
const studentRef = (id) => `ST-${String(id).padStart(6, "0")}`;

const logAction = async (adminId, action, targetUserId = null, details = {}) => {
    await pool.query(
        `INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
         VALUES ($1, $2, $3, $4)`,
        [adminId, action, targetUserId, JSON.stringify(details)]
    );
};

const getSetting = async (key, fallback) => {
    const result = await pool.query("SELECT value FROM app_settings WHERE key = $1", [key]);
    return result.rows.length ? result.rows[0].value : fallback;
};

const getOverview = async (req, res) => {
    try {
        const minCohort = Number(await getSetting("min_cohort", DEFAULT_MIN_COHORT));
        const [users, activity, trend, emotions, alerts, usage] = await Promise.all([
            pool.query(`SELECT
                COUNT(*) FILTER (WHERE role = 'student')::int AS total_users,
                COUNT(*) FILTER (WHERE role = 'student' AND account_status = 'active')::int AS active_accounts,
                COUNT(*) FILTER (WHERE role = 'student' AND last_active_at >= NOW() - INTERVAL '7 days')::int AS active_users_7d,
                COUNT(*) FILTER (WHERE role = 'student' AND created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d
                FROM users`),
            pool.query(`SELECT COUNT(*)::int AS events_7d,
                COUNT(DISTINCT user_id)::int AS users_7d
                FROM user_activity
                WHERE user_id IN (SELECT user_id FROM users WHERE role = 'student')
                  AND created_at >= NOW() - INTERVAL '7 days'`),
            pool.query(`SELECT day,
                    ROUND(AVG(valence)::numeric, 2)::float AS avg_valence,
                    COUNT(*)::int AS participating_users
             FROM mood_daily
             WHERE day >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 29
             GROUP BY day
             HAVING COUNT(*) >= $1
             ORDER BY day`, [minCohort]),
            pool.query(`SELECT dominant_emotion, COUNT(DISTINCT user_id)::int AS users
             FROM mood_daily
             WHERE day >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 6
             GROUP BY dominant_emotion
             HAVING COUNT(DISTINCT user_id) >= $1
             ORDER BY users DESC`, [minCohort]),
            pool.query(`SELECT level, COUNT(*)::int AS open_count
             FROM alerts WHERE status <> 'resolved' GROUP BY level`),
            pool.query(`SELECT activity_type, COUNT(*)::int AS events
                FROM user_activity
                WHERE created_at >= NOW() - INTERVAL '7 days'
                  AND user_id IN (SELECT user_id FROM users WHERE role = 'student')
                GROUP BY activity_type ORDER BY events DESC LIMIT 10`)
        ]);

        res.json({
            success: true,
            min_cohort: minCohort,
            users: users.rows[0],
            activity: activity.rows[0],
            trend: trend.rows,
            emotions: emotions.rows,
            open_alerts: alerts.rows,
            usage: usage.rows
        });
    } catch (error) {
        console.error("Admin overview error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load overview" });
    }
};

const getUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const search = String(req.query.search || "").trim();
        const status = req.query.status === "disabled" ? "disabled" : req.query.status === "active" ? "active" : null;

        const params = [];
        const where = [`role = 'student'`];
        if (search) { params.push(`%${search}%`); where.push(`username ILIKE $${params.length}`); }
        if (status) { params.push(status); where.push(`account_status = $${params.length}`); }
        const whereSql = where.join(" AND ");

        const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM users WHERE ${whereSql}`, params);
        params.push(limit, offset);
        const result = await pool.query(`
            SELECT user_id, username, role, account_status, consent_share, created_at,
                   last_login_at, last_active_at
            FROM users WHERE ${whereSql}
            ORDER BY created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

        res.json({
            success: true,
            users: result.rows.map((u) => ({ ...u, student_ref: studentRef(u.user_id) })),
            pagination: { page, limit, total: countResult.rows[0].total, pages: Math.ceil(countResult.rows[0].total / limit) }
        });
    } catch (error) {
        console.error("Admin users error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load users" });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        if (!Number.isInteger(id) || !["active", "disabled"].includes(status)) {
            return res.status(400).json({ success: false, error: "Invalid user or status" });
        }
        const result = await pool.query(`UPDATE users SET account_status = $1 WHERE user_id = $2 AND role = 'student' RETURNING user_id, username, account_status`, [status, id]);
        if (!result.rows.length) return res.status(404).json({ success: false, error: "Student not found" });
        await logAction(req.user.user_id, `USER_${status.toUpperCase()}`, id, { status });
        res.json({ success: true, user: { ...result.rows[0], student_ref: studentRef(id) } });
    } catch (error) {
        console.error("Update user status error:", error.message);
        res.status(500).json({ success: false, error: "Failed to update user" });
    }
};

const getUserActivity = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ success: false, error: "Invalid user" });
        const result = await pool.query(`SELECT activity_type, created_at FROM user_activity WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [id]);
        await logAction(req.user.user_id, "VIEW_USER_ACTIVITY", id);
        res.json({ success: true, student_ref: studentRef(id), activity: result.rows });
    } catch (error) {
        console.error("User activity error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load activity" });
    }
};

const getAlerts = async (req, res) => {
    try {
        const { status } = req.query;
        const result = await pool.query(`SELECT a.alert_id, a.level, a.reason_codes, a.status, a.note, a.created_at, a.updated_at, a.user_id,
                   md.stress_percentage::float AS stress_percentage
            FROM alerts a
            LEFT JOIN mood_daily md
              ON md.user_id = a.user_id
             AND md.day = (a.created_at AT TIME ZONE 'Asia/Kolkata')::date WHERE ($1::text IS NULL OR a.status = $1) ORDER BY (a.status = 'resolved'), a.level DESC, a.updated_at DESC LIMIT 100`, [status || null]);
        res.json({ success: true, alerts: result.rows.map((row) => ({ ...row, student_ref: studentRef(row.user_id) })) });
    } catch (error) {
        console.error("Admin alerts error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load alerts" });
    }
};

const updateAlert = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        if (!["new", "contacted", "resolved"].includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
        const result = await pool.query(`UPDATE alerts SET status = $1, note = COALESCE($2, note), assigned_to = $3, updated_at = NOW() WHERE alert_id = $4 RETURNING alert_id, user_id`, [status, note || null, req.user.user_id, id]);
        if (!result.rows.length) return res.status(404).json({ success: false, error: "Alert not found" });
        await logAction(req.user.user_id, `ALERT_${status.toUpperCase()}`, result.rows[0].user_id);
        res.json({ success: true });
    } catch (error) {
        console.error("Update alert error:", error.message);
        res.status(500).json({ success: false, error: "Failed to update alert" });
    }
};

const getUserTrend = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).json({ success: false, error: "Invalid student reference" });
        const user = await pool.query(`SELECT user_id FROM users WHERE user_id = $1 AND role = 'student' AND consent_share = TRUE`, [id]);
        if (!user.rows.length) return res.status(403).json({ success: false, error: "Student has not consented to share mood trends" });
        const trend = await pool.query(`SELECT day, dominant_emotion, valence::float AS valence, stress_percentage::float AS stress_percentage, intensity, crisis_flag FROM mood_daily WHERE user_id = $1 AND day >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 59 ORDER BY day`, [id]);
        await logAction(req.user.user_id, "VIEW_USER_TREND", id);
        res.json({ success: true, student_ref: studentRef(id), trend: trend.rows });
    } catch (error) {
        console.error("User trend error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load trend" });
    }
};

const getAuditLogs = async (req, res) => {
    try {
        const result = await pool.query(`SELECT a.log_id, a.action, a.target_user_id, a.details, a.created_at, u.username AS admin_username FROM admin_audit_log a JOIN users u ON u.user_id = a.admin_id ORDER BY a.created_at DESC LIMIT 200`);
        res.json({ success: true, logs: result.rows.map((row) => ({ ...row, target_ref: row.target_user_id ? studentRef(row.target_user_id) : null })) });
    } catch (error) {
        console.error("Audit logs error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load audit logs" });
    }
};

const getNotifications = async (req, res) => {
    try {
        const result = await pool.query(`SELECT notification_id, type, title, message, read_at, created_at FROM admin_notifications WHERE admin_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.user_id]);
        res.json({ success: true, notifications: result.rows, unread: result.rows.filter((n) => !n.read_at).length });
    } catch (error) {
        console.error("Notifications error:", error.message);
        res.status(500).json({ success: false, error: "Failed to load notifications" });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        await pool.query(`UPDATE admin_notifications SET read_at = COALESCE(read_at, NOW()) WHERE notification_id = $1 AND admin_id = $2`, [req.params.id, req.user.user_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to update notification" });
    }
};

const getSettings = async (req, res) => {
    try {
        const result = await pool.query(`SELECT key, value FROM app_settings ORDER BY key`);
        const settings = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to load settings" });
    }
};

const updateSettings = async (req, res) => {
    try {
        const allowed = ["min_cohort", "alerts_email_enabled"];
        for (const key of allowed) {
            if (!(key in req.body)) continue;
            let value = String(req.body[key]);
            if (key === "min_cohort") {
                const n = Number(value);
                if (!Number.isInteger(n) || n < 2 || n > 100) return res.status(400).json({ success: false, error: "Minimum cohort must be between 2 and 100" });
                value = String(n);
            }
            if (key === "alerts_email_enabled" && !["true", "false"].includes(value)) return res.status(400).json({ success: false, error: "Invalid email notification setting" });
            await pool.query(`INSERT INTO app_settings (key, value, updated_by) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`, [key, value, req.user.user_id]);
        }
        await logAction(req.user.user_id, "UPDATE_SETTINGS", null, req.body);
        const result = await pool.query(`SELECT key, value FROM app_settings ORDER BY key`);
        res.json({ success: true, settings: Object.fromEntries(result.rows.map((r) => [r.key, r.value])) });
    } catch (error) {
        console.error("Settings update error:", error.message);
        res.status(500).json({ success: false, error: "Failed to update settings" });
    }
};

module.exports = { getOverview, getUsers, updateUserStatus, getUserActivity, getAlerts, updateAlert, getUserTrend, getAuditLogs, getNotifications, markNotificationRead, getSettings, updateSettings };
