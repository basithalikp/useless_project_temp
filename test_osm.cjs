const fs = require('fs');
const osmtogeojson = require('osmtogeojson');
const { DOMParser } = require('@xmldom/xmldom');

async function test() {
  const s = 40.7812 - 0.002;
  const n = 40.7812 + 0.002;
  const w = -73.9665 - 0.002;
  const e = -73.9665 + 0.002;
  
  const bbox = `${w},${s},${e},${n}`;
  console.log("Fetching bbox:", bbox);
  const response = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`);
  const text = await response.text();
  console.log("Response length:", text.length);
  
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const geojson = osmtogeojson(doc);
  
  const roads = geojson.features.filter(f => f.geometry.type === 'LineString' && f.properties.highway);
  console.log("Roads found:", roads.length);
  if (roads.length > 0) {
    console.log("Sample road properties:", roads[0].properties);
  }
}
test();
