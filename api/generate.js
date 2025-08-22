// api/generate.js
import fetch from "node-fetch";

const MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN; // Твой токен через переменные окружения

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Не передан prompt" });
  }

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    res.status(200).json({ image: `data:image/png;base64,${base64}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}        "Content-Type": "application/json",
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
