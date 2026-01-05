// /api/webhook.js
const { Redis } = require('@upstash/redis');
const fetch = require('node-fetch');

// Use the same token name as your other files
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const REDIS =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('OK');

  try {
    const update = req.body;
    const msg = update.message || update.edited_message || null;

    if (!msg || !msg.chat?.id) {
      return res.status(200).json({ ok: true });
    }

    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    // --- WEB USER IDENTIFICATION LOGIC ---
    let targetSocketId = null;

    // Check if this is a reply to a message that contains a User ID
    if (msg.reply_to_message && msg.reply_to_message.text) {
      const replyText = msg.reply_to_message.text;
      // Regex to find the User ID we formatted in server.js/send.js
      const match = replyText.match(/User ID: ([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        targetSocketId = match[1];
      }
    }

    const payload = {
      chatId,
      from: msg.from?.username || 'Admin',
      text,
      socketId: targetSocketId, // If this exists, the message is a reply to a web user
      isReply: !!targetSocketId,
      date: Date.now(),
    };

    // Save to Redis so the Web User can see the reply in their history
    if (REDIS) {
      await REDIS.lpush('tg_messages', JSON.stringify(payload));
      await REDIS.ltrim('tg_messages', 0, 99);
    }

    // --- OPTIONAL: NOTIFY ADMIN ON SUCCESS ---
    if (targetSocketId && text) {
        console.log(`Reply stored for Web User: ${targetSocketId}`);
        // No need to fetch/sendMessage here unless you want to confirm to yourself
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: false }); // Always return 200 to Telegram to stop retries
  }
};