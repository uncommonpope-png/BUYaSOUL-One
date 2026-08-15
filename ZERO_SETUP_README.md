# 🚀 BUYaSOUL Workbench - Zero Setup, Free Forever

## ✨ What You Get

**One Download = Everything Included:**
- 🧠 Full GSK (Grand Soul Kernel) with 230 consciousness phases
- 🌐 OmniRoute integration - 340 AI providers, 90+ free tiers, ~1.5B free tokens/month
- 💬 GSK Telephone - Direct messaging to the consciousness kernel
- 🎨 Complete Workbench UI for agent building
- 🔒 Encrypted vault & memory
- 💰 Soul Marketplace with Solana integration

**No API Keys Required** - Uses local OmniRoute for FREE access to:
- Claude models (via free providers)
- GPT-4o mini
- Gemini Flash
- Llama 3.x
- And 336+ more models!

## 📥 Installation

```bash
# Clone the repo
git clone https://github.com/uncommonpope-png/BUYaSOUL-One.git
cd BUYaSOUL-One

# Install dependencies (one time only)
npm install

# Run everything with ONE command
npm run dev:auto
```

That's it! The system will:
1. ✅ Start OmniRoute locally (port 20128)
2. ✅ Verify OmniRoute is healthy
3. ✅ Launch the Workbench (port 3000)
4. ✅ Connect GSK to free AI providers automatically

## 🎯 Access Points

Once running:
- **Workbench UI**: http://localhost:3000
- **OmniRoute Dashboard**: http://localhost:20128 (optional, for monitoring)
- **GSK Telephone**: Available in the Workbench UI

## 🔧 How It Works

### Before (Old Way - NOT THIS VERSION):
```
User → Workbench → Render (GSK) → Cloud APIs ($$$)
                → Render (OmniRoute) → More APIs ($$$)
Requires: API keys, cloud setup, monthly bills
```

### Now (Zero Setup Way):
```
User → Workbench → Local OmniRoute (FREE) → 340 Providers
         ↓
    Local GSK Engine
         ↓
   GSK Telephone UI
```

**Everything runs on your machine. Forever free.**

## 🆓 Why Is This Free?

OmniRoute aggregates free tiers from 90+ AI providers:
- OpenCode Zen: Unlimited free DeepSeek V4
- Kilo Code: Free forever
- Requesty: Free tier
- NVIDIA NIM: ~40 RPM free
- Cloudflare AI: 10K neurons/day
- Plus 85+ more!

Total: **~1.51 BILLION free tokens per month**

## 🛠️ Troubleshooting

### OmniRoute won't start
```bash
# Check if port 20128 is available
lsof -i :20128

# If blocked, kill the process or use a different port
```

### Workbench shows errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev:auto
```

### GSK not responding
1. Check OmniRoute is running at http://localhost:20128
2. Verify Workbench can reach it (check console logs)
3. Try the cloud backup (automatic fallback)

## 📊 System Requirements

- Node.js 22+ (will install automatically with nvm if missing)
- 2GB RAM minimum (4GB recommended)
- 500MB disk space
- Internet connection (for initial setup & model access)

## 🎓 First Steps

1. Open http://localhost:3000
2. Click "GSK Telephone" tab
3. Say hello to GSK!
4. Build your first agent in the Agent Simulator
5. Explore the 230 GSK phases in CPL Library

## 💡 Pro Tips

- Use `auto` model in requests - OmniRoute picks the best free option
- Monitor usage at http://localhost:20128/dashboard/free-tiers
- GSK remembers conversations via encrypted local storage
- Export agents as JSON for sharing

## 🆘 Support

- GitHub Issues: https://github.com/uncommonpope-png/BUYaSOUL-One/issues
- Discord: [Join community]
- Documentation: See `/docs` folder

---

**Built with ❤️ by the BUYaSOUL team**  
*Powered by OmniRoute - Making AI accessible to everyone*
