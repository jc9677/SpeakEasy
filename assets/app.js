// app.js - Voice Synthesis Studio
// Modern TTS Web App using Web Speech API

const textArea = document.getElementById('tts-text');
const voiceSelect = document.getElementById('voice-select');
const speedRange = document.getElementById('speed-range');
const speedValue = document.getElementById('speed-value');
const loopCheckbox = document.getElementById('loop-checkbox');
const speakBtn = document.getElementById('speak-btn');
const stopBtn = document.getElementById('stop-btn');
const audioPlayer = document.getElementById('audio-player');

// Preferences management
function loadPreferences() {
    const prefs = JSON.parse(localStorage.getItem('tts_prefs') || '{}');
    if (prefs.voice) voiceSelect.value = prefs.voice;
    if (prefs.speed) speedRange.value = prefs.speed;
    if (prefs.loop !== undefined) loopCheckbox.checked = prefs.loop;
    speedValue.textContent = speedRange.value;
}

function savePreferences() {
    const prefs = {
        voice: voiceSelect.value,
        speed: speedRange.value,
        loop: loopCheckbox.checked
    };
    localStorage.setItem('tts_prefs', JSON.stringify(prefs));
}

// Event listeners for preferences
voiceSelect.addEventListener('change', savePreferences);
speedRange.addEventListener('input', () => {
    speedValue.textContent = speedRange.value;
    savePreferences();
});
loopCheckbox.addEventListener('change', savePreferences);

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
    // Restore preference if available
    const prefs = JSON.parse(localStorage.getItem('tts_prefs') || '{}');
    if (prefs.voice) voiceSelect.value = prefs.voice;

    // Show warning if only one or zero voices are available
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
    };
}

function speak(text, voiceName, rate) {
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

speakBtn.addEventListener('click', () => {
    const text = textArea.value.trim();
    if (!text) return;
    currentText = text;
    loopRequested = loopCheckbox.checked;
    speak(text, voiceSelect.value, speedRange.value);
});

stopBtn.addEventListener('click', () => {
    loopRequested = false;
    synth.cancel();
});

audioPlayer.style.display = 'none'; // Hide unused audio element


// Init
tryPopulateVoices();
loadPreferences();
