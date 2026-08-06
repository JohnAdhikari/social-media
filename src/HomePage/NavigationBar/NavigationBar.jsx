import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../../assets/logo.png";
import pfp from "../../assets/pfp.png";
import ai from "../../assets/ai.png";
import "./navigationbar.css";

function NavigationBar({ searchQuery, setSearchQuery, activeTab, setActiveTab }) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("zone_media_theme") || "dark");
  const username = localStorage.getItem("username") || "Guest";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("zone_media_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function handleLogout() {
    localStorage.removeItem("username");
    navigate("/");
  }

  return (
    <>
      <header className="navbar-container glass-panel">
        <div className="navbar-left">
          <Link to="/homepage" className="nav-brand">
            <img src={logo} alt="Zone Logo" className="nav-logo" />
            <span className="brand-title">Zone<span className="brand-accent">Media</span></span>
          </Link>

          <div className="nav-search-bar">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search posts, tags, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery("")}>×</button>
            )}
          </div>
        </div>

        <nav className="navbar-center">
          <button
            className={`nav-tab ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Feed</span>
          </button>

          <button
            className={`nav-tab ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
            </svg>
            <span>Explore</span>
          </button>

          <a
            href="https://johnadhikari.github.io/chat-bot/"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-tab ai-tab"
          >
            <img src={ai} alt="AI" className="ai-icon" />
            <span>Zone AI</span>
          </a>
        </nav>

        <div className="navbar-right">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <div className="user-profile-badge">
            <img src={pfp} alt="Profile" className="nav-pfp" />
            <span className="nav-username">{username}</span>
            <span className="pulse-dot"></span>
          </div>

          <button className="nav-logout-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span className="logout-text">Logout</span>
          </button>

          <button
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-user">
                <img src={pfp} alt="Profile" className="drawer-pfp" />
                <div>
                  <h4 className="drawer-name">{username}</h4>
                  <span className="badge badge-gradient">Active Online</span>
                </div>
              </div>
              <button className="drawer-close" onClick={() => setIsMobileMenuOpen(false)}>✕</button>
            </div>

            <div className="drawer-search">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <nav className="drawer-links">
              <button className="drawer-item" onClick={() => { setActiveTab('feed'); setIsMobileMenuOpen(false); }}>
                🏠 Home Feed
              </button>
              <button className="drawer-item" onClick={() => { setActiveTab('explore'); setIsMobileMenuOpen(false); }}>
                🧭 Explore Topics
              </button>
              <button className="drawer-item" onClick={toggleTheme}>
                {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <a href="https://johnadhikari.github.io/chat-bot/" target="_blank" rel="noopener noreferrer" className="drawer-item">
                🤖 Zone AI Assistant
              </a>
              <button className="drawer-item logout" onClick={handleLogout}>
                🚪 Logout
              </button>
            </nav>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-bar glass-panel">
        <button
          className={`bottom-tab ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          <span>Feed</span>
        </button>

        <button
          className={`bottom-tab ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
          </svg>
          <span>Explore</span>
        </button>

        <button className={`bottom-tab ${theme === 'light' ? 'active' : ''}`} onClick={toggleTheme}>
          {theme === 'dark' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
          <span>Theme</span>
        </button>

        <a
          href="https://johnadhikari.github.io/chat-bot/"
          target="_blank"
          rel="noopener noreferrer"
          className="bottom-tab ai"
        >
          <img src={ai} alt="AI" className="bottom-ai-img" />
          <span>AI</span>
        </a>

        <button className="bottom-tab logout" onClick={handleLogout}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
          </svg>
          <span>Exit</span>
        </button>
      </nav>
    </>
  );
}

export default NavigationBar;