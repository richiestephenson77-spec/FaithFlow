import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Star, Church } from 'lucide-react';
import api from '../utils/api';

const RADII = [
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
  { label: '20km', value: 20000 },
  { label: '50km', value: 50000 },
];

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function FindChurches({ embedded = false }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5000);
  const [error, setError] = useState('');

  const fetchChurches = useCallback(async (lat, lng, r) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/find-churches/nearby?lat=${lat}&lng=${lng}&radius=${r}`);
      setChurches(res.data.churches || []);
    } catch (err) {
      console.error('Failed to fetch churches:', err?.response?.status, err?.response?.data);
      setChurches([]);
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Could not load churches right now');
    }
    setLoading(false);
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem('userLocation', JSON.stringify(loc));
        setLocationDenied(false);
        setLocation(loc);
        fetchChurches(loc.lat, loc.lng, radius);
      },
      () => setLocationDenied(true)
    );
  }, [fetchChurches, radius]);

  useEffect(() => {
    const saved = localStorage.getItem('userLocation');
    if (saved) {
      const loc = JSON.parse(saved);
      setLocation(loc);
      fetchChurches(loc.lat, loc.lng, radius);
    } else {
      requestLocation();
    }
    // eslint-disable-next-line
  }, []);

  function handleRadiusChange(r) {
    setRadius(r);
    if (location) fetchChurches(location.lat, location.lng, r);
  }

  return (
    <div className={embedded ? '' : 'bg-gray-50 min-h-full'}>
      {!embedded && (
        <div className="px-4 pt-5 pb-4 flex items-center gap-3 bg-white border-b border-gray-100">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1">
            <ChevronLeft size={22} color="#111827" strokeWidth={2} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Find Churches</h2>
            <p className="text-xs text-gray-400">Churches near you</p>
          </div>
        </div>
      )}

      {locationDenied ? (
        <div className="flex flex-col items-center py-20 px-8">
          <MapPin size={48} color="#d1d5db" strokeWidth={1.5} />
          <p className="font-semibold text-gray-700 mt-4 text-center">Location access needed</p>
          <p className="text-sm text-gray-400 mt-1 text-center">
            Please enable location to find nearby churches
          </p>
          <button
            onClick={requestLocation}
            className="mt-6 px-6 py-3 rounded-full text-white font-semibold text-sm"
            style={{ background: '#2C4055' }}
          >
            Enable Location
          </button>
        </div>
      ) : (
        <>
          {!loading && churches.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-2 no-scrollbar">
              {RADII.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRadiusChange(r.value)}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200"
                  style={{
                    background: radius === r.value ? '#111827' : '#fff',
                    color: radius === r.value ? '#fff' : '#6b7280',
                    border: radius === r.value ? 'none' : '1px solid #e5e7eb',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 px-4 pt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
                ))}
              </motion.div>
            ) : error ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 px-8">
                <Church size={44} color="#fca5a5" strokeWidth={1.5} className="mx-auto" />
                <p className="font-semibold text-gray-700 mt-4">Something went wrong</p>
                <p className="text-sm text-gray-400 mt-1">{error}</p>
                <button
                  onClick={() => location && fetchChurches(location.lat, location.lng, radius)}
                  className="mt-6 px-6 py-3 rounded-full text-white font-semibold text-sm"
                  style={{ background: '#2C4055' }}
                >
                  Try Again
                </button>
              </motion.div>
            ) : churches.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 px-8">
                <Church size={44} color="#e5e7eb" strokeWidth={1.5} className="mx-auto" />
                <p className="font-semibold text-gray-700 mt-4">
                  No churches found within {radius / 1000}km
                </p>
                <p className="text-sm text-gray-400 mt-1">Try increasing the search radius</p>
                <button
                  onClick={() => handleRadiusChange(Math.min(radius * 2, 50000))}
                  className="mt-6 px-6 py-3 rounded-full text-white font-semibold text-sm"
                  style={{ background: '#2C4055' }}
                >
                  Increase Radius
                </button>
              </motion.div>
            ) : (
              <motion.div key="list" variants={stagger} initial="hidden" animate="show" className="pt-3 pb-8">
                {churches.map(c => (
                  <motion.div key={c.id} variants={item}>
                    <ChurchCard church={c} location={location} onClick={() => navigate(`/find-churches/${c.id}`)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-gray-300 py-4">Powered by Google</p>
        </>
      )}
    </div>
  );
}

function ChurchCard({ church, location, onClick }) {
  const dist = location ? getDistanceKm(location.lat, location.lng, church.lat, church.lng) : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex bg-white rounded-2xl mx-4 mb-3 overflow-hidden text-left active:opacity-80 transition-opacity"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div className="w-[100px] flex-shrink-0">
        {church.photo ? (
          <img loading="lazy" decoding="async" src={church.photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-terracotta-50 flex items-center justify-center">
            <Church size={28} color="#0A0A0A" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 p-3">
        <p className="text-base font-semibold text-gray-900 leading-tight">{church.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {church.rating && (
            <span className="flex items-center gap-0.5 text-sm text-gray-600">
              <Star size={12} fill="#2C4055" color="#0A0A0A" /> {church.rating}
            </span>
          )}
          {church.isOpen != null && (
            <span className="flex items-center gap-1 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${church.isOpen ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className={church.isOpen ? 'text-green-600' : 'text-red-400'}>
                {church.isOpen ? 'Open' : 'Closed'}
              </span>
            </span>
          )}
        </div>
        {church.address && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{church.address}</p>
        )}
        {dist != null && (
          <p className="text-xs text-gray-400 mt-0.5">{dist} km away</p>
        )}
      </div>
    </button>
  );
}
