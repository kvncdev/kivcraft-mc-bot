const { status } = require('minecraft-server-util');
const { Rcon } = require('rcon-client');

class MinecraftServer {
  constructor(host, port, rconPort, rconPassword) {
    this.host = host;
    this.port = parseInt(port);
    this.rconPort = parseInt(rconPort);
    this.rconPassword = rconPassword;
    this.rcon = null;
    this._reconnecting = false;
  }

  /* ========== SUNUCU DURUMU ========== */

  async getStatus() {
    try {
      const response = await status(this.host, this.port, { timeout: 5000 });
      return {
        online: true,
        players: {
          online: response.players.online,
          max: response.players.max,
          list: (response.players.sample || []).map(p => p.name),
        },
        version: response.version.name,
        latency: response.roundTripLatency,
        motd: response.motd?.clean || '',
      };
    } catch (e) {
      return { online: false, error: e.message };
    }
  }

  /* ========== RCON BAĞLANTISI ========== */

  async connectRcon() {
    if (this._reconnecting) return;
    this._reconnecting = true;

    try {
      if (this.rcon) {
        try { this.rcon.end(); } catch (_) { /* ignore */ }
        this.rcon = null;
      }

      console.log(`📡 RCON deneniyor: ${this.host}:${this.rconPort}`);

      this.rcon = await Rcon.connect({
        host: this.host,
        port: this.rconPort,
        password: this.rconPassword,
        timeout: 10000 // Timeout süresini artırdık
      });

      console.log('✅ RCON bağlantısı kuruldu');

      // Beklenmedik kopmaları yakala
      this.rcon.on('error', (err) => {
        console.error('⚠️ RCON Soket Hatası:', err.message);
        this.rcon = null;
      });

      this.rcon.on('end', () => {
        console.log('⚠️ RCON bağlantısı bitti');
        this.rcon = null;
      });

    } catch (e) {
      console.error('❌ RCON bağlantı hatası:', e.message);
      this.rcon = null;
      // 30 saniye sonra tekrar dene
      setTimeout(() => this.connectRcon(), 30000);
    } finally {
      this._reconnecting = false;
    }
  }

  async sendCommand(command) {
    if (!this.rcon) {
      await this.connectRcon();
      // Eğer hala bağlanamadıysa bekle
      if (!this.rcon) return null;
    }

    try {
      return await this.rcon.send(command);
    } catch (e) {
      console.error('❌ RCON komut hatası:', e.message);
      this.rcon = null; // Bağlantıyı sıfırla ki bir sonraki sefer tekrar denesin
      return null;
    }
  }

  /* ========== OYUNCU LİSTESİ ========== */

  async getPlayerList() {
    const response = await this.sendCommand('list');
    if (!response) return [];

    const match = response.match(/:\s*(.+)$/);
    if (!match || match[1].trim() === '') return [];
    return match[1].split(',').map(n => n.trim()).filter(Boolean);
  }

  async getPlayerXP(playerName) {
    const response = await this.sendCommand(`xp query ${playerName} levels`);
    if (!response) return null;

    const match = response.match(/has\s+(\d+)\s+experience/i);
    if (match) return parseInt(match[1]);

    const numMatch = response.match(/(\d+)/);
    return numMatch ? parseInt(numMatch[1]) : null;
  }

  async disconnect() {
    if (this.rcon) {
      try { this.rcon.end(); } catch (_) { /* ignore */ }
      this.rcon = null;
    }
  }
}

module.exports = MinecraftServer;
