import { useState } from "react";
import "./contact.css";
import pfp from "../../assets/pfp.png";

const CONTACTS = [
  { id: 1, name: "Sarah Chen", role: "AI Researcher", online: true, status: "Working on LLMs 🤖" },
  { id: 2, name: "David Kim", role: "UI Designer", online: true, status: "Designing glass UI ✨" },
  { id: 3, name: "Marcus Vance", role: "Backend Lead", online: false, status: "Offline" },
  { id: 4, name: "Elena Rostova", role: "Product Manager", online: true, status: "Planning v2.0 🚀" },
];

const TRENDS = [
  { tag: "#AIagents", posts: "14.2k posts" },
  { tag: "#React19", posts: "8.9k posts" },
  { tag: "#Glassmorphism", posts: "5.1k posts" },
  { tag: "#FastAPI", posts: "3.4k posts" },
];

function Contact() {
  const [activeTab, setActiveTab] = useState("online");
  const [following, setFollowing] = useState({});

  function toggleFollow(id) {
    setFollowing((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside className="contact-sidebar-container">
      {/* Active Contacts Widget */}
      <div className="contact-card glass-panel">
        <div className="contact-header">
          <h3>Active Friends</h3>
          <span className="pulse-dot"></span>
        </div>

        <div className="contact-list">
          {CONTACTS.map((contact) => (
            <div key={contact.id} className="contact-item">
              <div className="contact-avatar-wrapper">
                <img src={pfp} alt={contact.name} className="contact-avatar" />
                {contact.online && <span className="contact-online-dot"></span>}
              </div>
              <div className="contact-info">
                <span className="contact-name">{contact.name}</span>
                <span className="contact-status">{contact.status}</span>
              </div>
              <button
                className={`follow-btn ${following[contact.id] ? "following" : ""}`}
                onClick={() => toggleFollow(contact.id)}
              >
                {following[contact.id] ? "Following" : "+ Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>

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
              <span className="trend-icon">🔥</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Contact;