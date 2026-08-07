import { useEffect, useRef, useState } from "react";
import "./contact.css";
import pfp from "../../assets/pfp.png";
import api from "../../api";
import useGsapReveal from "../../hooks/useGsapReveal";
import usePresence from "../../hooks/usePresence";

const TRENDS = [
  { tag: "#AIagents", posts: "14.2k posts" },
  { tag: "#React19", posts: "8.9k posts" },
  { tag: "#Glassmorphism", posts: "5.1k posts" },
  { tag: "#FastAPI", posts: "3.4k posts" },
];

function Contact() {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  useGsapReveal(rootRef, { y: 24, stagger: 0.06 });
  const { isOnline } = usePresence();

  async function load() {
    try {
      const data = await api.getFriends();
      setFriends(data.friends || []);
      setIncoming(data.pending_incoming || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadSuggestions() {
    try {
      const list = await api.suggestFriends();
      setSuggestions(list || []);
    } catch {
      /* ignore */
    }
  }

  async function runSearch(q) {
    setQuery(q);
    if (!q.trim()) {
      setDiscover([]);
      return;
    }
    try {
      const results = await api.searchUsers(q.trim());
      setDiscover(results);
    } catch {
      setDiscover([]);
    }
  }

  useEffect(() => {
    load();
    loadSuggestions();
  }, []);

  async function handleAdd(username) {
    setBusy(true);
    try {
      await api.sendFriendRequest(username);
      await runSearch(query);
      await loadSuggestions();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(fromUser, accept) {
    setBusy(true);
    try {
      await api.respondFriendRequest(fromUser, accept);
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(username) {
    setBusy(true);
    try {
      await api.removeFriend(username);
      await load();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  function friendStatus(username) {
    if (friends.some((f) => f.username === username)) return "friends";
    if (discover.some((u) => u.username === username && u.status === "outgoing")) return "outgoing";
    if (discover.some((u) => u.username === username && u.status === "incoming")) return "incoming";
    return "none";
  }

  return (
    <aside className="contact-sidebar-container" ref={rootRef}>
      {/* Friends Card */}
      <div className="contact-card glass-panel">
        <div className="contact-header">
          <h3>Friends</h3>
          <span className="pulse-dot"></span>
        </div>

        {loading ? (
          <div className="contact-empty">Loading friends...</div>
        ) : friends.length === 0 ? (
          <div className="contact-empty">No friends yet — find someone to connect with!</div>
        ) : (
          <div className="contact-list">
            {friends.map((f) => (
              <div key={f.username} className="contact-item">
                <div className="contact-avatar-wrapper">
                  <img src={f.avatar || pfp} alt={f.username} className="contact-avatar" />
                  {isOnline(f.username) ? <span className="contact-online-dot"></span> : <span className="contact-offline-dot"></span>}
                </div>
                <div className="contact-info">
                  <span className="contact-name">{f.username}</span>
                  <span className="contact-status">{f.post_count} post{f.post_count === 1 ? "" : "s"}</span>
                </div>
                <button
                  className="follow-btn following"
                  onClick={() => handleRemove(f.username)}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friend Requests Card */}
      {incoming.length > 0 && (
        <div className="contact-card glass-panel">
          <div className="contact-header">
            <h3>Friend Requests</h3>
            <span className="badge badge-gradient">{incoming.length}</span>
          </div>
          <div className="contact-list">
            {incoming.map((name) => (
              <div key={name} className="contact-item">
                <div className="contact-avatar-wrapper">
                  <img src={pfp} alt={name} className="contact-avatar" />
                </div>
                <div className="contact-info">
                  <span className="contact-name">{name}</span>
                  <span className="contact-status">wants to be your friend</span>
                </div>
                <div className="request-actions">
                  <button className="follow-btn accept-btn" onClick={() => handleRespond(name, true)} disabled={busy}>
                    Accept
                  </button>
                  <button className="follow-btn decline-btn" onClick={() => handleRespond(name, false)} disabled={busy}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discover Users Card */}
      <div className="contact-card glass-panel">
        <div className="contact-header">
          <h3>Find Friends</h3>
        </div>
        <div className="discover-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="discover-input"
            placeholder="Search users..."
            value={query}
            onChange={(e) => runSearch(e.target.value)}
          />
        </div>

        {discover.length > 0 && (
          <div className="contact-list">
            {discover.slice(0, 6).map((u) => (
              <div key={u.username} className="contact-item">
                <div className="contact-avatar-wrapper">
                  <img src={u.avatar || pfp} alt={u.username} className="contact-avatar" />
                </div>
                <div className="contact-info">
                  <span className="contact-name">{u.username}</span>
                  <span className="contact-status">{u.bio}</span>
                </div>
                {friendStatus(u.username) === "friends" ? (
                  <span className="friend-label">Friends</span>
                ) : friendStatus(u.username) === "outgoing" ? (
                  <span className="sort-link">Pending</span>
                ) : friendStatus(u.username) === "incoming" ? (
                  <button className="follow-btn" onClick={() => handleRespond(u.username, true)} disabled={busy}>
                    Accept
                  </button>
                ) : (
                  <button className="follow-btn" onClick={() => handleAdd(u.username)} disabled={busy}>
                    Add Friend
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Friends Widget */}
      {suggestions.length > 0 && (
        <div className="contact-card glass-panel">
          <div className="contact-header">
            <h3>Suggested for you</h3>
          </div>
          <div className="contact-list">
            {suggestions.map((u) => (
              <div key={u.username} className="contact-item">
                <div className="contact-avatar-wrapper">
                  <img src={u.avatar || pfp} alt={u.username} className="contact-avatar" />
                </div>
                <div className="contact-info">
                  <span className="contact-name">{u.username}</span>
                  <span className="contact-status">{u.post_count} post{u.post_count === 1 ? "" : "s"}</span>
                </div>
                <button className="follow-btn" onClick={() => handleAdd(u.username)} disabled={busy}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Topics Widget */}
      <div className="trends-card glass-panel">
        <div className="trends-header">
          <h3>Trending Topics</h3>
          <span className="badge badge-gradient">Hot</span>
        </div>

        <div className="trends-list">
          {TRENDS.map((trend, idx) => (
            <div key={idx} className="trend-item">
              <div className="trend-details">
                <span className="trend-tag">{trend.tag}</span>
                <span className="trend-count">{trend.posts}</span>
              </div>
              <span className="trend-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2c1 3-2 4-2 7a2 2 0 0 0 4 0c1 2 2 3 2 5a6 6 0 0 1-12 0c0-4 3-6 4-9 1 2 3 2 4-3z"></path>
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Contact;