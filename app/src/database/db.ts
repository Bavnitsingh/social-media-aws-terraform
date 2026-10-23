import mysql, { Pool } from "mysql2";
import { readFileSync } from "node:fs";
import {
  DB_HOST,
  DB_NAME,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
  DB_SSL_CA,
  DB_POOL_SIZE,
} from "../config/config.env.js";

const pool: Pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  // Per instance. RDS allows only ~80 connections on a db.t4g.micro in total,
  // so (instances x this value) must stay well below that.
  connectionLimit: DB_POOL_SIZE,
  queueLimit: 0,
  timezone: "Z",
  ...(DB_SSL_CA
    ? { ssl: { ca: readFileSync(DB_SSL_CA, "utf8"), rejectUnauthorized: true } }
    : {}),
});

export default pool.promise();
