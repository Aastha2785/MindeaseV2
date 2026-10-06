const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const pool = require("./config/db");

const journalRoutes = require("./routes/journalRoutes");
const faceRoutes = require("./routes/faceRoutes");
const authRoutes = require("./routes/authRoutes");
const analysisRoutes = require("./routes/analysisRoutes");

const adminRoutes = require("./routes/adminRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");

const { ensureAdminAccount } = require("./controllers/adminAuthController");

const app = express();


// --------------------------------------------------
// CORS
// --------------------------------------------------

const allowedOrigins = String(process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("CORS origin not allowed"));
        },
        credentials: true
    })
);


// --------------------------------------------------
// Body Parser
// --------------------------------------------------

app.use(
    express.json({
        limit: "10mb"
    })
);


// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MindEase Backend is running!"
    });
});


// --------------------------------------------------
// Authentication
// --------------------------------------------------

app.use("/api/auth", authRoutes);


// --------------------------------------------------
// Admin Authentication
// --------------------------------------------------

app.use("/api/admin-auth", adminAuthRoutes);


// --------------------------------------------------
// Admin APIs
// --------------------------------------------------

app.use("/api/admin", adminRoutes);


// --------------------------------------------------
// Student APIs
// --------------------------------------------------

app.use("/api/journal", journalRoutes);

app.use("/api/face", faceRoutes);

app.use("/api/analysis", analysisRoutes);


// --------------------------------------------------
// Groq Test
// --------------------------------------------------

app.get("/api/test-groq", async (req, res) => {
    try {
        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const response =
            await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [
                    {
                        role: "user",
                        content: "Say hello to MindEase 2.0"
                    }
                ]
            });

        res.json({
            success: true,
            response: response.choices[0].message.content
        });

    } catch (error) {
        console.error(
            "Groq Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// --------------------------------------------------
// Database Test
// --------------------------------------------------

app.get("/api/test-db", async (req, res) => {
    try {
        const result =
            await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "PostgreSQL connection is working!",
            time: result.rows[0].now
        });

    } catch (error) {
        console.error(
            "Database Error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});


// --------------------------------------------------
// Error Handler
// --------------------------------------------------

app.use((error, req, res, next) => {
    console.error("Unhandled server error:", error);

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});


// --------------------------------------------------
// Start Server
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {

        // Make sure the configured admin account exists.
        await ensureAdminAccount();

        app.listen(PORT, () => {
            console.log(
                `Server running on http://localhost:${PORT}`
            );

            console.log(
                `Admin API: http://localhost:${PORT}/api/admin`
            );

            console.log(
                `Admin Login: http://localhost:${PORT}/api/admin-auth/login`
            );
        });

    } catch (error) {

        console.error(
            "Failed to start MindEase backend:",
            error.message
        );

        process.exit(1);
    }
};

startServer();