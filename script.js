fetch("https://your-project.vercel.app/api/bot/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sender: "Website User",
    text: message
  })
});
