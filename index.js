const axios = require('axios');
const qs = require('qs');
const express = require('express');
const app = express();

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatCount = (num) => {
  if (!num) return "0";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
};

const getVideoData = async (videoUrl) => {
  const data = { url: videoUrl };
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://iloveyt.net",
    "Referer": "https://iloveyt.net/en2",
    "User-Agent": "Mozilla/5.0"
  };

  const response = await axios.post(
    "https://iloveyt.net/proxy.php",
    qs.stringify(data),
    { headers }
  );
  return response.data;
};

const fetchRealDownloadUrl = async (mediaUrl) => {
  if (mediaUrl.includes("googlevideo.com")) return null;
  try {
    const response = await axios.get(mediaUrl);
    if (response.data?.fileUrl) {
      return response.data.fileUrl;
    }
    return mediaUrl;
  } catch {
    return null;
  }
};

app.get("/", (req, res) => {
  res.send("✅ YouTube Downloader API using iloveyt.net - by Smart Shankar");
});

app.get("/api", async (req, res) => {
  const { url, type = 'mp4' } = req.query;
  if (!url) return res.status(400).json({ status: "error", message: "Missing YouTube URL" });

  try {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:.*v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    const videoData = await getVideoData(url);
    if (!videoData?.api || videoData.api.status !== "OK") {
      throw new Error('Failed to process YouTube video');
    }

    const mediaItems = videoData.api.mediaItems || [];
    const filteredItems = mediaItems.filter(item =>
      type === 'mp3' ? item.type === 'audio' : item.type === 'video'
    );

    const downloadItems = [];
    for (const item of filteredItems) {
      const realUrl = await fetchRealDownloadUrl(item.mediaUrl);
      if (realUrl) {
        downloadItems.push({
          type: item.type,
          quality: item.mediaQuality,
          url: realUrl,
          resolution: item.mediaRes,
          duration: formatDuration(item.mediaDuration),
          extension: item.mediaExtension,
          size: item.mediaFileSize
        });
      }
    }

    return res.json({
      status: "success",
      code: 200,
      message: `YouTube ${type.toUpperCase()} download links fetched`,
      data: {
        video_info: {
          id: videoId,
          title: videoData.api.title || "No title",
          description: videoData.api.description || "",
          original_url: url,
          previewUrl: videoData.api.previewUrl || "",
          imagePreviewUrl: videoData.api.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          permanentLink: `https://youtu.be/${videoId}`,
          duration: filteredItems[0]?.mediaDuration || 0,
          duration_formatted: formatDuration(filteredItems[0]?.mediaDuration || 0)
        },
        statistics: {
          views: formatCount(videoData.api.mediaStats?.viewsCount),
          likes: formatCount(videoData.api.mediaStats?.likesCount),
          comments: formatCount(videoData.api.mediaStats?.commentsCount)
        },
        download_links: {
          count: downloadItems.length,
          items: downloadItems
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "Smart Shankar",
        service: "iloveyt.net"
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: err.message,
      data: null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
