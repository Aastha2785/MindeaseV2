const nodemailer = require("nodemailer");
const pool = require("../config/db");

const notifyAdmins = async (level, studentRef, reasons) => {
    const title = level === 3 ? "Urgent wellness alert" : "Student support recommended";
    const message = `Student reference ${studentRef} has a level ${level} support alert. Derived reasons: ${reasons.join(", ")}.`;

    try {
        const admins = await pool.query("SELECT user_id FROM users WHERE role = 'admin' AND account_status = 'active'");
        for (const admin of admins.rows) {
            await pool.query(`INSERT INTO admin_notifications (admin_id, type, title, message) VALUES ($1, 'WELLNESS_ALERT', $2, $3)`, [admin.user_id, title, message]);
        }

        const setting = await pool.query("SELECT value FROM app_settings WHERE key = 'alerts_email_enabled'");
        const emailEnabled = setting.rows.length ? setting.rows[0].value === "true" : true;
        const to = process.env.ADMIN_ALERT_EMAIL;
        if (!emailEnabled || !to || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log(`[ALERT] Level ${level} for student ${studentRef}`);
            return;
        }

        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject: level === 3 ? "MindEase URGENT: human attention needed" : "MindEase: student support recommended",
            text: `Student reference: ${studentRef}\nSupport level: ${level}\n\nDerived reasons:\n- ${reasons.join("\n- ")}\n\nNo journal text, facial image, or private journal content is included.`
        });
    } catch (error) {
        console.error("Admin notification failed:", error.message);
    }
};

module.exports = { notifyAdmins };
