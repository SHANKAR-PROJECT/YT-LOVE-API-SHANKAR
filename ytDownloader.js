const axios = require('axios');
const qs = require('qs');

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

  try {
    const response = await axios.post(
      "https://iloveyt.net/proxy.php",
      qs.stringify(data),
      { headers }
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch video data from iloveyt.net');
  }
};

const fetchRealDownloadUrl = async (mediaUrl) => {
  try {
    const response = await axios.get(mediaUrl);
    if (response.data && response.data.fileUrl) {
      return response.data.fileUrl;
    }
    return mediaUrl;
  } catch {
    return mediaUrl;
  }
};

module.exports = async (url, type = 'mp4') => {
  try {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:.*v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) throw new Error('Invalid YouTube URL');
    const videoId = videoIdMatch[1];

    const videoData = await getVideoData(url);
    if (!videoData?.api || videoData.api.status !== "OK") {
      throw new Error('Failed to process YouTube video');
    }

    const mediaItems = videoData.api.mediaItems || [];

    // Filter by requested type
    const filteredItems = mediaItems.filter(item =>
      type === 'mp3' ? item.type === 'audio' : item.type === 'video'
    );

    const result = {
      status: "success",
      code: 200,
      message: `YouTube ${type.toUpperCase()} data retrieved successfully`,
      data: {
        video_info: {
          id: videoId,
          title: videoData.api.title || "No title",
          description: videoData.api.description || "No description",
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
          status: true,
          items: await Promise.all(
            filteredItems.map(async (item) => ({
              type: item.type,
              quality: item.mediaQuality,
              url: await fetchRealDownloadUrl(item.mediaUrl),
              resolution: item.mediaRes,
              duration: formatDuration(item.mediaDuration),
              extension: item.mediaExtension,
              size: item.mediaFileSize
            }))
          )
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "Smart Shankar",
        service: "iloveyt.net"
      }
    };

    return result;
  } catch (error) {
    return {
      status: "error",
      code: 500,
      message: error.message,
      data: null
    };
  }
};
