// /api/send.js
import fetch from 'node-fetch';

const TELEGRAM_API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const token = process.env.TELEGRAM_BOT_TOKEN; // Adjusted to match your server.js variable
  if (!token) return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' });

  // socketId and ip are optional but recommended for identification
  const { chatId, text, socketId, ip } = req.body || {};
  
  if (!chatId || !text) {
    return res.status(400).json({ ok: false, error: 'chatId and text required' });
  }

  // Format the message to include User Identification if available
  let formattedText = text;
  if (socketId) {
    formattedText = 
      `🌐 **NEW MESSAGE (HTTP)**\n` +
      `━━━━━━━━━━━━━━━\n` +
      `👤 **User ID:** \`${socketId}\`\n` +
      `📍 **IP:** ${ip || 'Unknown'}\n` +
      `━━━━━━━━━━━━━━━\n` +
      `💬 **Message:** ${text}`;
  }

  try {
    const r = await fetch(TELEGRAM_API(token, 'sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: String(chatId), 
        text: formattedText,
        parse_mode: 'Markdown' // Required for the bold/monospaced ID to work
      }),
    });

    const j = await r.json();
    if (!r.ok) return res.status(502).json({ ok: false, error: j });

    return res.json({ ok: true, result: j });
  } catch (err) {
    console.error('send error', err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}
