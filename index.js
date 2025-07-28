const express = require("express");
const axios = require("axios");
const app = express();

app.get("/api", async (req, res) => {
  let { url, type } = req.query;
  if (!url || !type) return res.status(400).json({ error: "Missing url or type" });

  // ✅ Convert shorts link
  if (url.includes("youtube.com/shorts/")) {
    const id = url.split("/shorts/")[1].split("?")[0];
    url = `https://www.youtube.com/watch?v=${id}`;
  }

  try {
    const response = await axios.get(
      `https://iloveyt.net/api/ajax/search?query=${encodeURIComponent(url)}`,
      {
        headers: {
          "x-requested-with": "XMLHttpRequest",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
          referer: "https://iloveyt.net/en/youtube-to-mp3",
        },
      }
    );

    const json = response.data?.data;
    if (!json) return res.status(500).json({ error: "Invalid response from iloveyt.net" });

    const links = json.download_links?.items || [];

    const cleanLinks = links.filter(
      (x) => x.url && !x.url.includes("googlevideo.com") && x.type === type.toLowerCase()
    );

    if (!cleanLinks.length) {
      return res.status(404).json({ error: "Clean MP3/MP4 link not found" });
    }

    const best = cleanLinks[0];

    return res.json({
      status: "success",
      title: json.video_info.title,
      thumbnail: json.video_info.imagePreviewUrl,
      link: best.url,
      quality: best.quality,
      format: best.format,
      filesize: best.filesize,
    });
  } catch (e) {
    return res.status(500).json({
      error: "Something went wrong",
      details: e.response?.data || e.message,
    });
  }
});

app.listen(3000, () => console.log("✅ Running"));
