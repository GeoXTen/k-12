import { Client, GatewayIntentBits, GuildMember } from "discord.js";
import { LavalinkManager } from "lavalink-client";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const manager = new LavalinkManager({
  nodes: [
    {
      authorization: process.env.LAVALINK_PASSWORD!,
      host: process.env.LAVALINK_HOST!,
      port: Number(process.env.LAVALINK_PORT),
      id: "main",
      secure: process.env.LAVALINK_SECURE === "true",
    },
  ],
  sendToShard: (guildId, payload) =>
    client.guilds.cache.get(guildId)?.shard?.send(payload),
  client: {
    id: process.env.CLIENT_ID!,
    username: "TestBot",
  },
});

manager.on("trackStart", (_, track) => {
  console.log(`[Now playing] ${track?.info.title}`);
});

manager.on("trackEnd", (_, track, payload) => {
  console.log(`[Track ended] ${track?.info.title} (${payload.reason})`);
});

manager.on("trackError", (_, track, payload) => {
  console.error(`[Track error]`, payload);
});

manager.on("playerSocketClosed", (_, payload) => {
  console.error(`[Socket closed]`, payload);
});

client.on("raw", (d) => manager.sendRawData(d));

client.on("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  await manager.init({ id: client.user!.id, username: client.user!.username });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content === "!join") {
    const member = message.member as GuildMember;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) return message.reply("Join a voice channel first!");

    const existing = manager.getPlayer(message.guild.id);
    if (existing) await existing.destroy();

    const player = manager.createPlayer({
      guildId: message.guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: message.channel.id,
      selfDeaf: false,
      selfMute: false,
    });

    await player.connect();
    message.reply(`Joined **${voiceChannel.name}**!`);
  }

  if (message.content.startsWith("!play")) {
    const query = message.content.slice(6).trim();
    if (!query) return message.reply("Usage: `!play <song name or URL>`");

    const member = message.member as GuildMember;
    const voiceChannel = member?.voice?.channel;
    if (!voiceChannel) return message.reply("Join a voice channel first!");

    let player = manager.getPlayer(message.guild.id);
    if (!player) {
      player = manager.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channel.id,
        selfDeaf: false,
        selfMute: false,
      });
      await player.connect();
    }

    try {
      const response = await player.search({ query }, message.author);

      if (response.loadType === "error") {
        return message.reply(`Error: ${response.exception?.message || "unknown"}`);
      }
      if (response.loadType === "empty") {
        return message.reply("No results found.");
      }

      if (response.loadType === "playlist") {
        for (const track of response.tracks) player!.queue.add(track);
        await message.reply(`Added playlist **${response.playlist?.name}** (${response.tracks.length} tracks)`);
      } else {
        player.queue.add(response.tracks[0]);
        await message.reply(`Added **${response.tracks[0].info.title}**`);
      }

      if (!player.playing && !player.paused) {
        await player.play();
      }
    } catch (err) {
      console.error("[Error]", err);
      message.reply("Error playing track.");
    }
  }

  if (message.content === "!stop") {
    const player = manager.getPlayer(message.guild.id);
    if (!player) return message.reply("Nothing is playing!");
    await player.stopPlaying(true);
    message.reply("Stopped.");
  }

  if (message.content === "!disconnect" || message.content === "!leave") {
    const player = manager.getPlayer(message.guild.id);
    if (!player) return message.reply("Nothing is playing!");
    await player.destroy();
    message.reply("Disconnected.");
  }
});

client.login(process.env.DISCORD_TOKEN);
