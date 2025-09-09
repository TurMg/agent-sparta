import mysql from 'mysql2/promise';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agent-sparta',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
  timezone: '+07:00', // Indonesia timezone
};

let connection: mysql.Connection;

// Initialize database connection
export async function initConnection() {
  try {
    console.log('🔄 Attempting to connect to MariaDB...');
    console.log('📍 Host:', dbConfig.host);
    console.log('👤 User:', dbConfig.user);
    console.log('🗄️ Database:', dbConfig.database);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ MariaDB connected successfully');
    return connection;
  } catch (error: any) {
    console.error('❌ MariaDB connection error:', error.message);
    console.error('📋 Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    
    // Check if it's a specific database error
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('🔧 Database does not exist, trying to create it...');
      try {
        // Connect without specifying database
        const tempConnection = await mysql.createConnection({
          ...dbConfig,
          database: undefined
        });
        
        // Create database if not exists
        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        console.log(`✅ Database '${dbConfig.database}' created successfully`);
        
        // Close temp connection and reconnect with database
        await tempConnection.end();
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ MariaDB connected successfully after creating database');
        return connection;
      } catch (createError) {
        console.error('❌ Failed to create database:', createError);
        throw error;
      }
    }
    
    throw error;
  }
}

// Database query methods
export const dbRun = async (sql: string, params?: any[]) => {
  if (!connection) {
    await initConnection();
  }
  const [result] = await connection.execute(sql, params || []);
  return result as any;
};

export const dbGet = async (sql: string, params?: any[]) => {
  if (!connection) {
    await initConnection();
  }
  const [rows] = await connection.execute(sql, params || []);
  const result = Array.isArray(rows) ? rows[0] : null;
  return result as any;
};

export const dbAll = async (sql: string, params?: any[]) => {
  if (!connection) {
    await initConnection();
  }
  const [rows] = await connection.execute(sql, params || []);
  return Array.isArray(rows) ? rows : [];
};

export async function initDatabase() {
  try {
    // Initialize connection first
    await initConnection();

    // Create users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create documents table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('sph', 'contract', 'invoice') NOT NULL,
        title VARCHAR(500) NOT NULL,
        content LONGTEXT,
        data LONGTEXT,
        status ENUM('draft', 'generated', 'signed', 'sent') DEFAULT 'draft',
        file_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create chat_sessions table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create chat_messages table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content LONGTEXT NOT NULL,
        metadata LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create whatsapp_allowed_numbers table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS whatsapp_allowed_numbers (
        id VARCHAR(36) PRIMARY KEY,
        phone VARCHAR(32) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        user_id VARCHAR(36),
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure backward compatibility: add user_id column if the table existed before
    try {
      const col = await dbGet(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'whatsapp_allowed_numbers' AND COLUMN_NAME = 'user_id'`,
        [process.env.DB_NAME]
      );
      if (!col) {
        await dbRun(`ALTER TABLE whatsapp_allowed_numbers ADD COLUMN user_id VARCHAR(36) NULL AFTER display_name`);
        console.log('✅ Added missing column whatsapp_allowed_numbers.user_id');
      }
    } catch (e) {
      console.warn('⚠️ Could not verify/add whatsapp_allowed_numbers.user_id column:', e);
    }

    // Create default admin user if not exists
    const adminExists = await dbGet('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await dbRun(`
        INSERT INTO users (id, username, email, password, role)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), 'admin', 'admin@localhost', hashedPassword, 'admin']);
      
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeConnection() {
  if (connection) {
    await connection.end();
    console.log('✅ MariaDB connection closed');
  }
}

// Export connection for direct use if needed
export { connection };