class AudioManager {
  private ctx: AudioContext | null = null;
  private hitBuffer: AudioBuffer | null = null;
  private bounceBuffer: AudioBuffer | null = null;

  init() {
    if (!this.ctx) {
      // Must be created after user interaction
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.loadAudio('/hitball.wav').then(buffer => { this.hitBuffer = buffer; });
        this.loadAudio('/bounce.wav').then(buffer => { this.bounceBuffer = buffer; });
      } catch (e) {
        console.error('AudioContext creation failed', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private async loadAudio(url: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      if (this.ctx) {
        return await this.ctx.decodeAudioData(arrayBuffer);
      }
    } catch (e) {
      console.error(`Failed to load audio: ${url}`, e);
    }
    return null;
  }

  playWoosh() {
    this.init();
    if (!this.ctx) return;
        
    const t = this.ctx.currentTime;
    
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
        
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
        
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.4);
        
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.15, t + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);
        
    noiseSource.start(t);
    noiseSource.stop(t + 0.4);
  }

  playHit(type: 'sweet' | 'normal' | 'frame' = 'normal') {
    this.init();
    if (!this.ctx || !this.hitBuffer) return;
    
    const source = this.ctx.createBufferSource();
    source.buffer = this.hitBuffer;
    
    const gainNode = this.ctx.createGain();
    
    if (type === 'sweet') {
        gainNode.gain.value = 0.8; 
        source.playbackRate.value = 1.1; // Higher pitch
    } else if (type === 'frame') {
        gainNode.gain.value = 0.3;
        source.playbackRate.value = 0.8; // Lower pitch, dull thud
    } else {
        gainNode.gain.value = 0.5;
        source.playbackRate.value = 1.0;
    }
    
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);
  }

  playBounce(speed: number) {
    this.init();
    if (!this.ctx || !this.bounceBuffer) return;
    
    const source = this.ctx.createBufferSource();
    source.buffer = this.bounceBuffer;
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0.7; // 70% volume
    
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    source.start(0);
  }
  
  playCrowd(type: 'cheer' | 'aww' | 'applause') {
    return; // User disabled game point sound effects
  }
  
  announce(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 0.4;
      utterance.pitch = 0.95; // Softer, more natural pitch
      utterance.rate = 0.9;   // Slower rate
      
      const setVoiceAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        // Try to find a soft, natural female voice or at least a good one
        const goodVoices = voices.filter(v => v.lang.startsWith('en') && (
          v.name.includes('Female') || 
          v.name.includes('Samantha') || 
          v.name.includes('Victoria') || 
          v.name.includes('Google US English')
        ));
        
        if (goodVoices.length > 0) {
          utterance.voice = goodVoices[0];
        } else {
          const englishVoices = voices.filter(v => v.lang.startsWith('en'));
          if (englishVoices.length > 0) {
            utterance.voice = englishVoices[0];
          }
        }
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
      } else {
        setVoiceAndSpeak();
      }
    }
  }
  
  playEnvironment(theme: string) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    if (theme === 'forest' || theme === 'park') {
       const osc = this.ctx.createOscillator();
       const gain = this.ctx.createGain();
       osc.type = 'sine';
       osc.frequency.setValueAtTime(3000, t);
       osc.frequency.exponentialRampToValueAtTime(4000, t + 0.1);
       osc.frequency.exponentialRampToValueAtTime(2000, t + 0.2);
       
       gain.gain.setValueAtTime(0, t);
       gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
       gain.gain.linearRampToValueAtTime(0, t + 0.2);
       
       osc.connect(gain);
       gain.connect(this.ctx.destination);
       osc.start(t);
       osc.stop(t + 0.2);
    } else if (theme === 'beach') {
       const bufferSize = this.ctx.sampleRate * 3.0;
       const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
       const data = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
       
       const noise = this.ctx.createBufferSource();
       noise.buffer = buffer;
       const filter = this.ctx.createBiquadFilter();
       filter.type = 'lowpass';
       filter.frequency.setValueAtTime(400, t);
       
       const gain = this.ctx.createGain();
       gain.gain.setValueAtTime(0, t);
       gain.gain.linearRampToValueAtTime(0.05, t + 1.5);
       gain.gain.linearRampToValueAtTime(0, t + 3.0);
       
       noise.connect(filter);
       filter.connect(gain);
       gain.connect(this.ctx.destination);
       noise.start(t);
       noise.stop(t + 3.0);
    }
  }
}

export const audioManager = new AudioManager();
