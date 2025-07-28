const express = require('express');
const cors = require('cors');
const getYouTubeInfo = require('./ytDownloader');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('✅ YouTube Downloader API (MP3 + MP4) is Live');
});

app.get('/api/youtube', async (req, res) => {
  const { url, type } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing YouTube URL (?url=)' });

  const result = await getYouTubeInfo(url, type || 'mp4');
  res.status(result.code).json(result);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
