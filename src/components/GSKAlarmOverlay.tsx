import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * PHASE 240: OH SHIT DETECTOR - ALARM OVERLAY
 * Full-screen alert when GSK detects critical bugs or security issues.
 */
export const GSKAlarmOverlay = () => {
  const [alarm, setAlarm] = useState<{file: string, issues: any[]} | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    socket.on('critical_alarm', (data) => {
      console.log('🚨 CRITICAL ALARM RECEIVED:', data);
      setAlarm(data);
      
      // Play alarm sound if enabled
      if (audioEnabled) {
        playAlarmSound();
      }
    });

    return () => socket.disconnect();
  }, [audioEnabled]);

  const playAlarmSound = () => {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 880; // A5
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Beep pattern
      setTimeout(() => { oscillator.frequency.value = 440; }, 200);
      setTimeout(() => { oscillator.stop(); }, 400);
    } catch (e) {
      console.warn('Could not play alarm sound:', e);
    }
  };

  const handleAcknowledge = () => {
    setAlarm(null);
    // Optionally send acknowledgment back to GSK
  };

  if (!alarm) return null;

  return (
    <div className="fixed inset-0 bg-red-900/90 z-[9999] flex items-center justify-center backdrop-blur-md animate-pulse">
      <div className="bg-black border-4 border-red-500 p-8 rounded-xl max-w-2xl w-full mx-4 shadow-[0_0_100px_rgba(255,0,0,0.8)] transform animate-bounce">
        <div className="text-center mb-6">
          <h2 className="text-6xl font-bold text-red-500 mb-2 animate-pulse">
            🚨 CRITICAL ALERT
          </h2>
          <p className="text-red-300 text-lg">GSK detected a serious issue</p>
        </div>
        
        <div className="bg-gray-900 border-2 border-red-700 p-6 rounded-lg mb-6">
          <p className="text-white text-xl mb-4 font-mono">
            File: <span className="text-red-400">{alarm.file}</span>
          </p>
          
          <div className="space-y-3">
            {alarm.issues.map((issue, i) => (
              <div key={i} className="bg-red-950/50 p-3 rounded border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-400 font-bold">⚠️ Line {issue.line}:</span>
                  <span className="text-red-300 font-semibold">{issue.type}</span>
                </div>
                <code className="block mt-2 text-xs text-gray-400 bg-black p-2 rounded overflow-x-auto">
                  {issue.content}
                </code>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button 
            onClick={handleAcknowledge}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            I'M AWARE, GSK
          </button>
          
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
          >
            {audioEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
          </button>
        </div>

        <p className="text-gray-500 text-sm mt-4 text-center">
          This alert was triggered by GSK's Omniscient Watcher (Phase 240)
        </p>
      </div>
    </div>
  );
};
