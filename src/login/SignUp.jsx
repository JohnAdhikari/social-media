import "./signUp.css";
import logo from "../assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("Male");
  const navigate = useNavigate();

  function handleSignUp(e) {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0] || "User";
    localStorage.setItem("username", fullName);
    navigate("/homepage");
  }

  return (
    <div className="signup-container">
      <div className="signup-backdrop-glow glow-1"></div>
      <div className="signup-backdrop-glow glow-2"></div>

      <div className="signup-box glass-panel">
        <div className="signup-header">
          <div className="brand-header">
            <img className="img-logo" src={logo} alt="Logo" />
            <h2 className="brand-title">Zone<span className="brand-accent">Media</span></h2>
          </div>

          <h1 className="title">Create Account</h1>
          <p className="subtitle">Join Zone Media community today</p>
        </div>

        <form className="signup-form" onSubmit={handleSignUp}>
          <div className="name-row">
            <div className="input-group">
              <label>First name</label>
              <input
                className="input"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Last name</label>
              <input
                className="input"
                type="text"
                placeholder="Adhikari"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Email or Mobile</label>
            <input
              className="input"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              placeholder="Create strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="label">Birthday</label>
            <div className="birthday-row">
              <select className="input birth" defaultValue="Jan">
                <option>Jan</option>
                <option>Feb</option>
                <option>Mar</option>
                <option>Apr</option>
                <option>May</option>
                <option>Jun</option>
                <option>Jul</option>
                <option>Aug</option>
                <option>Sep</option>
                <option>Oct</option>
                <option>Nov</option>
                <option>Dec</option>
              </select>

              <select className="input birth" defaultValue="15">
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>

              <select className="input birth" defaultValue="2000">
                {Array.from({ length: 45 }, (_, i) => (
                  <option key={i}>{1980 + i}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="label">Gender</label>
            <div className="gender-row">
              {["Male", "Female", "Other"].map((item) => (
                <label
                  key={item}
                  className={`gender-option ${gender === item ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={item}
                    checked={gender === item}
                    onChange={() => setGender(item)}
                  />{" "}
                  {item}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="signup-btn btn-primary">
            Create Free Account
          </button>

          <p className="message">
            Already have an account?{" "}
            <Link className="login-link" to="/">
              Log in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignUp;