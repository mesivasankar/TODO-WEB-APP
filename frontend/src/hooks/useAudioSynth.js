import { useRef, useEffect, useState } from "react";

export default function useAudioSynth() {
  const audioCtxRef = useRef(null);
  
  // Binaural Focus Beats
  const binauralNodeLRef = useRef(null);
  const binauralNodeRRef = useRef(null);
  const binauralGainRef = useRef(null);
  
  // Cozy Rain (Brown Noise)
  const brownNoiseSourceRef = useRef(null);
  const brownNoiseGainRef = useRef(null);

  // Ocean Breeze (Modulated Waves)
  const oceanSourceRef = useRef(null);
  const oceanLfoRef = useRef(null);
  const oceanGainRef = useRef(null);

  // Night Forest (Wind & Crickets)
  const forestSourceRef = useRef(null);
  const forestLfoRef = useRef(null);
  const forestGainRef = useRef(null);
  const forestIntervalRef = useRef(null);

  // White Noise (Soft Hum)
  const whiteSourceRef = useRef(null);
  const whiteGainRef = useRef(null);

  // Zen Temple (Singing Bowl Gong)
  const zenGainRef = useRef(null);
  const zenIntervalRef = useRef(null);

  const [isBinauralPlaying, setIsBinauralPlaying] = useState(false);
  const [isBrownPlaying, setIsBrownPlaying] = useState(false);
  const [isOceanPlaying, setIsOceanPlaying] = useState(false);
  const [isForestPlaying, setIsForestPlaying] = useState(false);
  const [isWhitePlaying, setIsWhitePlaying] = useState(false);
  const [isZenPlaying, setIsZenPlaying] = useState(false);

  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playBinaural = () => {
    const ctx = initAudioContext();
    if (isBinauralPlaying) return;

    const oscL = ctx.createOscillator();
    const oscR = ctx.createOscillator();

    // Detune frequencies slightly (120Hz Left, 130Hz Right -> 10Hz Alpha Waves)
    oscL.frequency.value = 120;
    oscR.frequency.value = 130;

    const pannerL = ctx.createStereoPanner();
    const pannerR = ctx.createStereoPanner();
    pannerL.pan.value = -1;
    pannerR.pan.value = 1;

    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    oscL.connect(pannerL);
    pannerL.connect(gain);

    oscR.connect(pannerR);
    pannerR.connect(gain);

    gain.connect(ctx.destination);

    oscL.start();
    oscR.start();

    binauralNodeLRef.current = oscL;
    binauralNodeRRef.current = oscR;
    binauralGainRef.current = gain;

    setIsBinauralPlaying(true);
  };

  const stopBinaural = () => {
    if (binauralNodeLRef.current) {
      try { binauralNodeLRef.current.stop(); } catch (e) {}
      binauralNodeLRef.current = null;
    }
    if (binauralNodeRRef.current) {
      try { binauralNodeRRef.current.stop(); } catch (e) {}
      binauralNodeRRef.current = null;
    }
    setIsBinauralPlaying(false);
  };

  const playBrownNoise = () => {
    const ctx = initAudioContext();
    if (isBrownPlaying) return;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = noiseBuffer;
    bufferSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 350;

    const gain = ctx.createGain();
    gain.gain.value = 0.3;

    bufferSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    bufferSource.start();

    brownNoiseSourceRef.current = bufferSource;
    brownNoiseGainRef.current = gain;

    setIsBrownPlaying(true);
  };

  const stopBrownNoise = () => {
    if (brownNoiseSourceRef.current) {
      try { brownNoiseSourceRef.current.stop(); } catch (e) {}
      brownNoiseSourceRef.current = null;
    }
    setIsBrownPlaying(false);
  };

  const playOcean = () => {
    const ctx = initAudioContext();
    if (isOceanPlaying) return;

    // Generate modulated pink-style noise for waves rolling
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.05 * white)) / 1.05;
      lastOut = output[i];
      output[i] *= 2.5;
    }

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = noiseBuffer;
    bufferSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0.25;

    // Slow LFO to simulate rolling tides (~12.5 seconds per wave)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08; 

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.15; 

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    bufferSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    bufferSource.start();
    lfo.start();

    oceanSourceRef.current = bufferSource;
    oceanLfoRef.current = lfo;
    oceanGainRef.current = gain;

    setIsOceanPlaying(true);
  };

  const stopOcean = () => {
    if (oceanSourceRef.current) {
      try { oceanSourceRef.current.stop(); } catch (e) {}
      oceanSourceRef.current = null;
    }
    if (oceanLfoRef.current) {
      try { oceanLfoRef.current.stop(); } catch (e) {}
      oceanLfoRef.current = null;
    }
    setIsOceanPlaying(false);
  };

  const playCricketChirp = (ctx, destination, startTime) => {
    const pulseCount = 3 + Math.floor(Math.random() * 2);
    let time = startTime;
    for (let p = 0; p < pulseCount; p++) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(4200 + Math.random() * 200, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.005, time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      
      osc.connect(gainNode);
      gainNode.connect(destination);
      
      osc.start(time);
      osc.stop(time + 0.06);
      
      time += 0.07;
    }
  };

  const playForest = () => {
    const ctx = initAudioContext();
    if (isForestPlaying) return;

    // Wind rustle background
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.01 * white)) / 1.01;
      lastOut = output[i];
      output[i] *= 1.5;
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 250;
    windFilter.Q.value = 1.0;

    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    // Wind LFO to modulate filter frequency (blowing gusts)
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.05; 
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 100; 

    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    windSource.connect(windFilter);
    windFilter.connect(gain);
    gain.connect(ctx.destination);

    windSource.start();
    windLfo.start();

    // Crickets pings
    const cricketGain = ctx.createGain();
    cricketGain.gain.value = 1.0; 
    cricketGain.connect(gain); 

    const triggerChirp = () => {
      const now = ctx.currentTime;
      playCricketChirp(ctx, cricketGain, now + 0.1);
    };

    triggerChirp();
    const intervalId = setInterval(() => {
      if (ctx.state === "running") {
        triggerChirp();
      }
    }, 4500);

    forestSourceRef.current = windSource;
    forestLfoRef.current = windLfo;
    forestGainRef.current = gain;
    forestIntervalRef.current = intervalId;

    setIsForestPlaying(true);
  };

  const stopForest = () => {
    if (forestSourceRef.current) {
      try { forestSourceRef.current.stop(); } catch (e) {}
      forestSourceRef.current = null;
    }
    if (forestLfoRef.current) {
      try { forestLfoRef.current.stop(); } catch (e) {}
      forestLfoRef.current = null;
    }
    if (forestIntervalRef.current) {
      clearInterval(forestIntervalRef.current);
      forestIntervalRef.current = null;
    }
    setIsForestPlaying(false);
  };

  const playWhiteNoise = () => {
    const ctx = initAudioContext();
    if (isWhitePlaying) return;

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = noiseBuffer;
    bufferSource.loop = true;

    // Filter to make it a pleasant soft hum (lowpass at 1000Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.value = 0.12; // low baseline volume

    bufferSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    bufferSource.start();

    whiteSourceRef.current = bufferSource;
    whiteGainRef.current = gain;

    setIsWhitePlaying(true);
  };

  const stopWhiteNoise = () => {
    if (whiteSourceRef.current) {
      try { whiteSourceRef.current.stop(); } catch (e) {}
      whiteSourceRef.current = null;
    }
    setIsWhitePlaying(false);
  };

  const playZenGong = (ctx, destination, startTime) => {
    const now = startTime;
    // Resonant metallic singing bowl partials
    const frequencies = [150, 225, 300, 420, 570];
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      
      // Slow swell (0.4s attack) followed by long 8-second decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(idx === 0 ? 0.08 : 0.03, now + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 8.0);
      
      osc.connect(gainNode);
      gainNode.connect(destination);
      
      osc.start(now);
      osc.stop(now + 8.5);
    });
  };

  const playZen = () => {
    const ctx = initAudioContext();
    if (isZenPlaying) return;

    const gain = ctx.createGain();
    gain.gain.value = 0.3; // main master channel gain
    gain.connect(ctx.destination);

    const triggerZen = () => {
      const now = ctx.currentTime;
      playZenGong(ctx, gain, now + 0.1);
    };

    triggerZen();
    // Zen Singing Bowl gong every 10 seconds
    const intervalId = setInterval(() => {
      if (ctx.state === "running") {
        triggerZen();
      }
    }, 10000);

    zenGainRef.current = gain;
    zenIntervalRef.current = intervalId;

    setIsZenPlaying(true);
  };

  const stopZen = () => {
    if (zenIntervalRef.current) {
      clearInterval(zenIntervalRef.current);
      zenIntervalRef.current = null;
    }
    setIsZenPlaying(false);
  };

  const setBinauralVolume = (val) => {
    if (binauralGainRef.current) {
      binauralGainRef.current.gain.value = val;
    }
  };

  const setBrownVolume = (val) => {
    if (brownNoiseGainRef.current) {
      brownNoiseGainRef.current.gain.value = val;
    }
  };

  const setOceanVolume = (val) => {
    if (oceanGainRef.current) {
      oceanGainRef.current.gain.value = val;
    }
  };

  const setForestVolume = (val) => {
    if (forestGainRef.current) {
      forestGainRef.current.gain.value = val;
    }
  };

  const setWhiteVolume = (val) => {
    if (whiteGainRef.current) {
      whiteGainRef.current.gain.value = val;
    }
  };

  const setZenVolume = (val) => {
    if (zenGainRef.current) {
      zenGainRef.current.gain.value = val;
    }
  };

  const stopAll = () => {
    stopBinaural();
    stopBrownNoise();
    stopOcean();
    stopForest();
    stopWhiteNoise();
    stopZen();
  };

  useEffect(() => {
    return () => {
      stopAll();
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch(e){}
      }
    };
  }, []);

  return {
    playBinaural,
    stopBinaural,
    playBrownNoise,
    stopBrownNoise,
    playOcean,
    stopOcean,
    playForest,
    stopForest,
    playWhiteNoise,
    stopWhiteNoise,
    playZen,
    stopZen,
    setBinauralVolume,
    setBrownVolume,
    setOceanVolume,
    setForestVolume,
    setWhiteVolume,
    setZenVolume,
    stopAll,
    isBinauralPlaying,
    isBrownPlaying,
    isOceanPlaying,
    isForestPlaying,
    isWhitePlaying,
    isZenPlaying,
  };
}
