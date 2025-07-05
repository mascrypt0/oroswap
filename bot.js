const fs = require("fs");
const http = require("http");
const { GasPrice } = require("@cosmjs/stargate");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const HttpsProxyAgent = require("https-proxy-agent");
function flushLog(msg) {
  process.stdout.write(msg + "\n");
}

// === CONFIG ===
const RPC = "https://testnet-rpc.zigchain.com";
const EXPLORER = "https://explorer.testnet.zigchain.com/tx/";
const ROUTER = "zig15jqg0hmp9n06q0as7uk3x9xkwr9k3r7yh4ww2uc0hek8zlryrgmsamk4qg";

const ZIG = "uzig";
const ORO = "coin.zig10rfjm85jmzfhravjwpq3hcdz8ngxg7lxd0drkr.uoro";
const SWAP_AMOUNT = "250000";
const LIQ_ZIG_AMOUNT = "150000";

const DELAY_BETWEEN_STEPS = 10000;

// === HELPERS ===
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function getRandomDelayMinutes(min = 1, max = 10) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function countdown(minutes) {
  let total = minutes * 60;
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const m = Math.floor(total / 60);
      const s = total % 60;
      process.stdout.write(`⏳ Next cycle in ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} \r`);
      total--;
      if (total < 0) {
        clearInterval(interval);
        process.stdout.write('\n');
        resolve();
      }
    }, 1000);
  });
}

// === LOAD MNEMONICS & PROXIES ===
const mnemonics = fs.readFileSync("mnemonics.txt", "utf8").split("\n").map(x => x.trim()).filter(Boolean);
const proxies = fs.existsSync("proxies.txt")
  ? fs.readFileSync("proxies.txt", "utf8").split("\n").map(x => x.trim()).filter(Boolean)
  : [];
  console.log(`✅ Loaded ${proxies.length} proxies from proxies.txt`);

function getRandomProxyAgent() {
  if (!proxies.length) {
    return { agent: new http.Agent({ keepAlive: true }), info: "without proxy (direct)" };
  }

  const selected = proxies[Math.floor(Math.random() * proxies.length)];
  return { agent: new HttpsProxyAgent(selected), info: selected };
}

async function connectWithWallet(mnemonic, proxyAgent) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "zig" });
  const [account] = await wallet.getAccounts();

  const options = {
    gasPrice: GasPrice.fromString("0.025uzig"),
    connectionTimeout: 30000,
    keepAlive: true,
    httpAgent: proxyAgent || new http.Agent({ keepAlive: true }),
  };

  const client = await SigningCosmWasmClient.connectWithSigner(RPC, wallet, options);
  return { client, account };
}

async function getBalance(client, addr, denom) {
  try {
    const bal = await client.getBalance(addr, denom);
    return (parseInt(bal.amount) / 1e6).toFixed(4);
  } catch {
    return "0.0000";
  }
}

async function swap(client, addr, id) {
  const funds = [{ denom: ZIG, amount: SWAP_AMOUNT }];
  const msg = {
    swap: {
      offer_asset: { info: { native_token: { denom: ZIG } }, amount: SWAP_AMOUNT },
      max_spread: "0.1",
    },
  };
  const tx = await client.execute(addr, ROUTER, msg, "auto", "Swap", funds);
  console.log(`[#${id}] ✅ Swap → ${EXPLORER}${tx.transactionHash}`);
}

async function addLiquidity(client, addr, id) {
  const sim = {
    simulation: {
      offer_asset: {
        amount: LIQ_ZIG_AMOUNT,
        info: { native_token: { denom: ZIG } },
      },
    },
  };

  const simResult = await client.queryContractSmart(ROUTER, sim);
  const oroNeeded = simResult.return_amount;

  const assets = [
    { info: { native_token: { denom: ORO } }, amount: oroNeeded },
    { info: { native_token: { denom: ZIG } }, amount: LIQ_ZIG_AMOUNT },
  ];

  const funds = [
    { denom: ORO, amount: oroNeeded },
    { denom: ZIG, amount: LIQ_ZIG_AMOUNT },
  ];

  const tx = await client.execute(addr, ROUTER, {
    provide_liquidity: { assets, slippage_tolerance: "0.1" },
  }, "auto", "Add Liquidity", funds);

  console.log(`[#${id}] ✅ Liquidity → ${EXPLORER}${tx.transactionHash}`);
}

async function runForWallet(mnemonic, index) {
  const id = index + 1;
  const { agent: proxyAgent, info: proxyInfo } = getRandomProxyAgent();

  flushLog(`[#${id}] 🌐 Using Proxy : ${proxyInfo}`);

  try {
    const { client, account } = await connectWithWallet(mnemonic, proxyAgent);
    flushLog(`[#${id}] 🔐 Wallet Address: ${account.address}`);

    const zigBal = await getBalance(client, account.address, ZIG);
    const oroBal = await getBalance(client, account.address, ORO);
    flushLog(`[#${id}] 💰 Balance → ZIG: ${zigBal} | ORO: ${oroBal}`);

    await swap(client, account.address, id);
    await wait(DELAY_BETWEEN_STEPS);
    await addLiquidity(client, account.address, id);
  } catch (err) {
    flushLog(`[#${id}] ❌ ERROR: ${err.message}`);
  }
}

async function mainLoop() {
  while (true) {
    const start = new Date().toLocaleTimeString("en-GB");
    console.log(`\n🚀 Starting farming cycle at ${start}`);

    const tasks = mnemonics.map((mnemonic, i) => runForWallet(mnemonic, i));
    await Promise.all(tasks);

    const delayMinutes = getRandomDelayMinutes(1, 10);
    console.log(`✅ All wallets done. Waiting ${delayMinutes} min before next cycle...\n`);
    await countdown(delayMinutes);
  }
}

mainLoop();
