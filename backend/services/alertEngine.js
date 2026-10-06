const pool = require("../config/db");
const { notifyAdmins } = require("./notify");

const STRESS_THRESHOLD = Number(process.env.STRESS_ALERT_THRESHOLD || 50);

const getTodayMood = async (userId) => {
    const { rows } = await pool.query(
        `SELECT day, stress_percentage::float AS stress_percentage,
                intensity, crisis_flag
         FROM public.mood_daily
         WHERE user_id = $1
           AND day = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
};

const evaluateUser = async (userId) => {
    const today = await getTodayMood(userId);
    if (!today) return { level: 0, reasons: [], stressPercentage: null };

    const stressPercentage = Number(today.stress_percentage || 0);
    const reasons = [];

    if (stressPercentage > STRESS_THRESHOLD) {
        reasons.push(`DAILY_STRESS_ABOVE_THRESHOLD: ${stressPercentage.toFixed(0)}% stress`);
    }
    if (today.crisis_flag) reasons.push("CRISIS_LANGUAGE_DETECTED");

    let level = 0;
    if (today.crisis_flag) level = 3;
    else if (stressPercentage > STRESS_THRESHOLD) level = 2;

    return { level, reasons, stressPercentage };
};

const raiseAlertIfNeeded = async (userId, level, reasons, stressPercentage = null) => {
    if (level < 2) return null;

    const consent = await pool.query(
        `SELECT consent_share
         FROM public.users
         WHERE user_id = $1 AND role = 'student' AND account_status = 'active'`,
        [userId]
    );

    if (!consent.rows[0]?.consent_share) return null;

    const finalReasons = [...new Set(reasons || [])];
    if (stressPercentage !== null && stressPercentage !== undefined) {
        const reason = `STRESS_LEVEL: ${Number(stressPercentage).toFixed(0)}%`;
        if (!finalReasons.some((item) => item.startsWith("STRESS_LEVEL:"))) finalReasons.push(reason);
    }

    // Use the database's India-local calendar date. This avoids JS timezone/date-format differences.
    const existing = await pool.query(
        `SELECT alert_id, level
         FROM public.alerts
         WHERE user_id = $1
           AND (created_at AT TIME ZONE 'Asia/Kolkata')::date =
               (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         ORDER BY level DESC, updated_at DESC
         LIMIT 1`,
        [userId]
    );

    let alertId = null;
    let created = false;

    if (existing.rows.length) {
        alertId = existing.rows[0].alert_id;
        if (Number(existing.rows[0].level) < Number(level)) {
            await pool.query(
                `UPDATE public.alerts
                 SET level = $1, reason_codes = $2, status = 'new', updated_at = NOW()
                 WHERE alert_id = $3`,
                [level, finalReasons, alertId]
            );
        }
    } else {
        const inserted = await pool.query(
            `INSERT INTO public.alerts (user_id, level, reason_codes, status)
             VALUES ($1, $2, $3, 'new')
             RETURNING alert_id`,
            [userId, level, finalReasons]
        );
        alertId = inserted.rows[0].alert_id;
        created = true;
    }

    // Email/notification problems must never prevent the alert from existing in alerts.
    if (created) {
        try {
            await notifyAdmins(level, `ST-${String(userId).padStart(6, "0")}`, finalReasons);
        } catch (error) {
            console.error("Admin notification failed after alert creation:", error.message);
        }
    }

    console.log(`[MindEase Alert] user=${userId} stress=${stressPercentage}% level=${level} alert_id=${alertId} created=${created}`);
    return { created, alertId };
};

module.exports = { evaluateUser, raiseAlertIfNeeded };
