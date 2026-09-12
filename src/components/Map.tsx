import React, { useEffect, useRef, useMemo, useState } from 'react';
import MapLibreMap, { Layer, Source, Marker } from 'react-map-gl/maplibre';
import type { POI } from '../utils/overpass';
import { generateLoreForPOI } from '../utils/gemini';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  position: [number, number];
  avatarUrl: string;
  isArMode: boolean;
  geoJsonData: any;
  isSatelliteMode: boolean;
  nearbyPOIs?: POI[];
}

export const Map: React.FC<MapProps> = ({ position, avatarUrl, isArMode, geoJsonData, isSatelliteMode, nearbyPOIs = [] }) => {
  const mapRef = useRef<any>(null);
  
  // Track generated lores for POIs. Key is poi.id
  const [lores, setLores] = useState<Record<string, { loading: boolean, text: string }>>({});

  const handleRevealLore = async (poi: POI, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent map click
    if (lores[poi.id]?.loading || lores[poi.id]?.text) return; // already loading or loaded
    
    setLores(prev => ({ ...prev, [poi.id]: { loading: true, text: '' } }));
    const generatedText = await generateLoreForPOI(poi.name, poi.type);
    setLores(prev => ({ ...prev, [poi.id]: { loading: false, text: generatedText } }));
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
                <div className="bg-white rounded-xl p-2 shadow-2xl border-2 border-indigo-200 flex flex-col items-center w-48 pointer-events-auto transform hover:scale-105 transition-transform cursor-default">
                  <img src={imgUrl} alt={poi.type} className="w-full h-24 object-cover rounded-lg mb-2 bg-gray-100" />
                  <h3 className="text-sm font-bold text-gray-800 text-center leading-tight line-clamp-2">{poi.name}</h3>
                  <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
                    {poi.type}
                  </span>
                  
                  {/* Lore Section */}
                  <div className="mt-2 w-full">
                    {!lores[poi.id] && (
                      <button 
                        onClick={(e) => handleRevealLore(poi, e)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-2 rounded transition-colors"
                      >
                        Reveal Lore 📖
                      </button>
                    )}
                    
                    {lores[poi.id]?.loading && (
                      <div className="text-xs text-indigo-500 text-center py-2 animate-pulse font-bold">
                        Consulting the spirits... 🔮
                      </div>
                    )}

                    {lores[poi.id]?.text && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 max-h-32 overflow-y-auto italic">
                        "{lores[poi.id].text}"
                      </div>
                    )}
                  </div>

                  {/* Tooltip triangle at the bottom */}
                  <div className="absolute -bottom-2 w-4 h-4 bg-white border-b-2 border-r-2 border-indigo-200 transform rotate-45"></div>
                </div>
              </Marker>
            );
          })}
        </MapLibreMap>
      </div>
    </div>
  );
};
