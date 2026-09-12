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

## Current Features
- **Map & 3D Environment**: Upgraded from Leaflet to MapLibre GL for rich 3D rendering. Features dynamic 3D building extrusions based on live OpenStreetMap data, and toggles between a stylized "Pokemon Go" AR mode and a realistic Satellite mode.
- **Constrained Movement Physics**: The character moves using WASD or an on-screen virtual joystick. Movement is strictly constrained to real-world roads and footways calculated via point-line distance math against live OSM GeoJSON data.
- **Dynamic Map Data Fetching**: Bounding-box based fetching from the main OpenStreetMap API (`api.openstreetmap.org`). Map data seamlessly updates in a 250m radius as the player navigates the world.
- **Local POI Extraction**: Points of Interest (amenities, shops, leisure) are automatically extracted from the local OSM data. Map markers display dynamically generated placeholder images based on the POI's type.
- **Gemini Lore Generation**: Secure client-side integration with the Google Gemini API. Clicking "Reveal Lore" on any POI generates a custom, whimsical 2-3 sentence lore. The era of the story is evenly randomized 50/50 between the historical past (1000–2025) and the sci-fi future (2027–3000).
- **Floating Lore Interface**: A responsive, premium full-screen modal overlay for reading lore, featuring loading states, cached story retrieval, and large readable typography.