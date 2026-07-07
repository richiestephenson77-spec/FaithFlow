import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronLeft, X, BookOpen, ArrowRight } from 'lucide-react';
import * as turf from '@turf/turf';
import { BIBLE_ERAS, BIBLE_LOCATIONS, BIBLE_TERRITORIES } from '../data/bibleMaps';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function polygonCentroid(coords) {
  const n = coords.length;
  const [sumLng, sumLat] = coords.reduce(([a, b], [lng, lat]) => [a + lng, b + lat], [0, 0]);
  return [sumLng / n, sumLat / n];
}

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
  const [zoom, setZoom] = useState(5);

  const currentEra = BIBLE_ERAS[eraIndex];

  const visibleLocations = useMemo(
    () => BIBLE_LOCATIONS.filter(l => l.names[currentEra.id]),
    [currentEra]
  );

  const territoryGeoJSON = useMemo(() => {
    const territories = BIBLE_TERRITORIES[currentEra.id] || [];
    return {
      type: 'FeatureCollection',
      features: territories.map(t => {
        let coords = t.coordinates;
        try {
          const ring = coords[coords.length - 1][0] === coords[0][0] && coords[coords.length - 1][1] === coords[0][1]
            ? coords.slice(0, -1)
            : coords;
          const line = turf.lineString(ring);
          const curved = turf.bezierSpline(line, { resolution: 10000, sharpness: 0.85 });
          const smoothed = curved.geometry.coordinates;
          coords = [...smoothed, smoothed[0]];
        } catch (_) {}
        return {
          type: 'Feature',
          properties: { id: t.id, name: t.name, color: '#A8823C' },
          geometry: { type: 'Polygon', coordinates: [coords] },
        };
      }),
    };
  }, [currentEra]);

  function changeEra(i) {
    setEraIndex(i);
    setSelectedLocation(null);
  }

  function zoomIn() { mapRef.current?.getMap().zoomIn(); }
  function zoomOut() { mapRef.current?.getMap().zoomOut(); }

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

  function readInBible() { navigate('/bible'); }

  const reference = selectedLocation ? extractReference(selectedLocation.info?.[currentEra.id]) : null;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8" style={{ background: '#F6F1E4' }}>
        <button onClick={() => navigate(-1)} className="absolute top-5 left-4 p-1">
          <ChevronLeft size={22} color="#232B38" strokeWidth={2} />
        </button>
        <p className="font-semibold text-center" style={{ color: '#232B38' }}>Bible Maps needs setup</p>
        <p className="text-sm text-center mt-2 leading-relaxed" style={{ color: '#5C6270' }}>
          Missing <code style={{ color: '#7A2E2E' }}>REACT_APP_MAPBOX_TOKEN</code>. Add a free Mapbox public
          token to your environment variables to enable the map.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F6F1E4' }}>
      {/* Map area */}
      <div className="relative" style={{ height: '55vh' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: 36, latitude: 31, zoom: 5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          minZoom={3}
          maxZoom={10}
          attributionControl={false}
          onZoom={e => setZoom(e.viewState.zoom)}
        >
          {/* Territory fill + engraved outline */}
          <Source id="territories" type="geojson" data={territoryGeoJSON}>
            <Layer
              id="territory-fill"
              type="fill"
              paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 }}
            />
            <Layer
              id="territory-outline"
              type="line"
              paint={{ 'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.8 }}
            />
          </Source>

          {/* Territory name labels */}
          {zoom < 8 && (BIBLE_TERRITORIES[currentEra.id] || []).map(t => {
            const [lng, lat] = polygonCentroid(t.coordinates);
            return (
              <Marker key={`territory-label-${t.id}`} longitude={lng} latitude={lat}>
                <span
                  className="text-[11px] font-serif italic tracking-wide pointer-events-none whitespace-nowrap"
                  style={{ color: 'rgba(35,43,56,0.8)', textShadow: '0 1px 2px rgba(246,241,228,0.9)' }}
                >
                  {t.name}
                </span>
              </Marker>
            );
          })}

          {/* Location markers */}
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
                    <div className="absolute rounded-full animate-ping"
                      style={{ width: 20, height: 20, background: 'rgba(168,130,60,0.25)' }} />
                  )}
                  <div
                    className="rounded-full border-2"
                    style={isImportant
                      ? { width: 10, height: 10, background: '#A8823C', borderColor: '#FCFAF3' }
                      : { width: 6, height: 6, background: '#5C6270', borderColor: '#FCFAF3' }}
                  />
                </div>
              </Marker>
            );
          })}
        </Map>

        {/* Attribution */}
        <div className="absolute bottom-7 left-0 right-0 flex flex-col items-center gap-0.5 z-10 pointer-events-none px-2">
          <span className="text-[9px] text-center" style={{ color: 'rgba(92,98,112,0.5)' }}>
            Territory outlines are approximate for illustrative purposes.
          </span>
          <span className="text-[10px] text-right self-end" style={{ color: 'rgba(92,98,112,0.5)' }}>© Mapbox</span>
        </div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-5 z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full backdrop-blur flex items-center justify-center border"
            style={{ background: 'rgba(252,250,243,0.9)', borderColor: '#DED2B0' }}
          >
            <ChevronLeft size={20} color="#232B38" strokeWidth={2} />
          </button>
          <span
            className="backdrop-blur rounded-full px-4 py-2 text-sm font-medium border"
            style={{
              background: 'rgba(252,250,243,0.9)',
              borderColor: '#DED2B0',
              color: '#232B38',
              fontFamily: "'Fraunces', 'Georgia', serif",
            }}
          >
            Bible Maps
          </span>
          <span
            className="text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap"
            style={{
              background: 'rgba(122,46,46,0.08)',
              borderColor: 'rgba(122,46,46,0.22)',
              color: '#7A2E2E',
              letterSpacing: '0.02em',
            }}
          >
            {currentEra.label} · {currentEra.year}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="absolute top-20 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={zoomIn}
            className="w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center text-xl font-light"
            style={{ background: 'rgba(252,250,243,0.9)', borderColor: '#DED2B0', color: '#232B38' }}
          >+</button>
          <button
            onClick={zoomOut}
            className="w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center text-xl font-light"
            style={{ background: 'rgba(252,250,243,0.9)', borderColor: '#DED2B0', color: '#232B38' }}
          >−</button>
        </div>

        {/* Location popup */}
        <AnimatePresence>
          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 backdrop-blur-xl rounded-2xl p-4 z-10 border"
              style={{ background: 'rgba(252,250,243,0.95)', borderColor: '#DED2B0' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-base" style={{ color: '#232B38' }}>
                    📍 {selectedLocation.names[currentEra.id]?.replace(' ✦', '')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A2E2E' }}>{currentEra.label}</p>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(35,43,56,0.06)' }}
                >
                  <X size={12} color="#232B38" />
                </button>
              </div>

              <div className="my-3" style={{ borderTop: '1px solid #DED2B0' }} />

              <p className="text-sm leading-relaxed font-serif italic" style={{ color: '#5C6270' }}>
                {selectedLocation.info?.[currentEra.id] || 'An important location in biblical history.'}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={readInBible}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full py-2"
                  style={{ background: 'rgba(35,43,56,0.05)', color: '#232B38' }}
                >
                  <BookOpen size={12} /> Read in Bible
                </button>
                {visibleLocations.length > 1 && (
                  <button
                    onClick={goNext}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full py-2"
                    style={{ background: 'rgba(122,46,46,0.08)', color: '#7A2E2E' }}
                  >
                    Next <ArrowRight size={12} />
                  </button>
                )}
              </div>
              {reference && (
                <p className="text-xs mt-2 text-center" style={{ color: '#A8823C', letterSpacing: '0.02em' }}>{reference}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline panel */}
      <div
        className="flex-1 rounded-t-3xl px-5 pt-5 pb-8 -mt-6 relative z-10 border-t"
        style={{ background: '#FCFAF3', borderColor: '#DED2B0' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEra.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm" style={{ color: '#7A2E2E', letterSpacing: '0.02em' }}>
                {currentEra.year}
              </span>
              <span className="text-xs" style={{ color: 'rgba(92,98,112,0.6)' }}>
                {eraIndex + 1} of {BIBLE_ERAS.length}
              </span>
            </div>
            <h2
              className="font-bold text-xl mt-1"
              style={{ color: '#232B38', fontFamily: "'Fraunces', 'Georgia', serif" }}
            >
              {currentEra.label}
            </h2>
            <div className="mt-2 h-[2px] w-12" style={{ background: 'linear-gradient(90deg, #A8823C, transparent)' }} />
            <p className="text-sm leading-relaxed mt-3" style={{ color: '#5C6270' }}>{currentEra.description}</p>
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
                className="text-[9px] font-mono transition-colors"
                style={{
                  color: i === eraIndex ? '#7A2E2E' : 'rgba(92,98,112,0.55)',
                  fontWeight: i === eraIndex ? 700 : 400,
                  letterSpacing: '0.02em',
                }}
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
                ? { width: 10, height: 10, background: '#7A2E2E' }
                : { width: 8, height: 8, background: '#DED2B0' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
