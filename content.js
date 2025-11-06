// Log
function log(...args) {
  console.log("[Sol79 Injector]", ...args);
}

// Thực hiện việc copy và mở trang browser
async function copyAndOpenBrowser(copyButton) {
  try {
    log("Bắt đầu copy...");
    copyButton.click();

    // Chờ clipboard cập nhật
    await new Promise(r => setTimeout(r, 200));

    // Lấy clipboard
    const address = await navigator.clipboard.readText();
    log("Clipboard:", address);

    if (address) {
      if (address.startsWith("0x")) {
        const url = `https://bscscan.com/address/${address}`;
        log("Mở link:", url);
        window.open(url, "_blank");
      } else {
        const url = `https://gmgn.ai/sol/address/${address}`;
        log("Mở link:", url);
        window.open(url, "_blank");
      }
    } else {
      alert("❌ Không lấy được địa chỉ hợp lệ từ clipboard!");
    }
  } catch (err) {
    console.error("Lỗi khi xử lý copy/open:", err);
    alert("❌ Không thể đọc clipboard hoặc bấm copy thất bại!");
  }
}

// Chèn nút bscscan
function injectBscButton() {
  const containers = document.querySelectorAll("div.flex.items-center.gap-1");
  log("Tìm thấy container:", containers.length);

  containers.forEach(container => {
    const paragraphs = container.querySelectorAll("p");
    const copyBtn = container.querySelector("button");

    // Kiểm tra kỹ selector
    if (paragraphs.length === 2 && copyBtn && !container.querySelector(".bscscan-btn")) {
      const newBtn = document.createElement("button");
      newBtn.innerText = "🔗 BscScan";
      newBtn.className = "bscscan-btn";
      newBtn.style.marginLeft = "6px";
      newBtn.style.background = "#1f6feb";
      newBtn.style.color = "#fff";
      newBtn.style.border = "none";
      newBtn.style.borderRadius = "6px";
      newBtn.style.padding = "2px 6px";
      newBtn.style.fontSize = "12px";
      newBtn.style.cursor = "pointer";

      newBtn.addEventListener("click", e => {
        e.stopPropagation();
        copyAndOpenBrowser(copyBtn);
      });
    
      // Chèn nút BscScan
      copyBtn.insertAdjacentElement("afterend", newBtn);
      log("✅ Đã chèn nút BscScan");
    }
  });
}

// Chờ trang tải hoàn toàn
function initInjector() {
  log("Khởi động injector...");
  injectBscButton();

  // Quan sát nếu DOM thay đổi (SPA, AJAX, v.v.)
  const observer = new MutationObserver(() => injectBscButton());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInjector);
} else {
  initInjector();
}
