const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'faithflow/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'faithflow/covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 300, crop: 'fill' }],
  },
});

const postStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'faithflow/posts',
    resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
  }),
});

const churchStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'faithflow/churches',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 600, crop: 'fill' }],
  },
});

const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 10 * 1024 * 1024 } })
  .fields([{ name: 'profilePhoto', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]);

const uploadPost = multer({ storage: postStorage, limits: { fileSize: 50 * 1024 * 1024 } })
  .array('media', 10);

const uploadChurch = multer({ storage: churchStorage, limits: { fileSize: 10 * 1024 * 1024 } })
  .fields([{ name: 'logo', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]);

module.exports = { uploadProfile, uploadPost, uploadChurch };
