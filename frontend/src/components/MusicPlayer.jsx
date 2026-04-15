import React, { useEffect, useRef, useState } from 'react';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';

const MusicPlayer = () => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    const audio = new Audio('/bg-music.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Try autoplay after 3 seconds
    const timer = setTimeout(() => {
      audio.play().then(() => {
        setPlaying(true);
        setUserInteracted(true);
      }).catch(() => {
        // Autoplay blocked by browser — wait for user click
        setUserInteracted(false);
      });
    }, 3000);

    // If autoplay blocked, start on first user interaction
    const handleFirstInteraction = () => {
      if (!audioRef.current.paused) return;
      audioRef.current.play().then(() => {
        setPlaying(true);
        setUserInteracted(true);
      }).catch(() => {});
      document.removeEventListener('click', handleFirstInteraction);
    };

    const interactionTimer = setTimeout(() => {
      if (!userInteracted) {
        document.addEventListener('click', handleFirstInteraction);
      }
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(interactionTimer);
      document.removeEventListener('click', handleFirstInteraction);
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
