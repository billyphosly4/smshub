/**
 * Telegram Bot Integration for Prime SMS Hub
 * Commands: /start, /balance, /buy, /sms, /cancel, /finish, /transactions, /addfunds
 */

const TelegramBot = require('node-telegram-bot-api')
const firebase = require('../services/firebase')
const fivesim = require('../services/fivesim')
const paystack = require('../services/paystack')

class PrimeSMSBot {
  constructor(token) {
    this.bot = new TelegramBot(token, { polling: false })
    this.userSessions = new Map() // Store user session data (chat_id -> user_data)
    
    // Set up command handlers
    this.setupCommands()
  }

  /**
   * Setup command handlers
   */
  setupCommands() {
    // /start command
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg))

    // /balance command
    this.bot.onText(/\/balance/, (msg) => this.handleBalance(msg))

    // /buy command
    this.bot.onText(/\/buy/, (msg) => this.handleBuy(msg))

    // /sms command
    this.bot.onText(/\/sms (.+)/, (msg, match) => this.handleSMS(msg, match))

    // /cancel command
    this.bot.onText(/\/cancel (.+)/, (msg, match) => this.handleCancel(msg, match))

    // /finish command
    this.bot.onText(/\/finish (.+)/, (msg, match) => this.handleFinish(msg, match))

    // /transactions command
    this.bot.onText(/\/transactions/, (msg) => this.handleTransactions(msg))

    // /addfunds command
    this.bot.onText(/\/addfunds (.+)/, (msg, match) => this.handleAddFunds(msg, match))

    // Inline button callbacks
    this.bot.on('callback_query', (query) => this.handleCallback(query))
  }

  /**
   * Link Telegram user to Prime SMS Hub user (Firebase)
   * This would be done after authentication
   */
  linkUserToTelegram(chatId, firebaseUid) {
    this.userSessions.set(chatId, { uid: firebaseUid })
  }

  /**
   * Get Firebase UID for Telegram user
   */
  async getUserUID(chatId) {
    const session = this.userSessions.get(chatId)
    if (!session || !session.uid) {
      return null
    }
    return session.uid
  }

  /**
   * /start - Welcome message and instructions
   */
  async handleStart(msg) {
    const chatId = msg.chat.id
    const text = `
🤖 Welcome to Prime SMS Hub Bot!

This bot allows you to manage your virtual phone numbers and wallet right from Telegram.

📋 **Available Commands:**
/balance - Check your wallet balance
/buy - Buy a virtual number
/sms <orderId> - Get OTP for an order
/cancel <orderId> - Cancel an order
/finish <orderId> - Mark order as completed
/transactions - View your transaction history
/addfunds <amount> - Top up your wallet

⚠️ **Note:** You must link your Telegram account in the web dashboard first.
Visit: https://smshub-ftgg.onrender.com and link your Telegram in settings.

Need help? Type /help or visit our support page.
    `
    this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  }

  /**
   * /balance - Show wallet balance
   */
  async handleBalance(msg) {
    const chatId = msg.chat.id
    const uid = await this.getUserUID(chatId)

    if (!uid) {
      return this.bot.sendMessage(chatId, '❌ Please link your Telegram account first.')
    }

    try {
      const user = await firebase.getUser(uid)
      if (!user) {
        return this.bot.sendMessage(chatId, '❌ User not found')
      }

      const balance = user.wallet || 0
      const text = `
💰 **Your Wallet Balance**

Balance: $${balance.toFixed(2)} USD

Use /addfunds <amount> to top up your wallet.
      `
      this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
    }
  }

  /**
   * /buy - Interactive flow to buy a number
   */
  async handleBuy(msg) {
    const chatId = msg.chat.id
    const uid = await this.getUserUID(chatId)

    if (!uid) {
      return this.bot.sendMessage(chatId, '❌ Please link your Telegram account first.')
    }

    const countries = [
      { label: '🇺🇸 USA', value: 'US' },
      { label: '🇬🇧 UK', value: 'GB' },
      { label: '🇳🇬 Nigeria', value: 'NG' },
      { label: '🇬🇭 Ghana', value: 'GH' },
      { label: '🇰🇪 Kenya', value: 'KE' }
    ]

    const keyboard = countries.map(c => [
      { text: c.label, callback_data: `country_${c.value}` }
    ])

    this.bot.sendMessage(
      chatId,
      '📱 **Select Country:**',
      {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      }
    )

    // Store session for this buy flow
    this.userSessions.set(chatId, { uid, buyFlow: true })
  }

  /**
   * /sms <orderId> - Get OTP for an order
   */
  async handleSMS(msg, match) {
    const chatId = msg.chat.id
    const orderId = match[1]
    const uid = await this.getUserUID(chatId)

    if (!uid) {
      return this.bot.sendMessage(chatId, '❌ Please link your Telegram account first.')
    }

    try {
      const order = await firebase.getOrder(orderId)
      if (!order) {
        return this.bot.sendMessage(chatId, '❌ Order not found')
      }

      if (order.uid !== uid) {
        return this.bot.sendMessage(chatId, '❌ You do not own this order')
      }

      const text = `
📱 **Order Details**

Phone: ${order.phoneNumber}
Service: ${order.service}
Country: ${order.country}
Status: ${order.status === 'received' ? '✅ SMS Received' : `⏳ ${order.status}`}
${order.code ? `Code: \`${order.code}\`` : 'Waiting for SMS...'}
      `
      this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
    }
  }

  /**
   * /cancel <orderId> - Cancel an order
   */
  async handleCancel(msg, match) {
    const chatId = msg.chat.id
    const orderId = match[1]
    const uid = await this.getUserUID(chatId)

    if (!uid) {
      return this.bot.sendMessage(chatId, '❌ Please link your Telegram account first.')
    }

    try {
      const order = await firebase.getOrder(orderId)
      if (!order) {
        return this.bot.sendMessage(chatId, '❌ Order not found')
      }

      if (order.uid !== uid) {
        return this.bot.sendMessage(chatId, '❌ You do not own this order')
      }

      const cancelResult = await fivesim.cancelOrder(order.fivesimOrderId)
      if (!cancelResult.success) {
        return this.bot.sendMessage(chatId, `❌ ${cancelResult.error}`)
      }

      await firebase.updateOrder(orderId, { status: 'cancelled' })

      this.bot.sendMessage(chatId, '✅ Order cancelled successfully')
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
    }
  }

  /**
   * /finish <orderId> - Mark order as completed
   */
  async handleFinish(msg, match) {
    const chatId = msg.chat.id
    const orderId = match[1]
    const uid = await this.getUserUID(chatId)

    if (!uid) {
      return this.bot.sendMessage(chatId, '❌ Please link your Telegram account first.')
    }

    try {
      const order = await firebase.getOrder(orderId)
      if (!order) {
        return this.bot.sendMessage(chatId, '❌ Order not found')
      }

      if (order.uid !== uid) {
        return this.bot.sendMessage(chatId, '❌ You do not own this order')
      }

      const finishResult = await fivesim.finishOrder(order.fivesimOrderId)
      if (!finishResult.success) {
        return this.bot.sendMessage(chatId, `❌ ${finishResult.error}`)
      }

      await firebase.updateOrder(orderId, { status: 'completed' })

      this.bot.sendMessage(chatId, '✅ Order marked as completed')
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
    }
  }

  /**
   * /transactions - Show transaction history
   */
  async handleTransactions(msg) {
    const chatId = msg.chat.id
    const uid = await this.getUserUID(chatId)

    if (!uid) {
      return this.bot.sendMessage(chatId, '❌ Please link your Telegram account first.')
    }

    try {
      const ordersResult = await firebase.getUserOrders(uid)
      const orders = ordersResult.orders || []

      if (orders.length === 0) {
        return this.bot.sendMessage(chatId, '📋 No transactions yet')
      }

      const recentOrders = orders.slice(0, 10)
      let text = '📋 **Your Recent Transactions**\n\n'

      recentOrders.forEach((o, i) => {
        text += `${i + 1}. ${o.service} (${o.country}) - $${o.price}\n`
        text += `   Status: ${o.status} | Phone: ${o.phoneNumber}\n\n`
      })

      this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
    }
  }

  /**
   * /addfunds <amount> - Initiate wallet top-up
   */
  async handleAddFunds(msg, match) {
    const chatId = msg.chat.id
    const amount = parseFloat(match[1])
    const uid = await this.getUserUID(chatId)

    if (!uid) {
      return this.bot.sendMessage(chatId, '❌ Please link your Telegram account first.')
    }

    if (isNaN(amount) || amount < 1) {
      return this.bot.sendMessage(chatId, '❌ Invalid amount. Use: /addfunds 10')
    }

    try {
      const user = await firebase.getUser(uid)
      const text = `
💳 **Fund Wallet**

Amount: $${amount.toFixed(2)}
Current Balance: $${(user.wallet || 0).toFixed(2)}

Click the button below to proceed to payment:
      `

      const keyboard = [[
        {
          text: '💳 Pay with Paystack',
          url: `https://smshub-ftgg.onrender.com/dashboard.html?fund=${amount}`
        }
      ]]

      this.bot.sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      })
    } catch (error) {
      this.bot.sendMessage(chatId, `❌ Error: ${error.message}`)
    }
  }

  /**
   * Handle inline button callbacks
   */
  async handleCallback(query) {
    const chatId = query.message.chat.id
    const data = query.data

    if (data.startsWith('country_')) {
      const country = data.replace('country_', '')
      const session = this.userSessions.get(chatId)
      session.selectedCountry = country

      const services = {
        'US': ['Google', 'WhatsApp', 'Facebook', 'Telegram', 'OpenAI'],
        'GB': ['Google', 'WhatsApp', 'Facebook', 'Telegram', 'Twitter'],
        'NG': ['Telegram', 'WhatsApp', 'Facebook', 'Instagram', 'Twitter'],
        'GH': ['WhatsApp', 'Telegram', 'Facebook', 'Instagram', 'PayPal'],
        'KE': ['WhatsApp', 'Telegram', 'Facebook', 'Safaricom', 'Airtel']
      }

      const keyboard = (services[country] || []).map(s => [
        { text: s, callback_data: `service_${s}` }
      ])

      this.bot.editMessageText(
        '📱 **Select Service:**',
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        }
      )
    }

    if (data.startsWith('service_')) {
      const service = data.replace('service_', '')
      const session = this.userSessions.get(chatId)
      const country = session.selectedCountry

      // Here would be the actual buy logic
      this.bot.editMessageText(
        `🤖 Attempting to buy ${service} number for ${country}...`,
        {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: 'Markdown'
        }
      )

      // In production, call fivesim to buy here
      // For now, just show a message
      setTimeout(() => {
        this.bot.sendMessage(
          chatId,
          `✅ Number purchased!\n\nService: ${service} (${country})`,
          { parse_mode: 'Markdown' }
        )
      }, 1000)
    }
  }

  /**
   * Send notification to user
   */
  async notifyUser(chatId, message) {
    try {
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    } catch (error) {
      console.error(`Failed to notify user ${chatId}:`, error.message)
    }
  }
}

module.exports = PrimeSMSBot
