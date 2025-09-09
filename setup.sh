#!/bin/bash

# Agent AI - SPH Generator Setup Script
echo "🚀 Setting up Agent AI - SPH Generator..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/data
mkdir -p backend/uploads

# Copy environment file
echo "⚙️ Setting up environment variables..."
if [ ! -f backend/.env ]; then
    cp backend/env.example backend/.env
    echo "✅ Created backend/.env from template"
    echo "⚠️  Please edit backend/.env and configure your settings"
else
    echo "✅ backend/.env already exists"
fi

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build
cd ..

echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit backend/.env file with your configuration"
echo "2. Configure your LLM API URL and key"
echo "3. Run 'npm run dev' to start development servers"
echo ""
echo "🌐 Access points:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:3001"
echo ""
echo "👤 Default admin account:"
echo "- Username: admin"
echo "- Password: admin123"


