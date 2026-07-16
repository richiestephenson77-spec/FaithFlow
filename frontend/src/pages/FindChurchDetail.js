import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Phone, Globe, Clock, Star, Church, Navigation as NavIcon } from 'lucide-react';
import api from '../utils/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FindChurchDetail() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/find-churches/details/${placeId}`)
      .then(res => setChurch(res.data))
      .catch(() => setError('Could not load this church'))
      .finally(() => setLoading(false));
  }, [placeId]);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-full">
        <div className="h-[220px] bg-gray-200 animate-pulse" />
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-5 space-y-3">
          <div className="h-6 bg-gray-200 rounded-full w-2/3 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-full w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !church) {
    return (
      <div className="bg-gray-50 min-h-full flex flex-col items-center justify-center px-8">
        <Church size={44} color="#e5e7eb" strokeWidth={1.5} />
        <p className="font-semibold text-gray-700 mt-4">{error || 'Church not found'}</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-6 py-3 rounded-full text-white font-semibold text-sm" style={{ background: '#2C4055' }}>
          Go Back
        </button>
      </div>
    );
  }

  const todayIndex = new Date().getDay();

  return (
    <div className="bg-gray-50 min-h-full pb-10">
      {/* Photo gallery */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="relative h-[220px] overflow-hidden">
        {church.photos && church.photos.length > 0 ? (
          church.photos.length === 1 ? (
            <img src={church.photos[0]} alt={church.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full overflow-x-auto no-scrollbar snap-x">
              {church.photos.map((p, i) => (
                <img key={i} src={p} alt="" className="w-full h-full object-cover flex-shrink-0 snap-start" />
              ))}
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#0D2018' }}>
            <Church size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
        >
          <ChevronLeft size={20} color="white" strokeWidth={2} />
        </button>
      </motion.div>

      {/* Info card */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-white rounded-t-3xl -mt-6 relative z-10 p-5"
      >
        <h1 className="text-2xl font-bold text-gray-900">{church.name}</h1>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {church.rating && (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={14} fill={i < Math.round(church.rating) ? '#2C4055' : 'none'} color="#2C4055" />
              ))}
              <span className="text-xs text-gray-400 ml-1">({church.totalRatings || 0} reviews)</span>
            </span>
          )}
        </div>

        {church.isOpen != null && (
          <span
            className="inline-block mt-3 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              background: church.isOpen ? '#ecfdf5' : '#fef2f2',
              color: church.isOpen ? '#059669' : '#f87171',
            }}
          >
            {church.isOpen ? 'Open Now' : 'Closed'}
          </span>
        )}

        {/* Address */}
        {church.address && (
          <button
            onClick={() => window.open(`https://maps.google.com/?q=${church.lat},${church.lng}`)}
            className="w-full flex items-start gap-2.5 mt-4 text-left"
          >
            <MapPin size={16} color="#2C4055" strokeWidth={1.8} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">{church.address}</span>
          </button>
        )}

        {church.phone && (
          <button onClick={() => window.open(`tel:${church.phone}`)} className="w-full flex items-center gap-2.5 mt-3 text-left">
            <Phone size={16} color="#2C4055" strokeWidth={1.8} className="flex-shrink-0" />
            <span className="text-sm text-gray-700">{church.phone}</span>
          </button>
        )}

        {church.website && (
          <button onClick={() => window.open(church.website, '_blank')} className="w-full flex items-center gap-2.5 mt-3 text-left">
            <Globe size={16} color="#2C4055" strokeWidth={1.8} className="flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate">{church.website}</span>
          </button>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => window.open(`https://maps.google.com/?q=${church.lat},${church.lng}`)}
            className="flex-1 flex flex-col items-center gap-1 bg-gray-50 rounded-xl py-3"
          >
            <NavIcon size={18} color="#374151" strokeWidth={1.8} />
            <span className="text-xs font-medium text-gray-700">Directions</span>
          </button>
          {church.phone && (
            <button onClick={() => window.open(`tel:${church.phone}`)} className="flex-1 flex flex-col items-center gap-1 bg-gray-50 rounded-xl py-3">
              <Phone size={18} color="#374151" strokeWidth={1.8} />
              <span className="text-xs font-medium text-gray-700">Call</span>
            </button>
          )}
          {church.website && (
            <button onClick={() => window.open(church.website, '_blank')} className="flex-1 flex flex-col items-center gap-1 bg-gray-50 rounded-xl py-3">
              <Globe size={18} color="#374151" strokeWidth={1.8} />
              <span className="text-xs font-medium text-gray-700">Website</span>
            </button>
          )}
        </div>

        {/* Hours */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} color="#2C4055" strokeWidth={1.8} />
            <p className="text-sm font-semibold text-gray-900">Service Times</p>
          </div>

          {church.hours && church.hours.length > 0 ? (
            <div className="space-y-1">
              {church.hours.map((line, i) => {
                const isToday = line.startsWith(DAY_NAMES[todayIndex]);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className={`flex items-center justify-between text-sm px-3 py-1.5 rounded-lg ${isToday ? 'bg-terracotta-50' : ''}`}
                  >
                    <span className={isToday ? 'text-terracotta-700 font-medium' : 'text-gray-600'}>{line}</span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Hours not available</p>
          )}
        </div>
      </motion.div>

      <p className="text-center text-xs text-gray-300 py-4">Powered by Google</p>
    </div>
  );
}
