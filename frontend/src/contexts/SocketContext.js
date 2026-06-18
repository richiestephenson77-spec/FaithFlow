import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const socket = io('/', { query: { userId: user.id } });
    socketRef.current = socket;

    socket.on('notification', (data) => {
      setNotifications((prev) => [{ ...data, id: Date.now(), isRead: false }, ...prev]);
    });

    socket.on('prayerStarted', (data) => {
      setNotifications((prev) => [
        { ...data, id: Date.now(), type: 'PRAYER_STARTED', isRead: false },
        ...prev,
      ]);
    });

    return () => socket.disconnect();
  }, [user]);

  function clearNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, notifications, clearNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
