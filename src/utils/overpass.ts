import osmtogeojson from 'osmtogeojson';

/**
 * Utility to fetch OpenStreetMap data (buildings and roads) via Overpass API 
 * for a specific bounding box and convert it to GeoJSON.
 */

// We'll cache results so we don't spam the Overpass API if we stay in the same area.
let lastBboxStr = '';
let cachedGeoJSON: any = null;

export async function fetchMapData(lat: number, lon: number, radiusMeters: number = 250) {
  // Approximate bounding box (1 degree latitude is approx 111,000 meters)
  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos(lat * (Math.PI / 180)));

  const s = lat - latDelta;
  const n = lat + latDelta;
  const w = lon - lonDelta;
  const e = lon + lonDelta;

  // OSM API bbox format is: min_lon, min_lat, max_lon, max_lat
  const bbox = `${w},${s},${e},${n}`;
  
  // If we've already fetched this approximate area recently, return cache
  if (lastBboxStr === bbox && cachedGeoJSON) {
    return cachedGeoJSON;
  }

  const endpoint = `https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`;

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.error(`OSM API failed with status:`, response.status);
      return null;
    }

    const osmXml = await response.text();
    const dom = new DOMParser().parseFromString(osmXml, 'text/xml');

    // Convert the raw OSM XML DOM to GeoJSON
    const geojson = osmtogeojson(dom);

    // Cache the result
    lastBboxStr = bbox;
    cachedGeoJSON = geojson;

    return geojson;
  } catch (error) {
    console.error("Failed to fetch or parse OSM data", error);
    return null;
  }
}

/**
 * Pure Math: find closest point on a line segment to a target point
 */
function closestPointOnSegment(p: [number, number], a: [number, number], b: [number, number]): [number, number] {
  const atob = [b[0] - a[0], b[1] - a[1]];
  const atop = [p[0] - a[0], p[1] - a[1]];
  const lenSq = atob[0] * atob[0] + atob[1] * atob[1];
  
  if (lenSq === 0) return a; // a and b are the same point
  
  let dot = atop[0] * atob[0] + atop[1] * atob[1];
  let t = Math.min(1, Math.max(0, dot / lenSq));
  
  return [a[0] + t * atob[0], a[1] + t * atob[1]];
}

function distSq(p1: [number, number], p2: [number, number]) {
  return (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]);
}

/**
 * Constrains a proposed position to the nearest road segment in the GeoJSON.
 */
export function constrainToRoads(
  proposedLat: number, 
  proposedLon: number, 
  geojson: any
): [number, number] {
  if (!geojson || !geojson.features) return [proposedLat, proposedLon];

  // Filter out features that are just highways (LineStrings)
  const roads = geojson.features.filter((f: any) => 
    f.geometry.type === 'LineString' && f.properties.highway
  );

  if (roads.length === 0) return [proposedLat, proposedLon];

  const p: [number, number] = [proposedLat, proposedLon];
  let closestPoint: [number, number] | null = null;
  let minDistsq = Infinity;

  // Brute force all road segments
  // (In a massive app, use a spatial index like rbush, but for local 500m it's extremely fast)
  for (const road of roads) {
    const coords = road.geometry.coordinates; // [lon, lat] pairs
    for (let i = 0; i < coords.length - 1; i++) {
      // Overpass GeoJSON gives [lon, lat]. We swap it to [lat, lon] for our math
      const a: [number, number] = [coords[i][1], coords[i][0]];
      const b: [number, number] = [coords[i+1][1], coords[i+1][0]];
      
      const pt = closestPointOnSegment(p, a, b);
      const d = distSq(p, pt);
      
      if (d < minDistsq) {
        minDistsq = d;
        closestPoint = pt;
      }
    }
  }

  // If the closest road is VERY far away (e.g. we spawned in an ocean), just allow free movement.
  // We use a small threshold (~500 meters in degrees)
  if (closestPoint && minDistsq < 0.0001) {
    return closestPoint;
  }

  return [proposedLat, proposedLon];
}

export interface POI {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
}

/**
 * Extracts Points of Interest from the GeoJSON data.
 * Calculates the center if the POI is a polygon.
 */
export function extractPOIs(geojson: any): POI[] {
  if (!geojson || !geojson.features) return [];

  const pois: POI[] = [];

  for (const feature of geojson.features) {
    const props = feature.properties;
    if (!props || !props.name) continue;

    let type = '';
    if (props.amenity) type = props.amenity;
    else if (props.shop) type = props.shop;
    else if (props.tourism) type = props.tourism;
    else if (props.leisure) type = props.leisure;
    else continue; // Not a POI

    const geom = feature.geometry;
    let lat = 0;
    let lon = 0;

    if (geom.type === 'Point') {
      lon = geom.coordinates[0];
      lat = geom.coordinates[1];
    } else if (geom.type === 'Polygon') {
      // Simple centroid for the outer ring
      const ring = geom.coordinates[0];
      let sumLat = 0;
      let sumLon = 0;
      for (const coord of ring) {
        sumLon += coord[0];
        sumLat += coord[1];
      }
      lon = sumLon / ring.length;
      lat = sumLat / ring.length;
    } else {
      continue;
    }

    pois.push({
      id: feature.id || Math.random().toString(),
      name: props.name,
      type: type,
      lat,
      lon
    });
  }

  return pois;
}
