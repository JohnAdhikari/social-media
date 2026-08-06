// Zone Media — runtime configuration.
// Edit these to point the built site at the deployed backend.
//   ZONE_API: base URL for REST endpoints (no trailing slash)
//   ZONE_WS:  base URL for WebSockets (scheme + host, no trailing slash)
// When empty, the app falls back to same-origin (/api and ws(s)://host),
// which works in local dev via the Vite proxy.

window.ZONE_API = "";
window.ZONE_WS = "";