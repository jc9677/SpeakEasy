// app.js - SpeakEasy
// Modern TTS Web App using Web Speech API

// Global Module object for sherpa-onnx WASM (don't use let/const/var)
Module = {};

// https://emscripten.org/docs/api_reference/module.html#Module.locateFile
Module.locateFile = function(path, scriptDirectory = '') {
  console.log(`path: ${path}, scriptDirectory: ${scriptDirectory}`);
  return 'assets/' + path;
};

// Global TTS instance
let tts = null;

// WASM readiness flag
window.wasmReady = false;

Module.onRuntimeInitialized = function() {
  console.log('sherpa-onnx WASM initialized');
  try {
    tts = createOfflineTts(Module);
    console.log('Piper TTS initialized successfully');
    window.wasmReady = true;
    
    // Enable the speak button
    const speakBtn = document.getElementById('speak-btn');
    if (speakBtn) {
      speakBtn.disabled = false;
      console.log('Speak button enabled - Piper TTS ready');
    }
  } catch (error) {
    console.error('Error initializing Piper TTS:', error);
  }
};

const textArea = document.getElementById('tts-text');
const voiceSelect = document.getElementById('voice-select');
const speedRange = document.getElementById('speed-range');
const speedValue = document.getElementById('speed-value');
const loopCheckbox = document.getElementById('loop-checkbox');
const speakBtn = document.getElementById('speak-btn');
const stopBtn = document.getElementById('stop-btn');
const resetTextBtn = document.getElementById('reset-text-btn');
const audioPlayer = document.getElementById('audio-player');

// Default welcome message
const DEFAULT_TEXT = "Welcome to SpeakEasy! Replace this text with whatever you want me to say.";

// Offline status management
function showOfflineReady() {
    // Create a temporary notification to show offline readiness
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
        App cached - now works offline!
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Listen for service worker events
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        showOfflineReady();
    });
}

// Preferences management
function loadPreferences() {
    const prefs = JSON.parse(localStorage.getItem('tts_prefs') || '{}');
    
    // Load text content (use saved text or default welcome message)
    const savedText = localStorage.getItem('tts_text');
    textArea.value = savedText !== null ? savedText : DEFAULT_TEXT;
    
    // Load voice preference (only if voices are available)
    if (prefs.voice && voiceSelect.options.length > 0) {
        // Check if the saved voice exists in the current voice list
        const savedVoiceExists = Array.from(voiceSelect.options).some(option => option.value === prefs.voice);
        if (savedVoiceExists) {
            voiceSelect.value = prefs.voice;
        }
    }
    
    // Load other preferences
    if (prefs.speed) {
        speedRange.value = prefs.speed;
        speedValue.textContent = speedRange.value;
    }
    if (prefs.loop !== undefined) {
        loopCheckbox.checked = prefs.loop;
    }
}

function savePreferences() {
    const prefs = {
        voice: voiceSelect.value,
        speed: speedRange.value,
        loop: loopCheckbox.checked
    };
    localStorage.setItem('tts_prefs', JSON.stringify(prefs));
}

function saveTextContent() {
    const text = textArea.value.trim();
    if (text && text !== DEFAULT_TEXT) {
        localStorage.setItem('tts_text', text);
    }
}

function resetTextContent() {
    textArea.value = DEFAULT_TEXT;
    localStorage.removeItem('tts_text');
    // Add a subtle animation to indicate the reset
    textArea.style.transform = 'scale(0.98)';
    setTimeout(() => {
        textArea.style.transform = 'scale(1)';
    }, 150);
}

// Event listeners for preferences
voiceSelect.addEventListener('change', savePreferences);
speedRange.addEventListener('input', () => {
    speedValue.textContent = speedRange.value;
    savePreferences();
});
loopCheckbox.addEventListener('change', savePreferences);

// Event listener for reset button
resetTextBtn.addEventListener('click', resetTextContent);

// --- Web Speech API Integration ---
let synth = window.speechSynthesis;
let utterance = null;
let loopRequested = false;
let currentText = '';

function populateVoices() {
    const voices = synth.getVoices();
    voiceSelect.innerHTML = '';
    voices.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = v.name + (v.lang ? ` (${v.lang})` : '');
        voiceSelect.appendChild(opt);
    });
    // Always add Piper (offline) option
    const piperOpt = document.createElement('option');
    piperOpt.value = '__piper__';
    piperOpt.textContent = 'Piper (offline)';
    voiceSelect.appendChild(piperOpt);

    // Restore saved voice preference
    const prefs = JSON.parse(localStorage.getItem('tts_prefs') || '{}');
    if (prefs.voice && Array.from(voiceSelect.options).some(o => o.value === prefs.voice)) {
        voiceSelect.value = prefs.voice;
    }

    // Show warning if only one or zero voices are available (excluding Piper)
    const warning = document.getElementById('voice-warning');
    if (voices.length <= 1) {
        warning.classList.add('show');
        warning.textContent =
            'Note: Your browser only provides a single TTS voice. Voice selection may not be available on this device/browser.';
    } else {
        warning.classList.remove('show');
    }
}

// Some browsers load voices asynchronously, but some never fire onvoiceschanged.
// We'll retry populating voices for a few seconds after page load.
let voicesPopulated = false;
function tryPopulateVoices(retries = 20, delay = 200) {
    populateVoices();
    const voices = synth.getVoices();
    if (voices.length > 0) {
        voicesPopulated = true;
        // Load other preferences after voices are populated
        loadPreferences();
        return;
    }
    if (retries > 0) {
        setTimeout(() => tryPopulateVoices(retries - 1, delay), delay);
    }
}

if (typeof synth.onvoiceschanged !== 'undefined') {
    synth.onvoiceschanged = () => {
        voicesPopulated = true;
        populateVoices();
        // Load preferences after voices change
        loadPreferences();
    };
}

// Piper (sherpa-onnx) integration
let piperTTS = null;
let piperReady = false;
let piperInitPromise = null;

// Function to wait for WASM module to be ready
function waitForWasmReady() {
    return new Promise((resolve, reject) => {
        if (typeof Module !== 'undefined' && Module.calledRun) {
            resolve();
            return;
        }
        
        // If Module is not defined yet, wait for it
        if (typeof Module === 'undefined') {
            const checkInterval = setInterval(() => {
                if (typeof Module !== 'undefined') {
                    clearInterval(checkInterval);
                    if (Module.calledRun) {
                        resolve();
                    } else {
                        Module.onRuntimeInitialized = () => resolve();
                    }
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('WASM module failed to load within 10 seconds'));
            }, 10000);
        } else {
            // Module exists but not ready
            Module.onRuntimeInitialized = () => resolve();
            
            // Timeout after 10 seconds
            setTimeout(() => {
                reject(new Error('WASM module failed to initialize within 10 seconds'));
            }, 10000);
        }
    });
}

// Piper (sherpa-onnx) integration - use reference demo approach
async function speak(text, voiceName, rate) {
    if (voiceName === '__piper__') {
        // Check WASM readiness
        if (!window.wasmReady || !tts) {
            alert('Offline TTS engine is still loading. Please wait a moment and try again.');
            throw new Error('WASM module not ready yet');
        }
        
        // Synthesize audio using the global tts instance
        const audio = tts.generate({
            text: text,
            sid: 0, // speaker id
            speed: parseFloat(rate) || 1.0,
        });
        
        // Play audio using AudioContext (same as reference demo)
        const ctx = new (window.AudioContext || window.webkitAudioContext)({sampleRate: tts.sampleRate});
        const buffer = ctx.createBuffer(1, audio.samples.length, tts.sampleRate);
        const ptr = buffer.getChannelData(0);
        for (let i = 0; i < audio.samples.length; i++) {
            ptr[i] = audio.samples[i];
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        source.onended = () => {
            ctx.close();
            if (loopRequested) {
                setTimeout(() => speak(currentText, voiceSelect.value, speedRange.value), 200);
            }
        };
        return;
    }
    
    // Default: Web Speech API
    if (synth.speaking) synth.cancel();
    utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    utterance.voice = voices.find(v => v.name === voiceName) || null;
    utterance.rate = parseFloat(rate);
    utterance.onend = () => {
        if (loopRequested) {
            setTimeout(() => speak(currentText, voiceSelect.value, speedRange.value), 200);
        }
    };
    synth.speak(utterance);
}

// Override speak button to support async Piper
speakBtn.addEventListener('click', function() {
    (async () => {
        try {
            const text = textArea.value.trim();
            if (!text) return;
            saveTextContent();
            currentText = text;
            loopRequested = loopCheckbox.checked;
            await speak(text, voiceSelect.value, speedRange.value);
        } catch (error) {
            console.error('Speech synthesis error:', error);
            alert('Speech synthesis failed: ' + error.message);
        }
    })();
});

stopBtn.addEventListener('click', () => {
    loopRequested = false;
    synth.cancel();
});

audioPlayer.style.display = 'none'; // Hide unused audio element

// Disable speak button until WASM is ready
speakBtn.disabled = true;

// Wait for WASM to be ready, then enable speak button
function enableSpeakWhenReady() {
    if (typeof Module !== 'undefined' && Module.calledRun) {
        speakBtn.disabled = false;
    } else {
        setTimeout(enableSpeakWhenReady, 100);
    }
}
window.addEventListener('DOMContentLoaded', enableSpeakWhenReady);

// Init
tryPopulateVoices();
// Load preferences initially (will be called again when voices are loaded)
loadPreferences();
