# Project Overview: Geo-Tale Explorers
**Goal**: A mobile-first web app (PWA) hosted on GitHub Pages. Users explore a real-world map (physically or via virtual joystick) to unlock a location-based, AI-generated branching story with real-time multiplayer party syncing.

## Tech Stack & Architecture
- **Frontend**: Vite + React or Vanilla ES6. 
- **Map Rendering**: Leaflet.js (OpenStreetMap tiles).
- **Backend/State**: Firebase Realtime Database (BaaS for multiplayer syncing).
- **External APIs**: 
  - Google Gemini 1.5 Flash (Story generation).
  - Nominatim OSM API (Reverse geocoding for genre).
- **Hosting**: GitHub Pages (Static files only, no backend).

## Core Development Rules
- **No Custom Backend**: Do not write Node.js/Express server code. All API calls (Gemini, Nominatim) must happen directly from the client using `fetch`.
- **UI/UX**: Prioritize mobile touch interfaces. Ensure the Leaflet map does not conflict with the virtual joystick gestures.
- **State Management**: Use standard state management (like React `useState` or Zustand) for player coordinates, the story array, and meme coins.

## Key Game Mechanics
1. **Movement**: Default to HTML5 `navigator.geolocation`. Provide a UI toggle to switch to a virtual joystick that manually increments the Lat/Lng state.
2. **Genre Seeding**: On initial load, fetch the locality name via Nominatim. Hash this string to select a story genre deterministically.
3. **Multiplayer**: 
   - Users generate or input a 4-6 character `partyCode`.
   - Firebase Path: `/parties/{partyCode}/users/{userId}`.
   - On coordinate change, push `{ lat, lng, timestamp }`. Listen to the party node to plot friends on the map.
4. **Story Unlocking**: Calculate distance traveled using the Haversine formula. Every 50 meters, call the Gemini API with context: [Genre, Previous Story, Current Direction].
5. **Meme Coin Rewind**: Players start with 5 useless coins. Clicking "Rewind" decrements a coin, removes the last story array item, reverts coordinates, and syncs to Firebase.