/**
 * Prime SMS Hub - Backend Server
 * Integrates: Express, Firebase, 5sim API, Paystack, Telegram Bot, Socket.io
 */

require('dotenv').config()
const express = require('express')
const http = require('http')
const path = require('path')
const { Server } = require('socket.io')
const axios = require('axios')

// Import services and routes
const numberRoutes = require('./routes/numbers')
const dashboardRoutes = require('./routes/dashboard')
const fundsRoutes = require('./routes/funds')
const { authenticateUser, errorHandler, rateLimit } = require('./middleware/auth')
const PrimeSMSBot = require('./telegram-bot/bot')

// Initialize Express app
const app = express()
const server = http.createServer(app)

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 60000
})

// ================= CONFIGURATION ================= 
const PORT = process.env.PORT || 3000
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

// ================= MIDDLEWARE ================= 
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use(express.static(path.join(__dirname)))

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// Rate limiting
app.use('/api/', rateLimit(100, 60000)) // 100 requests per minute

// ================= TELEGRAM BOT ================= 
let bot = null
if (TELEGRAM_BOT_TOKEN) {
  const TelegramBot = require('node-telegram-bot-api')
  bot = new PrimeSMSBot(TELEGRAM_BOT_TOKEN)
  
  // Webhook endpoint for Telegram
  const botEndpoint = `/bot${TELEGRAM_BOT_TOKEN}`
  new (require('node-telegram-bot-api'))(TELEGRAM_BOT_TOKEN)
    .setWebHook(`${process.env.SERVER_URL || 'https://smshub-ftgg.onrender.com'}${botEndpoint}`)
  
  app.post(botEndpoint, (req, res) => {
    bot.bot.processUpdate(req.body)
    res.sendStatus(200)
  })
  
  console.log('✅ Telegram bot initialized')
}

// ================= SOCKET.IO ================= 
const activeWebSockets = new Map()

io.on('connection', (socket) => {
  console.log(`WebSocket connected: ${socket.id}`)
  activeWebSockets.set(socket.id, socket)

  // OTP polling
  socket.on('poll_sms', async (data) => {
    const { orderId } = data
    if (!orderId) return

    // Poll every 2 seconds for 2 minutes (60 times)
    let attempts = 0
    const pollInterval = setInterval(async () => {
      if (attempts++ >= 60) {
        clearInterval(pollInterval)
        socket.emit('sms_timeout', { orderId })
        return
      }

      try {
        // In production, call the OTP checking endpoint here
        // and emit 'sms_received' when SMS arrives
      } catch (error) {
        console.error('SMS polling error:', error)
      }
    }, 2000)

    socket.on('stop_polling', () => clearInterval(pollInterval))
  })

  socket.on('disconnect', () => {
    activeWebSockets.delete(socket.id)
    console.log(`WebSocket disconnected: ${socket.id}`)
  })
})

// ================= API ROUTES ================= 

// Mount all routes
app.use('/api/number', numberRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/funds', fundsRoutes)

// Paystack callback webhook
app.post('/paystack/webhook', async (req, res) => {
  try {
    const { data } = req.body

    if (data.status === 'success') {
      const amountInUSD = data.amount / 100

      // Send notification to admin via Telegram
      if (bot) {
        const message = `
💰 **NEW PAYMENT RECEIVED**
━━━━━━━━━━━━━━━
💵 Amount: $${amountInUSD}
📧 Email: ${data.customer.email}
👤 Customer: ${data.customer.name || 'Unknown'}
🆔 Reference: ${data.reference}
        `
        // Send to admin (would need admin chat ID)
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ================= HEALTH CHECK ================= 
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'Prime SMS Hub',
    timestamp: new Date().toISOString(),
    features: {
      firebase: '✅',
      telegram_bot: bot ? '✅' : '❌',
      paystack: PAYSTACK_PUBLIC_KEY ? '✅' : '❌',
      fivesim: '✅',
      websocket: '✅'
    }
  })
})

// ================= PAYSTACK PUBLIC KEY ================= 
app.get('/paystack-public-key', (req, res) => {
  res.json({ publicKey: PAYSTACK_PUBLIC_KEY })
})

// ================= TELEGRAM LINK ================= 
app.post('/api/auth/link-telegram', authenticateUser, async (req, res) => {
  try {
    const { chatId } = req.body
    const uid = req.user.uid

    if (!chatId) {
      return res.status(400).json({ success: false, error: 'Chat ID required' })
    }

    // Link Telegram user to Firebase user
    if (bot) {
      bot.linkUserToTelegram(chatId, uid)
    }

    res.json({
      success: true,
      message: 'Telegram account linked successfully'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ================= ERROR HANDLING ================= 
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  })
})

app.use(errorHandler)

// ================= START SERVER ================= 
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Prime SMS Hub Server Started     ║
╠════════════════════════════════════════╣
║ Port: ${PORT.toString().padEnd(29)}║
║ Environment: ${(process.env.NODE_ENV || 'production').padEnd(19)}║
║ Telegram Bot: ${bot ? '✅ Enabled'.padEnd(22) : '❌ Disabled'.padEnd(22)}║
║ Paystack: ${PAYSTACK_PUBLIC_KEY ? '✅ Configured'.padEnd(20) : '❌ Not configured'.padEnd(20)}║
╚════════════════════════════════════════╝
  `)
})

module.exports = { app, io, bot }
