document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const promptEl = $("prompt");
  const negativeEl = $("negative");
  const sizeEl = $("size");
  const generateBtn = $("generate");
  const statusEl = $("status");
  const preview = $("preview");
  const actions = $("actions");
  const downloadBtn = $("download");
  const openNewBtn = $("openNew");
  const errorEl = $("error");

  async function generate() {
    errorEl.textContent = "";
    actions.style.display = "none";
    preview.innerHTML = "<span style='color:#888'>Генерация… это может занять до минуты при первом запуске модели</span>";
    statusEl.textContent = "";
    generateBtn.disabled = true;

    try {
      const body = {
        prompt: promptEl.value.trim(),
        negative: negativeEl.value.trim(),
        size: sizeEl.value
      };

      if (!body.prompt) {
        errorEl.textContent = "Введите описание картинки.";
        preview.innerHTML = "<span style='color:#888'>Здесь появится изображение</span>";
        generateBtn.disabled = false;
        return;
      }

      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      let data;
      try { data = await resp.json(); } catch(_) {
        errorEl.textContent = "Ответ сервера не в формате JSON.";
        generateBtn.disabled = false;
        return;
      }

      if (!resp.ok || data.error) {
        errorEl.textContent = "Ошибка: " + (data.error || `status ${resp.status}`);
        preview.innerHTML = "<span style='color:#888'>Не удалось сгенерировать изображение</span>";
        generateBtn.disabled = false;
        return;
      }

      // Показ изображения
      const src = "data:image/png;base64," + data.image_b64;
      const img = new Image();
      img.src = src;
      img.alt = "AI image";
      img.onload = () => {
        preview.innerHTML = "";
        preview.appendChild(img);
        actions.style.display = "flex";
        statusEl.textContent = "Готово • можно скачать";
      };

      // Кнопки действий
      downloadBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = src;
        a.download = "ai-image.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      };

      openNewBtn.onclick = () => {
        window.open(src, "_blank");
      };
    } catch (e) {
      console.error(e);
      errorEl.textContent = "Ошибка сервера!";
      preview.innerHTML = "<span style='color:#888'>Не удалось сгенерировать изображение</span>";
    } finally {
      generateBtn.disabled = false;
    }
  }

  generateBtn.addEventListener("click", generate);
});
