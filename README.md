# Offline TTS Web App

A simple, browser-based Text-to-Speech (TTS) app that works offline using your system's built-in voices via the Web Speech API. No server, no WASM, no external models required—just open in your browser or deploy to GitHub Pages!

## Features
- Enter text and have it spoken aloud
- Select from available system voices
- Adjust speech speed
- Loop playback
- Remembers your preferences (voice, speed, loop)
- Works offline after first load (as a static site)

## Usage
1. **Local Testing**
   - Start a local server (for example):
     ```sh
     python3 -m http.server 8000
     ```
   - Open [http://localhost:8000/](http://localhost:8000/) in your browser.

2. **Deploy to GitHub Pages**
   - Push this repository to GitHub.
   - Go to your repo's **Settings > Pages** and set the source branch (usually `main`) and root (`/`).
   - Your app will be live at `https://<your-username>.github.io/<your-repo-name>/`.

## How it works
- Uses the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) for TTS.
- All logic is in `assets/app.js` and UI in `index.html`.
- No backend, no dependencies, no build step.

## Browser Support
- Works in all modern browsers (Chrome, Edge, Safari, Firefox).
- Voice selection and quality depend on your OS and browser.

## Customization
- Edit `index.html` and `assets/app.js` to change the UI or add features.
- Style with `assets/styles.css`.

## License
MIT
