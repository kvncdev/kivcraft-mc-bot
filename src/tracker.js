/**
 * PlayerTracker — Oyuncu giriş/çıkış tespiti, süre takibi, XP güncelleme
 *
 * Sunucuyu belirli aralıklarla sorgulayarak:
 *  - Yeni giren oyuncuları tespit eder
 *  - Çıkan oyuncuları tespit eder
 *  - Online oyuncuların süresini takip eder
 *  - Belirli aralıklarla XP seviyelerini günceller
 *  - Sunucu açılma/kapanma olaylarını bildirir
 *  - Günlük istatistik tutar
 */

class PlayerTracker {
  /**
   * @param {import('./minecraft')} mcServer
   * @param {import('./storage')} storage
   * @param {(event: string, player: string, extra?: object) => void} logCallback
   */
  constructor(mcServer, storage, logCallback) {
    this.mc = mcServer;
    this.storage = storage;
    this.logCallback = logCallback;
    this.onlinePlayers = new Set();
    this.lastPollTime = null;
    this.serverOnline = false;

    // Oturum başlangıç zamanları (oturum süresi hesabı için)
    this.sessionStartTimes = new Map();

    // Günlük istatistikler
    this.dailyStats = {
      totalJoins: 0,
      totalLeaves: 0,
      uniquePlayers: new Set(),
      peakOnline: 0,
    };
  }

  /**
   * Ana polling döngüsü — her X saniyede bir çağrılır
   */
  async poll() {
    const now = Date.now();
    const wasOnline = this.serverOnline;

    // Önce RCON ile dene, başarısız olursa status query kullan
    let currentPlayers = await this.mc.getPlayerList();
    let statusData = null;

    if (currentPlayers.length === 0) {
      statusData = await this.mc.getStatus();
      if (statusData.online) {
        currentPlayers = statusData.players.list || [];
        this.serverOnline = true;
      } else {
        // Sunucu kapalı — tüm oyuncuları "çıkış yaptı" say
        if (this.serverOnline && this.onlinePlayers.size > 0) {
          for (const player of this.onlinePlayers) {
            const sessionDuration = this._getSessionDuration(player, now);
            this.logCallback('leave', player, {
              onlineCount: 0,
              sessionDuration,
            });
            this.dailyStats.totalLeaves++;
            this.sessionStartTimes.delete(player);
            this.storage.updatePlayer(player, {
              lastSeen: new Date().toISOString(),
            });
          }
          this.onlinePlayers.clear();
        }

        // Sunucu durum değişikliği bildirimi
        if (wasOnline) {
          this.logCallback('server_offline', null, {});
        }

        this.serverOnline = false;
        this.lastPollTime = now;
        return;
      }
    } else {
      this.serverOnline = true;
    }

    // Sunucu yeni açıldı bildirimi
    if (!wasOnline && this.serverOnline) {
      this.logCallback('server_online', null, {
        playerCount: currentPlayers.length,
      });
    }

    const currentSet = new Set(currentPlayers);

    // Pik online güncelle
    if (currentSet.size > this.dailyStats.peakOnline) {
      this.dailyStats.peakOnline = currentSet.size;
    }

    // ===== GİRİŞ TESPİTİ =====
    for (const player of currentPlayers) {
      if (!this.onlinePlayers.has(player)) {
        this.sessionStartTimes.set(player, now);
        this.dailyStats.uniquePlayers.add(player);

        // İlk poll'da (bot yeni başladı) sessiz ol
        if (this.lastPollTime !== null) {
          this.dailyStats.totalJoins++;
          this.logCallback('join', player, {
            onlineCount: currentSet.size,
          });
        }
        const existing = this.storage.getPlayer(player);
        this.storage.updatePlayer(player, {
          lastSeen: new Date().toISOString(),
          sessions: (existing?.sessions || 0) + 1,
        });
      }
    }

    // ===== ÇIKIŞ TESPİTİ =====
    for (const player of this.onlinePlayers) {
      if (!currentSet.has(player)) {
        const sessionDuration = this._getSessionDuration(player, now);
        this.sessionStartTimes.delete(player);

        if (this.lastPollTime !== null) {
          this.dailyStats.totalLeaves++;
          this.logCallback('leave', player, {
            onlineCount: currentSet.size,
            sessionDuration,
          });
        }
        this.storage.updatePlayer(player, {
          lastSeen: new Date().toISOString(),
        });
      }
    }

    // ===== SÜRE TAKİBİ =====
    if (this.lastPollTime) {
      const elapsedSec = (now - this.lastPollTime) / 1000;
      for (const player of currentPlayers) {
        const existing = this.storage.getPlayer(player);
        this.storage.updatePlayer(player, {
          totalPlaytime: (existing?.totalPlaytime || 0) + elapsedSec,
        });
      }
    }

    this.onlinePlayers = currentSet;
    this.lastPollTime = now;
  }

  /**
   * Online oyuncuların XP seviyelerini güncelle
   */
  async updateXP() {
    if (this.onlinePlayers.size === 0) return;

    for (const player of this.onlinePlayers) {
      const xp = await this.mc.getPlayerXP(player);
      if (xp !== null) {
        this.storage.updatePlayer(player, { xpLevel: xp });
      }
      // Her oyuncu arasında kısa bekleme (RCON spam'i önlemek için)
      await new Promise(r => setTimeout(r, 500));
    }
  }

  /**
   * Oturum süresini hesapla
   */
  _getSessionDuration(player, now) {
    const start = this.sessionStartTimes.get(player);
    return start ? Math.floor((now - start) / 1000) : null;
  }

  /**
   * Günlük istatistikleri al ve sıfırla
   */
  getDailyStatsAndReset() {
    const stats = {
      totalJoins: this.dailyStats.totalJoins,
      totalLeaves: this.dailyStats.totalLeaves,
      uniquePlayers: this.dailyStats.uniquePlayers.size,
      peakOnline: this.dailyStats.peakOnline,
      topPlayer: this._getTopPlayerToday(),
    };

    // Sıfırla
    this.dailyStats = {
      totalJoins: 0,
      totalLeaves: 0,
      uniquePlayers: new Set(),
      peakOnline: 0,
    };

    return stats;
  }

  /**
   * Bugün en çok oynayan oyuncuyu bul
   */
  _getTopPlayerToday() {
    const leaderboard = this.storage.getLeaderboard('totalPlaytime', 1);
    return leaderboard.length > 0 ? leaderboard[0].name : null;
  }

  getOnlinePlayers() {
    return [...this.onlinePlayers];
  }

  isServerOnline() {
    return this.serverOnline;
  }
}

module.exports = PlayerTracker;
