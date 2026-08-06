import { useEffect, useState } from "react";
import api from "../api";
import { connect, onRealTime } from "../realtime";

export function usePresence() {
  const [online, setOnline] = useState([]);

  useEffect(() => {
    let alive = true;
    const username = localStorage.getItem("username") || "";
    connect(username);

    api
      .online()
      .then((d) => alive && setOnline(d.usernames || []))
      .catch(() => {});

    const off = onRealTime((data) => {
      if (data.type === "presence") {
        setOnline(data.usernames || []);
      }
    });

    return () => {
      alive = false;
      off();
    };
  }, []);

  const isOnline = (name) => online.includes(name);
  return { online, isOnline };
}

export default usePresence;