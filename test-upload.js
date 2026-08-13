const express = require('express');
const request = require('supertest');
const multer = require('multer');
const { storage } = require('./config/cloudinary');

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const extension = require('path').extname(file.originalname || '').toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(
      new Error('Unsupported file format. Only JPG, JPEG, PNG, and WEBP image formats are accepted.'),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

const app = express();
app.post('/upload', (req, res) => {
    upload.array('images', 5)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

async function run() {
    const fs = require('fs');
    fs.writeFileSync('test.jpg', 'fake image data');
    const res = await request(app)
        .post('/upload')
        .attach('images', 'test.jpg');
    console.log(res.body);
    fs.unlinkSync('test.jpg');
}

run();
