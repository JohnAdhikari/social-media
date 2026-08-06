// Zone Media — API client. Talks to the FastAPI backend.
// In dev, Vite proxies /api -> http://127.0.0.1:8000 (see vite.config.js).
// In production builds the API base can be overridden via window.ZONE_API.

const BASE =
  typeof window !== "undefined" && window.ZONE_API
    ? window.ZONE_API
    : "/api";

async function request(path, options = {}) {
  const username = localStorage.getItem("username") || "";
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (username) headers.author = username;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
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

  // Profiles
  getUser: (username) => request(`/users/${encodeURIComponent(username)}`),
  getUserPosts: (username) => request(`/users/${encodeURIComponent(username)}/posts`),
};

export default api;
