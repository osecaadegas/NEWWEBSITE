import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import './DailyWheel.css';

export default function DailyWheel() {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [wonPrize, setWonPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const currentRotationRef = useRef(0);
  const lastSegmentIndexRef = useRef(-1);

  useEffect(() => {
    loadPrizes();
    if (user) {
      checkSpinAvailability();
    }
  }, [user]);

  const loadPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_wheel_prizes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setPrizes(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading prizes:', error);
      setLoading(false);
    }
  };

  const checkSpinAvailability = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('can_user_spin_today', {
        p_user_id: user.id
      });

      if (error) throw error;
      setCanSpin(data);

      if (!data) {
        startCountdown();
      }
    } catch (error) {
      console.error('Error checking spin availability:', error);
    }
  };

  const startCountdown = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_next_spin_time', {
        p_user_id: user.id
      });

      if (error) throw error;

      const updateTimer = () => {
        const now = new Date().getTime();
        const nextSpin = new Date(data).getTime();
        const timeLeft = nextSpin - now;

        if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          setCountdown(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
          setTimeout(updateTimer, 1000);
        } else {
          setCanSpin(true);
          setCountdown('');
        }
      };

      updateTimer();
    } catch (error) {
      console.error('Error getting next spin time:', error);
    }
  };

  useEffect(() => {
    if (prizes.length > 0 && canvasRef.current) {
      drawWheel();
    }
  }, [prizes]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || prizes.length === 0) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    const segmentAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((prize, i) => {
      const angle = i * segmentAngle;
      
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + segmentAngle);
      ctx.fillStyle = prize.color;
      ctx.fill();
      
      // Segment Border
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw Text and Icon
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + segmentAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = prize.text_color;
      
      // Label
      ctx.font = 'bold 18px Goldman, cursive';
      ctx.fillText(prize.label, radius - 40, 0);
      
      // Icon
      ctx.font = '24px Arial';
      ctx.fillText(prize.icon, radius - 150, 0);
      ctx.restore();
    });

    // Outer border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 8;
    ctx.stroke();
  };

  const playSpinSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.25);
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playTickSound = () => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(900, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.06);
  };

  const playWinSound = () => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  };

  const selectPrizeWeighted = () => {
    const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalProbability;
    
    for (let i = 0; i < prizes.length; i++) {
      random -= prizes[i].probability;
      if (random <= 0) {
        return i;
      }
    }
    return 0;
  };

  const spin = async () => {
    if (isSpinning || !canSpin || !user) return;

    setIsSpinning(true);
    playSpinSound();

    const segmentAngle = 360 / prizes.length;
    const extraSpins = 8 + Math.random() * 5;
    
    const winningIndex = selectPrizeWeighted();
    const winningSegmentCenter = winningIndex * segmentAngle + segmentAngle / 2;
    const finalRotation = (270 - winningSegmentCenter + 360) % 360;
    const targetRotation = extraSpins * 360 + finalRotation;
    const startRotation = currentRotationRef.current;
    const duration = 5000;
    const startTime = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const customEasing = (t) => {
      if (t < 0.1) return t * 10;
      return easeOutCubic(t);
    };

    lastSegmentIndexRef.current = -1;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = customEasing(progress);
      const currentPos = startRotation + (targetRotation - startRotation) * ease;

      if (canvasRef.current) {
        canvasRef.current.style.transform = `rotate(${currentPos}deg)`;
      }

      const segAngle = 360 / prizes.length;
      const angleAtPointer = (270 - currentPos % 360 + 360) % 360;
      const currentSegmentIndex = Math.floor(angleAtPointer / segAngle);

      if (currentSegmentIndex !== lastSegmentIndexRef.current) {
        const pointer = document.querySelector('.wheel-pointer');
        if (pointer) {
          pointer.classList.remove('wiggle');
          void pointer.offsetWidth;
          pointer.classList.add('wiggle');
        }

        if (lastSegmentIndexRef.current !== -1) playTickSound();
        lastSegmentIndexRef.current = currentSegmentIndex;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (canvasRef.current) {
          canvasRef.current.style.transform = `rotate(${targetRotation}deg)`;
        }
        currentRotationRef.current = targetRotation;
        setIsSpinning(false);
        
        setTimeout(() => {
          handleWin(prizes[winningIndex]);
        }, 300);
      }
    };

    requestAnimationFrame(animate);
  };

  const handleWin = async (prize) => {
    playWinSound();
    setWonPrize(prize);
    setShowModal(true);
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffcf40', '#ffffff', '#e63946']
    });

    // Record spin in database
    try {
      const { error } = await supabase
        .from('daily_wheel_spins')
        .insert({
          user_id: user.id,
          prize_id: prize.id,
          prize_label: prize.label,
          se_points_won: prize.se_points
        });

      if (error) throw error;

      // Award StreamElements points if applicable
      if (prize.se_points > 0) {
        await awardPoints(prize.se_points);
      }

      setCanSpin(false);
      startCountdown();
    } catch (error) {
      console.error('Error recording spin:', error);
    }
  };

  const awardPoints = async (points) => {
    try {
      // Get user's SE username from profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('streamelements_username')
        .eq('user_id', user.id)
        .single();

      if (!profile?.streamelements_username) {
        console.warn('User has no StreamElements username set');
        return;
      }

      // Call StreamElements API via your backend
      const response = await fetch('/api/streamelements/award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: profile.streamelements_username,
          points: points
        })
      });

      if (!response.ok) {
        throw new Error('Failed to award points');
      }

      console.log(`Awarded ${points} points to ${profile.streamelements_username}`);
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  if (loading) {
    return (
      <div className="daily-wheel-container">
        <div className="text-center text-gray-400">Loading wheel...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="daily-wheel-container">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-yellow-400 mb-4">Daily Wheel</h2>
          <p className="text-gray-400">Please log in to spin the wheel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-wheel-container">
      <header className="text-center mb-8">
        <h1 className="goldman text-5xl md:text-6xl text-yellow-400 tracking-tighter drop-shadow-lg mb-2">
          DAILY WHEEL
        </h1>
        <p className="text-gray-400 uppercase tracking-widest text-sm">
          Spin to win StreamElements points
        </p>
      </header>

      <div className="wheel-section">
        <div className="wheel-container-inner">
          {/* LED Lights */}
          <div className="led-container">
            {[...Array(24)].map((_, i) => {
              const angle = (i / 24) * 2 * Math.PI;
              const containerRadius = 210;
              const x = 200 + containerRadius * Math.cos(angle);
              const y = 200 + containerRadius * Math.sin(angle);
              
              return (
                <div 
                  key={i}
                  className="led-light"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              );
            })}
          </div>
          
          {/* Pointer */}
          <div className="wheel-pointer">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-400 drop-shadow-md">
              <path d="M50 95 L15 10 L85 10 Z" />
            </svg>
            <div className="w-2 h-2 bg-white rounded-full absolute top-4 shadow-inner"></div>
          </div>
          
          {/* The Wheel */}
          <canvas 
            ref={canvasRef}
            id="wheel" 
            width="500" 
            height="500"
            className="wheel-canvas"
          />
          
          {/* Center Button */}
          <div className="wheel-center-button">
            <div className="w-16 h-16 bg-black rounded-full border-4 border-yellow-500 shadow-xl flex items-center justify-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="wheel-controls">
          <button 
            onClick={spin}
            disabled={!canSpin || isSpinning}
            className="spin-btn"
          >
            {isSpinning ? 'SPINNING...' : 'SPIN NOW'}
          </button>
          
          {!canSpin && countdown && (
            <div className="timer-msg">
              Next spin available in: <span className="font-bold">{countdown}</span>
            </div>
          )}
          
          <div className="status-msg">
            One free spin every 24 hours
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {showModal && wonPrize && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="goldman text-3xl text-yellow-400 mb-2">
              {wonPrize.se_points > 0 ? 'JACKPOT!' : 'NICE TRY!'}
            </h2>
            <div className="text-6xl my-6">{wonPrize.icon}</div>
            <p className="text-gray-300 mb-1">You won:</p>
            <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-tight">
              {wonPrize.label}
            </h3>
            {wonPrize.se_points > 0 && (
              <p className="text-green-400 text-sm mb-4">
                +{wonPrize.se_points} StreamElements Points
              </p>
            )}
            <button 
              onClick={() => setShowModal(false)}
              className="claim-btn"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Prize List */}
      <section className="prizes-section">
        <h3 className="text-center text-gray-500 uppercase tracking-widest text-xs mb-6">
          Possible Rewards
        </h3>
        <div className="prizes-grid">
          {prizes.map((prize) => (
            <div key={prize.id} className="prize-card">
              <div className="text-xl">{prize.icon}</div>
              <div className="text-xs font-bold text-gray-300">{prize.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
