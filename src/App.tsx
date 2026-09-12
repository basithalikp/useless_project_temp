import { useEffect, useState, useRef } from 'react';
import { Map } from './components/Map';
import { JoystickOverlay } from './components/JoystickOverlay';

// Default to a generic location (e.g. Central Park, NY) if geolocation fails
const DEFAULT_POSITION: [number, number] = [40.7812, -73.9665];

function App() {
  const [position, setPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const joystickRef = useRef<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Generate a random seed for the DiceBear avatar
    const randomSeed = Math.random().toString(36).substring(2, 8);
    setAvatarUrl(`https://api.dicebear.com/9.x/lorelei/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`);

    // Try to get actual location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => console.warn("Geolocation failed or denied, using default location.", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Update loop for joystick movement
  useEffect(() => {
    let lastTime = performance.now();

    const updateLoop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      if (joystickRef.current) {
        // speed modifier
        const speed = 0.000005 * deltaTime;
        
        setPosition((prev) => {
          // joystick y is positive upwards, x is positive rightwards. 
          // latitude increases north (up), longitude increases east (right).
          return [
            prev[0] + joystickRef.current!.y * speed,
            prev[1] + joystickRef.current!.x * speed,
          ];
        });
      }

      animationRef.current = requestAnimationFrame(updateLoop);
    };

    animationRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleJoystickMove = (data: { x: number; y: number }) => {
    joystickRef.current = data;
  };

  const handleJoystickStop = () => {
    joystickRef.current = null;
  };

  if (!avatarUrl) return null; // loading

  return (
    <div className="w-screen h-screen relative">
      <Map position={position} avatarUrl={avatarUrl} />
      <JoystickOverlay onMove={handleJoystickMove} onStop={handleJoystickStop} />
    </div>
  );
}

export default App;
