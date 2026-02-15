# Frontend-Backend Deployment Guide

## ✅ What Has Been Fixed

Your project has been updated to fix the Network Error issue when buying numbers. Here's what was corrected:

### 1. **CORS Configuration** ✅
- **Before**: Backend allowed all origins with `cors: { origin: '*' }`
- **After**: Backend now restricts CORS to only:
  - Your Vercel frontend: `https://primesmshub.vercel.app`
  - Local development: `http://localhost:3000`
  - Configurable via `FRONTEND_URL` environment variable

### 2. **Backend URL Configuration** ✅
- Updated all frontend JS files to use consistent backend URL
- Added automatic fallback detection in `utils.js`
- All API calls now point to: `https://smshub-ftgg.onrender.com`

### 3. **Error Handling** ✅
- Enhanced `utils.js` `apiCall()` function with detailed error messages
- Network errors now show more informative messages
- CORS errors and authentication errors are clearly reported
- Console logging added for debugging API calls

### 4. **HTTPS Security** ✅
- All frontend API calls use HTTPS
- Backend runs on HTTPS (Render deployment)
- Socket.IO uses HTTPS with proper CORS headers

---

## 🚀 Deployment Steps

### **Step 1: Configure Your Backend Environment**

1. Go to your Render dashboard: https://render.com/dashboard
2. Select your backend service (likely named `smshub`)
3. Go to **Environment** (Settings tab)
4. Add/update these variables:

```env
FRONTEND_URL=https://primesmshub.vercel.app
SERVER_URL=https://smshub-ftgg.onrender.com
NODE_ENV=production
PAYSTACK_SECRET_KEY=sk_live_xxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxx
FIVESIM_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email
```

**⚠️ CRITICAL**: Make sure `SERVER_URL` matches your Render backend URL exactly!

### **Step 2: Verify Backend is Running on HTTPS**

Test your backend is accessible:

```bash
# Open in browser or curl
curl -I https://smshub-ftgg.onrender.com/health

# Should return 200 OK
```

### **Step 3: Redeploy Frontend to Vercel**

Since the frontend JavaScript files have been updated:

```bash
# Option A: Push to GitHub (if using Git deployment)
git add .
git commit -m "Fix: Update backend URL for production deployment"
git push

# Option B: Upload files manually to Vercel
# Via Vercel dashboard -> Import project -> Redeploy
```

Or trigger a redeploy in Vercel dashboard:
1. Go to https://vercel.com/dashboard
2. Select `primesmshub` project
3. Click "Redeploy"

### **Step 4: Test Everything**

1. **Open your frontend**: https://primesmshub.vercel.app
2. **Login** with your test account
3. **Go to "Buy Numbers"** page
4. **Select a country and service**, then try to buy
5. **Check browser console** (F12 → Console tab):
   - Should see: `[API] POST https://smshub-ftgg.onrender.com/api/number/buy`
   - Should NOT see CORS errors
6. **Check wallet** loads properly
7. **Check dashboard** loads properly

---

## 🔍 Troubleshooting

### **Network Error appears when buying numbers**

**Check #1: Is your backend running?**
```bash
curl https://smshub-ftgg.onrender.com/health
# Should return: {"status": "ok"} or similar
```

**Check #2: Console errors (F12 → Console)**
- `CORS error`: Backend CORS configuration might not include your Vercel URL
- `Failed to fetch`: Backend is down or URL is wrong
- `401 Unauthorized`: Firebase token expired or invalid

**Check #3: Is FRONTEND_URL set in backend?**
```bash
# On Render dashboard, verify the Environment variable is set
FRONTEND_URL=https://primesmshub.vercel.app
```

### **Buying numbers works locally but not on Vercel**

**This usually means CORS is blocking the request.**

Fix:
1. Verify `FRONTEND_URL` env variable is set on Render
2. Check the exact domain matches (no trailing slashes)
3. Redeploy backend on Render after changing env variables

```bash
# On Render dashboard:
1. Go to Settings
2. Scroll to "Restart service"
3. Click "Restart"
```

### **Backend URL not updating in frontend**

The frontend gets the URL from two places:
1. **Each JS file** has it hardcoded: `window.BACKEND_URL = 'https://smshub-ftgg.onrender.com'`
2. **Fallback in utils.js** detects the environment

If you want to change the backend URL:
1. Update the hardcoded URLs in:
   - `js/buy-number.js` line 11
   - `js/dashboard.js` line 8
   - `js/usa-numbers.js` line 8
   - `js/transactions.js` line 8

2. Or, set it via window variable before utils.js loads:
```html
<!-- In your HTML file, before </head> -->
<script>
  window.BACKEND_URL = 'https://your-new-backend.com'
</script>
<script src="js/utils.js"></script>
```

---

## 📋 Complete Environment Variables Checklist

### **For Render Backend** (Production)

```env
# CRITICAL - Frontend CORS
FRONTEND_URL=https://primesmshub.vercel.app

# CRITICAL - Backend public URL
SERVER_URL=https://smshub-ftgg.onrender.com

# General
PORT=3000
NODE_ENV=production

# Payments
PAYSTACK_SECRET_KEY=sk_live_xxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxx

# SMS Services
FIVESIM_API_KEY=your_key

# Firebase (optional but recommended)
FIREBASE_PROJECT_ID=your_id
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_token
DEFAULT_CHAT_ID=7711425125

# Redis (optional)
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

### **For Vercel Frontend** (Production)

No special configuration needed! The frontend reads the hardcoded `BACKEND_URL` from JavaScript files.

---

## 🔐 Security Notes

1. **API Keys** are stored as Render environment variables (not in code) ✅
2. **CORS** restricts access to only your Vercel domain ✅
3. **HTTPS** is used everywhere ✅
4. **Credentials** are passed via `credentials: 'include'` in fetch calls ✅

---

## 📞 API Endpoints Being Used

When you buy a number, the frontend calls:

```javascript
// 1. Get wallet balance
GET https://smshub-ftgg.onrender.com/api/dashboard

// 2. Buy a number
POST https://smshub-ftgg.onrender.com/api/number/buy
{
  "country": "US",
  "service": "Google"
}

// 3. Get SMS for number
GET https://smshub-ftgg.onrender.com/api/number/sms/{orderId}

// 4. Complete the order
POST https://smshub-ftgg.onrender.com/api/number/finish/{orderId}
```

All these endpoints are now properly configured with CORS headers and error handling.

---

## 🎯 What Changed in Code

### **server.js**
- Updated Socket.IO CORS configuration
- Updated general CORS middleware to check `allowedOrigins`
- Added `FRONTEND_URL` configuration

### **js/utils.js**
- Added auto-detection of `BACKEND_URL` based on environment
- Enhanced `apiCall()` function with better error messages
- Added detailed console logging for debugging

### **js/*.js (all pages)**
- Updated `BACKEND_URL` initialization to use window object
- Consistent fallback to utils.js configuration

### **.env.example**
- Added `FRONTEND_URL` configuration
- Clarified the purpose of each variable

---

## ✨ Next Steps

1. **Test buying a number** on the Vercel frontend
2. **Check console** (F12) for any errors
3. **Verify** wallet and transactions load
4. **Contact support** if issues persist (include console errors)

✅ **Your deployment should now be working correctly!**
