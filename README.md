# 🤖 Oroswap Autoswap

A powerful automation tool to perform **token swap and liquidity provision** on the Oroswap DEX built on ZigChain.  
Supports **multi-wallet farming**, **proxy rotation**, **random farming delay**, and real-time terminal logging.

---

## 🚀 Features

- ✅ Automatically swaps native **ZIG** tokens into predefined CW20 tokens (e.g., ORO)
- ✅ Adds liquidity to the Oroswap pool after each swap
- 🔁 Runs farming cycles continuously with **random delays** between 1–10 minutes
- 🔐 **Multi-wallet support** using `wallets.txt`
- 🌐 **HTTP Proxy support** using `proxies.txt`
- ⏱️ Countdown timer before each cycle
- 🧠 Error handling and auto-retry on failures
- 🖥️ Real-time logs showing wallet number and proxy used

---

## 📁 File Structure

| File           | Description |
|----------------|-------------|
| `bot.js`   | Main bot file that handles farming cycles |
| `wallets.txt`  | One mnemonic per line, used for multi-wallet farming |
| `proxies.txt`  | One HTTP proxy per line (`http://ip:port` format) |
| `mnemonic.txt` | Optional if not using multi-wallet mode |

---

## ⚙️ How to Use
### Clone repository

```bash
git clone https://github.com/mascrypt0/oroswap.git
```

### Open folder

```bash
cd oroswap
```

### Install Dependencies

```bash
npm install
```
### Run bot
```bash
node bot.js
```

## Prepare Your Files
wallets.txt:
Contains one mnemonic per line for each wallet you want the bot to run.

proxies.txt:
Contains one HTTP proxy per line (e.g., http://123.45.67.89:8080), which the bot will assign randomly to each wallet.

mnemonic.txt (optional):
Used as fallback if wallets.txt does not exist or is empty.

💡 Make sure your wallets hold enough ZIG and token pairs for swap/liquidity.

## Disclaimer
This bot is provided for educational and testing purposes only.
Use it at your own risk. The author takes no responsibility for potential loss of funds or misuse.

## Contributing
Pull requests and suggestions are welcome!
If you'd like to improve the proxy rotation, support additional token pairs, or add auto-staking – feel free to fork and contribute!
