import React, { useEffect, useRef, useState } from 'react';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';

const MusicPlayer = () => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = new Audio('/bg-music.mp3');
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    const fadeIn = () => {
      let vol = 0;
      const fade = setInterval(() => {
        vol = Math.min(vol + 0.01, 0.3);
        audio.volume = vol;
        if (vol >= 0.3) clearInterval(fade);
      }, 50);
    };

    // Strategy 1: Try normal autoplay immediately
    const tryPlay = () => {
      audio.play().then(() => {
        setPlaying(true);
        fadeIn();
      }).catch(() => {
        // Strategy 2: Use interaction events (any touch/click/key/scroll)
        const events = ['click', 'touchstart', 'keydown', 'scroll'];
        const handler = () => {
          audio.play().then(() => {
            setPlaying(true);
            fadeIn();
          }).catch(() => {});
          events.forEach(e => document.removeEventListener(e, handler));
        };
        events.forEach(e => document.addEventListener(e, handler, { once: false }));
      });
    };

    const timer = setTimeout(tryPlay, 1000);

    return () => {
      clearTimeout(timer);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.volume = 0.3;
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <button
      className={`music-control ${playing ? 'playing' : ''}`}
      onClick={toggleMusic}
      title={playing ? 'Выключить музыку' : 'Включить музыку'}
    >
      {playing ? <FiVolume2 /> : <FiVolumeX />}
    </button>
  );
};

export default MusicPlayer;
