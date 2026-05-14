require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, ActivityType, Events } = require('discord.js');
const MinecraftServer = require('./src/minecraft');
const PlayerTracker = require('./src/tracker');
const storage = require('./src/storage');
const { createCommands } = require('./src/commands');
const {
  joinEmbed,
  leaveEmbed,
  securityJoinEmbed,
  securityLeaveEmbed,
  securityServerStatusEmbed,
  securityDailySummaryEmbed,
} = require('./src/embeds');

/* ========== AYAR KONTROLÜ ========== */

const required = ['DISCORD_TOKEN', 'DISCORD_GUILD_ID', 'LOG_CHANNEL_ID', 'MC_HOST', 'MC_RCON_PASSWORD'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Eksik environment değişkenleri: ${missing.join(', ')}`);
  process.exit(1);
}

const config = {
  token: process.env.DISCORD_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID,
  logChannelId: process.env.LOG_CHANNEL_ID,
  securityChannelId: process.env.SECURITY_LOG_CHANNEL_ID,
  statusChannelId: process.env.STATUS_CHANNEL_ID,
  mcHost: process.env.MC_HOST,
  mcPort: process.env.MC_PORT || '25565',
  mcRconPort: process.env.MC_RCON_PORT || '25575',
  mcRconPassword: process.env.MC_RCON_PASSWORD,
  pollInterval: parseInt(process.env.POLL_INTERVAL || '15000'),
  xpInterval: parseInt(process.env.XP_UPDATE_INTERVAL || '300000'),
};

/* ========== DISCORD CLIENT ========== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

/* ========== MINECRAFT SUNUCUSU ========== */

const mc = new MinecraftServer(config.mcHost, config.mcPort, config.mcRconPort, config.mcRconPassword);

/* ========== KANALLAR ========== */

let logChannel = null;
let securityChannel = null;
let statusVoiceChannel = null;

/* ========== YARDIMCI FONKSİYONLAR ========== */

async function updateStatusChannelName(isOnline) {
  if (!statusVoiceChannel) return;
  try {
    const newName = isOnline ? '🟢 Durum: Aktif' : '🔴 Durum: Kapalı';
    if (statusVoiceChannel.name !== newName) {
      await statusVoiceChannel.setName(newName);
      console.log(`📡 Ses kanalı ismi güncellendi: ${newName}`);
    }
  } catch (e) {
    console.error('❌ Ses kanalı ismi güncellenemedi:', e.message);
  }
}

/* ========== TRACKER ========== */

const tracker = new PlayerTracker(mc, storage, async (event, playerName, extra = {}) => {
  try {
    const isOnlineEvent = event === 'server_online';
    const isOfflineEvent = event === 'server_offline';

    if (isOnlineEvent || isOfflineEvent) {
      const statusEmbed = securityServerStatusEmbed(isOnlineEvent, extra.playerCount || 0);
      if (logChannel) await logChannel.send({ embeds: [statusEmbed] });
      if (securityChannel) await securityChannel.send({ embeds: [statusEmbed] });
      await updateStatusChannelName(isOnlineEvent);
    }

    switch (event) {
      case 'join': {
        const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'medium' });
        if (logChannel) await logChannel.send(`**${playerName}** sunucuya katıldı ✅\n\`\`\`\n⏰ ${timeStr}\n\`\`\``);
        if (securityChannel) await securityChannel.send({ embeds: [securityJoinEmbed(playerName, extra.onlineCount || 0)] });
        break;
      }
      case 'leave': {
        const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'medium' });
        if (logChannel) await logChannel.send(`**${playerName}** sunucudan ayrıldı ❌\n\`\`\`\n⏰ ${timeStr}\n\`\`\``);
        if (securityChannel) await securityChannel.send({ embeds: [securityLeaveEmbed(playerName, extra.onlineCount || 0, extra.sessionDuration)] });
        break;
      }
    }
  } catch (e) {
    console.error('❌ Log işlemi başarısız:', e.message);
  }
});

/* ========== KOMUTLAR ========== */

const { commands, handlers: cmdHandlers } = createCommands(mc, tracker, storage);

/* ========== BOT HAZIR ========== */

client.once(Events.ClientReady, async () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  🤖 ${client.user.tag} aktif!`);
  console.log(`║  📡 MC: ${config.mcHost}:${config.mcPort}`);
  console.log(`╚══════════════════════════════════════════╝\n`);

  try {
    logChannel = await client.channels.fetch(config.logChannelId);
    if (config.securityChannelId) securityChannel = await client.channels.fetch(config.securityChannelId);
    if (config.statusChannelId) statusVoiceChannel = await client.channels.fetch(config.statusChannelId);
  } catch (e) {
    console.error('❌ Kanallara erişilemedi:', e.message);
  }

  if (statusVoiceChannel) {
    const initialStatus = await mc.getStatus();
    await updateStatusChannelName(initialStatus.online);
  }

  try {
    const rest = new REST().setToken(config.token);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, config.guildId),
      { body: commands.map(c => c.toJSON()) },
    );
    console.log(`✅ Slash komutları yüklendi.`);
  } catch (e) {
    console.error('❌ Komut kaydı başarısız:', e.message);
  }

  await mc.connectRcon();

  // Polling döngüsü (Veri güncelleme)
  setInterval(async () => {
    try {
      await tracker.poll();
    } catch (e) {
      console.error('❌ Poll hatası:', e.message);
    }
  }, config.pollInterval);

  // Status Döngüsü (5 saniyede bir dönüşümlü bio)
  let statusIndex = 0;
  setInterval(() => {
    const players = tracker.getOnlinePlayers();
    const isOnline = tracker.isServerOnline();

    const statuses = [
      { text: '⛏️ @kiv_dev', type: ActivityType.Watching },
      { text: isOnline ? `${players.length} kişi aktif` : 'Sunucu şu an kapalı', type: ActivityType.Playing }
    ];

    const currentStatus = statuses[statusIndex];
    client.user.setActivity(currentStatus.text, { type: currentStatus.type });

    statusIndex = (statusIndex + 1) % statuses.length;
  }, 5000);

  setInterval(async () => {
    try { await tracker.updateXP(); } catch (e) { console.error('❌ XP hatası:', e.message); }
  }, config.xpInterval);

  scheduleDailySummary();
});

function scheduleDailySummary() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  setTimeout(() => {
    sendDailySummary();
    setInterval(sendDailySummary, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

async function sendDailySummary() {
  if (!securityChannel) return;
  try {
    const stats = tracker.getDailyStatsAndReset();
    await securityChannel.send({ embeds: [securityDailySummaryEmbed(stats)] });
  } catch (e) {
    console.error('❌ Özet hatası:', e.message);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const handler = cmdHandlers.get(interaction.commandName);
  if (handler) await handler(interaction).catch(e => console.error(e));
});

/* ========== DISCORD -> MINECRAFT CHAT KÖPRÜSÜ ========== */
client.on(Events.MessageCreate, async (message) => {
  // Sadece ayarlanan kanaldaki mesajları dinle ve botların mesajlarını yoksay
  if (message.author.bot || message.channelId !== config.logChannelId) return;

  try {
    // Güvenlik: Tırnak işaretlerini ve satır atlamaları temizle (RCON JSON formatını bozmaması için)
    const safeText = message.content.replace(/"/g, '\\"').replace(/\n/g, ' ');
    if (!safeText) return;

    // Kullanıcının sunucudaki adını veya Discord kullanıcı adını al
    const authorName = message.member?.nickname || message.author.displayName || message.author.username;
    const safeName = authorName.replace(/"/g, '\\"');

    // Renkli Tellraw komutu
    const command = `tellraw @a ["",{"text":"[Discord] ","color":"blue"},{"text":"${safeName}","color":"yellow"},{"text":": ${safeText}","color":"white"}]`;
    
    // Minecraft'a gönder
    const response = await mc.sendCommand(command);
    
    // Mesaj başarıyla gittiyse emoji ile tepki ver
    if (response !== null) {
      await message.react('✅').catch(() => {});
    }
  } catch (e) {
    console.error("❌ Mesaj Minecraft'a gönderilemedi:", e.message);
  }
});

process.on('SIGINT', async () => {
  await mc.disconnect();
  client.destroy();
  process.exit(0);
});

client.login(config.token);
