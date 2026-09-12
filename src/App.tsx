import { useEffect, useState, useRef } from 'react';
import { Map } from './components/Map';
import { JoystickOverlay } from './components/JoystickOverlay';
import { Character3D } from './components/Character3D';
import { fetchMapData, constrainToRoads, extractPOIs } from './utils/overpass';
import type { POI } from './utils/overpass';
import type { LoreEntry, Mission } from './utils/gemini';

const DEFAULT_POSITION: [number, number] = [40.7812, -73.9665];

function App() {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isArMode, setIsArMode] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [isRidingHorse, setIsRidingHorse] = useState<boolean>(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(null); // For MapLibre 3D Buildings
  const [nearbyPOIs, setNearbyPOIs] = useState<POI[]>([]);
  const [mapDataFailed, setMapDataFailed] = useState<boolean>(false);

  const [isSatelliteMode, setIsSatelliteMode] = useState<boolean>(false);

  const [xp, setXp] = useState<number>(0);
  const [lorebook, setLorebook] = useState<LoreEntry[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [isLorebookOpen, setIsLorebookOpen] = useState<boolean>(false);

  const joystickRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef<{ w: boolean; a: boolean; s: boolean; d: boolean }>({ w: false, a: false, s: false, d: false });
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef<[number, number]>(DEFAULT_POSITION);
  const geoJsonRef = useRef<any>(null);
  const isRidingHorseRef = useRef<boolean>(false);
  const isMapDataLoadingRef = useRef<boolean>(true);
  const allPoisRef = useRef<POI[]>([]);
  const nearbyPOIsRef = useRef<POI[]>([]);
  const lastFetchCenterRef = useRef<[number, number] | null>(null);

  // Function to fetch local GeoJSON for roads and buildings
  const fetchLocalData = async (lat: number, lon: number) => {
    isMapDataLoadingRef.current = true;
    const data = await fetchMapData(lat, lon, 250); // 250m radius
    if (data) {
      setGeoJsonData(data);
      geoJsonRef.current = data;
      allPoisRef.current = extractPOIs(data);
      lastFetchCenterRef.current = [lat, lon];
      setMapDataFailed(false);
    } else {
      setMapDataFailed(true);
    }
    isMapDataLoadingRef.current = false;
  };

  useEffect(() => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    setAvatarUrl(`https://api.dicebear.com/9.x/lorelei/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          positionRef.current = [pos.coords.latitude, pos.coords.longitude];
          // Fetch map data immediately for the user's real location
          fetchLocalData(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn("Geolocation failed", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    // Initial fetch for the default position in case geolocation fails or is slow
    fetchLocalData(positionRef.current[0], positionRef.current[1]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        keysRef.current[e.key.toLowerCase() as keyof typeof keysRef.current] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        keysRef.current[e.key.toLowerCase() as keyof typeof keysRef.current] = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Strict physics update loop
  useEffect(() => {
    let lastTime = performance.now();

    const updateLoop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      let dx = 0;
      let dy = 0;

      if (joystickRef.current) {
        dx += joystickRef.current.x;
        dy += joystickRef.current.y;
      } else {
        if (keysRef.current.w) dy += 50;
        if (keysRef.current.s) dy -= 50;
        if (keysRef.current.d) dx += 50;
        if (keysRef.current.a) dx -= 50;
      }

      const currentlyMoving = dx !== 0 || dy !== 0;
      setIsMoving(currentlyMoving);

      if (currentlyMoving) {
        // Prevent movement only during initial active loading. If API fails, fallback to free movement.
        if (isMapDataLoadingRef.current && !geoJsonRef.current) {
          animationRef.current = requestAnimationFrame(updateLoop);
          return;
        }

        const speedMultiplier = isRidingHorseRef.current ? 0.0000001500 : 0.0000000300;
        const calibratedSpeed = speedMultiplier * deltaTime;

        const proposedLat = positionRef.current[0] + dy * calibratedSpeed;
        const proposedLon = positionRef.current[1] + dx * calibratedSpeed;

        // Apply strict physics constraint!
        const constrainedPos = constrainToRoads(proposedLat, proposedLon, geoJsonRef.current);

        setPosition(constrainedPos);
        positionRef.current = constrainedPos;

        // Fetch new data if we moved > 150m from the last fetch center (approx 0.0000018 sq deg)
        if (lastFetchCenterRef.current) {
          const distFromCenterSq = (constrainedPos[0] - lastFetchCenterRef.current[0])**2 + (constrainedPos[1] - lastFetchCenterRef.current[1])**2;
          if (distFromCenterSq > 0.0000018 && !isMapDataLoadingRef.current) {
            fetchLocalData(constrainedPos[0], constrainedPos[1]);
          }
        }

        // Check for nearby POIs (within ~50 meters => distSq < 0.0000002)
        const nearby = allPoisRef.current.filter(poi => {
          const distSq = (poi.lat - positionRef.current[0])**2 + (poi.lon - positionRef.current[1])**2;
          return distSq < 0.0000002; 
        });
        
        // Update state only if changed
        if (nearby.length !== nearbyPOIsRef.current.length || !nearby.every((n, i) => n.id === nearbyPOIsRef.current[i]?.id)) {
          nearbyPOIsRef.current = nearby;
          setNearbyPOIs(nearby);
        }
      }

      animationRef.current = requestAnimationFrame(updateLoop);
    };

    animationRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleJoystickMove = (data: { x: number; y: number }) => { joystickRef.current = data; };
  const handleJoystickStop = () => { joystickRef.current = null; };

  if (!avatarUrl) return null;

  return (
    <div className="w-screen h-screen relative font-sans overflow-hidden bg-[#b6e3f4]">
      <Map
        position={position}
        avatarUrl={avatarUrl}
        isArMode={isArMode}
        geoJsonData={geoJsonData}
        isSatelliteMode={isSatelliteMode}
        nearbyPOIs={nearbyPOIs}
        setXp={setXp}
        lorebook={lorebook}
        setLorebook={setLorebook}
        activeMission={activeMission}
        setActiveMission={setActiveMission}
      />

      {isArMode && <Character3D isMoving={isMoving} isRidingHorse={isRidingHorse} />}

      {isArMode && (
        <div className="absolute bottom-24 right-4 z-[1000]">
          <button
            onClick={() => {
              setIsRidingHorse(!isRidingHorse);
              isRidingHorseRef.current = !isRidingHorse;
            }}
            className={`bg-white text-3xl p-3 rounded-full drop-shadow-lg border-4 transition-transform ${isRidingHorse ? 'border-orange-500 scale-110' : 'border-gray-300 hover:scale-105'}`}
            title={isRidingHorse ? "Dismount Horse" : "Ride Horse"}
          >
            🐎
          </button>
        </div>
      )}

      {/* Lorebook Button (positioned above the horse button) */}
      <div className="absolute bottom-40 right-4 z-[1000]">
        <button
          onClick={() => setIsLorebookOpen(true)}
          className="bg-[#8b5a2b] text-white text-2xl p-3 rounded-full drop-shadow-lg border-2 border-[#5c3a21] hover:scale-105 transition-transform"
          title="Open Lorebook"
        >
          📖
        </button>
      </div>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setIsArMode(!isArMode)}
          className="bg-white text-blue-600 font-bold py-2 px-6 rounded-full drop-shadow-md border-2 border-blue-500 hover:bg-blue-50 transition-colors"
        >
          {isArMode ? '🔙 Revert to Classic 2D' : '🦊 Pokemon Go Mode'}
        </button>
        <button
          onClick={() => setIsSatelliteMode(!isSatelliteMode)}
          className="bg-gray-800 text-white font-bold py-2 px-6 rounded-full drop-shadow-md border-2 border-gray-600 hover:bg-gray-700 transition-colors"
        >
          {isSatelliteMode ? '🗺️ Map View' : '🛰️ Satellite View'}
        </button>
      </div>

      <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur text-gray-800 text-sm font-medium py-3 px-5 rounded-2xl drop-shadow-md border border-gray-100 max-w-xs pointer-events-none">
        <h1 className="text-lg font-bold text-blue-600 mb-1">Geo-Tale</h1>
        <p>Use <b>WASD</b> or the <b>Joystick</b> to move.</p>
        <p className="text-xs text-gray-500 mt-1">Movement is strictly constrained to real-world roads using local physics.</p>
        {!geoJsonData && !mapDataFailed && <p className="text-xs text-orange-500 font-bold mt-1">Loading 3D world data...</p>}
        {mapDataFailed && <p className="text-xs text-red-500 font-bold mt-1">⚠️ Map server offline. Free movement enabled.</p>}
      </div>

      {/* Mission UI */}
      <div className="absolute bottom-4 left-4 z-[1000] w-72 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-indigo-100 pointer-events-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-1">
              <span>🎯</span> Active Mission
            </h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded-full">
              {xp} XP
            </span>
          </div>
          {activeMission ? (
            <div>
              <p className="text-xs text-gray-600 leading-tight mb-2">
                {activeMission.missionText}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-400">Target Type:</span>
                <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  {activeMission.targetPOIType}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No active mission. Explore POIs to find one!</p>
          )}
        </div>
      </div>

      <JoystickOverlay onMove={handleJoystickMove} onStop={handleJoystickStop} />

      {/* Lorebook Modal */}
      {isLorebookOpen && (
        <div className="absolute inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 md:p-12 pointer-events-auto">
          <div className="bg-[#f4ebd0] w-full max-w-2xl h-full max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border-4 border-[#8b5a2b] animate-fade-in-up">
            <div className="bg-[#8b5a2b] text-[#f4ebd0] p-4 flex justify-between items-center shadow-md z-10">
              <h2 className="text-2xl font-serif font-bold tracking-widest uppercase">The Lorebook</h2>
              <button onClick={() => setIsLorebookOpen(false)} className="text-[#f4ebd0] text-xl font-bold hover:text-white transition-colors p-2">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {lorebook.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-70">
                  <span className="text-6xl mb-4">🕸️</span>
                  <p className="text-center text-[#8b5a2b] italic font-serif text-lg">The pages are empty.<br/>Explore the world to uncover its secrets.</p>
                </div>
              ) : (
                lorebook.map((entry, idx) => (
                  <div key={idx} className="border-b border-[#d2b48c] pb-4 last:border-0 relative">
                    <span className="absolute top-0 right-0 text-[10px] font-bold text-[#8b5a2b]/60 uppercase bg-[#d2b48c]/30 px-2 py-0.5 rounded-full">{entry.poiType}</span>
                    <h3 className="font-serif font-bold text-[#5c3a21] text-lg mb-2 pr-20">{entry.poiName}</h3>
                    <p className="font-serif text-[#3e2723] leading-relaxed text-sm md:text-base">"{entry.narrative}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
