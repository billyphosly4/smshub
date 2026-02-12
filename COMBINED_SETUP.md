# Combined Server Setup - SMS Hub + Support Chat

## ✅ What's Included

### Server Features:
1. **SMS Hub System** (new)
   - Buy virtual numbers
   - OTP polling
   - Paystack wallet integration

2. **Support Chat Relay** (old + enhanced)
   - Web users send messages with their details
   - Support admin receives on Telegram
   - Admin replies back to web user in real-time
   - Chat history stored in Redis

---

## 🚀 Deployment Steps

### Step 1: Replace Server File
```bash
cp server-combined.js server.js
```

### Step 2: Add Support Chat to Your Pages

Add this script tag to every HTML page (dashboard.html, index.html, etc.):

```html
<!-- At the bottom of <body> -->
<script src="/socket.io/socket.io.js"></script>
<script src="js/support-chat.js"></script>
```

Example in `dashboard.html`:
```html
  </div>

  <!-- Support Chat Widget -->
  <script src="/socket.io/socket.io.js"></script>
  <script src="js/support-chat.js"></script>
  
</body>
</html>
```

### Step 3: Verify Environment Variables
```bash
# .env should have:
TELEGRAM_BOT_TOKEN=your_bot_token
SERVER_URL=https://smshub-ftgg.onrender.com
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
```

### Step 4: Deploy
```bash
git add .
git commit -m "Add combined SMS hub + support chat system"
git push
```

---

## 💬 How It Works

### User Side (Website)
1. **Chat widget appears** in bottom-right corner (💬 button)
2. User clicks to open
3. **User enters their details:**
   - Name (required)
   - Email (required)
   - Phone (optional)
4. User clicks "Continue"
5. **Chat input appears**
6. User types message and sends

### Admin Side (Telegram)
1. **Receives formatted message:**
   ```
   🌐 NEW MESSAGE FROM WEB SUPPORT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   From: John Doe
   Email: john@example.com
   Phone: +1234567890
   Socket ID: abc123xyz
   Message: I need help with my order
   ```

2. **Admin replies** by:
   - Replying to the Telegram message
   - Message automatically sent to user in browser

3. **User receives** real-time notification with reply

---

## 📱 Chat Widget Features

### User Perspective:
- ✅ Floating button in bottom-right (💬)
- ✅ Click to open chat
- ✅ Enter name, email, phone
- ✅ Send message
- ✅ See support responses instantly
- ✅ Close/minimize
- ✅ Reconnects automatically

### Support Perspective (Telegram):
- ✅ Receives message with user details
- ✅ Knows who is messaging (by name/email)
- ✅ Can reply via Telegram
- ✅ Gets confirmation when message delivered
- ✅ Notified when user goes offline

---

## 🔄 Data Flow

### Web → Telegram:
```
User sends message with details
    ↓
Socket.io emits to server
    ↓
Server formats message with user info
    ↓
Telegram bot sends to admin
    ↓
Admin sees formatted message with name, email, phone
```

### Telegram → Web:
```
Admin replies to Telegram message
    ↓
Bot detects reply with Socket ID
    ↓
Server sends to web socket
    ↓
User receives real-time message in browser
```

---

## 📋 User Details Captured

When a user sends a message, the support admin receives:
- **Name** - User's full name
- **Email** - User's email address
- **Phone** - User's phone number (optional)
- **Socket ID** - Unique identifier for this browser session
- **Message** - The actual message content
- **Timestamp** - When message was sent

---

## 🛍️ Where to Add Support Chat Widget

Add to ALL your pages:

**dashboard.html:**
```html
</div>
<!-- Support Chat -->
<script src="/socket.io/socket.io.js"></script>
<script src="js/support-chat.js"></script>
</body>
</html>
```

**index.html, buy-numbers.html, profile.html, etc.:**
Same as above at the bottom before closing `</body>`

---

## 🎨 Widget Styling

The widget is pre-styled, but you can customize in `js/support-chat.js`:

```javascript
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); // Change colors here
width: 380px;  // Adjust width
height: 500px; // Adjust height
```

---

## 🔐 Security Notes

✅ User details stored locally (browser only)
✅ Messages sent over Socket.io
✅ Redis stores history (secure)
✅ Telegram only for admins
✅ Socket ID anonymous to user

---

## ❌ Troubleshooting

### "Support Chat widget not showing"
- Check that `socket.io.js` is loaded
- Check that `support-chat.js` is loaded
- Open browser console (F12) for errors

### "Message not sending"
- Verify server.js is running
- Check Firebase authentication (if using)
- Check Socket.io connection in console

### "Telegram not receiving messages"
- Verify `TELEGRAM_BOT_TOKEN` in .env
- Check `DEFAULT_CHAT_ID` (default: 7711425125)
- Verify bot is running (check server logs)

### "Redis history not working"
- Redis is optional
- Messages still work without it
- Set `UPSTASH_REDIS_REST_URL` to enable

---

## 📊 Integration Checklist

- [ ] Replace server.js with server-combined.js
- [ ] Add support-chat.js to pages
- [ ] Add socket.io script tag
- [ ] Set TELEGRAM_BOT_TOKEN
- [ ] Test locally: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Click chat widget (bottom-right)
- [ ] Submit details & send message
- [ ] Check Telegram for message
- [ ] Reply on Telegram
- [ ] See response in browser
- [ ] Deploy to Render

---

## 🚀 Live Features After Deployment

1. **SMS Hub** - All number buying features work
2. **Support Chat** - Users can reach support with their details
3. **Telegram Bot** - Full command support (/buy, /balance, etc.)
4. **Real-time** - Instant message delivery
5. **History** - All messages stored

---

## 📞 Admin Setup

1. Get your Telegram chat ID:
   - Message @userinfobot on Telegram
   - Get your ID

2. Update in `server-combined.js`:
   ```javascript
   const DEFAULT_CHAT_ID = YOUR_CHAT_ID_HERE
   ```

3. Make sure you're a bot admin or private chat with the bot

---

## ✨ What Your Users See

**Before:** Just a website
**After:** Website with floating chat button (💬)

**One click opens:** 
- Cute purple gradient chat window
- Enter name, email, phone
- Send messages to support
- Get real-time responses

**Admin sees everything:**
- Who's messaging (by name)
- Their email & phone
- Full message history
- Can reply instantly from Telegram

---

**Status**: ✅ Ready to Deploy
**All features**: SMS Hub + Support Chat Combined
**Latest version**: server-combined.js
