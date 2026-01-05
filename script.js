const chatModal = document.getElementById('chatModal');
const openChat = document.getElementById('openChat');
const closeChat = document.getElementById('closeChat');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatStatus = document.getElementById('chatStatus');

const DEFAULT_CHAT_ID = 7711425125; 
const SERVER_URL = (document.querySelector('meta[name="server-url"]') || {}).content || null;
let currentChatId = DEFAULT_CHAT_ID;

/* ================= UI HELPERS ================= */

function openModal() {
    if (!chatModal) return;
    chatModal.classList.add('open');
    chatModal.style.display = 'flex';
    setTimeout(() => { if (messageInput) messageInput.focus(); }, 100);
}

function closeModal() {
    if (!chatModal) return;
    chatModal.classList.remove('open');
    setTimeout(() => { chatModal.style.display = 'none'; }, 200);
}

if (chatModal) { 
    chatModal.classList.remove('open'); 
    chatModal.style.display = 'none'; 
}

openChat.addEventListener('click', openModal);
if (closeChat) closeChat.addEventListener('click', closeModal);

function setChatStatus(text) {
    if (chatStatus) chatStatus.textContent = text;
}

function appendMessage(text, cls) {
    const wrapper = document.createElement('div');
    wrapper.className = cls + ' msg-wrapper';
    wrapper.style.marginBottom = '8px';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';

    const bubble = document.createElement('div');
    bubble.className = 'msg ' + (cls === 'msg-web' ? 'msg-web' : 'msg-telegram');
    bubble.textContent = text;

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const time = new Date();
    meta.textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (cls === 'msg-web') {
        const tick = document.createElement('span');
        tick.className = 'tick pending';
        tick.textContent = ' ✓';
        meta.appendChild(tick);
    }

    wrapper.appendChild(bubble);
    wrapper.appendChild(meta);

    if (chatBox) {
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
        return wrapper;
    }
    return null;
}

/* ================= SOCKET LOGIC ================= */

let socket = null;

// Connect to the server
const socketTarget = SERVER_URL || window.location.origin;
socket = io(socketTarget, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
    setChatStatus('Connected as: ' + socket.id); // This ID is what you see in Telegram
    console.log('Connected to server with ID:', socket.id);
});

// LISTEN FOR REPLIES FROM TELEGRAM
socket.on('tg_message', (data) => {
    // data.text is the reply from the bot
    appendMessage(data.text, 'msg-telegram');
});

socket.on('message_sent', (payload) => {
    if (payload.ok) {
        const ticks = document.querySelectorAll('.tick.pending');
        if (ticks.length > 0) {
            const lastTick = ticks[ticks.length - 1];
            lastTick.classList.replace('pending', 'delivered');
            lastTick.textContent = ' ✓✓';
        }
    } else {
        setChatStatus('Send failed: ' + payload.error);
    }
});

socket.on('disconnect', () => setChatStatus('Offline - Reconnecting...'));

/* ================= SENDING LOGIC ================= */

sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (!text) return;

    // 1. Show the message in the web UI immediately
    appendMessage(text, 'msg-web');

    // 2. Send to server via Socket.io
    // The server will automatically attach your Socket ID to the notification
    socket.emit('send_message', { 
        text: text,
        chatId: DEFAULT_CHAT_ID 
    });

    messageInput.value = '';
    setChatStatus('Sending...');
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});
// Inside your script.js send logic:
const payload = { 
  text: text, 
  chatId: 7711425125,
  socketId: socket.id, // THE FIX: Passing the ID to the API
  ip: 'Optional IP'
};