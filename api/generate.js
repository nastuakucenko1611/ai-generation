// api/generate.js
import fetch from "node-fetch";

const MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN; // Токен через переменные окружения

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  const { prompt, width = 512, height = 512, negative = "" } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Не передан prompt" });
  }

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width, height, negative_prompt: negative },
          options: { wait_for_model: true },
        }),
      }
    );

    if (!response.ok) {
      let errorText = `HF API error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) errorText = errJson.error;
      } catch (_) {}
      return res.status(response.status).json({ error: errorText });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    return res
      .status(200)
      .json({ image: `data:image/png;base64,${base64}` });
  } catch (err) {
    console.error("Ошибка API:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера." });
  }
}
