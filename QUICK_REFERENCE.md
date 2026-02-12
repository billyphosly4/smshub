# Prime SMS Hub - Quick Reference Card

## 🚀 Quick Links

- [Complete Setup Guide](COMPLETE_SETUP_GUIDE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.txt)

---

## 📍 API Endpoints

### Number Purchasing (POST /api/number/buy)
```bash
curl -X POST https://smshub-ftgg.onrender.com/api/number/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "country": "US",
    "service": "google"
  }'
```

**Response:**
```json
{
  "success": true,
  "orderId": "abc123def456",
  "phoneNumber": "+14155552671",
  "service": "google",
  "country": "US",
  "price": 0.49,
  "expiresAt": "2026-02-12T11:00:00Z"
}
```

### OTP Polling (GET /api/number/sms/:orderId)
```bash
curl https://smshub-ftgg.onrender.com/api/number/sms/abc123def456 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Response (Pending):**
```json
{
  "success": true,
  "status": "pending",
  "sms": null,
  "code": null
}
```

**Response (Received):**
```json
{
  "success": true,
  "status": "received",
  "sms": "Your Google code is 123456",
  "code": "123456"
}
```

### Dashboard (GET /api/dashboard)
```bash
curl https://smshub-ftgg.onrender.com/api/dashboard \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "wallet": 24.51,
  "totalSpent": 0.49,
  "activeNumbersCount": 1,
  "totalOrdersCount": 1,
  "activeNumbers": [
    {
      "id": "abc123",
      "phoneNumber": "+14155552671",
      "service": "google",
      "country": "US",
      "status": "received",
      "expiresAt": "2026-02-12T11:00:00Z",
      "sms": "Your Google code is 123456",
      "code": "123456"
    }
  ],
  "recentTransactions": []
}
```

### All Transactions (GET /api/transactions)
```bash
curl https://smshub-ftgg.onrender.com/api/transactions \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "abc123",
      "type": "number_purchase",
      "date": "2026-02-12T10:30:00Z",
      "service": "google",
      "country": "US",
      "phoneNumber": "+14155552671",
      "price": 0.49,
      "status": "received",
      "orderId": "abc123"
    }
  ],
  "count": 1
}
```

### Cancel Order (POST /api/number/cancel/:orderId)
```bash
curl -X POST https://smshub-ftgg.onrender.com/api/number/cancel/abc123def456 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled",
  "refunded": 0.441
}
```

### Finish Order (POST /api/number/finish/:orderId)
```bash
curl -X POST https://smshub-ftgg.onrender.com/api/number/finish/abc123def456 \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Order completed",
  "status": "completed"
}
```

### Add Funds (POST /api/funds/add)
```bash
curl -X POST https://smshub-ftgg.onrender.com/api/funds/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"amount": 10}'
```

**Response:**
```json
{
  "success": true,
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "abc123xyz",
  "reference": "PSH-uid-timestamp-hash",
  "amount": 10
}
```

### Verify Payment (POST /api/funds/verify)
```bash
curl -X POST https://smshub-ftgg.onrender.com/api/funds/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"reference": "PSH-uid-timestamp-hash"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet topped up with $10.00",
  "newBalance": 25.50,
  "amount": 10
}
```

### Get Paystack Public Key (GET /api/funds/public-key)
```bash
curl https://smshub-ftgg.onrender.com/api/funds/public-key
```

**Response:**
```json
{
  "publicKey": "pk_live_xxxxxxxxxxxxx"
}
```

---

## 🤖 Telegram Bot Commands

| Command | Usage | Example |
|---------|-------|---------|
| /start | Get help & welcome | `/start` |
| /balance | Check wallet | `/balance` |
| /buy | Buy a number | `/buy` |
| /sms | Get OTP | `/sms abc123def456` |
| /cancel | Cancel order | `/cancel abc123def456` |
| /finish | Mark complete | `/finish abc123def456` |
| /transactions | View orders | `/transactions` |
| /addfunds | Top up | `/addfunds 10` |

---

## 🌍 Supported Countries & Pricing

| Country | Code | Multiplier | Price |
|---------|------|-----------|-------|
| USA | US | 1.00 | $0.49 |
| UK | UK | 1.10 | $0.54 |
| Nigeria | NG | 0.50 | $0.25 |
| Ghana | GH | 0.60 | $0.29 |
| Kenya | KE | 0.80 | $0.39 |
| S. Africa | ZA | 0.90 | $0.44 |
| France | FR | 1.20 | $0.59 |
| Germany | DE | 1.30 | $0.64 |
| Canada | CA | 1.00 | $0.49 |
| Australia | AU | 1.15 | $0.56 |

---

## 📱 Services by Country

**USA**: Google, Facebook, WhatsApp, Telegram, OpenAI, Instagram, Twitter, LinkedIn, Discord, Snapchat

**UK**: Google, WhatsApp, Facebook, Telegram, Twitter, Instagram, Signal, Viber, WeChat, Wire

**Nigeria**: Telegram, WhatsApp, Facebook, Instagram, Twitter, LinkedIn, Discord, Snapchat, Signal, Viber

**Ghana**: WhatsApp, Telegram, Facebook, Instagram, Twitter, OpenAI, LinkedIn, Discord, Snapchat, Signal

**Kenya**: WhatsApp, Telegram, Facebook, Instagram, Twitter, Signal, Viber, Discord, OpenAI, LinkedIn

---

## 🔄 Common Workflows

### Workflow 1: Buy Number & Get OTP
```
1. POST /api/number/buy {country, service}
   ↓ Returns: orderId, phoneNumber
2. GET /api/number/sms/:orderId (poll every 2 seconds)
   ↓ Wait for status === "received"
3. Display code to user
4. User enters code in target service
5. POST /api/number/finish/:orderId (optional)
```

### Workflow 2: Top Up Wallet
```
1. POST /api/funds/add {amount}
   ↓ Returns: authorizationUrl
2. User completes Paystack payment
3. POST /api/funds/verify {reference}
   ↓ Returns: newBalance
4. Wallet updated automatically
```

### Workflow 3: View All Orders
```
1. GET /api/dashboard
   ↓ Get activeNumbers & recentTransactions
2. GET /api/transactions
   ↓ Get complete transaction history
3. Filter/display as needed
```

---

## ⏱️ Timing

- **SMS Poll Interval**: 2 seconds
- **Total Polling Time**: 2-4 minutes (up to 120 attempts)
- **Order Expiry**: Varies by 5sim (usually 10-30 minutes)
- **Token Expiry**: 1 hour (Firebase)
- **Rate Limit**: 100 requests/minute

---

## 🔐 Authentication

All endpoints require Firebase ID token in header:

```bash
Authorization: Bearer <firebase_id_token>
```

Or in cookie:
```bash
Cookie: idToken=<firebase_id_token>
```

Get token in browser:
```javascript
firebase.auth().currentUser.getIdToken().then(token => {
  console.log(token);
});
```

---

## 📊 Status Values

### Order Status
- `pending` - Waiting for SMS
- `received` - SMS received, code available
- `completed` - Order finished
- `cancelled` - Order cancelled
- `timeout` - Service didn't respond

### Payment Status
- `pending` - Awaiting payment
- `completed` - Payment successful
- `failed` - Payment failed

---

## ❌ Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid token | Token expired or invalid | Get new Firebase token |
| Insufficient wallet | Balance too low | Top up via Paystack |
| Service unavailable | 5sim doesn't have it | Try different service |
| SMS timeout | Service slow | Retry later |
| Unauthorized | Not authenticated | Add Authorization header |
| Too many requests | Rate limited | Wait & retry |

---

## 🧪 Testing Locally

Start server:
```bash
npm run dev
```

Test health:
```bash
curl http://localhost:3000/health
```

Test with mock data:
```bash
# Get a test Firebase token first
TOKEN="<your_firebase_token>"

curl -X POST http://localhost:3000/api/number/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"country":"US","service":"google"}'
```

---

## 📈 Monitoring

Check server health:
```bash
curl https://smshub-ftgg.onrender.com/health
```

Response shows:
- ✅ Firebase status
- ✅ Telegram bot status
- ✅ Paystack status
- ✅ WebSocket status

---

## 🔗 Links

- 5sim API: https://5sim.net/v1/docs
- Paystack: https://paystack.com/docs/api/
- Firebase: https://firebase.google.com/docs
- Telegram Bot API: https://core.telegram.org/bots/api

---

**Version**: 1.0.0
**Last Updated**: February 12, 2026
**Status**: ✅ Production Ready
