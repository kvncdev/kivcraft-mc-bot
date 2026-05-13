# ⛏️ Minecraft Sunucu Discord Botu

Pebble Host (veya herhangi bir Forge/Vanilla) Minecraft sunucusu için Discord botu.

## ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 📋 Giriş/Çıkış Logları | Oyuncu girişte/çıkışta Discord log kanalına embed mesaj |
| 📡 Sunucu Durumu | Anlık ping, oyuncu sayısı, versiyon bilgisi |
| 👥 Online Oyuncular | Şu an sunucuda kimlerin olduğunu gösterir |
| ✨ XP Liderlik | En yüksek XP seviyesine sahip oyuncular |
| ⏰ Süre Liderlik | En çok oynayan oyuncuların sıralaması |
| 🔍 Oyuncu İstatistik | Belirli bir oyuncunun detaylı istatistikleri |
| 🤖 Bot Durumu | Discord'da "⛏ X oyuncu online" gösterir |

## 📋 Komutlar

| Komut | Açıklama |
|-------|----------|
| `/sunucu` | Sunucu durumu (ping, oyuncu, versiyon) |
| `/oyuncular` | Online oyuncu listesi |
| `/liderlik süre` | En çok oynayan oyuncular |
| `/liderlik xp` | En yüksek XP seviyesi |
| `/oyuncu <isim>` | Oyuncu istatistikleri |
| `/yardim` | Komut listesi |

---

## 🔧 Kurulum

### 1. RCON'u Açma (Pebble Host)

RCON, Minecraft sunucusuna uzaktan komut göndermenizi sağlar. Bot'un XP verisi ve oyuncu listesi alabilmesi için şarttır.

**Pebble Host panelinden:**

1. [Pebble Host Game Panel](https://panel.pebblehost.com)'e giriş yap
2. Sunucunu seç
3. Sol menüden **Files** → **File Manager**'a git
4. `server.properties` dosyasını aç
5. Şu satırları bul ve düzenle:

```properties
enable-rcon=true
rcon.port=25575
rcon.password=BURAYA_GÜÇLÜ_BİR_ŞİFRE_YAZ
```

6. **Kaydet** ve sunucuyu **yeniden başlat**

> ⚠️ **Önemli:** RCON şifresini güçlü yapın ve kimseyle paylaşmayın!

> 💡 **Not:** Pebble Host'ta RCON portu genelde otomatik atanır. Panel'deki **Settings** veya **Startup** kısmından RCON portunu kontrol edin. `25575` değilse `.env` dosyasında doğru portu yazın.

### 2. Discord Bot Oluşturma

1. [Discord Developer Portal](https://discord.com/developers/applications)'a git
2. **New Application** → isim ver → **Create**
3. Sol menüden **Bot** → **Reset Token** → token'ı kopyala
4. **Privileged Gateway Intents** kısmında:
   - ✅ Server Members Intent (opsiyonel)
5. Sol menüden **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`
6. Oluşan URL'yi tarayıcıda aç → botu Discord sunucuna ekle

### 3. Gerekli ID'leri Bulma

Discord'da **Ayarlar → Gelişmiş → Geliştirici Modu**'nu aç.

- **Sunucu ID:** Sunucu ismine sağ tıkla → "Sunucu Kimliğini Kopyala"
- **Kanal ID:** Log kanalına sağ tıkla → "Kanal Kimliğini Kopyala"

### 4. Projeyi Ayarlama

```bash
# Bağımlılıkları kur
cd kiv-mc
npm install

# .env dosyasını oluştur
cp .env.example .env
```

`.env` dosyasını düzenle:

```env
DISCORD_TOKEN=buraya_bot_tokenini_yaz
DISCORD_GUILD_ID=buraya_sunucu_idsi
LOG_CHANNEL_ID=buraya_log_kanal_idsi

MC_HOST=buraya_sunucu_adresi.pebblehost.com
MC_PORT=25565
MC_RCON_PORT=25575
MC_RCON_PASSWORD=buraya_rcon_sifresi
```

### 5. Botu Başlat

```bash
npm start
```

Başarılıysa şunu görürsün:

```
╔══════════════════════════════════════════╗
║  🤖 BotAdı#1234 aktif!
║  📡 MC: sunucu.pebblehost.com:25565
║  🔧 RCON: sunucu.pebblehost.com:25575
╚══════════════════════════════════════════╝

📋 Log kanalı: #mc-log
✅ RCON bağlantısı kuruldu
✅ 5 slash komutu kaydedildi
👥 Şu an 3 oyuncu online
```

---

## 🌐 Ücretsiz Hosting Seçenekleri

Bot'u 7/24 çalıştırmak için ücretsiz hosting seçenekleri:

### 1. 🟢 Oracle Cloud Free Tier (Önerilen)
- **Tamamen ücretsiz**, süresiz VM
- 1 GB RAM, 1 CPU yeterli
- [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
- Kurulum:
  ```bash
  # VM'e SSH ile bağlan
  sudo apt update && sudo apt install -y nodejs npm
  git clone <repo-url> && cd kiv-mc
  npm install
  # pm2 ile arkaplanda çalıştır
  npm install -g pm2
  pm2 start index.js --name mc-bot
  pm2 save
  pm2 startup
  ```

### 2. 🟡 Railway
- Aylık $5 ücretsiz kredi (7/24 yeterli)
- [railway.app](https://railway.app)
- GitHub repo'sunu bağla → otomatik deploy

### 3. 🟡 Render
- Ücretsiz web service (15dk inaktiflikte uyur)
- Background worker olarak ayarlanabilir
- [render.com](https://render.com)

### 4. 🔵 Kendi Bilgisayarın
- `pm2` veya `screen` ile arkaplanda çalıştır:
  ```bash
  npm install -g pm2
  pm2 start index.js --name mc-bot
  ```

---

## 🛠️ Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| RCON bağlantı hatası | `server.properties`'de `enable-rcon=true` olduğundan emin ol, portu kontrol et |
| Oyuncu listesi boş | RCON bağlıysa `/list` komutu çalışır, status query fallback olarak devreye girer |
| Komutlar görünmüyor | Bot'u sunucudan çıkarıp `applications.commands` scope'u ile tekrar ekle |
| XP verisi gelmiyor | Forge sunucuda `xp query <isim> levels` komutunun çalıştığını RCON ile test et |
| Bot durumu güncellenmiyor | `POLL_INTERVAL` değerini kontrol et (varsayılan 15 saniye) |

---

## 📁 Proje Yapısı

```
kiv-mc/
├── index.js           # Ana giriş noktası
├── src/
│   ├── minecraft.js   # Sunucu sorgusu + RCON
│   ├── tracker.js     # Oyuncu takibi (giriş/çıkış/süre)
│   ├── commands.js    # Slash komutları
│   ├── embeds.js      # Discord embed tasarımları
│   └── storage.js     # JSON veri depolama
├── data/
│   └── players.json   # Oyuncu verileri (otomatik oluşur)
├── .env               # Gizli ayarlar (git'e eklenmez)
├── .env.example       # Örnek ayar dosyası
└── package.json
```
