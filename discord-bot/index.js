require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, () => {
  console.log("✅ Bot logged in successfully");
});

/* ===========================
   MESSAGE HANDLER
=========================== */
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  console.log("MESSAGE RECEIVED:", message.content);

  // ✅ ALWAYS RESPOND TO HELLO (NO CONFIG NEEDED)
  if (message.content.toLowerCase().includes("hello")) {
    HEALTH.lastMessage = new Date().toISOString();
    await message.reply("👋 Hello! Bot is alive.");
    return;
  }

  let config;
  try {
    config = await loadBotConfig();
  } catch (err) {
    registerError(err);
    await message.reply("⚠️ Bot config service unavailable.");
    return;
  }

  const isMentioned = message.mentions.has(client.user);
  const isAllowedChannel = config.allowedChannels.includes(message.channel.id);

  if (!isMentioned && !isAllowedChannel) return;

  const content = message.content.replace(/<@!?\d+>/g, "").trim();
  if (!content) return;

  try {
    await message.channel.sendTyping();

    const reply = await callAI(
      config.instructions,
      content,
      config.memory?.summary
    );

    await message.reply(reply.slice(0, 2000));
    HEALTH.lastMessage = new Date().toISOString();
  } catch (err) {
    registerError(err);
    await message.reply("⚠️ Something went wrong.");
  }
});


client.login(process.env.DISCORD_TOKEN);
