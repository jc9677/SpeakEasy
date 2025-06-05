# SpeakEasy - An offline TTS Web App

A simple, browser-based Text-to-Speech (TTS) app that works offline using your system's built-in voices via the Web Speech API. No server, no WASM, no external models required—just open in your browser or deploy to GitHub Pages!

## Features
- Enter text and have it spoken aloud
- Select from available system voices
- Adjust speech speed
- Loop playback
- Remembers your preferences (voice, speed, loop)
- **Full offline support** - works without internet after first load
- **Progressive Web App (PWA)** - can be installed on your device
- Responsive design that works on mobile and desktop

## Offline Functionality
After your first visit, SpeakEasy will work completely offline:
- Service Worker caches all app files automatically
- Refreshing the page works even when offline
- Can be installed as a standalone app on mobile/desktop
- All TTS functionality works offline (uses system voices)

## Usage
1. **Local Testing**
   - Start a local server (for example):
     ```sh
     python3 -m http.server 8000
     ```
   - Open [http://localhost:8000/](http://localhost:8000/) in your browser.
   - After the first load, the app will work offline (you can even stop the server!)

2. **Deploy to GitHub Pages**
   - Push this repository to GitHub.
   - Go to your repo's **Settings > Pages** and set the source branch (usually `main`) and root (`/`).
   - Your app will be live at `https://<your-username>.github.io/<your-repo-name>/`.

3. **Install as PWA**
   - On desktop: Look for an "Install" button in your browser's address bar
   - On mobile: Use "Add to Home Screen" from your browser's menu
   - Once installed, it works like a native app with full offline support

## How it works
- Uses the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) for TTS.
- **Service Worker** caches all resources for offline functionality.
- **Web App Manifest** enables PWA installation and standalone app experience.
- All logic is in `assets/app.js` and UI in `index.html`.
- No backend, no dependencies, no build step.

## Browser Support
- Works in all modern browsers (Chrome, Edge, Safari, Firefox).
- Voice selection and quality depend on your OS and browser.

## Customization
- Edit `index.html` and `assets/app.js` to change the UI or add features.
- Style with `assets/styles.css`.

## License
MIT?
