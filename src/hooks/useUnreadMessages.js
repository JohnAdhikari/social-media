import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { connect, onRealTime } from "../realtime";

export function useUnreadMessages() {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const convos = await api.getConversations();
      const total = (convos || []).reduce((acc, c) => acc + (c.unread || 0), 0);
      setCount(total);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const username = localStorage.getItem("username") || "";
    connect(username);
    void load();
    const off = onRealTime((data) => {
      if (data.type === "message" || data.type === "read") load();
    });
    const onMessagesUpdated = () => load();
    window.addEventListener("zone:messages-updated", onMessagesUpdated);
    const id = setInterval(load, 20000);
    return () => {
      off();
      clearInterval(id);
      window.removeEventListener("zone:messages-updated", onMessagesUpdated);
    };
  }, [load]);

  return count;
}

export default useUnreadMessages;
