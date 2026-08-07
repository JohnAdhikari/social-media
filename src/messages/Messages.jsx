import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import pfp from "../assets/pfp.png";
import api from "../api";
import { connect as connectRealtime, onRealTime, send } from "../realtime";
import usePresence from "../hooks/usePresence";
import "./messages.css";

function Messages() {
  const { username: routeUser } = useParams();
  const username = localStorage.getItem("username") || "Guest";
  const [friends, setFriends] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [msgRequests, setMsgRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeUser, setActiveUser] = useState(routeUser ? decodeURIComponent(routeUser) : null);
  const [thread, setThread] = useState([]);
  const [other, setOther] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");
  const threadEndRef = useRef(null);
  const typingTimer = useRef(null);
  const { isOnline } = usePresence();

  async function loadAll() {
    try {
      const [convData, reqData] = await Promise.all([
        api.getConversations(),
        api.getMessageRequests(),
      ]);
      setConversations(convData || []);
      setMsgRequests(reqData.requests || []);
      // Also load friends for the sidebar
      try {
        const fData = await api.getFriends();
        setFriends(fData.friends || []);
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(q) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setActiveTab("chats");
      return;
    }
    setActiveTab("search");
    try {
      const results = await api.searchUsers(q.trim());
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    }
  }

  function openThread(otherUser) {
    setActiveUser(otherUser);
    setSearchQuery("");
    setSearchResults([]);
    setActiveTab("chats");
  }

  async function handleAcceptRequest(requestId, fromUser) {
    try {
      await api.acceptMessageRequest(requestId);
      await loadAll();
      openThread(fromUser);
    } catch { /* ignore */ }
  }

  async function handleDeclineRequest(requestId) {
    try {
      await api.declineMessageRequest(requestId);
      await loadAll();
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadAll();
    connectRealtime(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeUser) return;
    let alive = true;
    api.getThread(activeUser).then((data) => {
      if (!alive) return;
      setOther(data.other);
      setThread(data.messages || []);
      loadAll();
    });
    return () => {
      alive = false;
    };
  }, [activeUser]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  useEffect(() => {
    if (!activeUser) return;
    const off = onRealTime((data) => {
      if (data.type === "message") {
        const m = data.message;
        if (m.from_user === activeUser) {
          setThread((t) => (t.some((x) => x.id === m.id) ? t : [...t, m]));
        }
        loadAll();
      } else if (data.type === "typing" && data.from === activeUser) {
        setTyping(Boolean(data.typing));
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 3000);
      } else if (data.type === "read" && data.from === activeUser) {
        setThread((t) => t.map((m) => (m.from_user === username ? { ...m, read: true } : m)));
      }
    });
    return () => {
      off();
      clearTimeout(typingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser]);

  function notifyTyping(active) {
    if (!activeUser) return;
    send({ type: "typing", to: activeUser, active });
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !activeUser || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(activeUser, draft.trim());
      setThread((t) => [...t, msg]);
      setDraft("");
      notifyTyping(false);
      await loadAll();
    } finally {
      setSending(false);
    }
  }

  function friendStatus(username) {
    return friends.some((f) => f.username === username);
  }

  return (
    <div className="messages-page">
      <div className="messages-container glass-panel">
        {/* Sidebar */}
        <aside className="conversation-list">
          <div className="conversation-head">
            <div className="conversation-head-top">
              <Link to="/homepage" className="messages-back-btn" aria-label="Back to homepage">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </Link>
              <h2>Messages</h2>
            </div>
            <div className="conversation-tabs">
              <button
                className={`conv-tab ${activeTab === "chats" ? "active" : ""}`}
                onClick={() => { setActiveTab("chats"); setSearchQuery(""); setSearchResults([]); }}
              >
                Chats
              </button>
              <button
                className={`conv-tab ${activeTab === "requests" ? "active" : ""}`}
                onClick={() => setActiveTab("requests")}
              >
                Requests
                {msgRequests.length > 0 && <span className="conv-tab-badge">{msgRequests.length}</span>}
              </button>
            </div>
          </div>

          <div className="conversation-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => runSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="conversation-empty">Loading...</div>
          ) : (
            <>
              {/* Search Results */}
              {activeTab === "search" && searchResults.length > 0 && (
                <div className="conv-section">
                  <div className="conv-section-title">Search Results</div>
                  {searchResults.map((u) => (
                    <button key={u.username} className="conversation-item" onClick={() => openThread(u.username)}>
                      <div className="conversation-avatar-wrap">
                        <img src={u.avatar || pfp} alt={u.username} className="conversation-avatar" />
                        {isOnline(u.username) ? <span className="contact-online-dot"></span> : <span className="contact-offline-dot"></span>}
                      </div>
                      <div className="conversation-info">
                        <div className="conversation-name-row">
                          <span className="conversation-name">{u.username}</span>
                          {!friendStatus(u.username) && <span className="conv-label-badge">Not friend</span>}
                        </div>
                        <span className="conversation-last">{u.bio || "Zone Media user"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === "search" && searchResults.length === 0 && searchQuery && (
                <div className="conversation-empty">No users found.</div>
              )}

              {/* Message Requests */}
              {activeTab === "requests" && (
                <div className="conv-section">
                  {msgRequests.length === 0 ? (
                    <div className="conversation-empty">No pending message requests.</div>
                  ) : (
                    msgRequests.map((req) => (
                      <div key={req.from_user} className="msg-request-item">
                        <div className="msg-request-header">
                          <div className="conversation-avatar-wrap">
                            <img src={req.avatar || pfp} alt={req.from_user} className="conversation-avatar" />
                          </div>
                          <div className="conversation-info">
                            <span className="conversation-name">{req.from_user}</span>
                            <span className="conversation-last">{req.messages[req.messages.length - 1]?.text}</span>
                          </div>
                        </div>
                        <div className="msg-request-actions">
                          <button className="msg-req-btn accept" onClick={() => handleAcceptRequest(req.messages[0].id, req.from_user)}>
                            Accept
                          </button>
                          <button className="msg-req-btn decline" onClick={() => handleDeclineRequest(req.messages[0].id)}>
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Conversations / Chats */}
              {activeTab === "chats" && (
                <div className="conv-section">
                  {conversations.length === 0 && msgRequests.length === 0 ? (
                    <div className="conversation-empty">
                      No messages yet.
                      <br />
                      <span className="conversation-empty-hint">Search for users above to start a chat.</span>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="conversation-empty">
                      No active conversations yet.
                      <br />
                      <span className="conversation-empty-hint">Accept a message request or search to start chatting.</span>
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <button
                        key={c.username}
                        className={`conversation-item ${activeUser === c.username ? "active" : ""}`}
                        onClick={() => openThread(c.username)}
                      >
                        <div className="conversation-avatar-wrap">
                          <img src={c.avatar || pfp} alt={c.username} className="conversation-avatar" />
                          {isOnline(c.username) ? <span className="contact-online-dot"></span> : <span className="contact-offline-dot"></span>}
                        </div>
                        <div className="conversation-info">
                          <div className="conversation-name-row">
                            <span className="conversation-name">{c.username}</span>
                            {c.unread > 0 && <span className="conversation-unread">{c.unread}</span>}
                          </div>
                          <span className="conversation-last">{c.last_message}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </aside>

        {/* Thread */}
        <main className="thread-pane">
          {!activeUser ? (
            <div className="thread-empty">
              <div className="thread-empty-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h3>Select a conversation</h3>
              <p>Chat with your friends and keep in touch.</p>
            </div>
          ) : (
            <>
              <div className="thread-head">
                <div className="thread-head-user">
                  <img src={other?.avatar || pfp} alt={other?.username} className="thread-head-avatar" />
                  <div>
                    <span className="thread-head-name">{other?.username}</span>
                    <span className={`thread-head-bio ${typing ? "typing" : ""}`}>
                      {typing ? "typing..." : isOnline(activeUser) ? "Online" : other?.bio || "Zone Media user"}
                    </span>
                  </div>
                </div>
                <Link to={`/profile/${encodeURIComponent(activeUser)}`} className="thread-view-profile">
                  View Profile
                </Link>
              </div>

              {!friendStatus(activeUser) && (
                <div className="thread-request-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>This is a message request. Messages will be delivered after they accept.</span>
                </div>
              )}

              <div className="thread-body">
                {thread.length === 0 ? (
                  <div className="thread-empty small">
                    <p>Say hello to {activeUser}!</p>
                  </div>
                ) : (
                  thread.map((m) => (
                    <div key={m.id} className={`message-bubble ${m.from_user === username ? "mine" : ""}`}>
                      <span className="message-text">{m.text}</span>
                      <span className="message-time">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {m.from_user === username && (
                        <span className={`message-read-tick ${m.read ? "read" : ""}`} title={m.read ? "Read" : "Sent"}>
                          {m.read ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  ))
                )}
                <div ref={threadEndRef} />
              </div>

              <form className="thread-composer" onSubmit={handleSend}>
                <input
                  type="text"
                  className="thread-input"
                  placeholder={`Message ${activeUser}...`}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    notifyTyping(true);
                  }}
                />
                <button type="submit" className="thread-send btn-primary" disabled={!draft.trim() || sending}>
                  Send
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Messages;
