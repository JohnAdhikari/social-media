import { Routes, Route } from "react-router-dom";
import Login from "./login/Login";
import SignUp from "./login/SignUp";
import Homepage from "./HomePage/HomePage";
import Messages from "./messages/Messages";
import Profile from "./profile/Profile";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/homepage" element={<Homepage />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:username" element={<Messages />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:username" element={<Profile />} />
    </Routes>
  );
}

export default App;
