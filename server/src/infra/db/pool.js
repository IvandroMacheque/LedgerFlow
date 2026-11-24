import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://ledger_user:ledger_password@localhost:5434/ledgerflow_db';
if (!connectionString) {
  throw new Error('DATABASE_URL não configurada no ambiente');
}

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

