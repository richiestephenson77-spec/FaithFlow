const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY;

// Search nearby churches
router.get('/nearby', authenticate, async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Location required' });
  }

  try {
    console.log('Key exists:', !!GOOGLE_KEY);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=church&key=${GOOGLE_KEY}`;
    console.log('Calling Google Places URL:', url.replace(GOOGLE_KEY, '***KEY***'));

    const response = await fetch(url);
    const data = await response.json();

    console.log('Google response HTTP status:', response.status);
    console.log('Google data.status:', data.status);
    console.log('Google result count:', data.results?.length ?? 0);
    if (data.error_message) console.log('Google error_message:', data.error_message);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(500).json({ error: data.status, message: data.error_message });
    }

    const churches = (data.results || []).map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      isOpen: place.opening_hours?.open_now,
      photo: place.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_KEY}`
        : null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    }));

    res.json({ churches });
  } catch (err) {
    console.error('Churches nearby error:', err);
    res.status(500).json({ error: 'Failed to fetch churches' });
  }
});

// Get church details (hours, phone, website)
router.get('/details/:placeId', authenticate, async (req, res) => {
  const { placeId } = req.params;

  try {
    console.log('Key exists:', !!GOOGLE_KEY);
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,photos,rating,user_ratings_total,geometry&key=${GOOGLE_KEY}`;
    console.log('Calling Google Places URL:', url.replace(GOOGLE_KEY, '***KEY***'));

    const response = await fetch(url);
    const data = await response.json();

    console.log('Google response HTTP status:', response.status);
    console.log('Google data.status:', data.status);
    if (data.error_message) console.log('Google error_message:', data.error_message);

    if (data.status !== 'OK') {
      return res.status(404).json({ error: 'Church not found', message: data.error_message });
    }

    const place = data.result;

    res.json({
      id: placeId,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      hours: place.opening_hours?.weekday_text || [],
      isOpen: place.opening_hours?.open_now,
      photos: place.photos?.slice(0, 5).map(p =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_KEY}`
      ) || [],
      lat: place.geometry?.location.lat,
      lng: place.geometry?.location.lng,
    });
  } catch (err) {
    console.error('Church details error:', err);
    res.status(500).json({ error: 'Failed to fetch church details' });
  }
});

module.exports = router;
