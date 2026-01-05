// /api/messages.js
// GET /api/messages - returns recent messages with Web User Identification

const { Redis } = require('@upstash/redis');

const REDIS =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

module.exports = async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  try {
    if (!REDIS) {
      return res.json({ ok: false, error: 'No Redis configured', messages: [] });
    }

    // Get the requester's ID from query params (optional, for filtering history)
    const socketId = req.query.socketId;

    // Fetch the last 100 messages from the Redis list
    const msgs = await REDIS.lrange('tg_messages', 0, 99);

    const parsed = msgs
      .map((m) => {
        try {
          // If Redis entry is already an object, return it; otherwise parse string
          return typeof m === 'object' ? m : JSON.parse(m);
        } catch (err) {
          console.error('Failed to parse message:', m, err);
          return null;
        }
      })
      .filter(Boolean)
      .map(msg => ({
        ...msg,
        // Ensure every message has a clear 'senderType' for the UI to style
        type: msg.socketId ? 'web-user' : 'telegram-admin',
        isMe: socketId && msg.socketId === socketId
      }));

    // Optional: Filter messages so users only see their own conversation
    // Remove this if you want every visitor to see the full global chat history
    const filteredMessages = socketId 
      ? parsed.filter(m => m.socketId === socketId || m.replyToSocketId === socketId)
      : parsed;

    return res.json({ 
      ok: true, 
      messages: filteredMessages,
      count: filteredMessages.length 
    });

  } catch (err) {
    console.error('/api/messages error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: err.toString(), 
      messages: [] 
    });
  }
};