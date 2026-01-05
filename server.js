require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const TelegramBot = require('node-telegram-bot-api')
const { Redis } = require('@upstash/redis')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

// Initialize Redis
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

app.use(express.json())
app.use(express.static(__dirname))

/* ================= TELEGRAM BOT ================= */

const token = process.env.TELEGRAM_BOT_TOKEN
const DEFAULT_CHAT_ID = 7711425125 

const bot = new TelegramBot(token, { polling: false })
const WEBHOOK_URL = `https://smshub-ftgg.onrender.com/bot${token}`
bot.setWebHook(WEBHOOK_URL)

app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body)
  res.sendStatus(200)
})

/* ================= WEB USER TRACKING ================= */

const activeWebSockets = new Map();

/* ================= SOCKET.IO (Web to Telegram) ================= */

io.on('connection', async (socket) => {
  const userId = socket.id;
  const userIp = socket.handshake.address;
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown Device';

  activeWebSockets.set(userId, socket);
  console.log(`User connected: ${userId}`);

  // --- AUTOMATIC WELCOME MESSAGE ---
  const welcomeText = "Hello! Welcome to PrimeSmsHub. How can we help you today?";
  
  // 1. Emit directly to the user who just connected
  socket.emit('tg_message', {
    text: welcomeText,
    from: "Support"
  });

  // 2. Save to Redis so it appears in history on page refresh
  if (redis) {
    try {
        const welcomeObj = {
          replyToSocketId: userId,
          text: welcomeText,
          from: 'Support',
          date: Date.now()
        };
        await redis.lpush('tg_messages', JSON.stringify(welcomeObj));
        await redis.ltrim('tg_messages', 0, 99);
    } catch (e) { console.error("Redis Welcome Save Error:", e); }
  }
  // --- END WELCOME MESSAGE ---

  socket.on('send_message', async (data) => {
    try {
      const report = 
        `🌐 **NEW MESSAGE FROM WEB**\n` +
        `━━━━━━━━━━━━━━━\n` +
        `👤 **User ID:** \`${userId}\`\n` +
        `📍 **IP:** ${userIp}\n` +
        `📱 **Device:** ${userAgent.substring(0, 50)}...\n` +
        `━━━━━━━━━━━━━━━\n` +
        `💬 **Message:** ${data.text}`;

      await bot.sendMessage(DEFAULT_CHAT_ID, report, { parse_mode: 'Markdown' });

      if (redis) {
        const msgObj = {
          socketId: userId,
          text: data.text,
          from: 'Web User',
          date: Date.now()
        };
        await redis.lpush('tg_messages', JSON.stringify(msgObj));
        await redis.ltrim('tg_messages', 0, 99);
      }

      socket.emit('message_sent', { ok: true });
      
    } catch (err) {
      console.error('Relay Error:', err.message);
      socket.emit('message_sent', { ok: false, error: 'Telegram Relay Failed' });
    }
  });

  socket.on('disconnect', () => activeWebSockets.delete(userId));
});

/* ================= TELEGRAM ACTIONS (Telegram to Web) ================= */

bot.on('message', async (msg) => {
  if (!msg.reply_to_message || msg.from.is_bot) return;

  const textToSearch = msg.reply_to_message.text || "";
  const match = textToSearch.match(/User ID: ([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    const targetSocketId = match[1];
    
    if (redis) {
      const replyObj = {
        replyToSocketId: targetSocketId,
        text: msg.text,
        from: 'Support',
        date: Date.now()
      };
      await redis.lpush('tg_messages', JSON.stringify(replyObj));
      await redis.ltrim('tg_messages', 0, 99);
    }

    const webClient = activeWebSockets.get(targetSocketId);
    if (webClient) {
      webClient.emit('tg_message', {
        text: msg.text,
        from: "Support"
      });
      bot.sendMessage(msg.chat.id, "✅ Reply delivered to user browser.");
    } else {
      bot.sendMessage(msg.chat.id, "⌛ User is offline. They will see this message when they return.");
    }
  }
});

/* ================= API FOR HISTORY ================= */

app.get('/api/messages', async (req, res) => {
    try {
        if (!redis) return res.json({ ok: false, messages: [] });
        const msgs = await redis.lrange('tg_messages', 0, 99);
        const parsed = msgs.map(m => typeof m === 'string' ? JSON.parse(m) : m);
        res.json({ ok: true, messages: parsed });
    } catch (err) {
        res.status(500).json({ ok: false, messages: [] });
    }
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log('✅ Server Live on Port', PORT)
})