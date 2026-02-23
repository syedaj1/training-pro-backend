import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'training_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Execute query helper
export async function query(sql: string, params?: any[]): Promise<any> {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Execute query with multiple statements
export async function queryMultiple(sql: string): Promise<any> {
  try {
    const [results] = await pool.query(sql);
    return results;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Get a single row
export async function queryOne(sql: string, params?: any[]): Promise<any | null> {
  const results = await query(sql, params);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

// Get connection from pool for transactions
export async function getConnection() {
  return await pool.getConnection();
}

// Initialize database with schema
export async function initializeDatabase(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const connection = await getConnection();
  
  try {
    for (const statement of statements) {
      try {
        await connection.query(statement + ';');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message?.includes('Duplicate') && !error.message?.includes('already exists')) {
          console.error('Error executing SQL:', statement.substring(0, 100));
          console.error(error.message);
        }
      }
    }
    console.log('✅ Database schema initialized successfully');
  } finally {
    connection.release();
  }
}

// Create database if not exists
export async function createDatabaseIfNotExists(): Promise<void> {
  const tempPool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true
  });
  
  try {
    await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database '${dbConfig.database}' ready`);
  } finally {
    await tempPool.end();
  }
}

export default pool;
