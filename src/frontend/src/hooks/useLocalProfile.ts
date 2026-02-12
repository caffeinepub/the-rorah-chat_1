import { useState, useEffect } from 'react';

const USER_ID_KEY = 'rorah_user_id';
const NICKNAME_KEY = 'rorah_nickname';

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function useLocalProfile() {
  const [userId, setUserId] = useState<string>(() => {
    const stored = localStorage.getItem(USER_ID_KEY);
    if (stored) return stored;
    const newId = generateUserId();
    localStorage.setItem(USER_ID_KEY, newId);
    return newId;
  });

  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem(NICKNAME_KEY) || '';
  });

  useEffect(() => {
    localStorage.setItem(USER_ID_KEY, userId);
  }, [userId]);

  useEffect(() => {
    if (nickname) {
      localStorage.setItem(NICKNAME_KEY, nickname);
    } else {
      localStorage.removeItem(NICKNAME_KEY);
    }
  }, [nickname]);

  return {
    userId,
    nickname,
    setNickname,
  };
}
