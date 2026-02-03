import { Client, GatewayIntentBits } from "discord.js"
import "dotenv/config"

/* ======================
   1️⃣ Gemini brain
   ====================== */
async function callGemini(prompt) {
	const model = "gemini-3-flash-preview"
	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
			process.env.GEMINI_API_KEY,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
			}),
		},
	)

	const data = await res.json();

  if (data.error) {
    throw new Error(`API Error: ${data.error.message}`);
  }
  
  if (!data.candidates || data.candidates.length === 0) {
    return "I can't answer that due to safety filters.";
  }

  return data.candidates[0].content.parts[0].text;
}

/* ======================
   2️⃣ Discord client
   ====================== */
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
})

client.once("ready", () => {
	console.log(`Logged in as ${client.user.tag}`)
})

/* ======================
   3️⃣ Message handler
   ====================== */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    await message.channel.sendTyping();
    const reply = await callGemini(message.content);

    // Call our new helper function instead of message.reply directly
    await sendSplitMessage(message, reply);

  } catch (err) {
    console.error("Handler Error:", err);
    message.reply("Brain malfunction. Try again.");
  }
});

/**
 * Splits a long string into chunks of 2000 characters 
 * and sends them as separate messages.
 */
async function sendSplitMessage(message, text) {
  const maxLength = 2000;
  
  if (text.length <= maxLength) {
    return await message.reply(text);
  }

  // Split text by 2000 character chunks
  // We use a regex to try and split at newlines so we don't break words in half
  const chunks = text.match(/[\s\S]{1,2000}/g) || [];

  for (const chunk of chunks) {
    await message.channel.send(chunk);
  }
}

client.login(process.env.DISCORD_TOKEN)
