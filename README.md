# Training Management System - Backend API (MySQL)

A complete Node.js/Express backend API with MySQL database for the Training Management System.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (Admin, Trainer, Learner)
- **User Management**: Full CRUD operations for users
- **Course Management**: Support for in-class, virtual, and e-learning courses with modules
- **Schedule Management**: Training schedules with enrollment and attendance tracking
- **Custom Profile Fields**: Administrators can add, edit, delete, and reorder profile fields
- **MySQL Database**: Production-ready relational database
- **RESTful API**: Clean, well-documented endpoints

## Prerequisites

- Node.js 18+
- MySQL 8.0+ or MariaDB 10.5+
- npm or yarn

## MySQL Setup

### 1. Install MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**macOS (with Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
Download and install from [MySQL official website](https://dev.mysql.com/downloads/installer/)

### 2. Create Database and User

```bash
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE training_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional, can use root)
CREATE USER 'training_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON training_db.* TO 'training_user'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

## Installation

1. **Navigate to the backend directory:**
```bash
cd training-api
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
nano .env  # Edit with your MySQL credentials
```

4. **Initialize the database:**
```bash
npm run setup
```

5. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Environment Variables

```env
# Server
PORT=3001                          # API server port
NODE_ENV=production                # Environment

# Security
JWT_SECRET=change-this-secret      # JWT signing key (CHANGE THIS!)
JWT_EXPIRES_IN=7d                  # Token expiration

# MySQL Database
DB_HOST=localhost                  # MySQL host
DB_PORT=3306                       # MySQL port
DB_USER=root                       # MySQL username
DB_PASSWORD=your_password          # MySQL password
DB_NAME=training_db                # Database name

# File Uploads
UPLOAD_DIR=./uploads               # File upload directory
MAX_FILE_SIZE=10485760             # Max file size (10MB)

# CORS
CORS_ORIGIN=*                      # Frontend domain
```

## Default Login Credentials

After running `npm run setup`, the following users are created:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@training.com | admin123 |
| Trainer | trainer1@training.com | trainer123 |
| Trainer | trainer2@training.com | trainer123 |
| Learner | learner1@training.com | learner123 |
| Learner | learner2@training.com | learner123 |
| Learner | learner3@training.com | learner123 |
| Learner | learner4@training.com | learner123 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin)

### Courses
- `GET /api/courses` - List courses
- `GET /api/courses/:id` - Get course
- `POST /api/courses` - Create course (admin)
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course (admin)
- `POST /api/courses/:id/publish` - Publish e-learning
- `POST /api/courses/:id/archive` - Archive course

### Course Modules (E-Learning)
- `GET /api/courses/:id/modules` - List modules
- `POST /api/courses/:id/modules` - Add module
- `PUT /api/courses/:courseId/modules/:moduleId` - Update module
- `DELETE /api/courses/:courseId/modules/:moduleId` - Delete module
- `POST /api/courses/:id/modules/reorder` - Reorder modules

### Schedules
- `GET /api/schedules` - List schedules
- `GET /api/schedules/:id` - Get schedule
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule (admin)
- `POST /api/schedules/:id/enroll` - Enroll learner
- `DELETE /api/schedules/:id/enroll/:enrollmentId` - Unenroll
- `GET /api/schedules/:id/attendance` - Get attendance
- `POST /api/schedules/:id/attendance` - Mark attendance

### Profile Fields
- `GET /api/profile-fields` - List fields
- `POST /api/profile-fields` - Create field (admin)
- `PUT /api/profile-fields/:id` - Update field (admin)
- `DELETE /api/profile-fields/:id` - Delete field (admin)
- `POST /api/profile-fields/reorder` - Reorder fields

## Database Schema

The MySQL database includes tables for:
- `users` - User accounts
- `courses` - Training courses
- `course_modules` - E-learning modules
- `schedules` - Training schedules
- `schedule_days` - Multi-day schedule dates
- `enrollments` - Learner enrollments
- `attendance` - Attendance records
- `assignments` - Course assignments
- `submissions` - Assignment submissions
- `custom_profile_fields` - Custom profile field definitions
- `document_credentials` - User uploaded documents
- `learner_groups` - Learner groups
- `chats` & `messages` - Messaging system
- `calendar_events` - Calendar events
- `zoho_invoices` - Invoice data
- `system_settings` - Application settings
- `notification_preferences` - Notification settings
- `dashboard_layouts` - User dashboard configs
- `elearning_enrollments` - E-learning progress tracking

## Production Deployment

### Option 1: Docker (Recommended)

```bash
cd training-api
cp .env.example .env
# Edit .env with production settings
docker-compose up -d
```

### Option 2: PM2 (Traditional)

```bash
cd training-api
chmod +x deploy.sh
./deploy.sh production
```

### Manual Deployment

1. **Install Node.js and MySQL on your server**

2. **Create MySQL database and user:**
```sql
CREATE DATABASE training_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'training_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON training_db.* TO 'training_user'@'localhost';
FLUSH PRIVILEGES;
```

3. **Deploy the application:**
```bash
cd training-api
npm install
npm run build
npm run setup
npm start
```

### Using Nginx as Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

## Database Backup and Restore

### Backup
```bash
# Manual backup
mysqldump -u root -p training_db > backups/training-$(date +%Y%m%d-%H%M%S).sql

# Automated backup (add to crontab)
0 2 * * * mysqldump -u root -p'password' training_db > /path/to/backups/training-$(date +\%Y\%m\%d).sql
```

### Restore
```bash
mysql -u root -p training_db < backup-file.sql
```

## Monitoring

Health check endpoint:
```
GET /health
```

Response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "database": "MySQL"
}
```

## Development

### Run in development mode:
```bash
npm run dev
```

### Database migrations:
```bash
npm run db:migrate
```

### Seed database:
```bash
npm run db:seed
```

### Full setup:
```bash
npm run setup
```

## Troubleshooting

### MySQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution:** Ensure MySQL is running:
```bash
sudo systemctl status mysql
sudo systemctl start mysql
```

### Access Denied Error
```
Error: Access denied for user 'root'@'localhost'
```
**Solution:** Check your DB_USER and DB_PASSWORD in .env file

### Database Not Found
```
Error: Unknown database 'training_db'
```
**Solution:** Run `npm run setup` to create the database

## License

MIT
"# training-api" 
"# training-api" 
