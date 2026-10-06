const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const ADMIN_ID = process.env.ADMIN_LOGIN_ID;
const ADMIN_PASSWORD = process.env.ADMIN_LOGIN_PASSWORD;

const ensureAdminAccount = async () => {
    if (!ADMIN_ID || !ADMIN_PASSWORD || !process.env.JWT_SECRET) {
        throw new Error("ADMIN_LOGIN_ID, ADMIN_LOGIN_PASSWORD and JWT_SECRET must be configured");
    }
    const existing = await pool.query("SELECT user_id, password_hash FROM users WHERE username = $1", [ADMIN_ID]);
    if (existing.rows.length === 0) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        await pool.query(
            `INSERT INTO users (username, password_hash, role, consent_share, account_status)
             VALUES ($1, $2, 'admin', FALSE, 'active')`,
            [ADMIN_ID, passwordHash]
        );
        console.log(`MindEase admin account created: ${ADMIN_ID}`);
    } else {
        await pool.query(`UPDATE users SET role = 'admin', account_status = 'active' WHERE username = $1`, [ADMIN_ID]);
    }
};

const loginAdmin = async (req, res) => {
    try {
        const key = String(req.ip || "unknown");
        const now = Date.now();
        const recent = (attempts.get(key) || []).filter((time) => now - time < WINDOW_MS);
        if (recent.length >= MAX_ATTEMPTS) return res.status(429).json({ success: false, error: "Too many login attempts. Please try again later." });
        const { loginId, password } = req.body;

        if (!loginId || !password) {
            return res.status(400).json({
                success: false,
                error: "Admin ID and password are required"
            });
        }

        if (loginId !== ADMIN_ID) {
            attempts.set(key, [...recent, now]);
            return res.status(401).json({
                success: false,
                error: "Invalid admin ID or password"
            });
        }

        const result = await pool.query(
            `SELECT user_id, username, password_hash, created_at
             FROM users
             WHERE username = $1 AND role = 'admin' AND account_status = 'active'`,
            [ADMIN_ID]
        );

        if (!result.rows.length) {
            return res.status(503).json({
                success: false,
                error: "Admin account is not initialized"
            });
        }

        const admin = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);

        if (!passwordMatch) {
            attempts.set(key, [...recent, now]);
            return res.status(401).json({
                success: false,
                error: "Invalid admin ID or password"
            });
        }

        attempts.delete(key);
        await pool.query("UPDATE users SET last_login_at = NOW(), last_active_at = NOW() WHERE user_id = $1", [admin.user_id]);
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
             VALUES ($1, 'ADMIN_LOGIN', NULL, $2)`,
            [admin.user_id, JSON.stringify({ ip: req.ip || null })]
        );

        const token = jwt.sign(
            { user_id: admin.user_id, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "12h" }
        );

        res.json({
            success: true,
            token,
            user: {
                user_id: admin.user_id,
                username: admin.username,
                role: "admin",
                created_at: admin.created_at
            }
        });
    } catch (error) {
        console.error("Admin login error:", error.message);
        res.status(500).json({
            success: false,
            error: "Server error during admin login"
        });
    }
};

module.exports = { loginAdmin, ensureAdminAccount };
