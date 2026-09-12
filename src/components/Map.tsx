import React, { useEffect, useRef, useMemo, useState } from 'react';
import MapLibreMap, { Layer, Source, Marker } from 'react-map-gl/maplibre';
import type { POI } from '../utils/overpass';
import { generateLoreForPOI } from '../utils/gemini';
import type { LoreEntry, Mission } from '../utils/gemini';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  position: [number, number];
  avatarUrl: string;
  isArMode: boolean;
  geoJsonData: any;
  isSatelliteMode: boolean;
  nearbyPOIs?: POI[];
  setXp: React.Dispatch<React.SetStateAction<number>>;
  lorebook: LoreEntry[];
  setLorebook: React.Dispatch<React.SetStateAction<LoreEntry[]>>;
  activeMission: Mission | null;
  setActiveMission: React.Dispatch<React.SetStateAction<Mission | null>>;
}

export const Map: React.FC<MapProps> = ({ 
  position, avatarUrl, isArMode, geoJsonData, isSatelliteMode, nearbyPOIs = [],
  setXp, lorebook, setLorebook, activeMission, setActiveMission
}) => {
  const mapRef = useRef<any>(null);
  
  // Track generated lores for POIs. Key is poi.id
  const [lores, setLores] = useState<Record<string, { loading: boolean, text: string }>>({});
  const [activeLorePOI, setActiveLorePOI] = useState<POI | null>(null);

  const handleRevealLore = async (poi: POI, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent map click
    setActiveLorePOI(poi);
    if (lores[poi.id]?.loading || lores[poi.id]?.text) return; // already loading or loaded
    
    // Award XP for discovering POI
    let earnedXP = 10;
    
    // Check if it completes active mission
    let completedMission = false;
    if (activeMission && activeMission.targetPOIType.toLowerCase() === poi.type.toLowerCase()) {
      earnedXP += 50; // Mission Complete
      completedMission = true;
    }
    
    setXp(prev => prev + earnedXP);
    if (completedMission) {
      setActiveMission(null);
    }
    
    setLores(prev => ({ ...prev, [poi.id]: { loading: true, text: '' } }));
    
    // Fetch JSON from Gemini API
    const response = await generateLoreForPOI(poi.name, poi.type, lorebook, activeMission);
    
    if (response) {
      setLores(prev => ({ ...prev, [poi.id]: { loading: false, text: response.narrative } }));
      
      // Update Lorebook
      setLorebook(prev => [...prev, {
        id: poi.id,
        poiName: poi.name,
        poiType: poi.type,
        narrative: response.narrative
      }]);

      // Accept new mission
      if (response.next_mission_objective && response.mission_text) {
        setActiveMission({
          targetPOIType: response.next_mission_objective,
          missionText: response.mission_text
        });
        setXp(prev => prev + 5); // XP for accepting mission
      }
    } else {
      setLores(prev => ({ ...prev, [poi.id]: { loading: false, text: "The ancient texts are silent." } }));
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [position[1], position[0]],
        duration: 0, 
      });
    }
  }, [position]);

  // We only apply the vibrant Pokemon Go filter if we are NOT in satellite mode, 
  // because satellite imagery looks strange with extreme saturation/hue shifting.
  const filterStyle = (isArMode && !isSatelliteMode) 
    ? 'saturate(200%) hue-rotate(15deg) brightness(1.1) contrast(1.1)' 
    : 'none';

  // Filter building polygons from the geoJson payload
  const buildingsGeoJson = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return { type: 'FeatureCollection' as const, features: [] };
    
    const buildings = geoJsonData.features.filter((f: any) => 
      f.geometry.type === 'Polygon' && f.properties.building
    );
    
    return { type: 'FeatureCollection' as const, features: buildings };
  }, [geoJsonData]);

  const buildingLabelsGeoJson = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return { type: 'FeatureCollection' as const, features: [] };
    
    const namedBuildings = geoJsonData.features.filter((f: any) => 
      f.geometry.type === 'Polygon' && f.properties.building && f.properties.name
    );
    
    return { type: 'FeatureCollection' as const, features: namedBuildings };
  }, [geoJsonData]);

  // Define the Satellite Style Object
  const satelliteStyle = {
    version: 8 as const,
    sources: {
      'satellite': {
        type: 'raster' as const,
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Tiles &copy; Esri'
      }
    },
    layers: [
      {
        id: 'satellite-layer',
        type: 'raster' as const,
        source: 'satellite',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  };

  // Carto Voyager Style for default maps
  const defaultStyle = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

  return (
    <div className="w-full h-full overflow-hidden bg-[#b6e3f4]" style={{ perspective: '800px' }}>
      <div 
        className="w-[150%] h-[150%] absolute -top-1/4 -left-1/4 origin-center transition-transform duration-1000 ease-in-out" 
        style={{ 
          transform: isArMode ? 'rotateX(50deg) scale(1)' : 'rotateX(0deg) scale(0.7)',
          filter: filterStyle,
          transition: 'transform 1s ease-in-out, filter 1s ease-in-out'
        }}
      >
        <MapLibreMap
          ref={mapRef}
          initialViewState={{
            longitude: position[1],
            latitude: position[0],
            zoom: 18,
            pitch: isArMode ? 45 : 0, 
            bearing: 0
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={isSatelliteMode ? satelliteStyle : defaultStyle}
          interactive={false} 
        >
          {/* Overpass Buildings 3D Extrusion Layer */}
          {buildingsGeoJson.features.length > 0 && (
            <Source id="overpass-buildings" type="geojson" data={buildingsGeoJson}>
              <Layer 
                id="3d-buildings-extrusion"
                type="fill-extrusion"
                paint={{
                  'fill-extrusion-color': isSatelliteMode ? '#a3a3a3' : '#e2e8f0', // Darker blocks in satellite mode
                  'fill-extrusion-height': [
                    'coalesce',
                    ['to-number', ['get', 'height']],
                    20
                  ],
                  'fill-extrusion-base': 0,
                  'fill-extrusion-opacity': isSatelliteMode ? 0.7 : 0.9 // More transparent so we see the satellite ground
                }}
              />
            </Source>
          )}

          {/* Overpass Building Labels Layer */}
          {buildingLabelsGeoJson.features.length > 0 && (
            <Source id="overpass-building-labels" type="geojson" data={buildingLabelsGeoJson}>
              <Layer 
                id="building-labels"
                type="symbol"
                layout={{
                  'text-field': ['get', 'name'],
                  'text-font': ['Open Sans Regular'],
                  'text-size': 12,
                  'text-anchor': 'top',
                  'text-allow-overlap': false
                }}
                paint={{
                  'text-color': isSatelliteMode ? '#ffffff' : '#333333',
                  'text-halo-color': isSatelliteMode ? '#000000' : '#ffffff',
                  'text-halo-width': 2
                }}
              />
            </Source>
          )}

          {!isArMode && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10
              }}
            >
              <img 
                src={avatarUrl} 
                style={{ width: '64px', height: '64px' }} 
                className="drop-shadow-lg bg-white rounded-full p-1 border-4 border-blue-500" 
              />
            </div>
          )}

          {/* Render Nearby POI Popups */}
          {nearbyPOIs.map((poi) => {
            // Using picsum photos with a seeded ID so it stays consistent per POI ID
            // or loremflickr with a keyword
            const imgUrl = `https://loremflickr.com/150/150/${poi.type}?lock=${poi.id.replace(/\D/g, '') || '1'}`;
            
            return (
              <Marker 
                key={poi.id} 
                longitude={poi.lon} 
                latitude={poi.lat} 
                anchor="bottom"
              >
                <div 
                  className="bg-white rounded-xl p-2 shadow-2xl border-2 border-indigo-200 flex flex-col items-center w-48 pointer-events-auto cursor-default"
                  style={{
                    transform: isArMode ? 'rotateX(-50deg)' : 'none',
                    transformOrigin: 'bottom center',
                    transition: 'transform 1s ease-in-out'
                  }}
                >
                  <div className="transform hover:scale-105 transition-transform w-full flex flex-col items-center">
                    <img src={imgUrl} alt={poi.type} className="w-full h-24 object-cover rounded-lg mb-2 bg-gray-100" />
                    <h3 className="text-sm font-bold text-gray-800 text-center leading-tight line-clamp-2">{poi.name}</h3>
                    <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                      {poi.type}
                    </span>
                    
                    {/* Lore Section */}
                    <div className="mt-2 w-full">
                      <button 
                        onClick={(e) => handleRevealLore(poi, e)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-2 rounded transition-colors shadow-sm"
                      >
                        {lores[poi.id]?.text ? "Read Lore 📖" : "Reveal Lore 📖"}
                      </button>
                    </div>

                    {/* Tooltip triangle at the bottom */}
                    <div className="absolute -bottom-2 w-4 h-4 bg-white border-b-2 border-r-2 border-indigo-200 transform rotate-45"></div>
                  </div>
                </div>
              </Marker>
            );
          })}
        </MapLibreMap>
      </div>

      {/* Floating Lore Menu */}
      {activeLorePOI && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 pointer-events-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-lg transform scale-100 transition-transform">
            <div className="relative h-56">
              <img 
                src={`https://loremflickr.com/600/400/${activeLorePOI.type}?lock=${activeLorePOI.id.replace(/\D/g, '') || '1'}`} 
                alt={activeLorePOI.type} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/90 via-[#1a1a2e]/40 to-transparent" />
              <button 
                onClick={() => setActiveLorePOI(null)}
                className="absolute top-4 right-4 bg-black/30 hover:bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm transition-colors text-xl font-bold"
                aria-label="Close"
              >
                ✕
              </button>
              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-block bg-indigo-500 text-white text-[10px] uppercase font-bold tracking-widest py-1 px-3 rounded-full mb-2 shadow-lg">
                  {activeLorePOI.type}
                </span>
                <h2 className="text-3xl font-extrabold text-white leading-tight drop-shadow-md">
                  {activeLorePOI.name}
                </h2>
              </div>
            </div>
            
            <div className="p-8 min-h-[200px] flex flex-col justify-center items-center bg-[#f8f9fa]">
              {lores[activeLorePOI.id]?.loading ? (
                <div className="flex flex-col items-center justify-center space-y-5 py-6">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin shadow-sm" />
                  <p className="text-indigo-600 font-bold tracking-wide animate-pulse">Consulting the ancient spirits...</p>
                </div>
              ) : lores[activeLorePOI.id]?.text ? (
                <p className="text-xl text-gray-800 italic leading-relaxed text-center font-serif relative">
                  <span className="text-5xl text-indigo-200 absolute -top-4 -left-6 leading-none">"</span>
                  {lores[activeLorePOI.id].text}
                  <span className="text-5xl text-indigo-200 absolute -bottom-8 -right-6 leading-none">"</span>
                </p>
              ) : (
                <p className="text-gray-400 text-center italic">
                  Lore is mysteriously missing.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
