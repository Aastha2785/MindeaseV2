const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect()
    .then((client) => {
        console.log("Supabase PostgreSQL connected successfully!");
        client.release();
    })
    .catch((error) => {
        console.error(
            "Supabase PostgreSQL connection error:",
            error.message
        );
    });

module.exports = pool;