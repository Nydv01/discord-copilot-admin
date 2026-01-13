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

client.on(Events.MessageCreate, async (message) => {
  console.log("📩 MESSAGE EVENT FIRED");

  if (message.author.bot) return;

  console.log("CONTENT:", message.content);

  await message.reply("✅ I RECEIVED YOUR MESSAGE");
});

client.login(process.env.DISCORD_TOKEN);
