import "./aboutme.css";
import logoText from "../../assets/text.png";
import logo from "../../assets/logo.png";
import pfp from "../../assets/pfp.png";
import { Link } from "react-router-dom";
import ai from "../../assets/ai.png";

function AboutMe() {
  const username = localStorage.getItem("username") || "Guest";

  return (
    <div className="aboutme">
      <div className="aboutme-info">
        <img src={pfp} className="aboutme-image" alt="Logo" />
        <h2 className="aboutme-name">{username}</h2>
      </div>
      <div className="aboutme-ai">
        <img src={ai} className="aboutme-image" alt="ai" />
        <p className="aboutme-ai-text"><a href="https://johnadhikari.github.io/chat-bot/" target="_blank" rel="noopener noreferrer">Zone - Ai</a></p>
      </div>
    </div>
  );
}

export default AboutMe;
