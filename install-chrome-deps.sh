#!/bin/bash

# Install Chrome dependencies for WhatsApp Web.js
echo "🔧 Installing Chrome dependencies for WhatsApp Web.js..."

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS"
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    # Install Chrome via Homebrew
    echo "📦 Installing Google Chrome..."
    brew install --cask google-chrome
    
    echo "✅ Chrome installed successfully"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux"
    
    # Update package list
    sudo apt-get update
    
    # Install Chrome
    echo "📦 Installing Google Chrome..."
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable
    
    echo "✅ Chrome installed successfully"
    
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install Google Chrome manually and ensure it's in your PATH"
    exit 1
fi

# Install additional dependencies for Puppeteer
echo "📦 Installing additional Puppeteer dependencies..."

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt-get install -y \
        ca-certificates \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgbm1 \
        libgcc1 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        lsb-release \
        wget \
        xdg-utils
fi

echo "✅ Dependencies installed successfully!"
echo ""
echo "🚀 You can now start the WhatsApp integration:"
echo "   cd backend && npm run dev"
echo ""
echo "📱 Then navigate to: http://localhost:3000/whatsapp"
