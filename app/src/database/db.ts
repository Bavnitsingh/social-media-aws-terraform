import mysql, { Pool } from 'mysql2';
import { DB_HOST,DB_NAME,DB_PASSWORD ,DB_USER} from '../config/config.env.js'

const pool:Pool = mysql.createPool({
    host: DB_HOST,
    user:DB_USER,
    password:DB_PASSWORD,
    database:DB_NAME,
    waitForConnections:true,
    connectionLimit: 1000,
    queueLimit:0,
    timezone: 'Z'
});

export  default pool.promise()