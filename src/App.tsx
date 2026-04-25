/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback, PointerEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, XCircle, Play, RotateCcw, Volume2, VolumeX, Award, TrendingUp } from 'lucide-react';
import { sounds } from '@/src/lib/sounds';

// Types
interface Entity {
  id: number;
  x: number;
  y: number;
  type: 'opportunity' | 'rejection';
  speed: number;
  size: number;
  label: string;
  rotation: number;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'static' | 'moving';
  moveSpeed?: number;
  direction?: 1 | -1;
  pulseScale: number;
}

type Theme = 'glass' | 'cyber' | 'minimal';

const OPPORTUNITY_LABELS = ['Job Offer', 'Interview Request', 'Career Boost', 'Skill Up', 'Networking'];
const REJECTION_LABELS = ['Rejection', 'Ghosted', 'Low Salary', 'Bad Manager', 'Unpaid Task'];

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [theme, setTheme] = useState<Theme>('glass');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    entities: [] as Entity[],
    obstacles: [] as Obstacle[],
    playerX: 0,
    playerY: 0,
    nextId: 0,
    lastSpawn: 0,
    difficulty: 1,
    frameCount: 0,
    dimensions: { width: 0, height: 0 }
  });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const { clientWidth, clientHeight } = canvasRef.current.parentElement;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        gameRef.current.dimensions = { width: clientWidth, height: clientHeight };
        gameRef.current.playerX = clientWidth / 2;
        gameRef.current.playerY = clientHeight - 110;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update high score
  useEffect(() => {
    const saved = localStorage.getItem('opportunity-knocks-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
    
    const savedTheme = localStorage.getItem('opportunity-knocks-theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('opportunity-knocks-highscore', score.toString());
    }
  }, [score, highScore]);

  // Sound control
  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  }, [isMuted]);

  // Game Logic
  const startGame = () => {
    setScore(0);
    setGameState('playing');
    gameRef.current.entities = [];
    gameRef.current.obstacles = [];
    gameRef.current.difficulty = 1;
    gameRef.current.frameCount = 0;
    gameRef.current.lastSpawn = 0;
  };

  const endGame = () => {
    setGameState('gameover');
    sounds.playGameOver();
  };

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('opportunity-knocks-theme', newTheme);
  };

  // Mouse/Touch movement
  const handlePointerMove = (e: PointerEvent) => {
    if (gameState !== 'playing') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      gameRef.current.playerX = e.clientX - rect.left;
    }
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animationFrameId: number;

    const render = (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const { width, height } = gameRef.current.dimensions;
      gameRef.current.frameCount++;

      // Difficulty increase
      gameRef.current.difficulty = 1 + Math.floor(score / 5) * 0.15;

      // Spawning
      if (time - gameRef.current.lastSpawn > (1000 / gameRef.current.difficulty)) {
        const type = Math.random() > 0.3 ? 'opportunity' : 'rejection';
        const entity: Entity = {
          id: gameRef.current.nextId++,
          x: Math.random() * (width - 60) + 30,
          y: -50,
          type,
          speed: (Math.random() * 2 + 2) * gameRef.current.difficulty,
          size: type === 'opportunity' ? 24 : 26,
          rotation: Math.random() * Math.PI * 2,
          label: type === 'opportunity' 
            ? OPPORTUNITY_LABELS[Math.floor(Math.random() * OPPORTUNITY_LABELS.length)]
            : REJECTION_LABELS[Math.floor(Math.random() * REJECTION_LABELS.length)]
        };
        gameRef.current.entities.push(entity);
        gameRef.current.lastSpawn = time;
      }

      // Obstacle System Adjustment
      if (score >= 5 && gameRef.current.obstacles.length < 1) {
        gameRef.current.obstacles.push({
          id: 100,
          x: width / 2 - 40,
          y: height / 2 - 20,
          width: 80,
          height: 40,
          type: 'static',
          pulseScale: 1
        });
      } else if (score >= 15 && gameRef.current.obstacles.length < 2) {
        gameRef.current.obstacles.push({
          id: 101,
          x: width / 2,
          y: height / 2 + 150,
          width: 120,
          height: 15,
          type: 'moving',
          moveSpeed: 2,
          direction: 1,
          pulseScale: 1
        });
      }

      // Update & Render
      ctx.clearRect(0, 0, width, height);

      // Render Obstacles
      for (const obs of gameRef.current.obstacles) {
        if (obs.type === 'moving' && obs.moveSpeed && obs.direction) {
          obs.x += obs.moveSpeed * obs.direction;
          if (obs.x + obs.width > width - 20 || obs.x < 20) {
            obs.direction *= -1;
          }
        }
        
        obs.pulseScale = 1 + Math.sin(time / 200) * 0.05;

        ctx.save();
        ctx.shadowBlur = theme === 'cyber' ? 20 : 10;
        ctx.shadowColor = theme === 'cyber' ? 'rgba(255, 0, 255, 0.4)' : 'rgba(249, 115, 22, 0.4)';
        
        ctx.beginPath();
        const centerX = obs.x + obs.width / 2;
        const centerY = obs.y + obs.height / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(obs.pulseScale, obs.pulseScale);
        
        if (theme === 'cyber') {
          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 3;
          ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
          ctx.fillStyle = 'rgba(244, 114, 182, 0.1)';
          ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
        } else {
          const gradient = ctx.createLinearGradient(-obs.width/2, -obs.height/2, obs.width/2, obs.height/2);
          gradient.addColorStop(0, '#f97316');
          gradient.addColorStop(1, '#ea580c');
          ctx.fillStyle = gradient;
          ctx.roundRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height, 8);
          ctx.fill();
        }

        ctx.restore();

        // Obstacle Collision
        const pX = gameRef.current.playerX;
        const pY = gameRef.current.playerY;
        const pW = 40;
        const pH = 50;
        
        const rect1 = { x: obs.x, y: obs.y, w: obs.width, h: obs.height };
        const rect2 = { x: pX - 20, y: pY - 25, w: pW, h: pH };

        if (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.h + rect1.y > rect2.y) {
          endGame();
          return;
        }
      }

      // Background Grid (Cyber Theme Only)
      if (theme === 'cyber') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for(let i = 0; i < width; i += 50) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
          ctx.stroke();
        }
        for(let i = 0; i < height; i += 50) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(width, i);
          ctx.stroke();
        }
      }

      // Update Entities
      for (let i = gameRef.current.entities.length - 1; i >= 0; i--) {
        const ent = gameRef.current.entities[i];
        ent.y += ent.speed;
        ent.rotation += 0.02;

        // Collision Check
        const dx = ent.x - gameRef.current.playerX;
        const dy = ent.y - gameRef.current.playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ent.size + 20) {
          if (ent.type === 'opportunity') {
            setScore(s => s + 1);
            sounds.playTing();
            gameRef.current.entities.splice(i, 1);
            continue;
          } else {
            endGame();
            return;
          }
        }

        if (ent.y > height + 50) {
          gameRef.current.entities.splice(i, 1);
          continue;
        }

        // Render Entity
        ctx.save();
        ctx.translate(ent.x, ent.y);
        ctx.rotate(ent.rotation);
        
        if (theme === 'cyber') {
          ctx.shadowBlur = 15;
          ctx.shadowColor = ent.type === 'opportunity' ? '#00ffcc' : '#ff0033';
          ctx.strokeStyle = ent.type === 'opportunity' ? '#00ffcc' : '#ff0033';
          ctx.lineWidth = 2;
          
          if (ent.type === 'opportunity') {
            // Rhombus shape
            ctx.beginPath();
            ctx.moveTo(0, -ent.size);
            ctx.lineTo(ent.size, 0);
            ctx.lineTo(0, ent.size);
            ctx.lineTo(-ent.size, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';
            ctx.fill();
          } else {
            // Glitchy X
            ctx.beginPath();
            ctx.moveTo(-ent.size, -ent.size);
            ctx.lineTo(ent.size, ent.size);
            ctx.moveTo(ent.size, -ent.size);
            ctx.lineTo(-ent.size, ent.size);
            ctx.stroke();
          }
        } else if (theme === 'minimal') {
          ctx.fillStyle = ent.type === 'opportunity' ? '#fff' : '#444';
          ctx.beginPath();
          if (ent.type === 'opportunity') {
            ctx.rect(-ent.size/2, -ent.size/2, ent.size, ent.size);
          } else {
            ctx.arc(0, 0, ent.size/3, 0, Math.PI * 2);
          }
          ctx.fill();
        } else {
          // Glass theme (Default updated)
          ctx.shadowBlur = 15;
          ctx.shadowColor = ent.type === 'opportunity' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.2)';
          
          const gradient = ctx.createRadialGradient(-ent.size/3, -ent.size/3, 0, 0, 0, ent.size);
          if (ent.type === 'opportunity') {
            gradient.addColorStop(0, '#86efac');
            gradient.addColorStop(1, '#22c55e');
          } else {
            gradient.addColorStop(0, '#f87171');
            gradient.addColorStop(1, '#dc2626');
          }
          ctx.fillStyle = gradient;
          
          if (ent.type === 'opportunity') {
             // Octagon for opportunities
             const sides = 8;
             ctx.beginPath();
             for (let s = 0; s < sides; s++) {
               const angle = (s / sides) * Math.PI * 2;
               ctx.lineTo(Math.cos(angle) * ent.size, Math.sin(angle) * ent.size);
             }
             ctx.closePath();
             ctx.fill();
          } else {
             // Triangle for rejections
             ctx.beginPath();
             ctx.moveTo(0, -ent.size);
             ctx.lineTo(ent.size, ent.size);
             ctx.lineTo(-ent.size, ent.size);
             ctx.closePath();
             ctx.fill();
          }
        }

        ctx.restore();
        
        // Label
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ent.label, ent.x, ent.y + ent.size + 15);
        ctx.restore();
      }

      // Render Player
      const px = gameRef.current.playerX;
      const py = gameRef.current.playerY;
      
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = theme === 'cyber' ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
      
      if (theme === 'cyber') {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 20, py - 25, 40, 50);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.fillRect(px - 20, py - 25, 40, 50);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(px - 20, py - 25, 40, 50, theme === 'minimal' ? 0 : 4);
        ctx.fill();
      }
      
      if (theme !== 'minimal') {
        ctx.fillStyle = theme === 'cyber' ? '#00ffff' : '#e5e5e5';
        ctx.fillRect(px - 12, py - 15, 24, 1);
        ctx.fillRect(px - 12, py - 8, 18, 1);
        ctx.fillRect(px - 12, py - 1, 24, 1);
        ctx.fillRect(px - 12, py + 6, 20, 1);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, score, theme]);

  return (
    <div className={`relative w-full h-screen text-white font-sans overflow-hidden selection:bg-white/10 ${theme === 'cyber' ? 'bg-[#000]' : 'bg-[#0a0a0a]'}`}>
      {/* Background Atmosphere */}
      <div className={`absolute inset-0 atmosphere pointer-events-none ${theme === 'cyber' ? 'opacity-10' : 'opacity-30'}`} />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold italic">Career Journey</span>
          <div className="flex items-center gap-3">
            <h1 className={`text-3xl font-light tracking-tighter ${theme === 'cyber' ? 'text-[#0ff] font-mono' : ''}`}>Opportunity Knocks</h1>
            {gameState === 'playing' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-full"
              >
                <TrendingUp size={12} className="text-green-400" />
                <span className="text-[10px] uppercase font-mono text-white/60">Lv. {gameRef.current.difficulty.toFixed(1)}</span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Current Hits</span>
            <div className={`text-2xl font-mono tabular-nums ${theme === 'cyber' ? 'text-[#0ff]' : ''}`}>{score}</div>
          </div>
          <button 
            onClick={toggleMute}
            className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* Game Canvas */}
      <div 
        className="absolute inset-0 cursor-none"
        onPointerMove={handlePointerMove}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Overlay UI */}
      <AnimatePresence>
        {gameState === 'menu' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-6 text-center"
          >
            <div className="max-w-md w-full space-y-8">
              <div className="space-y-4">
                <motion.div 
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className="flex justify-center"
                >
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl ${theme === 'cyber' ? 'bg-[#0ff] shadow-[#0ff]/50' : 'bg-white shadow-white/20'}`}>
                    <Briefcase size={40} className="text-black" />
                  </div>
                </motion.div>
                <h2 className={`text-5xl font-light tracking-tight ${theme === 'cyber' ? 'text-[#0ff] font-mono uppercase' : ''}`}>Your Next Step.</h2>
                <p className="text-white/60 font-light leading-relaxed">
                  Move your resume to catch opportunities and avoid rejections. 
                  Select a visual style before heading into the market.
                </p>
              </div>

              {/* Theme Selector */}
              <div className="flex justify-center gap-2">
                {(['glass', 'cyber', 'minimal'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTheme(t)}
                    className={`px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-semibold border transition-all ${
                      theme === t 
                        ? 'bg-white text-black border-white' 
                        : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={startGame}
                  className={`group relative w-full py-4 font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
                    theme === 'cyber' ? 'bg-[#0ff] text-black hover:bg-[#00e5e5]' : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  <Play size={20} fill="currentColor" />
                  Start the Search
                </button>
                
                {highScore > 0 && (
                  <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                    <Award size={14} />
                    Best Reach: <span className="font-mono text-white/60">{highScore}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-red-950/40 backdrop-blur-md z-50 p-6 text-center"
          >
            <div className={`max-w-md w-full p-12 bg-black/80 border rounded-[40px] space-y-8 ${theme === 'cyber' ? 'border-[#f03]' : 'border-red-500/20'}`}>
              <div className="space-y-4">
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex justify-center"
                >
                  <XCircle size={80} className={`${theme === 'cyber' ? 'text-[#f03]' : 'text-red-500/50'}`} strokeWidth={1} />
                </motion.div>
                <div className="space-y-2">
                  <h2 className={`text-4xl font-light tracking-tight ${theme === 'cyber' ? 'text-[#f03] font-mono' : 'text-red-100'}`}>Application Rejected.</h2>
                  <p className="text-red-200/40 text-sm italic font-light">"We've decided to move forward with other candidates."</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-8 border-y border-white/5">
                <div className="text-left px-4">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">Final Score</div>
                  <div className={`text-4xl font-mono font-light ${theme === 'cyber' ? 'text-[#f03]' : ''}`}>{score}</div>
                </div>
                <div className="text-left px-4 border-l border-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">Personal Best</div>
                  <div className="text-4xl font-mono font-light">{highScore}</div>
                </div>
              </div>

              <button 
                onClick={startGame}
                className={`w-full py-4 font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
                  theme === 'cyber' ? 'bg-[#f03] text-white hover:bg-[#d02]' : 'bg-white text-black hover:bg-white/90'
                }`}
              >
                <RotateCcw size={20} />
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .atmosphere {
          background: radial-gradient(circle at 50% 30%, ${theme === 'cyber' ? '#111' : '#1a1a1a'} 0%, transparent 60%),
                      radial-gradient(circle at 80% 80%, ${theme === 'cyber' ? '#001' : '#1e1e1e'} 0%, transparent 50%);
          filter: blur(60px);
        }
      `}</style>
    </div>
  );
}
