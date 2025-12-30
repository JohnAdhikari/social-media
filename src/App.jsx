import { Routes, Route } from "react-router-dom";
import Login from "./login/login";
import SignUp from "./login/SignUp";
import Homepage from "./HomePage/HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/homepage" element={<Homepage />} />
    </Routes>
  );
}

export default App;
