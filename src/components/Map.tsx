import React, { useEffect, useRef, useMemo } from 'react';
import MapLibreMap, { Layer, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
  position: [number, number];
  avatarUrl: string;
  isArMode: boolean;
  geoJsonData: any;
  isSatelliteMode: boolean;
}

export const Map: React.FC<MapProps> = ({ position, avatarUrl, isArMode, geoJsonData, isSatelliteMode }) => {
  const mapRef = useRef<any>(null);

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
        </MapLibreMap>
      </div>
    </div>
  );
};
