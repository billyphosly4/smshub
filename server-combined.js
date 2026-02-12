/**
 * Prime SMS Hub - Complete Backend Server
 * Features: SMS Hub + Support Chat Relay
 * 
 * Combines:
 * 1. Old server features (support chat, message relay)
 * 2. New SMS hub features (number buying, OTP polling, Paystack)
 * 3. User details capturing for support chats
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
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || ''
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const FIVESIM_API_KEY = process.env.FIVESIM_API_KEY || ''
const DEFAULT_CHAT_ID = process.env.DEFAULT_CHAT_ID || 7711425125 // Admin chat ID for support messages
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`

// Redis setup for chat history
let redis = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis')
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })
  }
} catch (e) {
  console.warn('Redis not available, chat history disabled')
}

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
let primeSMSBot = null

if (TELEGRAM_BOT_TOKEN) {
  try {
    const TelegramBot = require('node-telegram-bot-api')
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false })
    
    // Initialize SMS hub bot
    primeSMSBot = new PrimeSMSBot(TELEGRAM_BOT_TOKEN)
    
    // Webhook endpoint for Telegram
    const botEndpoint = `/bot${TELEGRAM_BOT_TOKEN}`
    if (SERVER_URL !== `http://localhost:${PORT}`) {
      bot.setWebHook(`${SERVER_URL}${botEndpoint}`)
    }
    
    app.post(botEndpoint, (req, res) => {
      bot.processUpdate(req.body)
      res.sendStatus(200)
    })
    
    console.log('✅ Telegram bot initialized')
  } catch (err) {
    console.error('⚠️ Telegram bot error:', err.message)
  }
} else {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN not set - Telegram features disabled')
}

// ================= ACTIVE WEB SOCKETS ================= 
const activeWebSockets = new Map() // userId -> socket mapping

// ================= SOCKET.IO CONNECTION ================= 
io.on('connection', async (socket) => {
  const userId = socket.id
  activeWebSockets.set(userId, socket)
  
  console.log(`WebSocket connected: ${socket.id}`)

  // Welcome message
  const welcomeText = "👋 Hello! Welcome to PrimeSmsHub. How can we help you today?"
  socket.emit('tg_message', { 
    text: welcomeText, 
    from: "Support",
    timestamp: new Date().toISOString()
  })

  // Store welcome in history
  if (redis) {
    try {
      const welcomeObj = { 
        socketId: userId, 
        text: welcomeText, 
        from: 'Support',
        userDetails: null,
        date: Date.now() 
      }
      await redis.lpush('tg_messages', JSON.stringify(welcomeObj))
      await redis.ltrim('tg_messages', 0, 99)
    } catch (e) {
      console.warn('Redis save failed:', e.message)
    }
  }

  /**
   * Send message from web user to Telegram support
   * Now includes user details (name, email, message)
   */
  socket.on('send_message', async (data) => {
    const { text, userDetails = {} } = data
    
    if (!text) {
      socket.emit('error', { message: 'Message cannot be empty' })
      return
    }

    try {
      // Format message for Telegram admin
      const userInfo = userDetails.name || userDetails.email || userId
      const report = `
🌐 **NEW MESSAGE FROM WEB SUPPORT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 **From:** ${userInfo}
${userDetails.email ? `📧 **Email:** \`${userDetails.email}\`` : ''}
${userDetails.phone ? `📱 **Phone:** \`${userDetails.phone}\`` : ''}
🆔 **Socket ID:** \`${userId}\`
💬 **Message:** ${text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

      // Send to Telegram support admin
      if (bot) {
        await bot.sendMessage(DEFAULT_CHAT_ID, report, { parse_mode: 'Markdown' })
      }

      // Store in Redis history with user details
      if (redis) {
        const msgObj = { 
          socketId: userId, 
          text: text, 
          from: 'Web User',
          userDetails: {
            name: userDetails.name || 'Anonymous',
            email: userDetails.email || null,
            phone: userDetails.phone || null
          },
          date: Date.now() 
        }
        await redis.lpush('tg_messages', JSON.stringify(msgObj))
        await redis.ltrim('tg_messages', 0, 99)
      }

      // Confirm to user
      socket.emit('message_sent', { 
        ok: true,
        message: 'Your message has been sent to our support team!'
      })
    } catch (error) {
      console.error('Error sending message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  /**
   * Stop polling for OTP
   */
  socket.on('stop_polling', () => {
    // Handle any polling cleanup if needed
  })

  socket.on('disconnect', () => {
    activeWebSockets.delete(userId)
    console.log(`WebSocket disconnected: ${socket.id}`)
  })
})

// ================= TELEGRAM SUPPORT RELAY ================= 
/**
 * When support replies to a message, send it back to web user
 * Support replies TO the original message
 */
if (bot) {
  bot.on('message', async (msg) => {
    try {
      // Check if this is a reply to a web user message
      if (!msg.reply_to_message || msg.from.is_bot) return

      // Extract Socket ID from original message
      const originalText = msg.reply_to_message.text || ""
      const socketMatch = originalText.match(/Socket ID: `([a-zA-Z0-9._-]+)`/)
      
      if (!socketMatch || !socketMatch[1]) return

      const targetSocketId = socketMatch[1]
      const replyText = msg.text

      // Save support reply to Redis
      if (redis) {
        const replyObj = { 
          replyToSocketId: targetSocketId, 
          text: replyText, 
          from: 'Support',
          userDetails: null,
          date: Date.now() 
        }
        await redis.lpush('tg_messages', JSON.stringify(replyObj))
        await redis.ltrim('tg_messages', 0, 99)
      }

      // Send reply to web user socket
      const webClient = activeWebSockets.get(targetSocketId)
      if (webClient) {
        webClient.emit('tg_message', { 
          text: replyText, 
          from: "Support",
          timestamp: new Date().toISOString()
        })
        
        // Confirm to support on Telegram
        await bot.sendMessage(msg.chat.id, "✅ Reply delivered to user in browser!")
      } else {
        // User is offline
        await bot.sendMessage(msg.chat.id, 
          "⌛ User is currently offline. They will see your message when they return.")
      }
    } catch (error) {
      console.error('Telegram relay error:', error)
    }
  })
}

// ================= API ROUTES ================= 

// Mount SMS Hub routes
app.use('/api/number', numberRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/funds', fundsRoutes)

/**
 * GET /api/messages
 * Get chat history from Redis
 */
app.get('/api/messages', async (req, res) => {
  try {
    if (!redis) {
      return res.json({ ok: false, messages: [], message: 'Redis not available' })
    }
    
    const msgs = await redis.lrange('tg_messages', 0, 99)
    res.json({ 
      ok: true, 
      messages: msgs.map(m => {
        try {
          return JSON.parse(m)
        } catch (e) {
          return m
        }
      })
    })
  } catch (error) {
    console.error('Get messages error:', error)
    res.json({ ok: false, messages: [], error: error.message })
  }
})

/**
 * GET /api/wallet
 * Get wallet balance from Redis payments
 */
app.get('/api/wallet', async (req, res) => {
  try {
    if (!redis) return res.json({ balance: 0 })
    
    const payments = await redis.lrange('payments', 0, -1)
    const balance = payments.reduce((sum, p) => {
      try {
        return sum + JSON.parse(p).amount
      } catch {
        return sum
      }
    }, 0)
    
    res.json({ balance })
  } catch (error) {
    console.error('Wallet error:', error)
    res.json({ balance: 0 })
  }
})

// Paystack callback webhook
app.post('/paystack/webhook', async (req, res) => {
  try {
    const { data } = req.body

    if (data.status === 'success') {
      const amountInUSD = data.amount / 100

      // Store payment in Redis
      if (redis) {
        const paymentObj = {
          transaction_id: data.id,
          amount: amountInUSD,
          currency: data.currency,
          customer: data.customer,
          timestamp: Date.now()
        }
        await redis.lpush('payments', JSON.stringify(paymentObj))
      }

      // Notify admin via Telegram
      if (bot) {
        const message = `
💰 **NEW PAYMENT VERIFIED**
━━━━━━━━━━━━━━━━━━━━━━━━━
💵 Amount: $${amountInUSD} ${data.currency}
📧 Email: ${data.customer.email}
👤 Customer: ${data.customer.name || 'Unknown'}
🆔 Transaction ID: \`${data.reference}\`
⏰ Time: ${new Date().toLocaleString()}
        `
        await bot.sendMessage(DEFAULT_CHAT_ID, message, { parse_mode: 'Markdown' })
      }

      // Emit real-time update to connected clients
      io.emit('wallet_update', { 
        balance: amountInUSD,
        message: 'Wallet updated!'
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ================= PAYSTACK PUBLIC KEY ================= 
app.get('/paystack-public-key', (req, res) => {
  res.json({ publicKey: PAYSTACK_PUBLIC_KEY })
})

// ================= HEALTH CHECK ================= 
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'Prime SMS Hub',
    timestamp: new Date().toISOString(),
    features: {
      sms_hub: '✅',
      support_chat: '✅',
      telegram_bot: bot ? '✅' : '❌',
      paystack: PAYSTACK_PUBLIC_KEY ? '✅' : '❌',
      redis: redis ? '✅' : '❌',
      websocket: '✅'
    }
  })
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
    if (primeSMSBot) {
      primeSMSBot.linkUserToTelegram(chatId, uid)
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
╔════════════════════════════════════════════╗
║   🚀 Prime SMS Hub Server Started         ║
╠════════════════════════════════════════════╣
║ Port: ${PORT.toString().padEnd(31)}║
║ Environment: ${(process.env.NODE_ENV || 'production').padEnd(25)}║
║ SMS Hub: ✅ Enabled                       ║
║ Support Chat: ✅ Enabled                  ║
║ Telegram Bot: ${bot ? '✅ Enabled'.padEnd(26) : '⚠️  Disabled'.padEnd(26)}║
║ Paystack: ${PAYSTACK_PUBLIC_KEY ? '✅ Configured'.padEnd(22) : '⚠️  Not configured'.padEnd(22)}║
║ 5sim: ${FIVESIM_API_KEY ? '✅ Configured'.padEnd(23) : '⚠️  Not configured'.padEnd(23)}║
║ Redis: ${redis ? '✅ Connected'.padEnd(23) : '⚠️  Disabled'.padEnd(23)}║
╚════════════════════════════════════════════╝
  `);
  
  if (!TELEGRAM_BOT_TOKEN) console.warn('⚠️  Warning: TELEGRAM_BOT_TOKEN not set');
  if (!FIVESIM_API_KEY) console.warn('⚠️  Warning: FIVESIM_API_KEY not set');
  console.log('✅ Server is running and ready to accept connections');
})

module.exports = { app, io, bot, primeSMSBot }
