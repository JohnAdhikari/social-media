import { useState } from "react";
import "./homepage.css";
import NavigationBar from "./NavigationBar/NavigationBar";
import DisplayPosts from "./DisplayPosts/DisplayPosts";
import Contact from "./ContactList/Contact";
import AboutMe from "./aboutme/AboutMe";

function Homepage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <div className="homepage-root">
      <div className="homepage-container">
        {/* Navigation Bar */}
        <NavigationBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Main Grid Content */}
        <div className="homepage-content-grid">
          {/* Left Column: User Profile Widget */}
          <aside className="homepage-left-sidebar">
            <AboutMe />
          </aside>

          {/* Center Column: Feed & Post Creation Stream */}
          <main className="homepage-main-feed">
            <DisplayPosts
              searchQuery={searchQuery}
              activeTab={activeTab}
            />
          </main>

          {/* Right Column: Active Contacts & Trends */}
          <aside className="homepage-right-sidebar">
            <Contact />
          </aside>
        </div>

        {/* Footer */}
        <footer className="homepage-footer">
          <p>© {new Date().getFullYear()} Zone Media • Built with React & AI Agents</p>
        </footer>
      </div>
    </div>
  );
}

export default Homepage;