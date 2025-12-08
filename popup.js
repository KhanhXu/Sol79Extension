document.getElementById("saveBtn").onclick = () => {
    const data = {
        sol_wallet : document.getElementById("solWallet").value,
        bsc_wallet : document.getElementById("bscWallet").value,
        token_notify : document.getElementById("tokenNotify").value
    };
    chrome.runtime.sendMessage({type:"save_config", data}, res=>{
        alert("Đã lưu thông tin!");
    });
};

document.getElementById("startBtn").onclick = () => {
    chrome.runtime.sendMessage({type:"start_ws"}, res=>{
        alert("Bắt đầu lắng nghe sự kiện!");
    });
};

// load lại config khi mở popup
chrome.storage.sync.get(["sol_wallet","bsc_wallet","token_notify"], d=>{
    if(d.sol_wallet) document.getElementById("solWallet").value=d.sol_wallet;
    if(d.bsc_wallet) document.getElementById("bscWallet").value=d.bsc_wallet;
    if(d.token_notify) document.getElementById("tokenNotify").value=d.token_notify;
});
