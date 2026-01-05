require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const TelegramBot = require('node-telegram-bot-api')
const { Redis } = require('@upstash/redis') // Added Redis

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

io.on('connection', (socket) => {
  const userId = socket.id;
  const userIp = socket.handshake.address;
  const userAgent = socket.handshake.headers['user-agent'];

  activeWebSockets.set(userId, socket);
  console.log(`User connected: ${userId}`);

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

      // SAVE TO REDIS
      if (redis) {
        const msgObj = {
          socketId: userId,
          text: data.text,
          from: 'Web User',
          date: Date.now()
        };
        await redis.lpush('tg_messages', JSON.stringify(msgObj));
        await redis.ltrim('tg_messages', 0, 99); // Keep last 100
      }

      socket.emit('message_sent', { ok: true });
    } catch (err) {
      console.error('Relay Error:', err.message);
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
    
    // SAVE REPLY TO REDIS
    if (redis) {
      const replyObj = {
        replyToSocketId: targetSocketId,
        text: msg.text,
        from: 'Support',
        date: Date.now()
      };
      await redis.lpush('tg_messages', JSON.stringify(replyObj));
    }

    const webClient = activeWebSockets.get(targetSocketId);
    if (webClient) {
      webClient.emit('tg_message', {
        text: msg.text,
        from: "Support"
      });
      bot.sendMessage(msg.chat.id, "✅ Reply sent to web user.");
    } else {
      bot.sendMessage(msg.chat.id, "❌ User is offline, but reply was saved to history.");
    }
  }
});

/* ================= API FOR HISTORY ================= */

// This allows your frontend to call /api/messages on load
app.get('/api/messages', async (req, res) => {
    if (!redis) return res.json({ ok: false, messages: [] });
    const msgs = await redis.lrange('tg_messages', 0, 99);
    const parsed = msgs.map(m => typeof m === 'string' ? JSON.parse(m) : m);
    res.json({ ok: true, messages: parsed });
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log('✅ Server Live on Port', PORT)
})