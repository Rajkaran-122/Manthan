'use client';

import { useState, useEffect } from 'react';
import Mapbox from '@/components/Mapbox';

export default function Home() {
  const [liveData, setLiveData] = useState(null);
  const [predictedData, setPredictedData] = useState(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [view, setView] = useState<'live' | 'predicted'>('live');
  const [time, setTime] = useState(0);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/density');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'live') {
        setLiveData(data);
      } else if (data.type === 'predicted') {
        setPredictedData(data);
        if (data.predicted_density > 0.0005) { // Threshold for alerts
          setAlerts((prevAlerts) => [...prevAlerts, `CRITICAL DENSITY WARNING - ${data.zone_id}`]);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="relative w-full h-screen">
        <Mapbox liveData={liveData} predictedData={predictedData} view={view} />
        <div className="absolute top-0 left-0 bg-gray-800 bg-opacity-75 p-4 m-4 rounded-lg">
          <h2 className="text-white text-lg font-bold">Mission Control</h2>
          <div className="flex space-x-2 mt-2">
            <button
              className={`px-3 py-1 text-sm rounded-md ${view === 'live' ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-300'}`}
              onClick={() => setView('live')}
            >
              Live View
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md ${view === 'predicted' ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-300'}`}
              onClick={() => setView('predicted')}
            >
              Predictive View
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 bg-red-800 bg-opacity-75 p-4 m-4 rounded-lg">
          <h2 className="text-white text-lg font-bold">Alerts</h2>
          <ul>
            {alerts.map((alert, index) => (
              <li key={index} className="text-white">{alert}</li>
            ))}
          </ul>
        </div>
        <div className="absolute bottom-0 w-full p-4 bg-gray-800 bg-opacity-75">
          <label htmlFor="time-scrubber" className="text-white mr-2">Time: {time}</label>
          <input 
            id="time-scrubber"
            type="range" 
            className="w-full"
            min="0"
            max="1200" // 20 minutes in seconds
            value={time}
            onChange={(e) => setTime(parseInt(e.target.value))}
          />
        </div>
      </div>
    </main>
  );
}
