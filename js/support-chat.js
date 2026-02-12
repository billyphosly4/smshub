/**
 * Support Chat Module
 * Collects user details (name, email, phone) before sending messages
 * Shows chat history
 */

class SupportChat {
  constructor() {
    this.socket = null
    this.userDetails = {
      name: '',
      email: '',
      phone: ''
    }
    this.isFormSubmitted = false
    this.init()
  }

  init() {
    // Initialize Socket.io connection
    this.socket = io('/', { 
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    this.socket.on('connect', () => {
      console.log('✅ Connected to support chat')
      this.loadChatHistory()
    })

    this.socket.on('tg_message', (msg) => {
      this.displayMessage(msg)
    })

    this.socket.on('message_sent', (response) => {
      console.log('✅ Message sent:', response)
    })

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error)
      this.showError(error.message || 'Connection error')
    })

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from support chat')
      this.showError('Connection lost. Reconnecting...')
    })

    this.setupUI()
  }

  setupUI() {
    // Create support chat widget
    const chatHTML = `
      <div id="supportChatWidget" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 380px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        z-index: 9999;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      ">
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div>
            <h3 style="margin: 0; font-size: 16px;">💬 Support Chat</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">We're here to help!</p>
          </div>
          <button id="closeChatBtn" style="
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
          ">✕</button>
        </div>

        <!-- Chat Area -->
        <div id="chatMessages" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f8f9fa;
          display: flex;
          flex-direction: column;
          gap: 12px;
        "></div>

        <!-- User Details Form (shows once) -->
        <div id="userDetailsForm" style="
          padding: 12px;
          border-top: 1px solid #e0e0e0;
          background: white;
          display: none;
          flex-direction: column;
          gap: 8px;
        ">
          <input 
            type="text" 
            id="userName" 
            placeholder="Your Name" 
            style="
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 13px;
            "
          />
          <input 
            type="email" 
            id="userEmail" 
            placeholder="Your Email" 
            style="
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 13px;
            "
          />
          <input 
            type="tel" 
            id="userPhone" 
            placeholder="Your Phone (Optional)" 
            style="
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 13px;
            "
          />
          <button id="submitDetailsBtn" style="
            padding: 8px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
          ">Continue</button>
        </div>

        <!-- Input Area (hidden until details submitted) -->
        <div id="messageInputArea" style="
          padding: 12px;
          border-top: 1px solid #e0e0e0;
          background: white;
          display: none;
          flex-direction: column;
          gap: 8px;
        ">
          <textarea 
            id="messageInput" 
            placeholder="Type your message..." 
            style="
              padding: 8px;
              border: 1px solid #ddd;
              border-radius: 6px;
              resize: none;
              height: 60px;
              font-size: 13px;
              font-family: inherit;
            "
          ></textarea>
          <button id="sendMessageBtn" style="
            padding: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
          ">Send Message</button>
        </div>

        <!-- Loading/Status -->
        <div id="chatStatus" style="
          padding: 8px 12px;
          font-size: 11px;
          background: #f0f4ff;
          color: #667eea;
          text-align: center;
          display: none;
        "></div>
      </div>

      <!-- Floating Button (when closed) -->
      <button id="openChatBtn" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 24px;
        box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
      ">💬</button>
    `

    // Append to body if not already present
    if (!document.getElementById('supportChatWidget')) {
      document.body.insertAdjacentHTML('beforeend', chatHTML)
      this.attachEventListeners()
    }
  }

  attachEventListeners() {
    // Chat toggle buttons
    document.getElementById('openChatBtn').addEventListener('click', () => {
      document.getElementById('supportChatWidget').style.display = 'flex'
      document.getElementById('openChatBtn').style.display = 'none'
    })

    document.getElementById('closeChatBtn').addEventListener('click', () => {
      document.getElementById('supportChatWidget').style.display = 'none'
      document.getElementById('openChatBtn').style.display = 'flex'
    })

    // User details form
    document.getElementById('submitDetailsBtn').addEventListener('click', () => {
      this.submitUserDetails()
    })

    // Enter key on details
    document.getElementById('userPhone').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.submitUserDetails()
    })

    // Message input
    document.getElementById('sendMessageBtn').addEventListener('click', () => {
      this.sendMessage()
    })

    // Enter key to send message
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })
  }

  submitUserDetails() {
    const name = document.getElementById('userName').value.trim()
    const email = document.getElementById('userEmail').value.trim()
    const phone = document.getElementById('userPhone').value.trim()

    if (!name || !email) {
      this.showError('Name and email are required')
      return
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      this.showError('Please enter a valid email')
      return
    }

    // Store user details
    this.userDetails = { name, email, phone }
    this.isFormSubmitted = true

    // Hide form, show message input
    document.getElementById('userDetailsForm').style.display = 'none'
    document.getElementById('messageInputArea').style.display = 'flex'
    document.getElementById('messageInput').focus()

    // Clear form
    document.getElementById('userName').value = ''
    document.getElementById('userEmail').value = ''
    document.getElementById('userPhone').value = ''

    this.displayMessage({
      from: 'System',
      text: `✅ Welcome ${name}! You can now send messages.`
    })
  }

  sendMessage() {
    const messageText = document.getElementById('messageInput').value.trim()

    if (!messageText) {
      this.showError('Message cannot be empty')
      return
    }

    if (!this.isFormSubmitted) {
      this.showError('Please submit your details first')
      return
    }

    // Show user message immediately
    this.displayMessage({
      from: this.userDetails.name,
      text: messageText,
      isUser: true
    })

    // Send to server with user details
    this.socket.emit('send_message', {
      text: messageText,
      userDetails: this.userDetails
    })

    // Clear input
    document.getElementById('messageInput').value = ''
    document.getElementById('messageInput').focus()
  }

  displayMessage(msg) {
    const chatMessages = document.getElementById('chatMessages')
    const isSupport = msg.from === 'Support' || msg.from === 'System'
    const isUser = msg.isUser || msg.from !== 'Support' && msg.from !== 'System'

    const messageEl = document.createElement('div')
    messageEl.style.cssText = `
      max-width: 85%;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
      word-wrap: break-word;
      align-self: ${isSupport ? 'flex-start' : 'flex-end'};
      background: ${isSupport ? '#e8e8f0' : '#667eea'};
      color: ${isSupport ? '#333' : 'white'};
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    `

    messageEl.innerHTML = `
      <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">
        ${isSupport ? '🤖 ' : '👤 '}${msg.from}
      </div>
      <div>${this.escapeHtml(msg.text)}</div>
    `

    chatMessages.appendChild(messageEl)
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  async loadChatHistory() {
    try {
      const response = await fetch('/api/messages')
      const data = await response.json()

      if (data.ok && data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          if (msg.text) {
            this.displayMessage({
              from: msg.from || 'Support',
              text: msg.text
            })
          }
        })
      }

      // Show user details form
      document.getElementById('userDetailsForm').style.display = 'flex'
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  showError(message) {
    const statusDiv = document.getElementById('chatStatus')
    statusDiv.textContent = '❌ ' + message
    statusDiv.style.display = 'block'
    setTimeout(() => {
      statusDiv.style.display = 'none'
    }, 3000)
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SupportChat()
  })
} else {
  new SupportChat()
}
