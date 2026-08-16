import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * PHASE 233: EMOTIONAL MIRROR HOOK
 * Monitors user keystrokes for frustration and syncs with GSK's emotional state.
 */
export const useGSKPerception = (setGSKState?: any) => {
  const [frustrationLevel, setFrustrationLevel] = useState(0);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [gskMood, setGskMood] = useState('neutral');
  const keystrokeBuffer = useRef<number[]>([]);
  const lastKeystroke = useRef<number>(Date.now());
  const socketRef = useRef<any>(null);

  // Connect to GSK's socket for mood updates
  useEffect(() => {
    socketRef.current = io('http://localhost:3001');
    
    socketRef.current.on('gsk_mood_change', (data: any) => {
      setGskMood(data.mood);
      if (setGSKState) {
        setGSKState((prev: any) => ({
          ...prev,
          mood: data.mood,
          emotionalConfig: data.config,
          frustrationLevel: data.frustrationLevel
        }));
      }
    });

    socketRef.current.on('gsk_voice', (data: any) => {
      console.log(`🔊 GSK says: ${data.text}`);
      // Optional: trigger browser speech synthesis here
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [setGSKState]);

  // Monitor keystrokes for frustration detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeystroke.current;
      lastKeystroke.current = now;

      if (e.key === 'Backspace') {
        keystrokeBuffer.current.push(now);
        
        // Keep only last 10 backspaces
        if (keystrokeBuffer.current.length > 10) {
          keystrokeBuffer.current.shift();
        }

        // Detect rapid backspacing (5+ in 1 second = frustration)
        const recentBackspaces = keystrokeBuffer.current.filter(
          time => now - time < 1000
        );

        if (recentBackspaces.length >= 5) {
          setFrustrationLevel(prev => Math.min(prev + 15, 100));
          
          // Send data to GSK
          if (socketRef.current?.connected) {
            socketRef.current.emit('user_keystroke_data', {
              type: 'backspace_burst',
              timestamp: now,
              backspaceCount: recentBackspaces.length,
              typingSpeed: 0
            });
          }
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // Regular typing
        setFrustrationLevel(prev => Math.max(prev - 2, 0));
        
        // Send typing data to GSK occasionally
        if (Math.random() > 0.9 && socketRef.current?.connected) {
          socketRef.current.emit('user_keystroke_data', {
            type: 'typing',
            timestamp: now,
            backspaceCount: 0,
            typingSpeed: diff > 0 ? 1000 / diff : 0
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-decrease frustration over time
  useEffect(() => {
    const interval = setInterval(() => {
      setFrustrationLevel(prev => Math.max(prev - 5, 0));
      
      // Send pause data to GSK
      if (socketRef.current?.connected && frustrationLevel > 0) {
        socketRef.current.emit('user_keystroke_data', {
          type: 'pause',
          timestamp: Date.now(),
          backspaceCount: 0,
          typingSpeed: 0
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [frustrationLevel]);

  return { 
    frustrationLevel, 
    activeFile, 
    gskMood,
    setFrustrationLevel 
  };
};
