const axios = require("axios");

module.exports = async (req, res) => {
  const { url, type = "mp4" } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const apiURL = `https://iloveyt.net/api/button/${type}/${encodeURIComponent(url)}`;
    const response = await axios.get(apiURL);
    const html = response.data;

    const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    if (matches.length === 0) {
      return res.status(404).json({ error: "No download links found" });
    }

    const links = matches.map(([_, href, text]) => ({
      label: text.trim(),
      url: href.trim(),
    }));

    return res.json({
      status: "success",
      type,
      source: "iloveyt.net",
      total: links.length,
      links,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch from iloveyt.net", details: err.message });
  }
};
