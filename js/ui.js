// Delade, DOM-lätta hjälpfunktioner som fler skärmar (poäng, grupper,
// spelare, ...) kommer att behöva. Håll den här filen fri från
// skärmspecifik logik - bara sådant som verkligen återanvänds.

export function visaToast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("visas");
  setTimeout(() => el.classList.remove("visas"), 2200);
}

export function visaTid(ms) {
  const el = document.getElementById("matning-tid");
  if (el) el.textContent = ms.toFixed(0) + " ms";
}

// Enkel ljushetsberäkning - samma princip som i den riktiga Shiny-appen,
// så text alltid syns tydligt oavsett bakgrundsfärg.
export function textFargForBg(hex) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  const ljushet = (r * 299 + g * 587 + b * 114) / 1000;
  return ljushet > 150 ? "#1A1A1A" : "white";
}
