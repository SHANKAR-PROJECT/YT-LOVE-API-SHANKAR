const express = require("express");
const axios = require("axios");
const app = express();

app.get("/api", async (req, res) => {
  let { url, type } = req.query;
  if (!url || !type) return res.status(400).json({ error: "Missing url or type" });

  // ✅ Convert shorts to normal watch format
  if (url.includes("youtube.com/shorts/")) {
    const id = url.split("/shorts/")[1].split("?")[0];
    url = `https://www.youtube.com/watch?v=${id}`;
  }

  try {
    const fetch = await axios.get(`https://iloveyt.net/api/ajax/search?query=${encodeURIComponent(url)}`, {
      headers: {
        "x-requested-with": "XMLHttpRequest",
        Referer: "https://iloveyt.net/en/youtube-to-mp3",
        "User-Agent": "Mozilla/5.0"
      }
    });

    const data = fetch.data;
    const video = data.data || {};
    const links = (video.download_links && video.download_links.items) || [];

    if (!links.length) return res.status(404).json({ error: "Download links not available" });

    const filtered = links.filter(x =>
      x.url && !x.url.includes("googlevideo.com") &&
      x.type === type.toLowerCase()
    );

    if (!filtered.length) return res.status(404).json({ error: "Clean MP3/MP4 download link not found" });

    const best = filtered[0];

    res.json({
      status: "success",
      title: video.video_info?.title,
      thumbnail: video.video_info?.imagePreviewUrl,
      link: best.url,
      quality: best.quality || "unknown",
      format: best.format || type,
      size: best.filesize || "unknown"
    });

  } catch (e) {
    res.status(500).json({ error: "Something went wrong", details: e.message });
  }
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));
