// Zone Media — API client. Talks to the FastAPI backend.
// In dev, Vite proxies /api -> http://127.0.0.1:8000 (see vite.config.js).
// In production builds the API base can be overridden via:
//   - VITE_ZONE_API env var (build time), or
//   - window.ZONE_API (runtime, set before the bundle loads).

const BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_ZONE_API) ||
  (typeof window !== "undefined" && window.ZONE_API) ||
  "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("zone_token") || "";
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    // Session expired/invalid — bounce back to login
    localStorage.removeItem("zone_token");
    localStorage.removeItem("username");
    window.location.hash = "#/";
  }
  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  register: (data) => request("/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/logout", { method: "POST" }),
  me: () => request("/me"),

  // Presence
  online: () => request("/online"),

  // Notifications
  getNotifications: () => request("/notifications"),
  markNotificationsRead: () => request("/notifications/read", { method: "POST" }),

  // Posts
  getPosts: () => request("/posts"),
  createPost: (data) => request("/posts", { method: "POST", body: JSON.stringify(data) }),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE" }),
  likePost: (id) => request(`/posts/${id}/like`, { method: "POST" }),
  addComment: (id, text) =>
    request(`/posts/${id}/comments`, { method: "POST", body: JSON.stringify({ text }) }),

  // Friends
  getFriends: () => request("/friends"),
  searchUsers: (q) => request(`/users/search?q=${encodeURIComponent(q)}`),
  suggestFriends: () => request("/users/suggest"),
  sendFriendRequest: (toUser) =>
    request("/friends/request", { method: "POST", body: JSON.stringify({ to_user: toUser }) }),
  respondFriendRequest: (fromUser, accept) =>
    request("/friends/respond", { method: "POST", body: JSON.stringify({ from_user: fromUser, accept }) }),
  removeFriend: (username) =>
    request("/friends/remove", { method: "POST", body: JSON.stringify({ to_user: username }) }),

  // Messages
  getConversations: () => request("/conversations"),
  getThread: (otherUser) => request(`/messages/${encodeURIComponent(otherUser)}`),
  sendMessage: (otherUser, text) =>
    request(`/messages/${encodeURIComponent(otherUser)}`, { method: "POST", body: JSON.stringify({ text }) }),

  // Message Requests (non-friend DMs)
  getMessageRequests: () => request("/message-requests"),
  acceptMessageRequest: (id) =>
    request(`/message-requests/${id}/accept`, { method: "POST" }),
  declineMessageRequest: (id) =>
    request(`/message-requests/${id}/decline`, { method: "POST" }),

  // Profiles
  getUser: (username) => request(`/users/${encodeURIComponent(username)}`),
  getUserPosts: (username) => request(`/users/${encodeURIComponent(username)}/posts`),
};

export default api;
