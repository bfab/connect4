// import SimplePeer from "https://esm.sh/simple-peer@9.11.1";
// import LZString from "https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js";
// import LZString from "https://esm.sh/lz-string@1.4.4";

/**
 * Initialize networking via SimplePeer
 * @param {function(Object):void} onData - callback when remote data received
 * @returns {Promise<{send: Function, isHost: boolean, ready: Promise}>}
 */
export async function initNetwork(onData) {
  const params = new URLSearchParams(location.search);
  const offerParam = params.get("offer");
  const isHost = !offerParam;

  const peer = new SimplePeer({ initiator: isHost, trickle: false });

  // Exposed methods
  const send = (data) => {
    if (peer.connected) {
      peer.send(JSON.stringify(data));
    }
  };

  // Ready promise (resolves when connected)
  let readyResolve;
  const ready = new Promise((res) => (readyResolve = res));

  peer.on("connect", () => {
    console.log("P2P connected");
    readyResolve();
  });

  peer.on("data", (d) => {
    try {
      const msg = JSON.parse(d);
      onData(msg);
    } catch (err) {
      console.error("Invalid data", err);
    }
  });

  // --- Signaling UX (manual, same as your app) ---
  peer.on("signal", async (data) => {
    if (isHost) {
      // Compress and build offer link
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
      const longURL = location.origin + location.pathname + "?offer=" + compressed;
      const shortURL = await shortenURL(longURL);

      const infoDiv = document.getElementById("info");
      infoDiv.innerHTML = `Share this link:<br>
        <input type="text" id="shortLink" value="${shortURL}" readonly>
        <button id="copyBtn">Copy</button>`;

      document.getElementById("copyBtn").onclick = () => {
        const input = document.getElementById("shortLink");
        input.select();
        document.execCommand("copy");
        alert("Link copied! Now wait for opponent's answer.");

        // Ask host to paste the answer
        const answer = prompt("Paste the ANSWER from the second player here:");
        if (answer) {
          const decompressed = JSON.parse(LZString.decompressFromEncodedURIComponent(answer));
          peer.signal(decompressed);
        }
      };
    } else {
      // Second player generates compressed answer
      const compressedAnswer = LZString.compressToEncodedURIComponent(JSON.stringify(data));
      prompt("Send this ANSWER back to the first player:\n\n", compressedAnswer);
    }
  });

  // If this is the second player, apply host's offer
  if (!isHost && offerParam) {
    const offerData = JSON.parse(LZString.decompressFromEncodedURIComponent(offerParam));
    peer.signal(offerData);
  }

  return { send, isHost, ready };
}

// Helper: shorten URL using TinyURL
async function shortenURL(longURL) {
  const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longURL)}`);
  return await res.text();
}
