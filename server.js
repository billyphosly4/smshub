require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const TelegramBot = require('node-telegram-bot-api')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(express.json())
app.use(express.static(__dirname))

/* ================= TELEGRAM BOT ================= */

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set')
  process.exit(1)
}

const bot = new TelegramBot(token)
const WEBHOOK_URL = `https://smshub-ftgg.onrender.com/bot${token}`

bot.setWebHook(WEBHOOK_URL)

/* Telegram webhook endpoint */
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body)
  res.sendStatus(200)
})

/* ================= CONFIG ================= */

const DEFAULT_CHAT_ID = 7711425125
const ALLOW_DEFAULT_CHAT = true

/* ================= API ================= */

app.get('/health', (req, res) => res.send('ok'))

app.post('/api/send', async (req, res) => {
  const { text, chatId } = req.body
  const targetChatId = chatId || (ALLOW_DEFAULT_CHAT ? DEFAULT_CHAT_ID : null)

  if (!targetChatId || !text) {
    return res.status(400).json({ ok: false, error: 'Missing chatId or text' })
  }

  try {
    const result = await bot.sendMessage(Number(targetChatId), text)
    res.json({ ok: true, result })
  } catch (err) {
    console.error('Telegram send error:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

/* ================= SOCKET.IO ================= */

const recentChats = new Map()

bot.on('message', msg => {
  const payload = {
    chatId: msg.chat.id,
    from: msg.from,
    text: msg.text || '',
    date: Date.now()
  }

  recentChats.set(msg.chat.id, payload)
  io.emit('tg_message', payload)
})

io.on('connection', socket => {
  socket.emit('chats_list', Array.from(recentChats.values()))
  socket.emit('default_chat', DEFAULT_CHAT_ID)

  socket.on('send_message', async ({ chatId, text }) => {
    try {
      const result = await bot.sendMessage(chatId || DEFAULT_CHAT_ID, text)
      socket.emit('message_sent', { ok: true, result })
    } catch (err) {
      socket.emit('message_sent', { ok: false, error: err.message })
    }
  })
})

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log('✅ Server running on port', PORT)
  console.log('✅ Telegram webhook:', WEBHOOK_URL)
})

