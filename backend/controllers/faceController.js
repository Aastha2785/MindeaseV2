const OpenAI = require("openai");

const analyzeFace = async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: "Face image is required"
            });
        }

        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const response = await groq.chat.completions.create({
            model: "qwen/qwen3.8-27b",

            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `
Analyze only the visible facial expression in this image.

Estimate the apparent facial-expression categories.

Use 2 to 5 emotions.

The percentages should represent the relative strength of the visible expressions and should add up to 100.

Do not diagnose the person.
Do not claim to know the person's actual internal emotional state.
`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: image
                            }
                        }
                    ]
                }
            ],

            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "face_emotion_analysis",
                    strict: true,
                    schema: {
                        type: "object",

                        properties: {
                            emotions: {
                                type: "array",
                                items: {
                                    type: "object",

                                    properties: {
                                        emotion: {
                                            type: "string",
                                            enum: [
                                                "Happiness",
                                                "Sadness",
                                                "Stress",
                                                "Anxiety",
                                                "Anger",
                                                "Calm",
                                                "Fatigue",
                                                "Excitement",
                                                "Fear",
                                                "Neutral"
                                            ]
                                        },

                                        percentage: {
                                            type: "integer",
                                            minimum: 0,
                                            maximum: 100
                                        }
                                    },

                                    required: [
                                        "emotion",
                                        "percentage"
                                    ],

                                    additionalProperties: false
                                },

                                minItems: 2,
                                maxItems: 5
                            },

                            dominantEmotion: {
                                type: "string",
                                enum: [
                                    "Happiness",
                                    "Sadness",
                                    "Stress",
                                    "Anxiety",
                                    "Anger",
                                    "Calm",
                                    "Fatigue",
                                    "Excitement",
                                    "Fear",
                                    "Neutral"
                                ]
                            },

                            intensity: {
                                type: "string",
                                enum: [
                                    "Low",
                                    "Moderate",
                                    "High"
                                ]
                            }
                        },

                        required: [
                            "emotions",
                            "dominantEmotion",
                            "intensity"
                        ],

                        additionalProperties: false
                    }
                }
            },

            temperature: 0.2,

            max_completion_tokens: 512,

            stream: false
        });

        const content = response.choices[0].message.content;

        console.log("Groq Face Response:");
        console.log(content);

        const analysis = JSON.parse(content);

        // Make sure percentages add up to 100
        let total = analysis.emotions.reduce(
            (sum, item) => sum + item.percentage,
            0
        );

        if (total !== 100 && total > 0) {
            analysis.emotions = analysis.emotions.map(item => ({
                ...item,
                percentage: Math.round(
                    (item.percentage / total) * 100
                )
            }));

            // Fix rounding difference
            const newTotal = analysis.emotions.reduce(
                (sum, item) => sum + item.percentage,
                0
            );

            const difference = 100 - newTotal;

            analysis.emotions[0].percentage += difference;
        }

        // Make dominant emotion consistent with the highest percentage
        const dominant = analysis.emotions.reduce(
            (highest, current) =>
                current.percentage > highest.percentage
                    ? current
                    : highest
        );

        analysis.dominantEmotion = dominant.emotion;

        res.json({
            success: true,
            analysis: analysis
        });

    } catch (error) {
        console.error("Face Analysis Error:");
        console.error(error);

        if (error.error) {
            console.error("Groq Error Details:");
            console.error(error.error);
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    analyzeFace
};