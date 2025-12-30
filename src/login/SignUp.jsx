import "./SignUp.css";
import logoText from "../assets/text.png";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";

function SignUp() {
  return (
    <div className="signup-container">
      {/* Left Side: Logos */}
      <div className="image">
        <img className="img-logo" src={logo} alt="Logo" />
        <img className="img-text" src={logoText} alt="Text" />
      </div>

      {/* Right Side: Form */}
      <div className="signup-box">
        <h1 className="title">Sign Up</h1>
        <h4 className="subtitle">It's quick and easy.</h4>

        {/* Name Row */}
        <div className="name-row">
          <input className="input half" type="text" placeholder="First name" />
          <input className="input half" type="text" placeholder="Last name" />
        </div>

        <input className="input" type="email" placeholder="Mobile number or email" />
        <input className="input" type="password" placeholder="New password" />

        {/* Birthday Section */}
        <label className="label">Birthday</label>
        <div className="birthday-row">
          <select className="input birth">
            <option>January</option>
            <option>February</option>
            <option>March</option>
            <option>April</option>
            {/* Add other months as needed */}
          </select>

          <select className="input birth">
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1}>{i + 1}</option>
            ))}
          </select>

          <select className="input birth">
            {Array.from({ length: 36 }, (_, i) => (
              <option key={i}>{1990 + i}</option>
            ))}
          </select>
        </div>

        {/* Gender Section */}
        <label className="label">Gender</label>
        <div className="gender-row">
          <label className="gender-option">
            <input type="radio" name="gender" /> Male
          </label>
          <label className="gender-option">
            <input type="radio" name="gender" /> Female
          </label>
          <label className="gender-option">
            <input type="radio" name="gender" /> Other
          </label>
        </div>

        {/* Sign Up Button (Fixed) */}
        <Link to="/homepage" className="signup-btn">
          Sign Up
        </Link>

        <p className="message">
          Already have an account?{" "}
          <Link className="login-link" to="/">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;