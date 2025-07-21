'use client';

import { useState } from 'react';
import Map, { Source, Layer, ViewStateChangeEvent } from 'react-map-gl';
import type { HeatmapLayer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN'; // Replace with your Mapbox token

const heatmapLayer: HeatmapLayer = {
  id: 'heatmap',
  maxzoom: 9,
  type: 'heatmap',
  paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 0, 0, 6, 1],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,
      'rgba(33,102,172,0)',
      0.2,
      'rgb(103,169,207)',
      0.4,
      'rgb(209,229,240)',
      0.6,
      'rgb(253,219,199)',
      0.8,
      'rgb(239,138,98)',
      1,
      'rgb(178,24,43)'
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0],
  },
};

interface DataPoint {
  lat: number;
  lng: number;
  density: number;
}

interface MapboxProps {
  liveData: DataPoint | null;
  predictedData: DataPoint | null;
  view: 'live' | 'predicted';
}

const Mapbox = ({ liveData, predictedData, view }: MapboxProps) => {
  const [viewState, setViewState] = useState({
    longitude: 77.4126,
    latitude: 23.2599,
    zoom: 14,
  });

  const data = view === 'live' ? liveData : predictedData;
  const geojsonData = data ? {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [data.lng, data.lat],
        },
        properties: {
          mag: data.density * 10000, // Scale for visibility
        },
      },
    ],
  } : null;

  return (
    <Map
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      style={{width: '100%', height: '100%'}}
      mapStyle="mapbox://styles/mapbox/dark-v10"
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      {geojsonData && (
        <Source type="geojson" data={geojsonData}>
          <Layer {...heatmapLayer} />
        </Source>
      )}
    </Map>
  );
};

export default Mapbox; 