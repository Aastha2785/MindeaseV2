const pool = require("../config/db");
const { evaluateUser, raiseAlertIfNeeded } = require("./alertEngine");

const EMOTION_WEIGHT = {
    Happiness: 1.0,
    Excitement: 0.8,
    Calm: 0.6,
    Neutral: 0.0,
    Fatigue: -0.4,
    Stress: -0.6,
    Anger: -0.6,
    Anxiety: -0.7,
    Fear: -0.7,
    Sadness: -0.8
};

const INTENSITY_MULTIPLIER = { Low: 0.7, Moderate: 1.0, High: 1.3 };

const CRISIS_PATTERN =
    /(kill myself|end my life|suicid|want to die|wanna die|don'?t want to live|no reason to live|better off dead|hurt myself|self[- ]harm|can'?t go on|hopeless|jeene ka mann nahi|marna chah|mar jana chah|mar jaana chah|khud ko khatam)/i;

const detectCrisis = (text) => CRISIS_PATTERN.test(text || "");

const computeValence = (emotions, intensity) => {
    const raw = emotions.reduce(
        (sum, e) => sum + (EMOTION_WEIGHT[e.emotion] || 0) * (e.percentage / 100),
        0
    );
    const scaled = raw * (INTENSITY_MULTIPLIER[intensity] || 1);
    return Math.max(-1, Math.min(1, Number(scaled.toFixed(2))));
};

const computeStressPercentage = (emotions) => {
    const stress = emotions
        .filter((item) => item.emotion === "Stress" || item.emotion === "Anxiety")
        .reduce((sum, item) => sum + Number(item.percentage || 0), 0);

    return Math.max(0, Math.min(100, Number(stress.toFixed(2))));
};

/**
 * Stores only derived daily values. Journal text is used for the crisis
 * check but is never written to mood_daily or sent to administrators.
 */
const recordMood = async (userId, journalText, analysis) => {
    const valence = computeValence(analysis.emotions, analysis.intensity);
    const stressPercentage = computeStressPercentage(analysis.emotions);
    const crisis = detectCrisis(journalText);

    await pool.query(
        `
        INSERT INTO public.mood_daily
            (user_id, day, dominant_emotion, valence, intensity, crisis_flag, stress_percentage)
        VALUES
            ($1, (NOW() AT TIME ZONE 'Asia/Kolkata')::date, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, day) DO UPDATE SET
            dominant_emotion = CASE
                WHEN EXCLUDED.valence < mood_daily.valence
                THEN EXCLUDED.dominant_emotion
                ELSE mood_daily.dominant_emotion
            END,
            intensity = CASE
                WHEN EXCLUDED.valence < mood_daily.valence
                THEN EXCLUDED.intensity
                ELSE mood_daily.intensity
            END,
            valence = LEAST(mood_daily.valence, EXCLUDED.valence),
            crisis_flag = mood_daily.crisis_flag OR EXCLUDED.crisis_flag,
            stress_percentage = GREATEST(
                mood_daily.stress_percentage,
                EXCLUDED.stress_percentage
            ),
            entries = mood_daily.entries + 1
        `,
        [userId, analysis.dominantEmotion, valence, analysis.intensity, crisis, stressPercentage]
    );

    // Evaluate immediately after the daily row has been committed.
    // The alert engine uses the database's India-local date, so the value
    // shown in the Admin trend and the value used for the alert are identical.
    const result = await evaluateUser(userId);
    const alert = await raiseAlertIfNeeded(
        userId,
        result.level,
        result.reasons,
        result.stressPercentage
    );

    console.log(
        `[MindEase] user=${userId} stress=${result.stressPercentage ?? 0}% ` +
        `level=${result.level} alert=${alert?.alertId || "none"}`
    );

    return {
        level: result.level,
        stressPercentage: result.stressPercentage,
        alertCreated: Boolean(alert?.created)
    };
};

module.exports = { recordMood, computeStressPercentage };
