// api/generate.js — серверная функция для Vercel (CommonJS)
// Использует Hugging Face Inference API и модель SDXL base.
// Нужна переменная окружения: HUGGINGFACE_TOKEN

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { prompt, size = "768x768", negative = "" } = req.body || {};
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({ error: "Введите осмысленный prompt (минимум 3 символа)." });
    }

    // Разбор и валидация размера
    const match = /^(\d+)x(\d+)$/.exec(size) || [];
    let width = Number(match[1]) || 768;
    let height = Number(match[2]) || 768;
    const allowed = new Set([512, 768, 1024]);
    if (!allowed.has(width) || !allowed.has(height)) {
      width = 768; height = 768;
    }

    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
    if (!HF_TOKEN) {
      return res.status(500).json({ error: "Не задан HUGGINGFACE_TOKEN в переменных окружения Vercel." });
    }

    const model = "stablediffusionapi/stable-diffusion-xl-base-1.0";

    const apiRes = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width, height, negative_prompt: negative },
        options: { wait_for_model: true }
      })
    });

    // Если Hugging Face вернул JSON с ошибкой — пробуем прочитать
    if (!apiRes.ok) {
      let err = `HF API error (${apiRes.status})`;
      try {
        const j = await apiRes.json();
        if (j && j.error) err = j.error;
      } catch (_) {}
      return res.status(apiRes.status).json({ error: err });
    }

    // Успешный ответ — это бинарное изображение
    const buf = Buffer.from(await apiRes.arrayBuffer());
    const b64 = buf.toString("base64");

    return res.status(200).json({ image_b64: b64 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Внутренняя ошибка сервера." });
  }
};
