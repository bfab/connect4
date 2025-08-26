/**
 * Initialize networking via PeerJS
 * @param {function(Object):void} onData - callback when remote data received
 * @returns {Promise<{send: Function, isHost: boolean, ready: Promise}>}
 */
export async function initNetwork(onData) {
  const params = new URLSearchParams(location.search);
  const peerIdParam = params.get("peer");
  const isHost = !peerIdParam;

  // Create a PeerJS instance (random ID if host)
  const peer = new Peer({
	config: {'iceServers': [
	  { url: 'stun:stun.l.google.com:19302' },
	  { url: 'turn:homeo@turn.bistri.com:80', credential: 'homeo' }
	]} /* Sample servers, please use appropriate ones */
  });

  let conn;
  let readyResolve;
  const ready = new Promise((res) => (readyResolve = res));

  // Exposed send method
  const send = (data) => {
    if (conn && conn.open) {
      conn.send(JSON.stringify(data));
    }
  };

  if (isHost) {
    // Host: generate ID and show it
    peer.on("open", (id) => {
      const infoDiv = document.getElementById("info");
      const url = `${location.origin}${location.pathname}?peer=${id}`;
      infoDiv.innerHTML = `Share this link with your opponent:<br>
        <input type="text" id="linkBox" value="${url}" readonly>
        <button id="copyBtn">Copy</button>`;

      document.getElementById("copyBtn").onclick = () => {
        const input = document.getElementById("linkBox");
        input.select();
        document.execCommand("copy");
        alert("Link copied! Share it with your opponent.");
      };
    });

    // Accept incoming connection
    peer.on("connection", (c) => {
      conn = c;
      setupConnection(conn, onData, readyResolve);
    });
  } else {
    // Guest: connect to host
    peer.on("open", () => {
      conn = peer.connect(peerIdParam);
      setupConnection(conn, onData, readyResolve);
    });
  }

  return { send, isHost, ready };
}

/** Setup data handlers */
function setupConnection(conn, onData, readyResolve) {
  conn.on("open", () => {
    console.log("PeerJS connected");
    readyResolve();
  });

  conn.on("data", (d) => {
    try {
      const msg = JSON.parse(d);
      onData(msg);
    } catch (err) {
      console.error("Invalid PeerJS data", err);
    }
  });
}
