// Zone Media — shared real-time WebSocket helpers.
// One socket per tab; each component registers a handler.

const handlers = new Set();

let socket = null;
let connected = false;
let username = "";

function wsBase() {
  // Allow a runtime override of the WS host (production deployment).
  if (typeof window !== "undefined" && window.ZONE_WS) return window.ZONE_WS;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}`;
}

function url() {
  return `${wsBase()}/ws/${encodeURIComponent(username)}`;
}

function open() {
  try {
    socket = new WebSocket(url());
  } catch {
    socket = null;
    return;
  }
  connected = false;
  socket.onopen = () => {
    connected = true;
  };
  socket.onclose = () => {
    connected = false;
    if (handlers.size > 0) {
      // best-effort reconnect
      setTimeout(open, 3000);
    }
  };
  socket.onmessage = (e) => {
    let data;
    try {
      data = JSON.parse(e.data);
    } catch {
      return;
    }
    handlers.forEach((fn) => fn(data));
  };
}

export function connect(user) {
  username = user || "";
  if (!username) return;
  if (socket && connected) return;
  open();
}

export function disconnect() {
  handlers.clear();
  if (socket) {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
  }
  socket = null;
  connected = false;
}

export function send(obj) {
  if (socket && connected) {
    try {
      socket.send(JSON.stringify(obj));
      return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function onRealTime(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export const isConnected = () => connected;