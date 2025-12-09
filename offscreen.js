chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "play_sound") {
        const audio = new Audio(msg.url);
        audio.play();
    }
});
