import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronLeft, X, BookOpen, ArrowRight } from 'lucide-react';
import * as turf from '@turf/turf';
import { BIBLE_ERAS, BIBLE_LOCATIONS, BIBLE_TERRITORIES, BIBLE_FIGURES } from '../data/bibleMaps';

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

function RobedFigureSVG({ accessory = 'none' }) {
  return (
    <svg viewBox="0 0 24 28" width="24" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Halo */}
      {accessory === 'halo' && (
        <circle cx="12" cy="6.5" r="5" fill="none" stroke="#A8823C" strokeWidth="1.2" opacity="0.85" />
      )}
      {/* Head */}
      <circle cx="12" cy="7" r="3.5" fill="#7A5C3E" />
      {/* Robe body */}
      <path d="M5 27 Q6 17 12 15 Q18 17 19 27Z" fill="#7A5C3E" opacity="0.9" />
      {/* Robe collar/shoulders */}
      <path d="M8.5 13.5 Q12 16 15.5 13.5 L16 15.5 Q12 18 8 15.5Z" fill="#5C3E28" />
      {/* Crown */}
      {accessory === 'crown' && (
        <g transform="translate(8,2.5)">
          <rect x="0" y="2" width="8" height="2.5" rx="0.5" fill="#B8860B" />
          <polygon points="0,2 1.5,0 3,2" fill="#B8860B" />
          <polygon points="3,2 4,0.5 5,2" fill="#FDE68A" />
          <polygon points="5,2 6.5,0 8,2" fill="#B8860B" />
        </g>
      )}
      {/* Staff */}
      {accessory === 'staff' && (
        <line x1="18" y1="10" x2="20" y2="27" stroke="#5C3E28" strokeWidth="1.3" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function BibleMaps() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [eraIndex, setEraIndex] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedFigure, setSelectedFigure] = useState(null);
  const [zoom, setZoom] = useState(5);

  const currentEra = BIBLE_ERAS[eraIndex];
  const eraFigures = useMemo(() => BIBLE_FIGURES.filter(f => f.era === currentEra.id), [currentEra]);

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

  function handleMapLoad(evt) {
    const map = evt.target;
    const layersToHide = [
      'country-label',
      'state-label',
      'admin-0-boundary',
      'admin-0-boundary-disputed',
      'admin-1-boundary',
      'admin-1-boundary-bg',
      'settlement-label',
      'settlement-subdivision-label',
    ];
    layersToHide.forEach(id => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', 'none');
      }
    });
  }

  function changeEra(i) {
    setEraIndex(i);
    setSelectedLocation(null);
    setSelectedFigure(null);
  }

  function zoomIn() { mapRef.current?.getMap().zoomIn(); }
  function zoomOut() { mapRef.current?.getMap().zoomOut(); }

  function flyTo(coords) {
    mapRef.current?.getMap().flyTo({ center: coords, zoom: 6, duration: 800 });
  }

  function selectLocation(loc) {
    setSelectedFigure(null);
    setSelectedLocation(loc);
    flyTo(loc.coordinates);
  }

  function selectFigure(fig) {
    setSelectedLocation(null);
    setSelectedFigure(fig);
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
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-8" style={{ background: '#F6F1E4' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="rounded-full flex items-center justify-center"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 12px)',
            left: 12,
            width: 36, height: 36,
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <ChevronLeft size={20} color="#163449" strokeWidth={2} />
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
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: '#F6F1E4' }}>
      {/* Map area */}
      <div className="relative" style={{ height: '68vh' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: 36, latitude: 31, zoom: 5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          minZoom={3}
          maxZoom={10}
          attributionControl={false}
          onLoad={handleMapLoad}
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

        {/* Floating back button — standalone, respects safe area */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="rounded-full flex items-center justify-center"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 12px)',
            left: 12,
            width: 36, height: 36,
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 20,
          }}
        >
          <ChevronLeft size={20} color="#163449" strokeWidth={2} />
        </button>

        {/* Header — title/era pills; spacer keeps them clear of the floating back button */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}
        >
          <div style={{ width: 36, flexShrink: 0 }} />
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
        <div
          className="absolute right-4 flex flex-col gap-2 z-10"
          style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
        >
          <button
            onClick={zoomIn}
            aria-label="Zoom in"
            className="w-10 h-10 rounded-full backdrop-blur border flex items-center justify-center text-xl font-light"
            style={{ background: 'rgba(252,250,243,0.9)', borderColor: '#DED2B0', color: '#232B38' }}
          >+</button>
          <button
            onClick={zoomOut}
            aria-label="Zoom out"
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
                  aria-label="Close"
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

        {/* Figure popup — same card pattern as location popup */}
        <AnimatePresence>
          {selectedFigure && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 backdrop-blur-xl rounded-2xl p-4 z-10 border"
              style={{ background: 'rgba(252,250,243,0.95)', borderColor: '#DED2B0' }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full border flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ background: '#F6F1E4', borderColor: '#DED2B0' }}
                  >
                    <RobedFigureSVG accessory={selectedFigure.accessory} />
                  </div>
                  <div>
                    <p className="font-bold text-base leading-tight" style={{ color: '#232B38' }}>
                      {selectedFigure.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A2E2E' }}>{selectedFigure.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFigure(null)}
                  aria-label="Close"
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2"
                  style={{ background: 'rgba(35,43,56,0.06)' }}
                >
                  <X size={12} color="#232B38" />
                </button>
              </div>
              <div className="my-3" style={{ borderTop: '1px solid #DED2B0' }} />
              <p className="text-sm leading-relaxed font-serif italic" style={{ color: '#5C6270' }}>
                {selectedFigure.info}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={readInBible}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full py-2"
                  style={{ background: 'rgba(35,43,56,0.05)', color: '#232B38' }}
                >
                  <BookOpen size={12} /> Read in Bible
                </button>
              </div>
              {selectedFigure.reference && (
                <p className="text-xs mt-2 text-center" style={{ color: '#A8823C', letterSpacing: '0.02em' }}>
                  {selectedFigure.reference}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Timeline panel — clears the home indicator now that the global nav is hidden here.
          paddingBottom is additive with the base 1rem (pb-4) via calc(): an inline style always
          wins the cascade over a class, so a bare env()-only value here would zero out pb-4 on
          non-notch devices instead of adding to it. */}
      <div
        className="flex-1 rounded-t-3xl px-5 pt-3 -mt-4 relative z-10 border-t overflow-y-auto"
        style={{ background: '#FCFAF3', borderColor: '#DED2B0', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
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
              className="font-bold text-lg mt-0.5"
              style={{ color: '#232B38', fontFamily: "'Fraunces', 'Georgia', serif" }}
            >
              {currentEra.label}
            </h2>
            <div className="mt-1.5 h-[2px] w-10" style={{ background: '#A8823C' }} />
            <p className="text-sm leading-snug mt-2 line-clamp-2" style={{ color: '#5C6270' }}>{currentEra.description}</p>

            {/* Figure strip */}
            {eraFigures.length > 0 && (
              <div
                className="flex gap-3 overflow-x-auto mt-2 pb-1 -mx-1 px-1"
                style={{ scrollbarWidth: 'none' }}
              >
                {eraFigures.map(figure => (
                  <button
                    key={figure.id}
                    onClick={() => selectFigure(figure)}
                    className="flex flex-col items-center flex-shrink-0 w-14"
                  >
                    <div
                      className="w-9 h-9 rounded-full border flex items-center justify-center overflow-hidden"
                      style={{
                        background: selectedFigure?.id === figure.id ? '#F6F1E4' : '#FCFAF3',
                        borderColor: selectedFigure?.id === figure.id ? '#A8823C' : '#DED2B0',
                      }}
                    >
                      <RobedFigureSVG accessory={figure.accessory} />
                    </div>
                    <span
                      className="text-[9px] font-semibold mt-1 truncate w-full text-center"
                      style={{ color: selectedFigure?.id === figure.id ? '#7A2E2E' : '#232B38' }}
                    >
                      {figure.name}
                    </span>
                    <span
                      className="text-[8px] truncate w-full text-center leading-tight"
                      style={{ color: 'rgba(92,98,112,0.7)' }}
                    >
                      {figure.hook}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-3">
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

        <div className="flex items-center justify-center gap-3 mt-3">
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
