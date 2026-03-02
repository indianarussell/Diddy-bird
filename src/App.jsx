import { useState, useEffect, useCallback } from 'react';
import './App.css';

// --- CONFIGURATION ---
const BIRD_SIZE_RATIO = 0.05; // 5% of screen height
const PIPE_WIDTH_RATIO = 0.08; // 8% of screen width
const PIPE_GAP_RATIO = 0.45; // Easy gap
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 5;

function App() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [birdPosition, setBirdPosition] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [pipePosition, setPipePosition] = useState(0);
  const [pipeHeight, setPipeHeight] = useState(0);
  const [score, setScore] = useState(0);

  // Game State: 'idle' (start screen), 'running', 'gameOver'
  const [gameState, setGameState] = useState('idle');

  const startGame = () => {
    setBirdPosition(dimensions.height / 2);
    setPipePosition(dimensions.width);
    setScore(0);
    setVelocity(0);
    setGameState('running');
  };

  // --- JUMP FUNCTION ---
  const jump = useCallback(() => {
    if (gameState === 'running') {
      setVelocity(JUMP_STRENGTH);
    }
  }, [gameState]);

  // --- MEASURE SCREEN SIZE ON LOAD ---
  useEffect(() => {
    const updateDimensions = () => {
      const gameArea = document.querySelector('.game-area');
      if (gameArea) {
        setDimensions({ width: gameArea.offsetWidth, height: gameArea.offsetHeight });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // --- GAME LOOP ---
  useEffect(() => {
    if (gameState !== 'running' || dimensions.height === 0) return;

    const gameTimer = setInterval(() => {
      // 1. Physics: Bird Movement
      const newVelocity = velocity + GRAVITY;
      const newPosition = birdPosition + newVelocity;

      // 2. Physics: Pipe Movement
      let newPipePosition = pipePosition - PIPE_SPEED;

      // A. SPAWN LOGIC: Reset pipe to right side only when it leaves screen left
      if (newPipePosition < -dimensions.width * PIPE_WIDTH_RATIO) {
        newPipePosition = dimensions.width;
        setPipeHeight(Math.random() * (dimensions.height * 0.5) + dimensions.height * 0.1);
      }

      // B. SCORE LOGIC: Increment score ONLY when bird passes pipe center
      if (
        pipePosition > dimensions.width * 0.1 &&
        newPipePosition <= dimensions.width * 0.1
      ) {
        setScore(s => s + 1);
      }

      // 3. Collision Detection
      const birdTop = newPosition;
      const birdBottom = newPosition + (dimensions.height * BIRD_SIZE_RATIO);
      const birdLeft = dimensions.width * 0.1;
      const birdRight = birdLeft + (dimensions.height * BIRD_SIZE_RATIO);

      const pipeLeft = newPipePosition;
      const pipeRight = newPipePosition + (dimensions.width * PIPE_WIDTH_RATIO);
      const topPipeBottom = pipeHeight;
      const bottomPipeTop = dimensions.height - (dimensions.height - pipeHeight - (dimensions.height * PIPE_GAP_RATIO));

      const birdHitsFloor = birdBottom > dimensions.height;
      const birdHitsCeiling = birdTop < 0;
      const birdInPipeX = birdRight > pipeLeft && birdLeft < pipeRight;
      const hitsTopPipe = birdInPipeX && birdTop < topPipeBottom;
      const hitsBottomPipe = birdInPipeX && birdBottom > bottomPipeTop;

      if (birdHitsFloor || birdHitsCeiling || hitsTopPipe || hitsBottomPipe) {
        setGameState('gameOver');
      } else {
        setBirdPosition(newPosition);
        setVelocity(newVelocity);
        setPipePosition(newPipePosition);
      }
    }, 24);

    return () => clearInterval(gameTimer);
  }, [gameState, birdPosition, velocity, pipePosition, dimensions, pipeHeight]);

  // --- KEYBOARD INPUT HANDLER ---
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        if (gameState === 'running') jump();
        else if (gameState === 'idle' || gameState === 'gameOver') startGame();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, jump]);

  // Styling for centered screens
  const screenStyle = {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white', zIndex: 20
  };

  return (
    <div className="game-area" onClick={jump} style={{ position: 'relative', overflow: 'hidden', background: 'skyblue' }}>

      {/* START SCREEN */}
      {gameState === 'idle' && (
        <div style={screenStyle}>
          <h1>DIDDY BIRD</h1>
          <button onClick={startGame} style={{ padding: '10px 20px', fontSize: '20px' }}>START (Space)</button>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'gameOver' && (
        <div style={screenStyle}>
          <h1>GAME OVER</h1>
          <h2>Score: {score}</h2>
          <button onClick={startGame} style={{ padding: '10px 20px', fontSize: '20px' }}>RESTART (Space)</button>
        </div>
      )}

      {/* Score Display */}
      {gameState === 'running' && (
        <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 24, zIndex: 10, color: 'white', fontWeight: 'bold' }}>
          Score: {score}
        </div>
      )}

      {/* --- BIRD --- */}
      {dimensions.width > 0 && (
        <img
          src="/diddyhead4.png"
          alt="Diddy Bird"
          style={{
            height: dimensions.height * BIRD_SIZE_RATIO,
            width: dimensions.height * BIRD_SIZE_RATIO,
            position: 'absolute',
            top: birdPosition,
            left: dimensions.width * 0.1,
            transition: gameState === 'running' ? 'none' : 'top 0.1s linear'
          }}
        />
      )}

      {/* --- PIPES --- */}
      {gameState === 'running' && dimensions.width > 0 && (
        <>
          <img
            src="/babyoil2.png"
            alt="Pipe"
            style={{
              height: pipeHeight,
              width: dimensions.width * PIPE_WIDTH_RATIO,
              position: 'absolute',
              top: 0,
              left: pipePosition,
              transform: 'rotate(180deg)'
            }}
          />
          <img
            src="/babyoil2.png"
            alt="Pipe"
            style={{
              height: dimensions.height - pipeHeight - (dimensions.height * PIPE_GAP_RATIO),
              width: dimensions.width * PIPE_WIDTH_RATIO,
              position: 'absolute',
              bottom: 0,
              left: pipePosition,
            }}
          />
        </>
      )}
    </div>
  );
}

export default App;