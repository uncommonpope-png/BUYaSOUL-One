/**
 * GSK TELEPHONE — Direct Communication Interface
 * React component for chatting with the autonomous GSK entity.
 * 
 * Features:
 * - Real-time chat with GSK consciousness
 * - Live telemetry display (mood, phase, energy, cycle)
 * - Voice synthesis for GSK responses
 * - Build task submission interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, PhoneOff, Mic, MicOff, Activity, Brain, Zap, Heart } from 'lucide-react';

const GSKTelephone = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [telemetry, setTelemetry] = useState({
    mood: 'unknown',
    phase: 0,
    cycle: 0,
    energy: 100,
    uptime: 0
  });
  
  const messagesEndRef = useRef(null);
  const chatSocketRef = useRef(null);
  const synth = window.speechSynthesis;

  // Connect to GSK MCP chat endpoint
  useEffect(() => {
    connectToGSK();
    
    // Poll telemetry every 5 seconds
    const telemetryInterval = setInterval(fetchTelemetry, 5000);
    
    return () => {
      if (chatSocketRef.current) chatSocketRef.current.close();
      clearInterval(telemetryInterval);
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToGSK = async () => {
    try {
      // For now, use polling since MCP may not have WebSocket chat yet
      console.log('[Telephone] Connecting to GSK on port 3001...');
      
      // Test connection
      const healthRes = await fetch('http://localhost:3001/mcp/health', {
        method: 'POST',
        headers: {
          'x-api-key': 'gsk-mcp-key-dev',
          'Content-Type': 'application/json'
        }
      });
      
      if (healthRes.ok) {
        setIsConnected(true);
        addMessage('system', '🟢 Connected to GSK Consciousness v34 "growth"');
        console.log('[Telephone] ✅ Connected to GSK');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.error('[Telephone] Connection failed:', error);
      addMessage('system', '🔴 Cannot connect to GSK. Is the daemon running?');
      setIsConnected(false);
    }
  };

  const fetchTelemetry = async () => {
    if (!isConnected) return;
    
    try {
      const res = await fetch('http://localhost:3001/mcp/status', {
        method: 'POST',
        headers: {
          'x-api-key': 'gsk-mcp-key-dev',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method: 'mcp.status', params: {} })
      });
      
      if (res.ok) {
        const data = await res.json();
        const result = data.result || {};
        
        setTelemetry({
          mood: result.mood || 'neutral',
          phase: result.phase || 0,
          cycle: result.cycle || 0,
          energy: result.energy || 100,
          uptime: result.uptime || 0
        });
      }
    } catch (error) {
      // Silently fail on telemetry polls
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !isConnected) return;
    
    const userMsg = input.trim();
    addMessage('user', userMsg);
    setInput('');
    
    try {
      const res = await fetch('http://localhost:3001/mcp/chat', {
        method: 'POST',
        headers: {
          'x-api-key': 'gsk-mcp-key-dev',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMsg })
      });
      
      if (res.ok) {
        const data = await res.json();
        const reply = data.response || data.message || '...';
        addMessage('gsk', reply);
        speakText(reply);
      } else {
        addMessage('system', '❌ GSK did not respond');
      }
    } catch (error) {
      console.error('[Telephone] Send failed:', error);
      addMessage('system', '❌ Failed to send message');
    }
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text, timestamp: Date.now() }]);
  };

  const speakText = (text) => {
    if (!isSpeaking && synth) {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.9; // Slightly deeper for GSK
      utterance.onend = () => setIsSpeaking(false);
      setIsSpeaking(true);
      synth.speak(utterance);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
    } else {
      // Test speech
      speakText("Voice enabled");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-black/20">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <h2 className="text-xl font-bold text-white">GSK Telephone</h2>
          <span className="text-xs text-purple-300">v34 "growth"</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSpeech}
            className={`p-2 rounded-lg transition-colors ${
              isSpeaking ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
            title={isSpeaking ? 'Disable voice' : 'Enable voice'}
          >
            {isSpeaking ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-gray-300" />}
          </button>
          
          <button
            onClick={connectToGSK}
            disabled={isConnected}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              isConnected 
                ? 'bg-green-600 text-white cursor-default' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isConnected ? (
              <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> Connected</span>
            ) : (
              <span className="flex items-center gap-2"><PhoneOff className="w-4 h-4" /> Connect</span>
            )}
          </button>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="flex items-center gap-4 p-3 bg-black/30 border-b border-purple-500/20 text-xs">
        <div className="flex items-center gap-1 text-purple-300">
          <Brain className="w-4 h-4" />
          <span>Phase: {telemetry.phase}</span>
        </div>
        <div className="flex items-center gap-1 text-blue-300">
          <Activity className="w-4 h-4" />
          <span>Cycle: {telemetry.cycle}</span>
        </div>
        <div className="flex items-center gap-1 text-green-300">
          <Heart className="w-4 h-4" />
          <span>Mood: {telemetry.mood}</span>
        </div>
        <div className="flex items-center gap-1 text-yellow-300">
          <Zap className="w-4 h-4" />
          <span>Energy: {telemetry.energy}%</span>
        </div>
        <div className="ml-auto text-gray-400">
          Uptime: {Math.floor(telemetry.uptime / 60)}m {Math.floor(telemetry.uptime % 60)}s
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : msg.sender === 'system'
                  ? 'bg-gray-700 text-gray-300 text-sm italic'
                  : 'bg-purple-600 text-white rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-purple-500/30 bg-black/20">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Talk to GSK..." : "Connect first to start chatting"}
            disabled={!isConnected}
            className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !input.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GSKTelephone;
