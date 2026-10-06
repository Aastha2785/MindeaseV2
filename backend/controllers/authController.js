const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { evaluateUser, raiseAlertIfNeeded } = require("../services/alertEngine");

const registerUser = async (req, res) => {
    try {
        const { username, password, confirmPassword, consent_share } = req.body;
const consentShare = consent_share === true;
        if (!username || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: "All fields are required"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: "Passwords do not match"
            });
        }

        const existingUser = await pool.query(
            "SELECT user_id FROM users WHERE username = $1",
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: "Username already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

       const result = await pool.query(
    `INSERT INTO users (username, password_hash, consent_share, consent_at)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, username, created_at`,
    [username, passwordHash, consentShare, consentShare ? new Date() : null]
);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration Error:", error.message);

        res.status(500).json({
            success: false,
            error: "Server error during registration"
        });
    }
};


const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: "Username and password are required"
            });
        }

        const result = await pool.query(
            `SELECT user_id, username, password_hash, created_at, role, account_status
             FROM users
             WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password"
            });
        }

        const user = result.rows[0];

        if (user.account_status !== "active") {
            return res.status(403).json({ success: false, error: "This account is disabled. Please contact support." });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid username or password"
            });
        }

        await pool.query("UPDATE users SET last_login_at = NOW(), last_active_at = NOW() WHERE user_id = $1", [user.user_id]);

        const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
);

res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
        user_id: user.user_id,
        username: user.username,
        created_at: user.created_at,
        role: user.role
    }
});

    } catch (error) {
        console.error("Login Error:", error.message);

        res.status(500).json({
            success: false,
            error: "Server error during login"
        });
    }
};

const getConsentShare = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT consent_share, consent_at FROM users WHERE user_id = $1 AND role = 'student'`,
            [req.user.user_id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, error: "Student account not found" });
        res.json({ success: true, consent_share: result.rows[0].consent_share, consent_at: result.rows[0].consent_at });
    } catch (error) {
        res.status(500).json({ success: false, error: "Unable to load privacy preference" });
    }
};

const updateConsentShare = async (req, res) => {
    try {
        const consentShare = req.body?.consent_share === true;
        const result = await pool.query(
            `UPDATE users
             SET consent_share = $1, consent_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END
             WHERE user_id = $2 AND role = 'student'
             RETURNING user_id, consent_share, consent_at`,
            [consentShare, req.user.user_id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: "Student account not found" });
        }

        // If the student turns sharing on after already writing a high-stress
        // journal today, evaluate the existing derived daily stress immediately.
        // No journal text or image is sent to the admin.
        if (consentShare) {
            try {
                const evaluation = await evaluateUser(req.user.user_id);
                await raiseAlertIfNeeded(
                    req.user.user_id,
                    evaluation.level,
                    evaluation.reasons,
                    evaluation.stressPercentage
                );
            } catch (alertError) {
                console.error("Consent alert evaluation error:", alertError.message);
            }
        } else {
            // Revoking consent prevents future individual trend access. Close any
            // currently open support alert so it is not treated as an active
            // consent-based workflow after the student opts out.
            await pool.query(
                `UPDATE alerts
                 SET status = 'resolved',
                     note = COALESCE(note, 'Student disabled stress-level sharing.'),
                     updated_at = NOW()
                 WHERE user_id = $1 AND status <> 'resolved'`,
                [req.user.user_id]
            );
        }

        res.json({ success: true, consent_share: result.rows[0].consent_share, consent_at: result.rows[0].consent_at });
    } catch (error) {
        console.error("Consent update error:", error.message);
        res.status(500).json({ success: false, error: "Unable to update privacy preference" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    updateConsentShare,
    getConsentShare
};