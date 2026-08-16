/**
 * PHASE 232: VOICE OF THE CODE
 * Text-to-Speech engine for GSK. Speaks findings, fixes, and warnings aloud.
 */
class VoiceEngine {
  constructor(gskCore) {
    this.gsk = gskCore;
    this.enabled = true;
    this.queue = [];
    this.isSpeaking = false;
    this.lastSpoken = null;
  }

  speak(text, priority = 'normal') {
    if (!this.enabled || !text) return;

    // Prevent immediate repeats
    if (this.lastSpoken === text && Date.now() - this.lastSpokenTime < 5000) {
      return;
    }

    if (priority === 'critical') {
      this.queue.unshift({ text, priority });
    } else {
      this.queue.push({ text, priority });
    }

    this.lastSpoken = text;
    this.lastSpokenTime = Date.now();
    this.processQueue();
  }

  async processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    this.isSpeaking = true;
    const { text, priority } = this.queue.shift();
    
    console.log(`🔊 GSK SPEAKS [${priority}]: "${text}"`);
    
    // Emit to frontend via socket.io if available
    if (this.gsk.io) {
      this.gsk.io.emit('gsk_voice', { 
        text, 
        priority,
        timestamp: Date.now() 
      });
    }

    // Log to memory
    if (this.gsk.memory) {
      this.gsk.memory.addEvent({
        type: 'voice_output',
        text,
        priority,
        timestamp: Date.now()
      });
    }

    // Simulate speech duration (rough estimate: 150ms per word)
    const duration = Math.min(5000, text.split(' ').length * 150);
    
    setTimeout(() => {
      this.isSpeaking = false;
      this.processQueue();
    }, duration);
  }

  enable() {
    this.enabled = true;
    console.log('🔊 Voice engine enabled.');
  }

  disable() {
    this.enabled = false;
    console.log('🔇 Voice engine disabled.');
  }

  clear() {
    this.queue = [];
    this.isSpeaking = false;
  }
}

module.exports = VoiceEngine;
