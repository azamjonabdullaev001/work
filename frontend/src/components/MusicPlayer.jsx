import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';

const MusicPlayer = () => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [rec, setRec] = useState(false);

  useEffect(() => {
    const audio = new Audio('/bg-music.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  const toggleRec = useCallback(() => {
    setRec(prev => !prev);
  }, []);

  return (
    <StyledWrapper>
      <div className="button-mastery">
        <div className={`button-container${playing ? ' is-playing' : ''}${rec ? ' is-rec' : ''}`}>
          <div className="audio-visualizer">
            <div className="audio-column-wrapper"><div className="audio-column audio-column-1" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-2" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-3" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-4" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-5" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-6" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-5" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-4" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-3" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-2" /></div>
            <div className="audio-column-wrapper"><div className="audio-column audio-column-1" /></div>
          </div>
          <div className="button-group">
            <button className="the-button left-button" type="button" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; } }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="35px" width="35px" className="svg">
                <path strokeLinecap="round" strokeWidth={2} stroke="#323232" d="M20.5 15C18.9558 18.0448 15.7622 21 12 21C7.14776 21 3.58529 17.5101 3 13" />
                <path strokeLinecap="round" strokeWidth={2} stroke="#323232" d="M3.5 9C4.89106 5.64934 8.0647 3 12 3C16.7819 3 20.4232 6.48993 21 11" />
                <path strokeLinejoin="round" strokeLinecap="round" strokeWidth={2} stroke="#323232" d="M21 21L21 15.6C21 15.2686 20.7314 15 20.4 15V15L15 15" />
                <path strokeLinejoin="round" strokeLinecap="round" strokeWidth={2} stroke="#323232" d="M9 9L3.6 9V9C3.26863 9 3 8.73137 3 8.4L3 3" />
              </svg>
            </button>
            <button className="the-button play-button" type="button" onClick={togglePlay}>
              <div className="play-button-border">
                <p>{playing ? 'PAUSE' : 'PLAY'}</p>
              </div>
            </button>
            <button className="the-button right-button" type="button" onClick={toggleRec}>
              <p>{rec ? 'ON' : 'REC'}</p>
              <div className="rec-dot" />
            </button>
          </div>
        </div>
        <div className="button-container-depth" />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 10000;
  transform: scale(0.55);
  transform-origin: bottom left;

  .button-mastery {
    position: relative;
    width: 420px;
    user-select: none !important;
    transition: 5s ease;
  }
  .button-container {
    padding: 10px;
    background-color: #26272a;
    border-radius: 100px;
    box-shadow: inset 1px -1px 3px 1px #55555533;
    position: relative;
    z-index: 100;
    transition: 0.2s ease;
  }
  .button-container-depth {
    position: absolute;
    width: 100%;
    height: 70%;
    background-color: #141519;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    border-bottom-left-radius: 65px;
    border-bottom-right-radius: 65px;
    border-bottom: 2px solid #26272a;
    transition: 0.3s ease;
    box-shadow: inset 0px -5px 2px #26272a44, 20px 30px 60px 15px #000000aa;
    top: 45px;
    left: 0;
    z-index: -1;
  }
  .button-group {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 6px;
    background-color: black;
    border-radius: 100px;
    position: relative;
  }
  .the-button {
    flex: 1;
    width: 200px;
    font-family: "Doto", serif;
    font-weight: 800;
    color: #585b6d;
    background: #131517;
    font-size: 24px;
    height: 80px;
    border: 2px solid #181a1b;
    outline: 6px solid black;
    cursor: pointer;
  }
  .play-button {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 170px;
    transform: translate(-50%, -50%);
    background-color: #050709;
    color: #00c4fa;
    border-top-left-radius: 80px;
    border-bottom-right-radius: 80px;
    border-top-right-radius: 3px;
    border-bottom-left-radius: 3px;
    text-shadow: 0px 0px 5px #66a3ff, 0px 0px 10px #66a3ff, 0px 0px 20px #66a3ff,
      0px 0px 40px #66a3ff, 0px 0px 80px #66a3ff, 0px 0px 120px #66a3ff;
    outline: 5px solid black;
    box-shadow: inset 0px 0px 3px 2px #22222288, 6px 0px 5px 3px #222222, -5px 0px 5px 3px #222222;
    transition: 0.5s ease;
  }
  .play-button p {
    margin: 0;
    font-weight: 900;
    transition: 0.2s ease;
  }
  .play-button-border {
    height: 100%;
    width: 100%;
    border-top-left-radius: 60px;
    border-bottom-right-radius: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s ease;
  }
  .left-button {
    border-top-left-radius: 100px;
    border-bottom-left-radius: 100px;
    display: flex;
    align-items: center;
    padding-left: 35px;
    box-shadow: inset 0px -1px 2px 1px #222222;
  }
  .right-button {
    border-top-right-radius: 100px;
    border-bottom-right-radius: 100px;
    text-align: right;
    padding-right: 20px;
    letter-spacing: 3px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    box-shadow: inset -2px -2px 2px #222222;
    transition: 0.2s ease;
  }
  .right-button p {
    margin: 0;
    transition: 0.3s ease;
  }
  .rec-dot {
    height: 8px;
    width: 8px;
    border-radius: 100%;
    background: #fd7a00;
    background: linear-gradient(0deg, #fd7a00 20%, rgba(255,255,255,0.8) 100%);
    box-shadow: 0px 0px 15px 2px #fd7a00;
    transition: 0.2s ease;
  }
  .svg {
    height: 35px;
    width: 35px;
    object-fit: contain;
    filter: brightness(0) saturate(100%) invert(37%) sepia(13%) saturate(669%)
      hue-rotate(194deg) brightness(86%) contrast(82%);
  }
  .left-button:active .svg {
    animation: accelerateThenRotate 1s ease-in forwards, continuousRotate 0.5s linear 1s infinite;
  }

  /* REC state */
  .is-rec .rec-dot {
    background: linear-gradient(0deg, #ff0000 20%, rgba(255,255,255,0.8) 100%);
    box-shadow: 0px 0px 15px 2px #ff0000;
  }
  .is-rec.button-container {
    background: #880000;
  }
  .is-rec ~ .button-container-depth {
    box-shadow: 0px 0px 60px 15px #880000 !important;
    background-color: #ac0000;
    border-bottom: 2px solid red;
  }
  .is-rec .right-button p {
    color: #ff0000;
  }
  .is-rec .play-button {
    border-radius: 100px;
    border-top-left-radius: 3px;
    border-bottom-right-radius: 3px;
    border-top-right-radius: 80px;
    border-bottom-left-radius: 80px;
  }
  .is-rec .play-button p {
    color: #fab700;
    text-shadow: 0px 0px 5px #ff0000, 0px 0px 10px #ff0000, 0px 0px 20px #ff0000,
      0px 0px 40px #ff0000, 0px 0px 80px #ff0000, 0px 0px 120px #ff0000;
  }
  .is-rec .play-button {
    box-shadow: inset 0px 0px 20px 2px #ff0000 !important;
  }
  .is-rec .audio-column {
    background: linear-gradient(0deg, #fab700 0%, #790000 90%, #8b0000 100%);
    box-shadow: 0px -10px 30px #8b0000;
    border-top: none;
  }
  .is-rec .audio-visualizer {
    background: linear-gradient(0deg, #fab700 30%, #790000 100%);
  }

  /* PLAY state */
  .is-playing .play-button {
    width: 120px;
    height: 120px;
    border-radius: 120px;
    box-shadow: inset 0px 0px 20px 2px #66a3ff;
  }
  .is-playing .play-button-border {
    animation: accelerateThenRotate 0.2s ease-out forwards reverse,
      continuousRotate 0.2s linear 0.2s infinite reverse;
  }
  .is-playing .play-button-border p {
    animation: accelerateThenRotate 0.2s ease-in forwards,
      continuousRotate 0.2s linear 0.2s infinite;
  }
  .is-playing .audio-visualizer {
    top: -30px;
    left: 50%;
    width: 200px;
    height: 10px;
    padding: 0px 20px;
    transform: translate(-50%, -50%);
    overflow: visible;
  }

  /* Audio visualizer */
  .audio-visualizer {
    position: absolute;
    width: 20px;
    height: 20px !important;
    top: 50%;
    left: 50%;
    transition: 1s ease;
    transform: translate(-50%, -50%);
    background: linear-gradient(0deg, #00c4fa 30%, #005e79 100%);
    border: 5px solid #111111;
    overflow: hidden;
    border-radius: 30px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 3px;
    z-index: -1;
  }
  .audio-column-wrapper {
    height: 10px;
    width: 20px;
    position: relative;
  }
  .audio-column {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    height: 10px;
    width: 10px;
    background: linear-gradient(0deg, #00c4fa 0%, #005e79 90%);
    animation-duration: 0.4s;
    animation-timing-function: ease-out;
    animation-iteration-count: infinite;
    animation-direction: normal;
    border-top-right-radius: 5px;
    border-top-left-radius: 5px;
    transition: 0.2s ease;
    box-shadow: 0px -10px 30px #005e79;
  }
  .audio-column-1 { animation-name: pulse; animation-delay: 0.36s; }
  .audio-column-2 { animation-name: pulse; animation-delay: 0.3s; }
  .audio-column-3 { animation-name: pulse; animation-delay: 0.24s; }
  .audio-column-4 { animation-name: pulse; animation-delay: 0.18s; }
  .audio-column-5 { animation-name: pulse; animation-delay: 0.12s; }
  .audio-column-6 { animation-name: pulse; animation-delay: 0.06s; }

  @keyframes pulse {
    0% { height: 150px; }
    20% { height: 130px; }
    40% { height: 80px; }
    60% { height: 50px; }
    80% { height: 5px; }
    100% { height: 150px; }
  }
  @keyframes accelerateThenRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
  @keyframes continuousRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
`;

export default MusicPlayer;
