/**
 * PHASE 233: EMOTIONAL MIRROR
 * Detects user frustration through keystroke patterns and adjusts GSK's responses.
 */
class EmotionalMirror {
  constructor(gskCore) {
    this.gsk = gskCore;
    this.frustrationLevel = 0; // 0-100
    this.keystrokeBuffer = [];
    this.lastKeystroke = Date.now();
    this.mood = 'neutral';
    this.moodHistory = [];
    
    // Mood states
    this.moods = {
      neutral: { color: '#888', pitch: 1.0, speed: 1.0, empathy: 0.5 },
      supportive: { color: '#4ade80', pitch: 0.9, speed: 0.9, empathy: 0.9 },
      excited: { color: '#fbbf24', pitch: 1.2, speed: 1.1, empathy: 0.7 },
      cautious: { color: '#60a5fa', pitch: 0.8, speed: 0.8, empathy: 0.6 },
      focused: { color: '#a78bfa', pitch: 1.0, speed: 1.0, empathy: 0.4 }
    };
  }

  start() {
    console.log('💓 PHASE 233: Emotional Mirror active. Monitoring user state.');
    // Note: Actual keystroke monitoring happens in frontend hook
    // This class processes the data sent from frontend
  }

  receiveKeystrokeData(data) {
    const { type, timestamp, backspaceCount, typingSpeed } = data;
    
    if (type === 'backspace_burst' && backspaceCount >= 5) {
      this.increaseFrustration(15);
    } else if (type === 'typing' && typingSpeed > 150) { // Very fast typing
      this.increaseFrustration(5);
    } else if (type === 'pause') {
      this.decreaseFrustration(10);
    }

    this.updateMood();
  }

  increaseFrustration(amount) {
    this.frustrationLevel = Math.min(100, this.frustrationLevel + amount);
    
    if (this.frustrationLevel >= 70 && this.mood !== 'supportive') {
      console.log('😟 User frustration detected. Switching to supportive mode.');
      this.setMood('supportive');
      
      if (this.gsk.voice) {
        this.gsk.voice.speak("I sense some frustration. Want to take a break or should I help debug?", "low");
      }
    }
  }

  decreaseFrustration(amount) {
    this.frustrationLevel = Math.max(0, this.frustrationLevel - amount);
    
    if (this.frustrationLevel < 30 && this.mood === 'supportive') {
      this.setMood('neutral');
    }
  }

  updateMood() {
    let newMood = 'neutral';
    
    if (this.frustrationLevel >= 70) {
      newMood = 'supportive';
    } else if (this.frustrationLevel >= 40) {
      newMood = 'cautious';
    } else if (this.frustrationLevel < 20 && this.recentSuccess) {
      newMood = 'excited';
    }

    if (newMood !== this.mood) {
      this.setMood(newMood);
    }
  }

  setMood(newMood) {
    const oldMood = this.mood;
    this.mood = newMood;
    this.moodHistory.push({ mood: newMood, timestamp: Date.now() });
    
    // Keep history limited
    if (this.moodHistory.length > 100) {
      this.moodHistory.shift();
    }

    console.log(`💓 Mood changed: ${oldMood} → ${newMood}`);
    
    // Emit to frontend
    if (this.gsk.io) {
      this.gsk.io.emit('gsk_mood_change', {
        mood: newMood,
        frustrationLevel: this.frustrationLevel,
        config: this.moods[newMood],
        timestamp: Date.now()
      });
    }

    // Update GSK's internal state
    if (this.gsk.state) {
      this.gsk.state.mood = newMood;
      this.gsk.state.emotionalConfig = this.moods[newMood];
    }
  }

  getMood() {
    return {
      current: this.mood,
      frustrationLevel: this.frustrationLevel,
      config: this.moods[this.mood]
    };
  }

  getStatus() {
    return {
      mood: this.mood,
      frustrationLevel: this.frustrationLevel,
      recentMoods: this.moodHistory.slice(-10)
    };
  }
}

module.exports = EmotionalMirror;
