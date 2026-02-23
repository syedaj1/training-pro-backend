#!/bin/bash

# Training Management System - Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: development, production

set -e

ENV=${1:-production}
echo "Deploying Training Management System API in $ENV mode..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Found: $(node -v)"
    exit 1
fi

print_status "Node.js version: $(node -v)"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Create necessary directories
print_status "Creating directories..."
mkdir -p data uploads logs

# Set up environment file
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before running in production!"
fi

# Build the application
print_status "Building application..."
npm run build

# Initialize database
print_status "Initializing database..."
if [ -f data/training.db ]; then
    print_warning "Database already exists. Skipping seed."
    print_warning "Run 'npm run db:seed' to re-seed the database."
else
    npm run setup
fi

if [ "$ENV" = "production" ]; then
    # Production deployment
    print_status "Starting production server with PM2..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        npm install -g pm2
    fi
    
    # Stop existing process if running
    pm2 stop training-api 2>/dev/null || true
    pm2 delete training-api 2>/dev/null || true
    
    # Start with PM2
    pm2 start dist/index.js --name "training-api" --env production
    pm2 save
    
    print_status "Application deployed successfully!"
    print_status "API is running at: http://localhost:3001"
    print_status "Health check: http://localhost:3001/health"
    print_status ""
    print_status "PM2 Commands:"
    print_status "  - View logs: pm2 logs training-api"
    print_status "  - Monitor: pm2 monit"
    print_status "  - Restart: pm2 restart training-api"
    print_status "  - Stop: pm2 stop training-api"
    
else
    # Development mode
    print_status "Starting development server..."
    print_status "API will be available at: http://localhost:3001"
    npm run dev
fi
