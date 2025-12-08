
const WS_URL = "wss://ws.mevx.io/api/v1/ws";

let ws = null;
let pingTimer = null;

// ===========================
// 🚀 START WEBSOCKET
// ===========================
async function startSocket() {

    const config = await chrome.storage.sync.get(["sol_wallet","bsc_wallet","token_notify"]);
    if (!config.token_notify){
        console.warn("⚠ Chưa có Token");
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN){
        console.log("⚡ WS đã chạy, bỏ qua restart.");
        return;
    }

    console.log("🔌 Connecting socket mevx.io");

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("🟢 WS Connected!");
        
        if (config.sol_wallet){
            subscribeSolana(config.sol_wallet, config.token_notify);
        } else {
            console.log("🟨 Không có ví Solana");
        }

        if (config.bsc_wallet){
            subscribeBSC(config.bsc_wallet);
        } else {
            console.log("🟨 Không có ví BSC");
        }

        startPing();
    };

    ws.onmessage = (e) => handleMessage(e.data);

    ws.onclose = () => {
        console.log("🔴 WS Closed → reconnecting...");
        stopPing();
        setTimeout(startSocket, 5000);
    };

    ws.onerror = err => {
        console.error("⛔ WS Error:", err);
        ws.close();
    };
}

// ===========================
// 📡 SUBSCRIBE BSC
// ===========================
function subscribeBSC(wallet){
    if(!wallet) return;

    const subscribeMsg = `
        {
          "jsonrpc":"2.0",
          "id":"9934fea3-57fe-42f5-9216-9bcf12c86972",
          "method":"subscribeTrades",
          "params":{
            "chain":"bsc",
            "wallets":["${wallet}"]
          }
        }
    `.trim();

    ws.send(subscribeMsg);
    console.log(`🟩 SUB BSC → ${wallet}`);
}

// ===========================
// 📡 LOGIN + SUBSCRIBE SOLANA
// ===========================
function subscribeSolana(sol_wallet, authToken){
    if(!authToken) return;

    const loginMsg = `
        {
          "jsonrpc":"2.0",
          "id":"0419b6b5-aeda-46d3-9786-4addd51b4930",
          "method":"login",
          "params":{
            "authToken":"${authToken}"
          }
        }
    `.trim();

    ws.send(loginMsg);
    console.log(`🟩 SUB SOL → ${sol_wallet}`);
}

// ===========================
// 🔄 PING SOCKET mỗi 15s
// ===========================
function startPing(){
    stopPing();
    pingTimer = setInterval(()=>{
        if(ws.readyState === WebSocket.OPEN){
            ws.send(`{"method":"ping"}`);
            console.log("📩 Ping → WS");
        }
    },15000);
}
function stopPing(){ if(pingTimer) clearInterval(pingTimer); pingTimer=null; }

// ===========================
// 📥 Handle WS Data
// ===========================
async function handleMessage(raw){
    
    if(raw==="pong" || raw==="ping") return;

    let data=null;
    try{ data = JSON.parse(raw); }
    catch(e){
        console.log("⚠ Non JSON message:", raw);
        return;
    }

    console.log("📥 WS DATA:", data);

    // Token notify filter
    const cfg = await chrome.storage.sync.get("token_notify");
    if(!cfg.token_notify) return;

    const notifyList = cfg.token_notify.split(",").map(x=>x.trim().toUpperCase());
    const token = data?.result?.token;
    if(!token) return;

    if(notifyList.includes(token.toUpperCase())){
        chrome.notifications.create({
            type:"basic",
            iconUrl:"icons/icon128.png",
            title:`Token Detected: ${token}`,
            message: JSON.stringify(data.result,null,2)
        });
        console.log(`🔔 Notify: ${token}`);
    }
}

// ===========================
// 📩 Nhận lệnh từ popup
// ===========================
chrome.runtime.onMessage.addListener((msg,_,sendResponse)=>{
    
    if (msg.type === "start_ws") {
        startSocket();
        sendResponse({ started: true });
    }

    if(msg.type==="save_config"){
        chrome.storage.sync.set(msg.data, () => sendResponse({ ok: true }));
        return true;
    }
});

