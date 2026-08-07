import { useEffect, useState } from "react";
import "./aboutme.css";
import pfp from "../../assets/pfp.png";
import logo from "../../assets/logo.png";
import api from "../../api";

function AboutMe() {
  const username = localStorage.getItem("username") || "John Adhikari";
  const [stats, setStats] = useState({ post_count: 0, friend_count: 0, request_count: 0 });
  const [bio, setBio] = useState(() => {
    const stored = localStorage.getItem("zone_user_bio") || "";
    return stored === "Full-stack developer & AI enthusiast building future web apps."
      ? ""
      : stored;
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadStats() {
      try {
        const data = await api.getFriends();
        if (alive) setStats(data.stats || { post_count: 0, friend_count: 0, request_count: 0 });
      } catch {
        /* backend may be offline */
      }
    }
    loadStats();
    const id = setInterval(loadStats, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  function handleSaveBio() {
    localStorage.setItem("zone_user_bio", bio);
    setIsEditing(false);
  }

  return (
    <div className="aboutme-card glass-panel">
      {/* Cover Header Banner */}
      <div className="profile-cover"></div>

      <div className="profile-content">
        <div className="profile-avatar-row">
          <div className="avatar-wrapper">
            <img src={pfp} className="profile-avatar" alt="Avatar" />
            <span className="online-indicator"></span>
          </div>
          <button
            className="edit-profile-btn"
            onClick={() => isEditing ? handleSaveBio() : setIsEditing(true)}
          >
            {isEditing ? "Save" : "Edit Bio"}
          </button>
        </div>

        <div className="profile-meta">
          <h3 className="profile-username">{username}</h3>
          <span className="profile-handle">@{username.toLowerCase().replace(/\s+/g, '')}</span>
        </div>

        {/* Bio Section */}
        <div className="profile-bio-box">
          {isEditing ? (
            <textarea
              className="bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="3"
              placeholder="Your Bio"
            />
          ) : (
            <p className="profile-bio-text">{bio || "Your Bio"}</p>
          )}
        </div>

        {/* Stats Row */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.post_count}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">{stats.friend_count}</span>
            <span className="stat-label">Friends</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">{stats.request_count}</span>
            <span className="stat-label">Requests</span>
          </div>
        </div>

        {/* Zone AI Link */}
        <a
          href="https://johnadhikari.github.io/chat-bot/"
          target="_blank"
          rel="noopener noreferrer"
          className="zone-ai-card"
        >
          <div className="ai-icon-bg">
            <img src={logo} className="ai-img" alt="Zone AI" />
          </div>
          <div className="ai-card-text">
            <span className="ai-title">Zone AI Assistant</span>
            <span className="ai-sub">Chat with smart agent &rarr;</span>
          </div>
        </a>
      </div>
    </div>
  );
}

export default AboutMe;
