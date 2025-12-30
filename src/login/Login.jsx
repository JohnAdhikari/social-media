import "./login.css";
import logoText from "../assets/text.png";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import { useState } from "react";

function Login() {
  const [username, setUsername] = useState("");

  alert("only front-end is used to build this project. So, after login you will be redirected to homepage without any authentication.\nPlease use any username to login. Thank you!");

  return (
    <div className="login-container">
      <div className="image">
        <img className="img-logo" src={logo} alt="Logo" />
        <img className="img-text" src={logoText} alt="Text" />
      </div>

      <div className="login-page">
        <form className="login-form">
          <input className="input" type="text" placeholder="username..." 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input className="input" type="password" placeholder="password" />

          <Link to="/homepage"
           className="login-btn"
            onClick={()=> {
              localStorage.setItem("username",username)
            }}
          >
            Login
          </Link>

          <hr />

          <p className="message">
            Not registered?{" "}
            <Link className="create" to="/signup">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
