// === Гостевой лимит через localStorage ===
const GUEST_DAILY_LIMIT = 2;
const LS_KEY = "guest_quota_v1"; // ключ в localStorage

function todayISO() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10); // YYYY-MM-DD
}

function readGuestQuota() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { used: 0, day: todayISO() };
    const obj = JSON.parse(raw);
    // если день сменился — обнуляем
    if (obj.day !== todayISO()) return { used: 0, day: todayISO() };
    return { used: Number(obj.used) || 0, day: obj.day };
  } catch {
    return { used: 0, day: todayISO() };
  }
}

function writeGuestQuota(q) {
  localStorage.setItem(LS_KEY, JSON.stringify(q));
}

function updateQuotaUI(q = readGuestQuota()) {
  const quotaText = document.getElementById("quotaText");
  const quotaMsg = document.getElementById("quotaMsg");
  if (quotaText) quotaText.textContent = `${Math.max(GUEST_DAILY_LIMIT - q.used, 0)} из ${GUEST_DAILY_LIMIT}`;
  if (quotaMsg) quotaMsg.textContent = q.used >= GUEST_DAILY_LIMIT ? "Лимит для гостей исчерпан — войдите, чтобы продолжить" : "";
}

/**
 * Пытаемся «списать» одну бесплатную попытку гостя.
 * Возвращает true — можно генерировать; false — лимит исчерпан.
 */
function consumeGuestCredit() {
  let q = readGuestQuota();
  if (q.used >= GUEST_DAILY_LIMIT) {
    updateQuotaUI(q);
    return false;
  }
  q.used += 1;
  writeGuestQuota(q);
  updateQuotaUI(q);
  return true;
}

// при загрузке страницы — привести счётчик к актуальному дню
window.addEventListener("DOMContentLoaded", () => updateQuotaUI());

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

    // ==== Проверка лимита для гостя ====
    if (!consumeGuestCredit()) {
      errorEl.textContent = "Лимит для гостей исчерпан — войдите, чтобы продолжить.";
      preview.innerHTML = "<span style='color:#888'>Здесь появится изображение</span>";
      generateBtn.disabled = false;
      return;
    }
    // ==================================

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
