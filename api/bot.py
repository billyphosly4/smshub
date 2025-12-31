import os
import json
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

BOT_TOKEN = os.environ.get("8301086359:AAE7rpPM5VpPO3roaVFpiV3utxqvLD0E8cY")
CHAT_ID = os.environ.get("7711425125")

TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

# ---- Send message to Telegram (from website) ----
def send_to_telegram(text, sender="Website"):
    payload = {
        "chat_id": CHAT_ID,
        "text": f"📩 *New Message*\n👤 {sender}\n💬 {text}",
        "parse_mode": "Markdown"
    }
    requests.post(f"{TELEGRAM_API}/sendMessage", json=payload)


# ---- Receive messages from Telegram (Webhook) ----
@app.route("/api/bot/webhook", methods=["POST"])
def telegram_webhook():
    data = request.json

    if "message" in data:
        message = data["message"]
        text = message.get("text", "")
        sender = message["from"].get("first_name", "Telegram")

        # Here you can store the message in DB (Firebase, etc.)
        print("Reply from Telegram:", text)

        return jsonify({
            "sender": sender,
            "text": text
        })

    return jsonify({"status": "ok"})


# ---- Website sends message here ----
@app.route("/api/bot/send", methods=["POST"])
def send_message():
    data = request.json
    text = data.get("text")
    sender = data.get("sender", "Website")

    if not text:
        return jsonify({"error": "No message"}), 400

    send_to_telegram(text, sender)
    return jsonify({"status": "sent"})


# ---- Health check ----
@app.route("/api/bot", methods=["GET"])
def health():
    return jsonify({"status": "Bot is running"})


# Vercel entry point
def handler(request, context):
    return app(request, context)

