import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const MUSIC_ENABLED_KEY = 'syharik_music_enabled';
const MUSIC_SRC = '/music/game-bg.mp3';

function getMusicEnabled() {
  try {
    const v = localStorage.getItem(MUSIC_ENABLED_KEY);
    return v !== 'false';
  } catch {
    return true;
  }
}

function setMusicEnabledStorage(enabled) {
  try {
    localStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {}
}

const MusicContext = createContext({
  musicEnabled: true,
  setMusicEnabled: () => {},
});

export function MusicProvider({ children, playWhenView }) {
  const [musicEnabled, setMusicEnabledState] = useState(getMusicEnabled);
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);

  const setMusicEnabled = useCallback((enabled) => {
    setMusicEnabledState(enabled);
    setMusicEnabledStorage(enabled);
    if (!enabled && audioRef.current) {
      audioRef.current.pause();
      isPlayingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.12;
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const shouldPlay = musicEnabled && playWhenView;
    if (shouldPlay && !isPlayingRef.current) {
      audio.src = MUSIC_SRC;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { isPlayingRef.current = true; }).catch(() => {});
      } else {
        isPlayingRef.current = true;
      }
    } else if (!shouldPlay && isPlayingRef.current) {
      audio.pause();
      isPlayingRef.current = false;
    }
  }, [musicEnabled, playWhenView]);

  // При сворачивании вкладки или переключении — ставим музыку на паузу; при возврате — возобновляем
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        if (isPlayingRef.current) {
          audio.pause();
          isPlayingRef.current = false;
          audio.dataset.wasPlaying = '1';
        }
      } else {
        if (audio.dataset.wasPlaying === '1' && musicEnabled && playWhenView) {
          audio.dataset.wasPlaying = '';
          audio.play().then(() => { isPlayingRef.current = true; }).catch(() => {});
        }
      }
    };

    const handlePageHide = () => {
      if (isPlayingRef.current) {
        audio.pause();
        isPlayingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [musicEnabled, playWhenView]);

  return (
    <MusicContext.Provider value={{ musicEnabled, setMusicEnabled }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
