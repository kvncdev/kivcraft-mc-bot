const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

class Storage {
  constructor() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(PLAYERS_FILE)) {
        return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('⚠️  Veri dosyası okunamadı:', e.message);
    }
    return { players: {} };
  }

  save() {
    try {
      fs.writeFileSync(PLAYERS_FILE, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('⚠️  Veri dosyası yazılamadı:', e.message);
    }
  }

  getPlayer(name) {
    return this.data.players[name] || null;
  }

  updatePlayer(name, updates) {
    if (!this.data.players[name]) {
      this.data.players[name] = {
        totalPlaytime: 0,
        xpLevel: 0,
        lastSeen: null,
        firstSeen: new Date().toISOString(),
        sessions: 0,
      };
    }
    Object.assign(this.data.players[name], updates);
    this.save();
  }

  /**
   * Liderlik tablosu verisini döndürür
   * @param {'totalPlaytime'|'xpLevel'} field - Sıralama alanı
   * @param {number} limit - Kaç oyuncu gösterilsin
   */
  getLeaderboard(field, limit = 10) {
    return Object.entries(this.data.players)
      .filter(([, data]) => (data[field] || 0) > 0)
      .sort((a, b) => (b[1][field] || 0) - (a[1][field] || 0))
      .slice(0, limit)
      .map(([name, data], i) => ({ rank: i + 1, name, ...data }));
  }

  getAllPlayers() {
    return this.data.players;
  }
}

module.exports = new Storage();
