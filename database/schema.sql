CREATE DATABASE mindease;

-- Connect to the mindease database before running the rest of the schema.


CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE journals (
    journal_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    journal_text TEXT NOT NULL,
    overall_mood VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_journal_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE TABLE journal_emotions (
    journal_emotion_id SERIAL PRIMARY KEY,
    journal_id INTEGER NOT NULL,
    emotion VARCHAR(50) NOT NULL,
    percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),

    CONSTRAINT fk_journal_emotion
        FOREIGN KEY (journal_id)
        REFERENCES journals(journal_id)
        ON DELETE CASCADE
);


CREATE TABLE selfies (
    selfie_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    image_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_selfie_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE TABLE daily_tasks (
    task_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task TEXT NOT NULL,
    deadline TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    CONSTRAINT fk_task_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE INDEX idx_journals_user_date
ON journals(user_id, created_at);


CREATE INDEX idx_selfies_user_date
ON selfies(user_id, created_at);


CREATE INDEX idx_tasks_user_date
ON daily_tasks(user_id, created_at);


-- Run this in the Supabase SQL editor (one time)

ALTER TABLE users
    ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'admin')),
    ADD COLUMN consent_share BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN consent_at TIMESTAMP;

-- One row per user per day. ONLY derived numbers, no text, no images.
CREATE TABLE mood_daily (
    user_id INTEGER NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,
    day DATE NOT NULL,
    dominant_emotion VARCHAR(50),
    valence NUMERIC(4,2) NOT NULL,
    intensity VARCHAR(10),
    crisis_flag BOOLEAN NOT NULL DEFAULT FALSE,
    stress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (stress_percentage >= 0 AND stress_percentage <= 100),
    entries INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, day)
);

CREATE TABLE alerts (
    alert_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(user_id) ON DELETE CASCADE,
    level SMALLINT NOT NULL CHECK (level IN (2, 3)),
    reason_codes TEXT[] NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'resolved')),
    note TEXT,
    assigned_to INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_open ON alerts(status, level DESC, updated_at DESC);

-- Who looked at whose data, and when
CREATE TABLE admin_audit_log (
    log_id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    target_user_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- After registering your admin account normally, make it admin:
-- UPDATE users SET role = 'admin' WHERE username = 'your_admin_username';
-- Admin management, activity, privacy-safe analytics, notifications and controls.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'disabled')),
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS admin_permissions JSONB NOT NULL DEFAULT '{"users.read":true,"users.manage":true,"analytics.read":true,"alerts.manage":true,"audit.read":true,"settings.manage":true,"notifications.read":true}'::jsonb;

ALTER TABLE admin_audit_log
    ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;

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
INSERT INTO app_settings (key, value) VALUES
    ('min_cohort', '2'),
    ('alerts_email_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
