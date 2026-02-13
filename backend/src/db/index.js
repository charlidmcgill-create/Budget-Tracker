import pkg from "pg";
import { config } from "../config/env.js";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
