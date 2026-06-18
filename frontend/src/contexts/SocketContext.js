import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread count from DB on mount
  useEffect(() => {
    if (!user) return;
    api.get('/notifications')
      .then(res => {
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const socket = io('/', { query: { userId: user.id } });
    socketRef.current = socket;

    socket.on('notification', (data) => {
      setNotifications((prev) => [{ ...data, id: Date.now(), isRead: false }, ...prev]);
      setUnreadCount(c => c + 1);
    });

    socket.on('prayerStarted', (data) => {
      setNotifications((prev) => [
        { ...data, id: Date.now(), type: 'PRAYER_STARTED', isRead: false },
        ...prev,
      ]);
      setUnreadCount(c => c + 1);
    });

    return () => socket.disconnect();
  }, [user]);

  function markAllRead() {
    setUnreadCount(0);
  }

  function clearNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, notifications, unreadCount, markAllRead, clearNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
