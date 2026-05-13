const { EmbedBuilder } = require('discord.js');

/* ========== RENK PALETİ ========== */
const C = {
  JOIN:        0x55FF55,  // Minecraft yeşili
  LEAVE:       0xFF5555,  // Minecraft kırmızısı
  INFO:        0x55FFFF,  // Aqua
  GOLD:        0xFFAA00,  // Altın
  OFFLINE:     0xAAAAAA,  // Gri
  XP:          0x7FFF00,  // XP yeşili
  SECURITY:    0xFF6600,  // Güvenlik turuncusu
  SERVER_UP:   0x00FF00,  // Sunucu açıldı
  SERVER_DOWN: 0xFF0000,  // Sunucu kapandı
};

/* ========== YARDIMCI ========== */

function formatPlaytime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}s ${m}dk`;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

function playerHead(name) {
  return `https://mc-heads.net/avatar/${name}/64`;
}

/* ========== EMBED'LER ========== */

function joinEmbed(playerName) {
  return new EmbedBuilder()
    .setColor(C.JOIN)
    .setAuthor({
      name: `${playerName} sunucuya katıldı!`,
      iconURL: playerHead(playerName),
    })
    .setThumbnail(playerHead(playerName))
    .setTimestamp();
}

function leaveEmbed(playerName) {
  return new EmbedBuilder()
    .setColor(C.LEAVE)
    .setAuthor({
      name: `${playerName} sunucudan ayrıldı.`,
      iconURL: playerHead(playerName),
    })
    .setThumbnail(playerHead(playerName))
    .setTimestamp();
}

function statusEmbed(serverStatus, onlinePlayers) {
  if (!serverStatus.online) {
    return new EmbedBuilder()
      .setColor(C.OFFLINE)
      .setTitle('🔴 Sunucu Çevrimdışı')
      .setDescription('Minecraft sunucusu şu anda erişilemiyor.')
      .setTimestamp();
  }

  const playerList = onlinePlayers.length > 0
    ? onlinePlayers.map(p => `\`⛏\` **${p}**`).join('\n')
    : '*Şu anda kimse online değil*';

  return new EmbedBuilder()
    .setColor(C.INFO)
    .setTitle('🟢 Sunucu Durumu')
    .addFields(
      { name: '📡 Gecikme',   value: `\`${serverStatus.latency}ms\``,                                    inline: true },
      { name: '👥 Oyuncular', value: `\`${serverStatus.players.online}/${serverStatus.players.max}\``,    inline: true },
      { name: '🎮 Versiyon',  value: `\`${serverStatus.version}\``,                                      inline: true },
      { name: '📋 Online Oyuncular', value: playerList },
    )
    .setFooter({ text: serverStatus.motd || 'Minecraft Sunucusu' })
    .setTimestamp();
}

function playersEmbed(onlinePlayers) {
  if (onlinePlayers.length === 0) {
    return new EmbedBuilder()
      .setColor(C.OFFLINE)
      .setTitle('👥 Online Oyuncular')
      .setDescription('*Şu anda sunucuda kimse yok.*')
      .setTimestamp();
  }

  const list = onlinePlayers
    .map((p, i) => `**${i + 1}.** \`${p}\``)
    .join('\n');

  return new EmbedBuilder()
    .setColor(C.INFO)
    .setTitle(`👥 Online Oyuncular (${onlinePlayers.length})`)
    .setDescription(list)
    .setTimestamp();
}

function leaderboardEmbed(type, data) {
  const isXP = type === 'xp';
  const title = isXP ? '✨ XP Liderlik Tablosu' : '⏰ Süre Liderlik Tablosu';
  const desc  = isXP
    ? 'En yüksek XP seviyesine sahip oyuncular'
    : 'Sunucuda en çok vakit geçiren oyuncular';

  const medals = ['🥇', '🥈', '🥉'];

  if (data.length === 0) {
    return new EmbedBuilder()
      .setColor(C.GOLD)
      .setTitle(title)
      .setDescription('*Henüz yeterli veri yok.*')
      .setTimestamp();
  }

  const lines = data.map((entry, i) => {
    const prefix = medals[i] || `**${entry.rank}.**`;
    const value = isXP
      ? `Seviye **${entry.xpLevel}**`
      : `**${formatPlaytime(entry.totalPlaytime)}**`;
    return `${prefix} \`${entry.name}\` — ${value}`;
  });

  return new EmbedBuilder()
    .setColor(C.GOLD)
    .setTitle(title)
    .setDescription(desc + '\n\n' + lines.join('\n'))
    .setThumbnail(data[0] ? playerHead(data[0].name) : null)
    .setFooter({ text: `Toplam ${Object.keys(data).length} oyuncu listelendi` })
    .setTimestamp();
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(C.INFO)
    .setTitle('📖 Komut Listesi')
    .setDescription('Minecraft sunucu botu komutları:')
    .addFields(
      { name: '`/sunucu`',              value: 'Sunucu durumunu gösterir (ping, oyuncu sayısı, versiyon)' },
      { name: '`/oyuncular`',           value: 'Şu an online olan oyuncuları listeler' },
      { name: '`/liderlik süre`',       value: 'En çok oynayan oyuncuların sıralaması' },
      { name: '`/liderlik xp`',         value: 'En yüksek XP seviyesine sahip oyuncular' },
      { name: '`/oyuncu <isim>`',       value: 'Belirli bir oyuncunun istatistiklerini gösterir' },
      { name: '`/yardım`',             value: 'Bu mesajı gösterir' },
    )
    .setTimestamp();
}

function playerInfoEmbed(name, data, isOnline) {
  const statusText = isOnline ? '🟢 Online' : '🔴 Çevrimdışı';

  const embed = new EmbedBuilder()
    .setColor(isOnline ? C.JOIN : C.OFFLINE)
    .setTitle(`⛏️ ${name}`)
    .setThumbnail(playerHead(name))
    .addFields(
      { name: '📊 Durum',         value: statusText,                              inline: true },
      { name: '✨ XP Seviyesi',   value: `\`${data.xpLevel || 0}\``,              inline: true },
      { name: '⏰ Toplam Süre',   value: `\`${formatPlaytime(data.totalPlaytime || 0)}\``, inline: true },
      { name: '🔄 Oturum Sayısı', value: `\`${data.sessions || 0}\``,             inline: true },
      { name: '📅 İlk Görülme',   value: data.firstSeen ? `<t:${Math.floor(new Date(data.firstSeen).getTime() / 1000)}:R>` : '*Bilinmiyor*', inline: true },
      { name: '🕐 Son Görülme',   value: data.lastSeen ? `<t:${Math.floor(new Date(data.lastSeen).getTime() / 1000)}:R>` : '*Bilinmiyor*',  inline: true },
    )
    .setTimestamp();

  return embed;
}

/* ========== GÜVENLİK LOG EMBED'LERİ ========== */

function securityJoinEmbed(playerName, onlineCount) {
  return new EmbedBuilder()
    .setColor(C.SECURITY)
    .setTitle('🔐 Oyuncu Girişi')
    .setThumbnail(playerHead(playerName))
    .addFields(
      { name: '👤 Oyuncu',         value: `\`${playerName}\``,           inline: true },
      { name: '🕐 Zaman',          value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: '👥 Online Sayısı',   value: `\`${onlineCount}\``,          inline: true },
    )
    .setFooter({ text: '🟢 GİRİŞ' })
    .setTimestamp();
}

function securityLeaveEmbed(playerName, onlineCount, sessionDuration) {
  const durationText = sessionDuration ? formatPlaytime(sessionDuration) : 'Bilinmiyor';
  return new EmbedBuilder()
    .setColor(C.LEAVE)
    .setTitle('🔐 Oyuncu Çıkışı')
    .setThumbnail(playerHead(playerName))
    .addFields(
      { name: '👤 Oyuncu',         value: `\`${playerName}\``,           inline: true },
      { name: '🕐 Zaman',          value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: '⏱️ Oturum Süresi',  value: `\`${durationText}\``,         inline: true },
      { name: '👥 Kalan Online',    value: `\`${onlineCount}\``,          inline: true },
    )
    .setFooter({ text: '🔴 ÇIKIŞ' })
    .setTimestamp();
}

function securityServerStatusEmbed(isOnline, playerCount) {
  if (isOnline) {
    return new EmbedBuilder()
      .setColor(C.SERVER_UP)
      .setTitle('🟢 Sunucu Açıldı')
      .setDescription('Minecraft sunucusu tekrar erişilebilir durumda.')
      .addFields(
        { name: '🕐 Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '👥 Online', value: `\`${playerCount}\``, inline: true },
      )
      .setTimestamp();
  }

  return new EmbedBuilder()
    .setColor(C.SERVER_DOWN)
    .setTitle('🔴 Sunucu Kapandı')
    .setDescription('Minecraft sunucusu erişilemez durumda!')
    .addFields(
      { name: '🕐 Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setTimestamp();
}

function securityDailySummaryEmbed(stats) {
  return new EmbedBuilder()
    .setColor(C.GOLD)
    .setTitle('📊 Günlük Güvenlik Özeti')
    .addFields(
      { name: '🔄 Toplam Giriş',       value: `\`${stats.totalJoins}\``,                    inline: true },
      { name: '🔄 Toplam Çıkış',       value: `\`${stats.totalLeaves}\``,                   inline: true },
      { name: '👥 Benzersiz Oyuncu',    value: `\`${stats.uniquePlayers}\``,                 inline: true },
      { name: '⏰ En Çok Oynayan',      value: stats.topPlayer ? `\`${stats.topPlayer}\`` : '*Yok*', inline: true },
      { name: '📈 Pik Online',          value: `\`${stats.peakOnline}\``,                    inline: true },
      { name: '🕐 Rapor Zamanı',        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,     inline: true },
    )
    .setTimestamp();
}

module.exports = {
  joinEmbed,
  leaveEmbed,
  statusEmbed,
  playersEmbed,
  leaderboardEmbed,
  helpEmbed,
  playerInfoEmbed,
  securityJoinEmbed,
  securityLeaveEmbed,
  securityServerStatusEmbed,
  securityDailySummaryEmbed,
  formatPlaytime,
};
