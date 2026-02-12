#!/bin/bash
# Prime SMS Hub - Quick Deployment Script

echo "╔════════════════════════════════════════╗"
echo "║  Prime SMS Hub - Deployment Helper    ║"
echo "╚════════════════════════════════════════╝"

# Step 1: Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Step 2: Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm: $(npm --version)"

# Step 3: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Step 4: Check .env file
echo ""
echo "🔑 Checking environment variables..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << 'EOF'
# Firebase Configuration
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"primesmshub-c0f58",...}

# 5sim API
FIVESIM_API_KEY=14a33d6b3ced4d2f94276607603a0086

# Paystack API
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxx

# Server Configuration
SERVER_URL=https://smshub-ftgg.onrender.com
NODE_ENV=production
PORT=3000
EOF
    echo "📝 Template created at .env - Please fill in your keys"
else
    echo "✅ .env file found"
fi

# Step 5: Verify files
echo ""
echo "📂 Verifying file structure..."
FILES=(
    "services/fivesim.js"
    "services/paystack.js"
    "services/firebase.js"
    "routes/numbers.js"
    "routes/dashboard.js"
    "routes/funds.js"
    "middleware/auth.js"
    "telegram-bot/bot.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file NOT FOUND"
    fi
done

# Step 6: Replace server.js
echo ""
echo "🔄 Updating server.js..."
if [ -f "server-new.js" ]; then
    cp server-new.js server.js
    echo "✅ server.js updated"
else
    echo "⚠️  server-new.js not found - manually run: cp server-new.js server.js"
fi

# Step 7: Summary
echo ""
echo "╔════════════════════════════════════════╗"
echo "║         Setup Complete! ✅            ║"
echo "╠════════════════════════════════════════╣"
echo "║ Next Steps:                            ║"
echo "║ 1. Edit .env with your API keys      ║"
echo "║ 2. Test locally: npm run dev          ║"
echo "║ 3. Deploy: git push                    ║"
echo "║                                        ║"
echo "║ Documentation:                         ║"
echo "║ - COMPLETE_SETUP_GUIDE.md             ║"
echo "║ - IMPLEMENTATION_SUMMARY.md           ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "🚀 Start development server:"
echo "   npm run dev"
echo ""
echo "📖 Read the guides for more information"
echo ""
