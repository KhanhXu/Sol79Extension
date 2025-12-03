// ============================
//       CONSTANTS
// ============================
const BSC_URL = "https://bscscan.com/address/";
const GMGN_URL = "https://gmgn.ai/sol/address/";
const GMGN_TOKEN_URL = "https://gmgn.ai/sol/token/";
const GMGN = "GMGN";

// Log
function log(...args) {
  console.log("[Sol79 Injector]", ...args);
}

// Kiểm tra Mevx
function isMevxSite() {
  return location.hostname === "mevx.io";
}

// Kiểm tra Solscan
function isSolscanSite() {
  return location.hostname === "solscan.io";
}

// ============================
//       Inject SolScan
// ============================
function injectSolScanHeader() {
  log("Đang chạy injectSolScanHeader() trên solscan.io ...");

  // ====== Tìm block TIP ======
  const tipBlock = document.querySelector('div.inline-flex[aria-haspopup="dialog"]');
  if (!tipBlock) return;

  // Đã có nút → bỏ qua
  if (tipBlock.parentElement.querySelector(".gmgn-btn")) return;

  // ====== Tạo nút GMGN ======
  // Tạo nút GMGN
  const btn = document.createElement("button");
  btn.className = "gmgn-btn";
  btn.innerText = GMGN;
  btn.style.marginLeft = "6px";
  btn.style.padding = "2px 6px";
  btn.style.fontSize = "12px";
  btn.style.cursor = "pointer";
  btn.style.borderRadius = "12px";
  btn.style.background = "linear-gradient(135deg, #f570f7ff, #3e99f4ff, #7fe07fff)";
  btn.style.color = "#fff";
  btn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
  btn.style.transition = "transform 0.1s ease";

  btn.addEventListener("click", async e => {
    e.stopPropagation();

    // Lấy address từ URL: https://solscan.io/account/<addr>
    const match = location.pathname.match(/\/account\/([A-Za-z0-9]+)/);
    if (!match) {
      alert("Không tìm thấy địa chỉ ví!");
      return;
    }

    const address = match[1];
    openBrowser(GMGN_URL + address);
  });

  // ====== Chèn vào sau Tip block ======
  tipBlock.insertAdjacentElement("afterend", btn);

  log("✅ Đã chèn nút GMGN vào Solscan");
}

function injectListviewSolscan() {
  log("Đang chạy injectListviewSolscan() trên solscan.io ...");
  const observer = new MutationObserver(() => {
    // Chọn tất cả span ngoài cùng có class whitespace-nowrap hoặc w-auto max-w-full whitespace-nowrap
    const spans = document.querySelectorAll(
      'span.whitespace-nowrap, span.w-auto.max-w-full.whitespace-nowrap'
    );

    spans.forEach(span => {
      // -------- Lọc span.whitespace-nowrap ----------
      if (span.classList.contains("whitespace-nowrap") &&
          span.querySelector('div.w-full.aspect-square.relative.flex.items-center.justify-center.flex-col')) {

        // Đây lọc trong phần cột to from của listview
        const copyDiv = span.querySelector('span.inline-flex.items-center.ml-1 div.inline-flex.align-middle[data-state]');
        const linkDiv = span.querySelector('div.inline[data-state="closed"]');
        if (!copyDiv || !linkDiv) return;

        // Tránh chèn trùng
        if (copyDiv.nextElementSibling?.classList?.contains("gmgn-btn")) return;

        const link = linkDiv.querySelector('a[href^="/token/"]');
        if (!link) return;

        // Tạo nút GMGN
        const btn = document.createElement("button");
        btn.className = "gmgn-btn";
        btn.innerText = GMGN;
        btn.style.marginLeft = "2px";
        btn.style.padding = "2px 6px";
        btn.style.fontSize = "10px";
        btn.style.cursor = "pointer";
        btn.style.borderRadius = "12px";
        btn.style.background = "linear-gradient(135deg, #f570f7ff, #3e99f4ff, #7fe07fff)";
        btn.style.color = "#fff";
        btn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        btn.style.transition = "transform 0.1s ease";

        // Optional: hover effect
        // btn.addEventListener("mouseenter", () => btn.style.transform = "scale(1.05)");
        // btn.addEventListener("mouseleave", () => btn.style.transform = "scale(1)");

        btn.addEventListener("click", async e => {
          e.stopPropagation();
          copyDiv.click(); // bấm div copy
          await new Promise(r => setTimeout(r, 50));
          const token = link.getAttribute("href").split("/").pop();
          openBrowser(GMGN_TOKEN_URL + token);
        });

        copyDiv.insertAdjacentElement("afterend", btn);
        return; // bỏ qua xử lý loại khác
      } else if (span.classList.contains("w-auto") && span.classList.contains("max-w-full") && span.classList.contains("whitespace-nowrap")) {
        // -------- Loại full--------
        // Loại có div.inline[data-state="closed"] nhưng **không có icon token**
        // const delayedDiv = span.querySelector('div.inline[data-state="closed"]');
        // const iconTokenRemove = span.querySelector('span.inline-flex.items-center.align-middle.mr-1, span.inline-flex.items-center.align-middle.cursor-pointer');

        // Bỏ qua span có iconToken Loại đi
        const delayedDiv = span.querySelector('div.inline[data-state="closed"]');
        // nếu không có delayedDiv thì bỏ (theo logic cũ của bạn)
        if (!delayedDiv) return;

        // tìm ảnh (nếu có) trong span
        const iconImg = span.querySelector('img[src]');

        // nếu có ảnh và ảnh không phải token_creator_icon.svg => bỏ qua
        if (iconImg && !iconImg.src.includes('token_creator_icon.svg')) return;

        // Ngược lại (icon là token_creator_icon.svg hoặc không có icon) → tiếp tục xử lý

        const iconToken = span.querySelector('span.inline-flex.items-center.align-middle');
        const linkDiv = span.querySelector('div.inline[data-state="closed"]');
        const copyDiv = span.querySelector('span.inline-flex.items-center.ml-1 div.inline-flex.align-middle[data-state="closed"]');

        if (!iconToken || !linkDiv || !copyDiv) return; // bỏ qua span không đúng kiểu
        if (copyDiv.nextElementSibling?.classList?.contains("gmgn-btn")) return;

        const link = linkDiv.querySelector('a[href^="/account/"], a[href^="/token/"]');
        if (!link) return;

        // Tạo nút GMGN cho các span khác
        const btn = document.createElement("button");
        btn.className = "gmgn-btn";
        btn.innerText = GMGN;
        btn.style.marginLeft = "2px";
        btn.style.padding = "2px 6px";
        btn.style.fontSize = "10px";
        btn.style.cursor = "pointer";
        btn.style.borderRadius = "12px";
        btn.style.background = "linear-gradient(135deg, #f570f7ff, #3e99f4ff, #7fe07fff)";
        btn.style.color = "#fff";
        btn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        btn.style.transition = "transform 0.1s ease";

        btn.addEventListener("click", async e => {
          e.stopPropagation();
          copyDiv.click();
          await new Promise(r => setTimeout(r, 50));
          const addr = link.getAttribute("href").split("/").pop();
          openBrowser(GMGN_URL + addr);
        });

        copyDiv.insertAdjacentElement("afterend", btn);
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ============================
//       Inject Mevx
// ============================
function injectMevx() {
  if (!isMevxSite()) return;

  const containers = document.querySelectorAll("div.flex.items-center.gap-1");
  log("Tìm thấy container:", containers.length);

  containers.forEach(container => {
    const paragraphs = container.querySelectorAll("p");
    const copyBtn = container.querySelector("button");

    if (paragraphs.length === 2 && copyBtn && !container.querySelector(".gmgn-btn")) {
      const newBtn = document.createElement("button");
      newBtn.innerText = GMGN;
      newBtn.className = "gmgn-btn";
      newBtn.style.marginLeft = "6px";
      newBtn.style.background = "#1f6feb";
      newBtn.style.color = "#fff";
      newBtn.style.border = "none";
      newBtn.style.borderRadius = "12px";
      newBtn.style.padding = "2px 6px";
      newBtn.style.fontSize = "12px";
      newBtn.style.cursor = "pointer";

      newBtn.addEventListener("click", e => {
        e.stopPropagation();
        copyAndOpenBrowser(copyBtn);
      });

      copyBtn.insertAdjacentElement("afterend", newBtn);
      log("✅ Đã chèn nút GMGN");
    }
  });
}

// ============================
//   copy & open Browser
// ============================
async function copyAndOpenBrowser(copyButton) {
  try {
    log("Bắt đầu copy...");
    copyButton.click();

    await new Promise(r => setTimeout(r, 50));
    const address = await navigator.clipboard.readText();
    log("Clipboard:", address);

    if (!address) {
      alert("❌ Không lấy được địa chỉ hợp lệ!");
      return;
    }

    // ETH / BNB → BSCScan
    if (address.startsWith("0x")) {
      openBrowser(BSC_URL + address);
    } else {
      // SOL → GMGN
      openBrowser(GMGN_URL + address);
    }

  } catch (err) {
    console.error("Lỗi:", err);
    alert("❌ Không thể đọc clipboard!");
  }
}

// ============================
//   Utils
// ============================
function openBrowser(url) {
  try {
    if (url) {
      window.open(url, "_blank");
    }
  } catch (err) {
    console.error("Lỗi:", err);
    alert("❌ Không thể mở tab!");
  }
}

// ============================
//       INIT INJECTOR
// ============================
function initInjector() {
  if (isMevxSite()) {
    log("🌐 Trang mevx.io detected → chạy injectMevx()");
    injectMevx();

    const observer = new MutationObserver(() => injectMevx());
    observer.observe(document.body, { childList: true, subtree: true });
    return;
  }

  if (isSolscanSite()) {
    log("🌐 Trang solscan.io detected → chạy injectSolScan()");
    injectSolScanHeader();
    injectListviewSolscan();
  
    const observer = new MutationObserver(() => injectSolScanHeader());
    observer.observe(document.body, { childList: true, subtree: true });
    return;
  }

  log("⛔ Không phải mevx.io hoặc solscan.io — Injector không chạy");
}

// Run
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInjector);
} else {
  initInjector();
}
