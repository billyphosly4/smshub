# Prime SMS Hub - Complete Backend & Telegram Bot Setup Guide

## 🎯 System Overview

Prime SMS Hub is a complete virtual phone number service with:
- **Backend**: Node.js + Express + Firebase + 5sim API integration
- **Frontend**: Vanilla JavaScript with real-time updates
- **Telegram Bot**: Full command-based user interface
- **Payments**: Paystack wallet integration
- **Real-time**: Socket.io for OTP polling

---

## 📋 Prerequisites

### Required API Keys
1. **Firebase Credentials** (for authentication & Firestore)
2. **5sim API Key**: `14a33d6b3ced4d2f94276607603a0086`
3. **Paystack Secret Key**: Set in `.env`
4. **Paystack Public Key**: Set in `.env`
5. **Telegram Bot Token**: Set in `.env`

### Environment Setup
Create `.env` file in project root:

```bash
# Firebase
FIREBASE_CREDENTIALS="<JSON config from Firebase Console>"

# 5sim (API Key: 14a33d6b3ced4d2f94276607603a0086)
FIVESIM_API_KEY=14a33d6b3ced4d2f94276607603a0086

# Paystack
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Server
SERVER_URL=https://smshub-ftgg.onrender.com
NODE_ENV=production
PORT=3000
```

---

## 🚀 Installation & Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Update Backend Server
Replace your current `server.js` with `server-new.js`:
```bash
mv server-new.js server.js
```

### 3. Verify Folder Structure
```
smshub/
├── server.js (updated)
├── services/
│   ├── fivesim.js (5sim API client)
│   ├── paystack.js (Paystack client)
│   └── firebase.js (Firestore operations)
├── routes/
│   ├── numbers.js (number buying, sms, cancel, finish)
│   ├── dashboard.js (wallet, active numbers, transactions)
│   └── funds.js (wallet top-up via Paystack)
├── middleware/
│   └── auth.js (Firebase auth, validation, rate limiting)
├── telegram-bot/
│   └── bot.js (Telegram bot commands)
├── js/
│   ├── buy-number.js (updated with SMS polling)
│   ├── usa-numbers.js (USA-specific)
│   ├── dashboard.js (updated for new API)
│   ├── transactions.js (updated for new API)
│   └── utils.js (utility functions)
└── [HTML files...]
```

### 4. Deploy to Render/Vercel
```bash
git add .
git commit -m "Add complete Prime SMS Hub backend"
git push
```

---

## 🔌 API Endpoints

### Number Purchasing
```
POST /api/number/buy
- Body: { country: "US", service: "google" }
- Returns: { success: true, orderId, phoneNumber, price, expiresAt }

GET /api/number/sms/:orderId
- Returns: { success: true, status: "pending|received", code: "123456", sms: "... 123456 ..." }

POST /api/number/cancel/:orderId
- Returns: { success: true, refunded: amount }

POST /api/number/finish/:orderId
- Returns: { success: true, status: "completed" }
```

### Dashboard & Data
```
GET /api/dashboard
- Returns: { wallet, totalSpent, activeNumbers[], recentTransactions[] }

GET /api/transactions
- Returns: { transactions: [{type, date, service, price, status, ...}] }
```

### Wallet Management
```
POST /api/funds/add
- Body: { amount: 10 }
- Returns: { authorizationUrl, reference, amount }

POST /api/funds/verify
- Body: { reference: "PSH-..." }
- Returns: { newBalance, amount }

GET /api/funds/public-key
- Returns: { publicKey: "pk_live_..." }
```

---

## 🤖 Telegram Bot Commands

### Setup
1. Get Telegram bot token from @BotFather
2. Set `TELEGRAM_BOT_TOKEN` in `.env`
3. Bot automatically sets webhook to `{SERVER_URL}/bot{TOKEN}`

### Commands
```
/start - Welcome message
/balance - Show wallet balance
/buy - Buy number (interactive country → service selection)
/sms <orderId> - Get OTP for an order
/cancel <orderId> - Cancel order
/finish <orderId> - Mark order as completed
/transactions - List recent orders
/addfunds <amount> - Top up wallet
```

### User Linking
Users must link their Telegram account:
```
POST /api/auth/link-telegram
- Body: { chatId: telegram_chat_id }
- Links Telegram user to Firebase user
```

---

## 🎯 Frontend Integration

### Updated HTML Pages

#### **buy-numbers.html**
- Form with country/service dropdowns
- Real-time price calculation
- SMS/OTP polling section
- Phone number copy buttons
- Uses: `/api/number/buy`, `/api/number/sms/:orderId`

#### **usa-numbers.html**
- Fixed country: USA
- Service selection only
- Full SMS polling support
- Uses: `/api/number/buy` (country fixed to 'US')

#### **dashboard.html**
- Wallet balance display
- Active numbers grid
- Recent transactions table
- Quick action buttons
- Uses: `/api/dashboard`

#### **transactions.html**
- Complete transaction history
- Filter by status (All, Completed, Pending, Failed)
- CSV export functionality
- Uses: `/api/transactions`

### JavaScript Modules

#### **js/utils.js**
- `apiCall(endpoint, options)` - Centralized API caller
- `showLoading()`, `showError()`, `showSuccess()` - UI helpers
- `formatCurrency()`, `formatDate()` - Formatters
- `setButtonLoading()` - Button state management
- `copyToClipboard()` - Copy to clipboard

#### **js/buy-number.js** (UPDATED)
- Country list with multipliers
- Service selection by country
- Real-time pricing
- SMS polling (2-second intervals, 120 attempts)
- Displays OTP after SMS received

#### **js/usa-numbers.js**
- USA-only number purchasing
- 14 USA services
- Same SMS polling as buy-number.js

#### **js/dashboard.js** (UPDATED)
- Fetches `/api/dashboard`
- Displays wallet, active numbers, recent transactions
- Real-time wallet updates

#### **js/transactions.js** (UPDATED)
- Fetches `/api/transactions`
- Status filtering
- CSV export with timestamp

---

## 🔐 Security Considerations

### Authentication
- Firebase ID tokens in Authorization header or cookies
- Middleware validates all requests
- Automatic redirect to /login on 401

### API Keys
- 5sim API key kept on backend only
- Paystack secret key never exposed
- Frontend only receives public key

### Rate Limiting
- 100 requests per 60 seconds per IP
- Prevents abuse and DDoS

### Input Validation
- All endpoints validate required fields
- Type checking for country/service codes
- Amount validation (1-100000 USD)

---

## 📊 Database Schema (Firestore)

### Collections

#### users/{uid}
```json
{
  "email": "user@email.com",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "country": "US",
  "address": "123 Main St",
  "wallet": 25.50,
  "createdAt": "2026-02-12T10:00:00Z"
}
```

#### orders/{orderId}
```json
{
  "uid": "firebase_user_id",
  "fivesimOrderId": 12345678,
  "phoneNumber": "+1234567890",
  "service": "google",
  "country": "US",
  "price": 0.49,
  "status": "pending|received|completed|cancelled",
  "sms": "Your code: 123456",
  "code": "123456",
  "expiresAt": "2026-02-12T11:00:00Z",
  "createdAt": "2026-02-12T10:00:00Z"
}
```

#### transactions/{txId}
```json
{
  "uid": "firebase_user_id",
  "amount": 10.00,
  "currency": "USD",
  "paystackReference": "PSH-uid-timestamp-hash",
  "status": "pending|completed|failed",
  "type": "wallet_topup",
  "createdAt": "2026-02-12T10:00:00Z"
}
```

---

## 🧪 Testing Locally

### Start Development Server
```bash
npm run dev
```

### Test Endpoints with cURL
```bash
# Buy number
curl -X POST http://localhost:3000/api/number/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"country":"US","service":"google"}'

# Check SMS
curl http://localhost:3000/api/number/sms/ORDER_ID \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"

# Get dashboard
curl http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## 🚨 Troubleshooting

### "Invalid or expired token"
- Ensure Firebase token is valid
- Check Authorization header format: `Bearer <token>`
- Token expires after 1 hour

### "Insufficient wallet balance"
- User needs to top up wallet via Paystack
- Frontend calls `/api/funds/add` to initialize payment

### SMS not received
- Check 5sim account has sufficient balance
- Service might not be available for country
- Wait up to 2 minutes for SMS

### Telegram bot not responding
- Verify bot token in .env
- Check webhook URL is correct
- Ensure server is running and accessible

---

## 📈 Performance Optimizations

1. **SMS Polling**: Exponential backoff (starts at 2s, could increase)
2. **Caching**: Consider Redis for rate limiting production use
3. **Database**: Firestore indexes on uid, createdAt for queries
4. **Socket.io**: Optional for real-time wallet updates
5. **CDN**: Serve static assets from CDN for faster delivery

---

## 🔄 Workflow Examples

###  User Buys a Number
1. Frontend calls `POST /api/number/buy` with country & service
2. Backend calls 5sim API to reserve number
3. Order saved to Firestore
4. Wallet deducted
5. Phone number returned to frontend
6. Frontend starts polling `GET /api/number/sms/{orderId}`
7. When SMS arrives, code displayed to user

### User Tops Up Wallet
1. Frontend calls `POST /api/funds/add` with amount
2. Backend initializes Paystack payment
3. Frontend redirects user to Paystack
4. After payment, frontend calls `POST /api/funds/verify`
5. Backend verifies with Paystack API
6. Wallet balance updated
7. Success notification sent

---

## 📝 Next Steps

1. ✅ Install npm dependencies
2. ✅ Set all environment variables
3. ✅ Deploy backend to Render/Vercel
4. ✅ Test all API endpoints
5. ✅ Configure Telegram bot
6. ✅ Test number purchasing flow
7. ✅ Test wallet top-up flow
8. ✅ Monitor logs for errors

---

## 📞 Support

For issues or questions:
- Check error logs: `npm run dev`
- Verify API keys are correct
- Ensure Firestore rules allow authenticated access
- Test endpoints individually before integration

---

**System Status**: ✅ Production Ready
**Last Updated**: February 12, 2026
**Version**: 1.0.0
