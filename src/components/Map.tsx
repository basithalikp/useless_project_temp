import React, { useEffect, useRef, useMemo } from 'react';
import MapLibreMap, { Layer, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  position: [number, number];
  avatarUrl: string;
  isArMode: boolean;
  geoJsonData: any;
}

export const Map: React.FC<MapProps> = ({ position, avatarUrl, isArMode, geoJsonData }) => {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [position[1], position[0]],
        duration: 0, 
      });
    }
  }, [position]);

  const filterStyle = isArMode ? 'saturate(200%) hue-rotate(15deg) brightness(1.1) contrast(1.1)' : 'none';

  // Filter building polygons from the geoJson payload
  const buildingsGeoJson = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return { type: 'FeatureCollection' as const, features: [] };
    
    // We only want polygons that have the building tag for 3D extrusion
    const buildings = geoJsonData.features.filter((f: any) => 
      f.geometry.type === 'Polygon' && f.properties.building
    );
    
    return { type: 'FeatureCollection' as const, features: buildings };
  }, [geoJsonData]);

  // Filter building polygons that have names for our text labels
  const buildingLabelsGeoJson = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return { type: 'FeatureCollection' as const, features: [] };
    
    const namedBuildings = geoJsonData.features.filter((f: any) => 
      f.geometry.type === 'Polygon' && f.properties.building && f.properties.name
    );
    
    return { type: 'FeatureCollection' as const, features: namedBuildings };
  }, [geoJsonData]);

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
          mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          interactive={false} 
        >
          {/* Overpass Buildings 3D Extrusion Layer */}
          {buildingsGeoJson.features.length > 0 && (
            <Source id="overpass-buildings" type="geojson" data={buildingsGeoJson}>
              <Layer 
                id="3d-buildings-extrusion"
                type="fill-extrusion"
                paint={{
                  'fill-extrusion-color': '#e2e8f0',
                  // Use real height if present, otherwise default to a robust 20 meters
                  'fill-extrusion-height': [
                    'coalesce',
                    ['to-number', ['get', 'height']],
                    20
                  ],
                  'fill-extrusion-base': 0,
                  'fill-extrusion-opacity': 0.9
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
                  'text-font': ['Open Sans Regular'], // Standard web font supported by most styles
                  'text-size': 12,
                  'text-anchor': 'top',
                  // Only show names when tilted (AR Mode) or at high zoom levels
                  'text-allow-overlap': false
                }}
                paint={{
                  'text-color': '#333333',
                  'text-halo-color': '#ffffff',
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
        </MapLibreMap>
      </div>
    </div>
  );
};
