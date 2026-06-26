import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { ChevronLeft, X } from 'lucide-react';
import { BIBLE_ERAS, BIBLE_LOCATIONS } from '../data/bibleMaps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export default function BibleMaps() {
  const navigate = useNavigate();
  const [eraIndex, setEraIndex] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [position, setPosition] = useState({ coordinates: [36, 31], zoom: 4 });

  const currentEra = BIBLE_ERAS[eraIndex];

  const handleMoveEnd = useCallback((pos) => setPosition(pos), []);

  function changeEra(i) {
    setEraIndex(i);
    setSelectedLocation(null);
  }

  function zoomIn() {
    setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 12) }));
  }

  function zoomOut() {
    setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 2) }));
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1a1205' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft size={22} color="white" strokeWidth={2} />
          </button>
          <h2 className="text-base font-bold text-white">Bible Maps</h2>
        </div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400">
          {currentEra.year} · {currentEra.label}
        </span>
      </div>

      {/* Map area */}
      <div className="relative flex-1 min-h-[300px]" style={{ background: '#0a2a1a' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 800, center: [36, 31] }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            minZoom={2}
            maxZoom={12}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#2d4a1e"
                    stroke="#1a2e10"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {BIBLE_LOCATIONS.map(location => {
              const name = location.names[currentEra.id];
              if (!name) return null;

              const isImportant = name.includes('✦');
              const displayName = name.replace(' ✦', '');

              return (
                <Marker
                  key={location.id}
                  coordinates={location.coordinates}
                  onClick={() => setSelectedLocation(location)}
                >
                  <circle
                    r={isImportant ? 5 : 3}
                    fill={isImportant ? currentEra.color : '#8B7355'}
                    stroke="#FBF8F3"
                    strokeWidth={1}
                    className="cursor-pointer"
                  />
                  {isImportant && (
                    <circle
                      r={8}
                      fill="none"
                      stroke={currentEra.color}
                      strokeWidth={1}
                      opacity={0.5}
                      className="animate-ping"
                    />
                  )}
                  <text
                    textAnchor="middle"
                    y={-10}
                    style={{
                      fontFamily: 'serif',
                      fontSize: isImportant ? '6px' : '5px',
                      fill: isImportant ? '#FBF8F3' : '#A89070',
                      fontWeight: isImportant ? 'bold' : 'normal',
                      pointerEvents: 'none',
                    }}
                  >
                    {displayName}
                  </text>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={zoomIn}
            className="w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white text-lg"
          >+</button>
          <button
            onClick={zoomOut}
            className="w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white text-lg"
          >−</button>
        </div>

        {/* Location popup */}
        <AnimatePresence>
          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 border rounded-2xl p-4 z-10"
              style={{ background: '#1a1205', borderColor: 'rgba(120,53,15,0.4)' }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-bold text-base">
                    {selectedLocation.names[currentEra.id]?.replace(' ✦', '')}
                  </h3>
                  <span className="text-amber-500 text-xs">{currentEra.label}</span>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
              <p className="text-white/70 text-sm leading-relaxed font-serif italic">
                {selectedLocation.info?.[currentEra.id] || 'An important location in biblical history.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline */}
      <div className="flex-shrink-0 border-t" style={{ background: '#0d0a05', borderColor: 'rgba(120,53,15,0.3)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEra.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pt-4 pb-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-500 text-xs font-mono">{currentEra.year}</span>
              <span className="text-white/40 text-xs">{eraIndex + 1} of {BIBLE_ERAS.length}</span>
            </div>
            <h2 className="text-white font-bold text-lg mt-0.5">{currentEra.label}</h2>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">{currentEra.description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="px-4 pb-2">
          <input
            type="range"
            min={0}
            max={BIBLE_ERAS.length - 1}
            value={eraIndex}
            onChange={e => changeEra(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: currentEra.color }}
          />
          <div className="flex justify-between mt-1">
            {BIBLE_ERAS.map((era, i) => (
              <button
                key={era.id}
                onClick={() => changeEra(i)}
                className={`text-[9px] font-mono transition-colors ${
                  i === eraIndex ? 'text-amber-400 font-bold' : 'text-white/20'
                }`}
              >
                {era.year}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {BIBLE_ERAS.map((era, i) => (
            <button
              key={era.id}
              onClick={() => changeEra(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === eraIndex ? 'bg-amber-500 scale-125' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
