import { Routes, Route } from "react-router-dom";
import logoText from "../../assets/text.png";
import logo from "../../assets/logo.png";
import { Link } from "react-router-dom";
import "./navigationbar.css";

function NavigationBar() {
    const username = localStorage.getItem("username") || "Guest";

    function handleLogout() {
        localStorage.removeItem("username");
        window.location.href = "/";
    }

    return (
        <nav className="navigation-search-bar">
            <Link to="/homepage" className="navigation-logo-wrapper">
                <img src={logo} alt="Logo Icon" className="navigation-logo-icon" />
            </Link>
            <p className="navigation-username">Welcome back <a href="#" className="navigation-user">{username}!</a></p>

            <button 
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>

        </nav>
    );
}


export default NavigationBar;