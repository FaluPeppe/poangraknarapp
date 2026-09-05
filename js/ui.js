// Delade, DOM-lätta hjälpfunktioner som fler skärmar (poäng, grupper,
// spelare, ...) kommer att behöva. Håll den här filen fri från
// skärmspecifik logik - bara sådant som verkligen återanvänds.

export function visaToast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("visas");
  setTimeout(() => el.classList.remove("visas"), 2200);
}

// visaTid() togs bort - svarstidsmätningen visades inte längre i UI:t.

// En inställningsrad: etikett + liten hjälptext till vänster, själva
// kontrollen (radioknappar, kryssruta, ...) till höger PÅ SAMMA RAD. Staplas
// automatiskt på smal skärm. Används av Appinställningar-skärmen.
export function byggInstallningsRad(etikett, hjalptext, kontrollEl) {
  const rad = document.createElement("div");
  rad.className = "installning-rad";

  const vanster = document.createElement("div");
  vanster.className = "installning-etikett";
  const namn = document.createElement("span");
  namn.className = "installning-namn";
  namn.textContent = etikett;
  vanster.appendChild(namn);
  if (hjalptext) {
    const hj = document.createElement("span");
    hj.className = "installning-hjalp";
    hj.textContent = hjalptext;
    vanster.appendChild(hj);
  }
  rad.appendChild(vanster);
  rad.appendChild(kontrollEl);
  return rad;
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