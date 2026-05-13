const { SlashCommandBuilder } = require('discord.js');
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

  return { commands, handlers };
}

module.exports = { createCommands };
