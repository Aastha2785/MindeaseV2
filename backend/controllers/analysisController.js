const OpenAI = require("openai");

/**
 * Analyze the user's overall mood using journal and/or facial analysis.
 */
const analyzeOverallMood = async (req, res) => {
    try {
        const {
            journalAnalysis,
            faceAnalysis
        } = req.body;

        if (!journalAnalysis && !faceAnalysis) {
            return res.status(400).json({
                success: false,
                error: "At least one analysis is required"
            });
        }

        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const inputData = {
            journalAnalysis: journalAnalysis || null,
            faceAnalysis: faceAnalysis || null
        };

        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",

            messages: [
                {
                    role: "system",
                    content: `
You are the overall emotional analysis component of MindEase.

Analyze the available journal and facial-expression information.

Do not diagnose mental health conditions.

Use only these emotions:

Happiness
Calm
Neutral
Stress
Sadness
Anxiety
Anger
Fatigue
Excitement
Fear

Return exactly 3 emotions.

Their percentages must be integers between 0 and 100
and must add up to exactly 100.

The highest percentage must be the dominant emotion.

Stress level must be Low, Moderate, or High.

Energy level must be Low, Moderate, or High.

Return exactly 3 short personalized suggestions.

Return only the requested JSON structure.
`
                },
                {
                    role: "user",
                    content: JSON.stringify(inputData)
                }
            ],

            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "overall_mood",
                    strict: true,
                    schema: {
                        type: "object",

                        properties: {
                            emotion1: {
                                type: "string"
                            },

                            percentage1: {
                                type: "integer"
                            },

                            emotion2: {
                                type: "string"
                            },

                            percentage2: {
                                type: "integer"
                            },

                            emotion3: {
                                type: "string"
                            },

                            percentage3: {
                                type: "integer"
                            },

                            dominantEmotion: {
                                type: "string"
                            },

                            stressLevel: {
                                type: "string"
                            },

                            energyLevel: {
                                type: "string"
                            },

                            summary: {
                                type: "string"
                            },

                            suggestion1: {
                                type: "string"
                            },

                            suggestion2: {
                                type: "string"
                            },

                            suggestion3: {
                                type: "string"
                            }
                        },

                        required: [
                            "emotion1",
                            "percentage1",
                            "emotion2",
                            "percentage2",
                            "emotion3",
                            "percentage3",
                            "dominantEmotion",
                            "stressLevel",
                            "energyLevel",
                            "summary",
                            "suggestion1",
                            "suggestion2",
                            "suggestion3"
                        ],

                        additionalProperties: false
                    }
                }
            },

            temperature: 0.2,
            max_completion_tokens: 1500
        });

        const content = response.choices[0].message.content;

        console.log("=================================");
        console.log("GROQ SUCCESS");
        console.log(content);
        console.log("=================================");

        const result = JSON.parse(content);

        const emotions = [
            {
                emotion: result.emotion1,
                percentage: Number(result.percentage1)
            },
            {
                emotion: result.emotion2,
                percentage: Number(result.percentage2)
            },
            {
                emotion: result.emotion3,
                percentage: Number(result.percentage3)
            }
        ];

        let total = emotions.reduce(
            (sum, item) => sum + item.percentage,
            0
        );

        if (total <= 0) {
            emotions.splice(
                0,
                emotions.length,
                {
                    emotion: "Neutral",
                    percentage: 100
                }
            );
        } else if (total !== 100) {
            emotions.forEach((item) => {
                item.percentage = Math.round(
                    (item.percentage / total) * 100
                );
            });

            const newTotal = emotions.reduce(
                (sum, item) => sum + item.percentage,
                0
            );

            emotions[0].percentage += 100 - newTotal;
        }

        emotions.sort(
            (a, b) => b.percentage - a.percentage
        );

        const analysis = {
            overallEmotions: emotions,

            dominantEmotion: emotions[0].emotion,

            stressLevel: ["Low", "Moderate", "High"].includes(
                result.stressLevel
            )
                ? result.stressLevel
                : "Moderate",

            energyLevel: ["Low", "Moderate", "High"].includes(
                result.energyLevel
            )
                ? result.energyLevel
                : "Moderate",

            summary:
                typeof result.summary === "string"
                    ? result.summary
                    : "Your available emotional signals show a mixed emotional picture.",

            suggestions: [
                result.suggestion1,
                result.suggestion2,
                result.suggestion3
            ]
        };

        return res.json({
            success: true,
            analysis
        });

    } catch (error) {
        console.log("=================================");
        console.log("GROQ ERROR");
        console.log("Message:");
        console.log(error.message);

        console.log("Status:");
        console.log(error.status);

        console.log("Full error:");
        console.log(
            JSON.stringify(
                error,
                Object.getOwnPropertyNames(error),
                2
            )
        );

        console.log("Response data:");
        console.log(
            error.response
                ? JSON.stringify(error.response.data, null, 2)
                : "No response.data"
        );

        console.log("=================================");

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


/**
 * Get weekly mood data.
 *
 * This endpoint is kept for compatibility with the existing
 * MindEase student dashboard.
 *
 * If your application already stores weekly mood data in a
 * different table/service, this function should be connected
 * to that source.
 */
const getWeeklyMood = async (req, res) => {
    try {
        /*
         * The existing project does not currently expose a
         * weekly-mood controller implementation.
         *
         * Return an empty but valid response instead of allowing
         * the server to crash because the route handler is missing.
         *
         * The frontend can safely consume this structure.
         */
        return res.json({
            success: true,
            data: [],
            weeklyMood: []
        });

    } catch (error) {
        console.error("Weekly mood error:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch weekly mood data"
        });
    }
};


module.exports = {
    analyzeOverallMood,
    getWeeklyMood
};