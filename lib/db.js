const env = require('dotenv').config()
const { Pool } = require('pg')

const DB_CONFIG = {
    port: env.parsed.DATABASE_PORT,
    user: env.parsed.DATABASE_USER,
    host: env.parsed.DATABASE_HOST,
    database: env.parsed.DATABASE_NAME,
    password: env.parsed.DATABASE_PASSWORD,
}
const pool = new Pool(DB_CONFIG)
module.exports = {
    async query (text, params) {
        return await pool.query(text, params)
    }
}
