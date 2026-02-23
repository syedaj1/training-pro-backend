import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Import database connection and initialization
import { testConnection, createDatabaseIfNotExists, initializeDatabase } from './database/connection';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import scheduleRoutes from './routes/schedules';
import profileFieldRoutes from './routes/profileFields';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API server
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static files for uploads
app.use('/uploads', express.static(uploadDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'MySQL'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/profile-fields', profileFieldRoutes);

// TODO: Add more routes
// app.use('/api/groups', groupRoutes);
// app.use('/api/assignments', assignmentRoutes);
// app.use('/api/attendance', attendanceRoutes);
// app.use('/api/chats', chatRoutes);
// app.use('/api/calendar', calendarRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/invoices', invoiceRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Failed to connect to MySQL database');
      console.log('');
      console.log('Please check your database configuration:');
      console.log('  - DB_HOST: MySQL server hostname');
      console.log('  - DB_PORT: MySQL server port (default: 3306)');
      console.log('  - DB_USER: MySQL username');
      console.log('  - DB_PASSWORD: MySQL password');
      console.log('  - DB_NAME: Database name');
      console.log('');
      console.log('Example .env configuration:');
      console.log('  DB_HOST=localhost');
      console.log('  DB_PORT=3306');
      console.log('  DB_USER=root');
      console.log('  DB_PASSWORD=your_password');
      console.log('  DB_NAME=training_db');
      process.exit(1);
    }
    
    // Create database if not exists
    await createDatabaseIfNotExists();
    
    // Initialize database schema
    await initializeDatabase();
    
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     Training Management System API Server                  ║
║                                                            ║
║     Database:    MySQL                                     ║
║     Running on:  http://localhost:${PORT}                          ║
║     Environment: ${process.env.NODE_ENV || 'development'}  ║
║                                                            ║
║     API Documentation:                                     ║
║     - Health Check:  GET  /health                          ║
║     - Auth:          POST /api/auth/login                  ║
║     - Users:         GET  /api/users                       ║
║     - Courses:       GET  /api/courses                     ║
║     - Schedules:     GET  /api/schedules                   ║
║     - Profile Fields: GET /api/profile-fields              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
