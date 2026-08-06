import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import pfp from "../assets/pfp.png";
import api from "../api";
import "./messages.css";

function Messages() {
  const { username: routeUser } = useParams();
  const username = localStorage.getItem("username") || "Guest";
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(routeUser ? decodeURIComponent(routeUser) : null);
  const [thread, setThread] = useState([]);
  const [other, setOther] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);

  async function loadConversations() {
    try {
      const data = await api.getConversations();
      setConversations(data || []);
    } finally {
      setLoading(false);
    }
  }

  async function openThread(otherUser) {
    setActiveUser(otherUser);
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeUser) return;
    let alive = true;
    api.getThread(activeUser).then((data) => {
      if (!alive) return;
      setOther(data.other);
      setThread(data.messages || []);
      loadConversations();
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
    const id = setInterval(async () => {
      const data = await api.getThread(activeUser);
      setThread(data.messages || []);
      await loadConversations();
    }, 5000);
    return () => clearInterval(id);
  }, [activeUser]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !activeUser || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(activeUser, draft.trim());
      setThread((t) => [...t, msg]);
      setDraft("");
      await loadConversations();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="messages-page">
      <div className="messages-container glass-panel">
        {/* Conversation List */}
        <aside className="conversation-list">
          <div className="conversation-head">
            <h2>Messages</h2>
            <span className="conversation-count">{conversations.length}</span>
          </div>

          {loading ? (
            <div className="conversation-empty">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="conversation-empty">
              No messages yet.
              <br />
              Find friends to start a chat.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.username}
                className={`conversation-item ${activeUser === c.username ? "active" : ""}`}
                onClick={() => openThread(c.username)}
              >
                <div className="conversation-avatar-wrap">
                  <img src={pfp} alt={c.username} className="conversation-avatar" />
                  {c.is_friend && <span className="contact-online-dot"></span>}
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
                  <img src={pfp} alt={other?.username} className="thread-head-avatar" />
                  <div>
                    <span className="thread-head-name">{other?.username}</span>
                    <span className="thread-head-bio">{other?.bio || "Zone Media user"}</span>
                  </div>
                </div>
                <Link to={`/profile/${encodeURIComponent(activeUser)}`} className="thread-view-profile">
                  View Profile
                </Link>
              </div>

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
                  onChange={(e) => setDraft(e.target.value)}
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
