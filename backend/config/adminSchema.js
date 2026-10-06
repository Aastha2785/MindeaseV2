const pool = require("./db");

const ensureAdminSchema = async () => {
    await pool.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'disabled')),
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS admin_permissions JSONB NOT NULL DEFAULT '{"users.read":true,"users.manage":true,"analytics.read":true,"alerts.manage":true,"audit.read":true,"settings.manage":true,"notifications.read":true}'::jsonb;
        ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;
        CREATE TABLE IF NOT EXISTS user_activity (
            activity_id BIGSERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            activity_type VARCHAR(50) NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_user_activity_type_date ON user_activity(activity_type, created_at DESC);
        CREATE TABLE IF NOT EXISTS admin_notifications (
            notification_id BIGSERIAL PRIMARY KEY,
            admin_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            read_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_date ON admin_notifications(admin_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS app_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT NOT NULL,
            updated_by INTEGER REFERENCES users(user_id),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        INSERT INTO app_settings (key, value) VALUES ('min_cohort', '5'), ('alerts_email_enabled', 'true') ON CONFLICT (key) DO NOTHING;
    `);
};

module.exports = { ensureAdminSchema };
