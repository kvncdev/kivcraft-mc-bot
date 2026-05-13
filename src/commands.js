const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const embeds = require('./embeds');

/**
 * Tüm slash komutlarını tanımlar ve handler'larını döndürür.
 *
 * @param {import('./minecraft')} mc - Minecraft sunucu instance
 * @param {import('./tracker')} tracker - Player tracker instance
 * @param {import('./storage')} storage - Storage instance
 */
function createCommands(mc, tracker, storage) {
  const commands = [];
  const handlers = new Map();

  /* ========== /sunucu ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('sunucu')
      .setDescription('Minecraft sunucu durumunu gösterir')
  );
  handlers.set('sunucu', async (interaction) => {
    await interaction.deferReply();
    const status = await mc.getStatus();
    const players = tracker.getOnlinePlayers();
    await interaction.editReply({ embeds: [embeds.statusEmbed(status, players)] });
  });

  /* ========== /oyuncular ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('oyuncular')
      .setDescription('Online oyuncuları listeler')
  );
  handlers.set('oyuncular', async (interaction) => {
    await interaction.deferReply();
    const players = tracker.getOnlinePlayers();
    await interaction.editReply({ embeds: [embeds.playersEmbed(players)] });
  });

  /* ========== /liderlik ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('liderlik')
      .setDescription('Liderlik tablosunu gösterir')
      .addStringOption(option =>
        option
          .setName('tür')
          .setDescription('Liderlik tablosu türü')
          .setRequired(true)
          .addChoices(
            { name: '⏰ En Çok Oynayan', value: 'süre' },
            { name: '✨ En Yüksek XP',   value: 'xp' },
          )
      )
  );
  handlers.set('liderlik', async (interaction) => {
    await interaction.deferReply();
    const type = interaction.options.getString('tür');
    const field = type === 'xp' ? 'xpLevel' : 'totalPlaytime';
    const data = storage.getLeaderboard(field, 10);
    await interaction.editReply({ embeds: [embeds.leaderboardEmbed(type === 'xp' ? 'xp' : 'time', data)] });
  });

  /* ========== /oyuncu ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('oyuncu')
      .setDescription('Bir oyuncunun istatistiklerini gösterir')
      .addStringOption(option =>
        option
          .setName('isim')
          .setDescription('Oyuncu adı')
          .setRequired(true)
      )
  );
  handlers.set('oyuncu', async (interaction) => {
    await interaction.deferReply();
    const name = interaction.options.getString('isim');
    const data = storage.getPlayer(name);

    if (!data) {
      await interaction.editReply({ content: `❌ **${name}** adlı oyuncu bulunamadı. Oyuncunun en az bir kez sunucuya girmesi gerekir.` });
      return;
    }

    const isOnline = tracker.getOnlinePlayers().includes(name);
    await interaction.editReply({ embeds: [embeds.playerInfoEmbed(name, data, isOnline)] });
  });

  /* ========== /yardım ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('yardim')
      .setDescription('Komut listesini gösterir')
  );
  handlers.set('yardim', async (interaction) => {
    await interaction.reply({ embeds: [embeds.helpEmbed()] });
  });

  /* ========== /ping ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Botun ve sunucunun gecikme süresini gösterir')
  );
  handlers.set('ping', async (interaction) => {
    await interaction.deferReply();
    const discordPing = interaction.client.ws.ping;
    
    let mcPing = '🔴 Ulaşılamıyor';
    const status = await mc.getStatus();
    if (status.online) mcPing = `🟢 ${status.latency}ms`;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '🤖 Bot Gecikmesi', value: `\`${discordPing}ms\``, inline: true },
        { name: '📡 Sunucu Gecikmesi', value: `\`${mcPing}\``, inline: true }
      );
    await interaction.editReply({ embeds: [embed] });
  });

  /* ========== /duyuru ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('duyuru')
      .setDescription('Oyundaki herkese renkli bir duyuru gönderir (Sadece Yetkililer)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option =>
        option.setName('mesaj').setDescription('Gönderilecek mesaj').setRequired(true)
      )
  );
  handlers.set('duyuru', async (interaction) => {
    const mesaj = interaction.options.getString('mesaj').replace(/"/g, '\\"');
    const command = `tellraw @a ["",{"text":"[DUYURU] ","color":"red","bold":true},{"text":"${mesaj}","color":"yellow","bold":false}]`;
    
    const response = await mc.sendCommand(command);
    if (response !== null) {
      await interaction.reply('✅ Duyuru başarıyla gönderildi!');
    } else {
      await interaction.reply({ content: '❌ Duyuru gönderilemedi. RCON bağlantısı kopuk olabilir.', ephemeral: true });
    }
  });

  /* ========== /zaman ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('zaman')
      .setDescription('Minecraft sunucu saatini değiştirir (Sadece Yetkililer)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option =>
        option.setName('vakit')
          .setDescription('Hangi vakit olsun?')
          .setRequired(true)
          .addChoices(
            { name: '☀️ Gündüz', value: 'day' },
            { name: '🌙 Gece', value: 'night' },
            { name: '🌅 Sabah', value: 'morning' }
          )
      )
  );
  handlers.set('zaman', async (interaction) => {
    const vakit = interaction.options.getString('vakit');
    const response = await mc.sendCommand(`time set ${vakit}`);
    
    if (response !== null) {
      await interaction.reply(`✅ Zaman başarıyla **${vakit}** olarak değiştirildi!`);
    } else {
      await interaction.reply({ content: '❌ İşlem başarısız. RCON bağlı mı?', ephemeral: true });
    }
  });

  /* ========== /hava ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('hava')
      .setDescription('Minecraft hava durumunu değiştirir (Sadece Yetkililer)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(option =>
        option.setName('durum')
          .setDescription('Nasıl bir hava?')
          .setRequired(true)
          .addChoices(
            { name: '☀️ Açık', value: 'clear' },
            { name: '🌧️ Yağmurlu', value: 'rain' },
            { name: '⛈️ Fırtınalı', value: 'thunder' }
          )
      )
  );
  handlers.set('hava', async (interaction) => {
    const durum = interaction.options.getString('durum');
    const response = await mc.sendCommand(`weather ${durum}`);
    
    if (response !== null) {
      await interaction.reply(`✅ Hava durumu başarıyla **${durum}** olarak ayarlandı!`);
    } else {
      await interaction.reply({ content: '❌ İşlem başarısız. RCON bağlı mı?', ephemeral: true });
    }
  });

  /* ========== /oyun_saati ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('oyun_saati')
      .setDescription('Minecraft dünyasındaki anlık saati gösterir')
  );
  handlers.set('oyun_saati', async (interaction) => {
    await interaction.deferReply();
    const response = await mc.sendCommand('time query daytime');
    
    if (!response) {
      return interaction.editReply('❌ Oyun saati alınamadı. RCON bağlantısı kopuk olabilir.');
    }

    const match = response.match(/is\s+(\d+)/);
    if (!match) {
      return interaction.editReply('❌ Zaman bilgisi anlaşılamadı.');
    }

    const ticks = parseInt(match[1]);
    let hours = Math.floor(ticks / 1000) + 6;
    const minutes = Math.floor(((ticks % 1000) / 1000) * 60);
    
    if (hours >= 24) hours -= 24;
    
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    let emoji = '☀️';
    if (hours >= 18 || hours < 6) emoji = '🌙';
    else if (hours >= 6 && hours < 8) emoji = '🌅';
    else if (hours >= 16 && hours < 18) emoji = '🌇';

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(`${emoji} Minecraft Zamanı`)
      .setDescription(`Şu an dünyada saat: **${formattedHours}:${formattedMinutes}**`)
      .setFooter({ text: `Oyun İçi Tick: ${ticks}` });
      
    await interaction.editReply({ embeds: [embed] });
  });

  /* ========== /sunucu_detay ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('sunucu_detay')
      .setDescription('Sunucu hakkında çok detaylı istatistikler sunar')
  );
  handlers.set('sunucu_detay', async (interaction) => {
    await interaction.deferReply();
    const status = await mc.getStatus();
    
    // Veritabanı istatistikleri
    const allPlayers = Object.keys(storage.data.players || {});
    const totalRegistered = allPlayers.length;
    
    let totalPlaytime = 0;
    let mostActivePlayer = { name: 'Yok', time: 0 };
    
    for (const p of allPlayers) {
      const pData = storage.getPlayer(p);
      totalPlaytime += pData.totalPlaytime || 0;
      if (pData.totalPlaytime > mostActivePlayer.time) {
        mostActivePlayer = { name: p, time: pData.totalPlaytime };
      }
    }

    const totalHours = Math.floor(totalPlaytime / 60);
    
    // Uptime (Botun çalışma süresi)
    const uptimeDays = Math.floor(interaction.client.uptime / 86400000);
    const uptimeHours = Math.floor(interaction.client.uptime / 3600000) % 24;
    const uptimeMins = Math.floor(interaction.client.uptime / 60000) % 60;

    const embed = new EmbedBuilder()
      .setColor('#2E8B57')
      .setTitle('📊 Detaylı Sunucu Raporu')
      .addFields(
        { name: '📡 Bağlantı Durumu', value: status.online ? `🟢 Aktif (${status.latency}ms)` : '🔴 Kapalı', inline: true },
        { name: '👥 Oyuncular', value: status.online ? `${status.players.online} / ${status.players.max}` : '0', inline: true },
        { name: '📦 Versiyon', value: status.online ? status.version : 'Bilinmiyor', inline: true },
        { name: '📝 Toplam Kayıtlı Oyuncu', value: `\`${totalRegistered} Kişi\``, inline: true },
        { name: '⏱️ Toplam Oynanma Süresi', value: `\`${totalHours} Saat\``, inline: true },
        { name: '👑 En Çok Oynayan', value: `\`${mostActivePlayer.name}\``, inline: true },
        { name: '🤖 Bot Uptime', value: `${uptimeDays}g ${uptimeHours}s ${uptimeMins}d`, inline: false }
      )
      .setTimestamp();
      
    await interaction.editReply({ embeds: [embed] });
  });

  /* ========== /zar ========== */
  commands.push(
    new SlashCommandBuilder()
      .setName('zar')
      .setDescription("100 üzerinden zar atar ve sonucu Minecraft'a da duyurur!")
  );
  handlers.set('zar', async (interaction) => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const username = interaction.member?.nickname || interaction.user.displayName;
    
    let emoji = '🎲';
    if (roll > 90) emoji = '🔥';
    else if (roll < 10) emoji = '💀';

    await interaction.reply(`**${username}** zarı yuvarladı... ve **${roll}** geldi! ${emoji}`);
    
    // Oyun içine de gönder
    const safeName = username.replace(/"/g, '\\"');
    const command = `tellraw @a ["",{"text":"[Mini Oyun] ","color":"light_purple"},{"text":"${safeName}","color":"yellow"},{"text":" zar attı: ","color":"white"},{"text":"${roll}","color":"gold","bold":true}]`;
    await mc.sendCommand(command);
  });

  return { commands, handlers };
}

module.exports = { createCommands };
