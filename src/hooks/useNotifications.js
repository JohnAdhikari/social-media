import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { connect, onRealTime } from "../realtime";

export function useNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const username = localStorage.getItem("username") || "";
    connect(username);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    const off = onRealTime((data) => {
      if (
        data.type === "friend_request" ||
        data.type === "friend_accept" ||
        data.type === "like" ||
        data.type === "comment"
      ) {
        load();
      }
    });
    return () => off();
  }, [load]);

  const markRead = useCallback(async () => {
    try {
      await api.markNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  }, []);

  return { items, unread, load, markRead };
}

export default useNotifications;