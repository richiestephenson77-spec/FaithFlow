import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronLeft, X, BookOpen, ArrowRight } from 'lucide-react';
import { BIBLE_ERAS, BIBLE_LOCATIONS } from '../data/bibleMaps';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

// Best-effort dark/ancient restyle of the streets-v12 base style:
// hides roads/labels, recolors water/land/borders. Layer ids are
// matched by pattern (not exact names) since streets-v12 splits
// roads/labels into many differently-named layers depending on
// zoom and region (e.g. road-secondary-tertiary, settlement-major-label).
function customizeMapStyle(map) {
  try {
    const layers = map.getStyle()?.layers || [];
    layers.forEach(layer => {
      const id = layer.id;
      try {
        if (/road|street|bridge|tunnel/i.test(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
        } else if (/label|poi|place|settlement/i.test(id) && !/country/i.test(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
        } else if (/water/i.test(id) && layer.type === 'fill') {
          map.setPaintProperty(id, 'fill-color', '#1a3a5c');
        } else if (/^background$/i.test(id) && layer.type === 'background') {
          map.setPaintProperty(id, 'background-color', '#2d3a1e');
        } else if (/^land$|landcover|landuse/i.test(id) && layer.type === 'fill') {
          map.setPaintProperty(id, 'fill-color', '#2d3a1e');
        } else if (/border|boundar/i.test(id) && layer.type === 'line') {
          map.setPaintProperty(id, 'line-color', '#d4a843');
          map.setPaintProperty(id, 'line-opacity', 0.6);
        }
      } catch {
        // layer doesn't support this property — skip
      }
    });
  } catch (err) {
    console.error('Map style customization failed:', err);
  }
}

// Pull a "Book Chapter:Verse" style reference out of free-text info,
// e.g. "...(Gen 14:18)" -> "Gen 14:18"
function extractReference(text) {
  if (!text) return null;
  const match = text.match(/\(([1-3]?\s?[A-Za-z]+\.?\s\d+:\d+(?:-\d+)?)\)/);
  return match ? match[1] : null;
}

export default function BibleMaps() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [eraIndex, setEraIndex] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const currentEra = BIBLE_ERAS[eraIndex];

  const visibleLocations = useMemo(
    () => BIBLE_LOCATIONS.filter(l => l.names[currentEra.id]),
    [currentEra]
  );

  function changeEra(i) {
    setEraIndex(i);
    setSelectedLocation(null);
  }

  function handleMapLoad(e) {
    customizeMapStyle(e.target);
  }

  function zoomIn() {
    mapRef.current?.getMap().zoomIn();
  }

  function zoomOut() {
    mapRef.current?.getMap().zoomOut();
  }

  function flyTo(coords) {
    mapRef.current?.getMap().flyTo({ center: coords, zoom: 6, duration: 800 });
  }

  function selectLocation(loc) {
    setSelectedLocation(loc);
    flyTo(loc.coordinates);
  }

  function goNext() {
    if (!selectedLocation) return;
    const idx = visibleLocations.findIndex(l => l.id === selectedLocation.id);
    const next = visibleLocations[(idx + 1) % visibleLocations.length];
    selectLocation(next);
  }

  function readInBible() {
    navigate('/bible');
  }

  const reference = selectedLocation ? extractReference(selectedLocation.info?.[currentEra.id]) : null;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8" style={{ background: '#0d0a05' }}>
        <button onClick={() => navigate(-1)} className="absolute top-5 left-4 p-1">
          <ChevronLeft size={22} color="white" strokeWidth={2} />
        </button>
        <p className="text-white font-semibold text-center">Bible Maps needs setup</p>
        <p className="text-white/50 text-sm text-center mt-2 leading-relaxed">
          Missing <code className="text-amber-400">REACT_APP_MAPBOX_TOKEN</code>. Add a free Mapbox public
          token to your environment variables to enable the map.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0a05' }}>
      {/* Map area with overlaid header */}
      <div className="relative" style={{ height: '55vh' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: 36, latitude: 31, zoom: 5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          minZoom={3}
          maxZoom={10}
          onLoad={handleMapLoad}
          attributionControl={false}
        >
          {visibleLocations.map(location => {
            const name = location.names[currentEra.id];
            const isImportant = name.includes('✦');

            return (
              <Marker
                key={location.id}
                longitude={location.coordinates[0]}
                latitude={location.coordinates[1]}
                onClick={(e) => { e.originalEvent.stopPropagation(); selectLocation(location); }}
              >
                <div className="relative cursor-pointer flex flex-col items-center">
                  {isImportant && (
                    <div className="absolute rounded-full bg-amber-500/30 animate-ping" style={{ width: 20, height: 20 }} />
                  )}
                  <div
                    className="rounded-full border-2 border-white/80"
                    style={isImportant
                      ? { width: 10, height: 10, background: '#f59e0b' }
                      : { width: 6, height: 6, background: 'rgba(255,255,255,0.6)' }}
                  />
                </div>
              </Marker>
            );
          })}
        </Map>

        {/* Mapbox/OSM attribution (required by ToS) — sits above the timeline's overlap */}
        <div className="absolute bottom-7 right-2 text-[10px] text-white/30 text-right px-2 py-1 z-10 pointer-events-none">
          © Mapbox © OpenStreetMap
        </div>

        {/* Overlaid header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-5 z-10">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <ChevronLeft size={20} color="white" strokeWidth={2} />
          </button>
          <span className="bg-black/40 backdrop-blur rounded-full px-4 py-2 text-white text-sm font-medium">
            Bible Maps
          </span>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 whitespace-nowrap">
            {currentEra.label} · {currentEra.year}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="absolute top-20 right-4 flex flex-col gap-2 z-10">
          <button onClick={zoomIn} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white text-xl">+</button>
          <button onClick={zoomOut} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white text-xl">−</button>
        </div>

        {/* Location popup */}
        <AnimatePresence>
          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4 z-10"
              style={{ boxShadow: '0 0 40px rgba(245,158,11,0.15)' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-bold text-base">
                    📍 {selectedLocation.names[currentEra.id]?.replace(' ✦', '')}
                  </p>
                  <p className="text-amber-400 text-xs mt-0.5">{currentEra.label}</p>
                </div>
                <button onClick={() => setSelectedLocation(null)} className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <X size={12} className="text-white" />
                </button>
              </div>

              <div className="border-t border-white/10 my-3" />

              <p className="text-white/70 text-sm leading-relaxed font-serif italic">
                {selectedLocation.info?.[currentEra.id] || 'An important location in biblical history.'}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={readInBible}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-white/10 rounded-full py-2"
                >
                  <BookOpen size={12} /> Read in Bible
                </button>
                {visibleLocations.length > 1 && (
                  <button
                    onClick={goNext}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/15 rounded-full py-2"
                  >
                    Next <ArrowRight size={12} />
                  </button>
                )}
              </div>
              {reference && (
                <p className="text-amber-500 text-xs mt-2 text-center">{reference}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline panel */}
      <div className="flex-1 bg-black/60 backdrop-blur-xl border-t border-white/10 rounded-t-3xl px-5 pt-5 pb-8 -mt-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEra.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-amber-400 text-sm">{currentEra.year}</span>
              <span className="text-white/40 text-xs">{eraIndex + 1} of {BIBLE_ERAS.length}</span>
            </div>
            <h2 className="text-white font-bold text-xl font-serif mt-1">{currentEra.label}</h2>
            <div className="mt-2 h-[2px] w-12" style={{ background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
            <p className="text-white/60 text-sm leading-relaxed mt-3">{currentEra.description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5">
          <input
            type="range"
            min={0}
            max={BIBLE_ERAS.length - 1}
            value={eraIndex}
            onChange={e => changeEra(Number(e.target.value))}
            className="bible-maps-slider w-full cursor-pointer"
            style={{ '--slider-progress': `${(eraIndex / (BIBLE_ERAS.length - 1)) * 100}%` }}
          />
          <div className="flex justify-between mt-1.5">
            {BIBLE_ERAS.map((era, i) => (
              <button
                key={era.id}
                onClick={() => changeEra(i)}
                className={`text-[9px] font-mono transition-colors ${i === eraIndex ? 'text-amber-400 font-bold' : 'text-white/30'}`}
              >
                {era.year}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-5">
          {BIBLE_ERAS.map((era, i) => (
            <button
              key={era.id}
              onClick={() => changeEra(i)}
              className="rounded-full transition-all"
              style={i === eraIndex
                ? { width: 10, height: 10, background: '#f59e0b' }
                : { width: 8, height: 8, background: 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
