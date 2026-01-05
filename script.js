const chatModal = document.getElementById('chatModal');
const openChat = document.getElementById('openChat');
const closeChat = document.getElementById('closeChat');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatStatus = document.getElementById('chatStatus');

const DEFAULT_CHAT_ID = 7711425125; 
const SERVER_URL = (document.querySelector('meta[name="server-url"]') || {}).content || window.location.origin;

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

openChat.addEventListener('click', openModal);
if (closeChat) closeChat.addEventListener('click', closeModal);

function setChatStatus(text) {
    if (chatStatus) chatStatus.textContent = text;
}

function appendMessage(text, cls) {
    const wrapper = document.createElement('div');
    wrapper.className = cls + ' msg-wrapper';
    
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

// Connect using the Meta tag URL or current origin
socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
    setChatStatus('Connected as: ' + socket.id); // This ID is what appears in your Telegram bot
    console.log('Connected to server with ID:', socket.id);
});

// LISTEN FOR REPLIES FROM TELEGRAM
socket.on('tg_message', (data) => {
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

function handleSend() {
    const text = messageInput.value.trim(); // Fixed: Defining text within the scope of the function

    if (!text) return;

    // 1. Show the message in the web UI immediately
    appendMessage(text, 'msg-web');

    // 2. Send to server via Socket.io
    if (socket && socket.connected) {
        socket.emit('send_message', { 
            text: text, 
            chatId: DEFAULT_CHAT_ID 
        });
        setChatStatus('Sending...');
    } else {
        setChatStatus('Not connected to server.');
    }

    messageInput.value = '';
}

sendBtn.addEventListener('click', handleSend);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
});