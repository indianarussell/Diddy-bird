import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// --- CONFIG ---
const BIRD_SIZE_RATIO = 0.07;
const PIPE_WIDTH_RATIO = 0.09;
const PIPE_GAP_RATIO = 0.30;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 7;
const WIN_SCORE = 10;

// Spark colors for win screen
const SPARK_COLORS = ['#fbbf24', '#a855f7', '#ec4899', '#34d399', '#60a5fa'];

function Sparks() {
  const sparks = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: SPARK_COLORS[i % SPARK_COLORS.length],
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    tx: `${(Math.random() - 0.5) * 300}px`,
    ty: `${(Math.random() - 0.5) * 300}px`,
    delay: `${Math.random() * 0.6}s`,
  }));

  return (
    <div className="win-sparks">
      {sparks.map(s => (
        <div
          key={s.id}
          className="spark"
          style={{
            background: s.color,
            left: s.left,
            top: s.top,
            '--tx': s.tx,
            '--ty': s.ty,
            animationDelay: s.delay,
            boxShadow: `0 0 6px ${s.color}`,
          }}
        />
      ))}
    </div>
  );
}

function App() {
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('diddyHighScore');
    return saved ? parseInt(saved) : 0;
  });

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [birdPosition, setBirdPosition] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [pipePosition, setPipePosition] = useState(0);
  const [pipeHeight, setPipeHeight] = useState(0);
  const [score, setScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [birdRotation, setBirdRotation] = useState(0);
  const [showWinFlash, setShowWinFlash] = useState(false);
  const [paused, setPaused] = useState(false);

  // gameState: 'idle' | 'running' | 'gameOver' | 'win'
  const [gameState, setGameState] = useState('idle');

  const startGame = useCallback(() => {
    setBirdPosition(dimensions.height / 2);
    setPipePosition(dimensions.width);
    setPipeHeight(
      Math.random() * (dimensions.height * 0.4) + dimensions.height * 0.15
    );
    setScore(0);
    setVelocity(0);
    setIsNewRecord(false);
    setBirdRotation(0);
    setShowWinFlash(false);
    setPaused(false);
    setGameState('running');
  }, [dimensions]);

  const jump = useCallback(() => {
    if (gameState === 'running') setVelocity(JUMP_STRENGTH);
  }, [gameState]);

  // Measure game area
  useEffect(() => {
    const update = () => {
      const el = document.querySelector('.game-area');
      if (el) setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'running' || dimensions.height === 0 || paused) return;

    const timer = setInterval(() => {
      const newVelocity = velocity + GRAVITY;
      const newBirdPos = birdPosition + newVelocity;

      // Bird rotation based on velocity
      const rotation = Math.min(Math.max(newVelocity * 4, -30), 80);
      setBirdRotation(rotation);

      let newPipePos = pipePosition - PIPE_SPEED;

      // Respawn pipe
      if (newPipePos < -(dimensions.width * PIPE_WIDTH_RATIO)) {
        newPipePos = dimensions.width;
        setPipeHeight(
          Math.random() * (dimensions.height * 0.4) + dimensions.height * 0.15
        );
      }

      // Score point
      if (
        pipePosition > dimensions.width * 0.1 &&
        newPipePos <= dimensions.width * 0.1
      ) {
        setScore(s => {
          const next = s + 1;
          if (next === WIN_SCORE) {
            setShowWinFlash(true);
            setPaused(true);
            if (next > highScore) {
              setHighScore(next);
              setIsNewRecord(true);
              localStorage.setItem('diddyHighScore', next.toString());
            }
          }
          return next;
        });
      }

      // Collision
      const birdSize = dimensions.height * BIRD_SIZE_RATIO;
      const birdTop = newBirdPos;
      const birdBottom = newBirdPos + birdSize;
      const birdLeft = dimensions.width * 0.1;
      const birdRight = birdLeft + birdSize;
      const pipeLeft = newPipePos;
      const pipeRight = newPipePos + dimensions.width * PIPE_WIDTH_RATIO;
      const topPipeBottom = pipeHeight;
      const bottomPipeTop = pipeHeight + dimensions.height * PIPE_GAP_RATIO;
      const groundTop = dimensions.height - 60;

      const hitFloor = birdBottom > groundTop;
      const hitCeiling = birdTop < 0;
      const inPipeX = birdRight > pipeLeft && birdLeft < pipeRight;
      const hitTopPipe = inPipeX && birdTop < topPipeBottom;
      const hitBottomPipe = inPipeX && birdBottom > bottomPipeTop;

      if (hitFloor || hitCeiling || hitTopPipe || hitBottomPipe) {
        setGameState('gameOver');
        setScore(finalScore => {
          if (finalScore > highScore) {
            setHighScore(finalScore);
            setIsNewRecord(true);
            localStorage.setItem('diddyHighScore', finalScore.toString());
          }
          return finalScore;
        });
      } else {
        setBirdPosition(newBirdPos);
        setVelocity(newVelocity);
        setPipePosition(newPipePos);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [gameState, birdPosition, velocity, pipePosition, dimensions, pipeHeight, highScore, paused]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'running') jump();
        else if (gameState === 'idle' || gameState === 'gameOver' || gameState === 'win') startGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, jump, startGame]);

  const birdSize = dimensions.height * BIRD_SIZE_RATIO;
  const progressWidth = Math.min((score / WIN_SCORE) * 100, 100);

  return (
    <div className="game-area" onClick={jump}>

      {/* Progress bar */}
      {gameState === 'running' && (
        <div className="win-progress" style={{ width: `${progressWidth}%` }} />
      )}

      {/* High score */}
      <div className="high-score-badge">
        <div className="hs-label">Best</div>
        <div className="hs-number">{highScore}</div>
      </div>

      {/* Score */}
      {gameState === 'running' && (
        <div className="score-display">
          <div className="score-number">{score}</div>
          <div className="score-label">Score</div>
        </div>
      )}

      {/* Ground */}
      <div className="ground" />

      {/* Bird */}
      {dimensions.width > 0 && (
        <img
          src="/diddyhead4.png"
          alt="Diddy Bird"
          className="bird-img"
          style={{
            width: birdSize,
            height: birdSize,
            top: birdPosition,
            left: dimensions.width * 0.1,
            transform: `rotate(${birdRotation}deg)`,
          }}
        />
      )}

      {/* Pipes */}
      {(gameState === 'running' || gameState === 'gameOver') && dimensions.width > 0 && (
        <>
          <img
            src="/babyoil2.png"
            alt="Top pipe"
            className="pipe-img"
            style={{
              width: dimensions.width * PIPE_WIDTH_RATIO,
              top: pipeHeight,
              left: pipePosition,
              transform: 'translateY(-100%)',
            }}
          />
          <img
            src="/babyoil3.png"
            alt="Bottom pipe"
            className="pipe-img"
            style={{
              width: dimensions.width * PIPE_WIDTH_RATIO,
              top: pipeHeight + (dimensions.height * PIPE_GAP_RATIO),
              left: pipePosition,
            }}
          />
        </>
      )}

      {/* START SCREEN */}
      {gameState === 'idle' && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="win-emoji-row" style={{ animationDelay: '0s' }}>🐦💨</div>
            <div className="overlay-title purple">DIDDY BIRD</div>
            <div className="overlay-subtitle">Dodge the baby oil</div>
            <button className="btn-game" onClick={(e) => { e.stopPropagation(); startGame(); }}>
              TAKE FLIGHT
            </button>
            <div className="hint-text">Tap / Space to flap</div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'gameOver' && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="overlay-title purple">GAME OVER</div>
            <div className="score-reveal">
              <div className="big-score">{score}</div>
              <div className="big-score-label">Score</div>
            </div>
            {isNewRecord && <div className="new-record">🏆 New Record!</div>}
            <button className="btn-game" onClick={(e) => { e.stopPropagation(); startGame(); }}>
              TRY AGAIN
            </button>
            <div className="hint-text">Tap / Space to restart</div>
          </div>
        </div>
      )}

      {/* WIN FLASH - shows briefly then game continues */}
      {showWinFlash && (
        <>
          <Sparks />
          <div
            className="overlay win-overlay"
            onClick={(e) => {
              e.stopPropagation();
              setShowWinFlash(false);
              setPaused(false);
            }}
          >
            <img src="/diddybirdwin.jpeg" alt="You Win!" className="win-fullscreen-img" />
            <div className="win-tap-hint">Tap to continue</div>
          </div>
        </>
      )}

    </div>
  );
}

export default App;