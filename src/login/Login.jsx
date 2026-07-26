import "./login.css";
import logo from "../assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a valid username");
      return;
    }
    localStorage.setItem("username", username.trim());
    navigate("/homepage");
  }

  function handleDemoLogin() {
    localStorage.setItem("username", "John Adhikari");
    navigate("/homepage");
  }

  return (
    <div className="login-container">
      <div className="login-backdrop-glow glow-1"></div>
      <div className="login-backdrop-glow glow-2"></div>

      <div className="login-content-wrapper glass-panel">
        <div className="login-brand-section">
          <div className="logo-badge">
            <img className="img-logo" src={logo} alt="Zone Logo" />
            <h1 className="brand-title">Zone<span className="brand-accent">Media</span></h1>
          </div>

          <p className="brand-tagline">
            Connect with friends, share moments, and explore what's happening in your zone.
          </p>
        </div>

        <div className="login-form-section">
          <div className="form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {error && <div className="login-error-alert">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                className="input"
                type="text"
                placeholder="Enter your username..."
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn btn-primary">
              Log In
            </button>

            <button
              type="button"
              className="demo-login-btn"
              onClick={handleDemoLogin}
            >
              ⚡ Quick Demo Sign In
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <p className="signup-prompt">
            Don't have an account yet?{" "}
            <Link className="create-link" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
