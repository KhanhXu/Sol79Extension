const WS_URL = "wss://ws.mevx.io/api/v1/ws";
const GMGN_ADDRESS_URL = "https://gmgn.ai/sol/address/";
const GMGN_TOKEN_URL = "https://gmgn.ai/sol/token/";

let ws = null;
let pingTimer = null;
let SNIPED_TOKENS = new Set();  // ⚠ Không lặp, lookup O(1)

// ============ UI ICON CONTROL ============

function setIcon(status){
    chrome.action.setIcon({
        path: `icons/${status ? "ws_on.png" : "ws_off.png"}`
    });
    console.log(`🎨 Icon → ${status ? "🟢 ON" : "🔴 OFF"}`);
}

// ======= ALWAYS START WEBSOCKET WHEN EXTENSION LOAD =======
startSocket();

// ===========================
// 🚀 START WEBSOCKET
// ===========================
async function startSocket() {

    const config = await chrome.storage.sync.get(["sol_wallet","bsc_wallet","token_notify"]);
    if (!config.token_notify){
        console.warn("⚠ Chưa có Token");
        setIcon(false);
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN){
        console.log("⚡ WS đã chạy, bỏ qua restart.");
        setIcon(true);
        return;
    }

    console.log("🔌 Connecting socket Mevx.io");

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("🟢 WS Connected!");
        setIcon(true);

        if (config.sol_wallet){
            subscribeSolana(config.sol_wallet, config.token_notify);
        } else console.log("🟨 Không có ví Solana");

        // if (config.bsc_wallet){
        //     subscribeBSC(config.bsc_wallet);
        // } else console.log("🟨 Không có ví BSC");

        startPing();
    };

    ws.onmessage = (e) => handleMessage(e.data);

    ws.onclose = () => {
        console.log("🔴 WS Closed → reconnecting...");
        stopPing();
        setIcon(false);
        setTimeout(startSocket, 5000);
    };

    ws.onerror = err => {
        console.error("⛔ WS Error:", err);
        ws.close();
        setIcon(false);
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
// 🔄 PING mỗi 15s
// ===========================
function startPing(){
    stopPing();
    pingTimer = setInterval(()=>{
        if(ws?.readyState === WebSocket.OPEN){
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

    // Extract token
    const snipeToken = extractTokenMessageSniping(raw);
    if(snipeToken){
        // Nếu token đã sniped rồi -> bỏ qua
        if(isSniped(snipeToken)){
            console.log(`⛔ SKIP - Token already sniped: ${snipeToken}`);
            return;
        }

        // MỞ TAB GMGN AUTOMATIC
        chrome.tabs.create({
            url: GMGN_TOKEN_URL + snipeToken
        });

         // Lần đầu sniping → xử lý
        markTokenSniped(snipeToken);
        console.log("🎯 NEW SNIPING TOKEN:", snipeToken);

        // Phát chuông
        playNotifySound();
    }
}

/**
 * Lưu token vào list tránh xử lý lại
 */
function markTokenSniped(token){
    SNIPED_TOKENS.add(token);
}

/**
 * Kiểm tra token đã xử lý chưa
 */
function isSniped(token){
    return SNIPED_TOKENS.has(token);
}

/**
 * Extract Token Message Sniping
 * @param {string} data  - raw response WebSocket
 * @returns {string|null}
 */
function extractTokenMessageSniping(data){

    let root;
    try { root = JSON.parse(data); }
    catch { return null; }

    if (!root.method || !root.params) return null;
    if (root.method !== "notification") return null;

    const params = root.params;
    if (!params.notificationType || !params.message) return null;
    if (params.notificationType !== "snipe") return null;

    const message = params.message;
    if (!message.includes("Sniping")) return null;

    // Regex như bản Java
    const match = message.match(/https:\/\/solscan\.io\/token\/([^"&<]+)/);
    return match ? match[1] : null;
}

async function ensureOffscreenDocument() {
    const exists = await chrome.offscreen.hasDocument();
    if (!exists) {
        await chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["AUDIO_PLAYBACK"],
            justification: "Play notification sound"
        });
    }
}

// Hàm phát âm thanh
async function playNotifySound() {
    await ensureOffscreenDocument();
    const url = chrome.runtime.getURL("sounds/tele.wav");
    chrome.runtime.sendMessage({ type: "play_sound", url });
}

// ===========================
// 📩 Nhận lệnh từ popup
// ===========================
chrome.runtime.onMessage.addListener((msg,_,sendResponse)=>{
    
    if(msg.type === "start_ws"){
        startSocket();
        sendResponse({started:true});
    }

    if(msg.type==="save_config"){
        chrome.storage.sync.set(msg.data,()=>sendResponse({ok:true}));
        return true;
    }
});
