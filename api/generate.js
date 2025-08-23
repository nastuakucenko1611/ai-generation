// api/generate.js  (CommonJS, для Vercel)
const MODEL = process.env.HF_MODEL || "stabilityai/stable-diffusion-xl-base-1.0";

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
    if (!HF_TOKEN) {
      return res.status(500).json({ error: "HUGGINGFACE_TOKEN not set on server" });
    }

    const body = req.body || {};
    const prompt = (body.prompt || "").toString().trim();
    const negative = (body.negative || "").toString().trim();
    const size = (body.size || "768x768").toString();

    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // parse size like "768x768"
    const m = /^(\d+)x(\d+)$/.exec(size);
    let width = 768, height = 768;
    if (m) { width = parseInt(m[1],10); height = parseInt(m[2],10); }

    // Build HF request payload
    const payload = {
      inputs: prompt,
      parameters: { width, height, negative_prompt: negative },
      options: { wait_for_model: true }
    };

    const apiUrl = `https://api-inference.huggingface.co/models/${MODEL}`;
    console.log("HF request to", apiUrl, "payload size:", width, height);

    const hfRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const contentType = (hfRes.headers.get("content-type") || "").toLowerCase();
    console.log("HF status", hfRes.status, "content-type", contentType);

    // If HF returned image directly (most image models return image bytes)
    if (hfRes.ok && contentType.startsWith("image/")) {
      const arrayBuffer = await hfRes.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString("base64");
      return res.status(200).json({ ok: true, image_b64: b64 });
    }

    // If HF returned JSON (errors or JSON metadata)
    let text;
    try {
      // try parse JSON first
      const j = await hfRes.json();
      // If it's an object with error key — forward it
      if (!hfRes.ok) {
        return res.status(hfRes.status).json({ ok: false, hf_error: j });
      }
      // Otherwise forward JSON result
      return res.status(200).json({ ok: true, hf_json: j });
    } catch (e) {
      // not JSON — read as text
      text = await hfRes.text();
      console.log("HF non-JSON response:", text.slice(0,1000));
      return res.status(hfRes.status || 500).json({
        ok: false,
        error: "HF returned non-JSON response",
        hf_text: text.slice(0, 2000)
      });
    }

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error", detail: String(err) });
  }
};
