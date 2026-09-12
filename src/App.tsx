import { useEffect, useState, useRef } from 'react';
import { Map } from './components/Map';
import { JoystickOverlay } from './components/JoystickOverlay';
import { Character3D } from './components/Character3D';
import { fetchMapData, constrainToRoads } from './utils/overpass';

const DEFAULT_POSITION: [number, number] = [40.7812, -73.9665];

function App() {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isArMode, setIsArMode] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(null); // For MapLibre 3D Buildings
  
  const [isSatelliteMode, setIsSatelliteMode] = useState<boolean>(false);

  const joystickRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef<{ w: boolean; a: boolean; s: boolean; d: boolean }>({ w: false, a: false, s: false, d: false });
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef<[number, number]>(DEFAULT_POSITION);
  const geoJsonRef = useRef<any>(null);

  useEffect(() => {
    const randomSeed = Math.random().toString(36).substring(2, 8);
    setAvatarUrl(`https://api.dicebear.com/9.x/lorelei/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          positionRef.current = [pos.coords.latitude, pos.coords.longitude];
        },
        (err) => console.warn("Geolocation failed", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Fetch local GeoJSON for roads and buildings via Overpass
  useEffect(() => {
    const fetchLocalData = async () => {
      const [lat, lon] = positionRef.current;
      const data = await fetchMapData(lat, lon, 500); // 500m radius
      if (data) {
        setGeoJsonData(data);
        geoJsonRef.current = data;
      }
    };

    // Fetch immediately, then every 10 seconds to ensure we have chunks loaded as we walk
    fetchLocalData();
    const interval = setInterval(fetchLocalData, 10000);
    return () => clearInterval(interval);
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
        const calibratedSpeed = 0.0000000300 * deltaTime;
        
        const proposedLat = positionRef.current[0] + dy * calibratedSpeed;
        const proposedLon = positionRef.current[1] + dx * calibratedSpeed;

        // Apply strict physics constraint!
        const constrainedPos = constrainToRoads(proposedLat, proposedLon, geoJsonRef.current);
        
        setPosition(constrainedPos);
        positionRef.current = constrainedPos;
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
      />
      
      {isArMode && <Character3D isMoving={isMoving} />}
      
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
        {!geoJsonData && <p className="text-xs text-orange-500 font-bold mt-1">Loading 3D world data...</p>}
      </div>

      <JoystickOverlay onMove={handleJoystickMove} onStop={handleJoystickStop} />
    </div>
  );
}

export default App;
