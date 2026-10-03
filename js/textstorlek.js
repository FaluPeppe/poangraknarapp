// Textstorlek - Normal / Stor / Extra stor. Personlig inställning som
// sparas lokalt i webbläsaren (inte per lag), samma mönster som zoomlas.js.
// Sätter en klass på <html>; all text i css/stil.css är i rem och skalas
// därmed med (se html-regeln överst där). Normal = ingen klass = exakt
// samma utseende som innan inställningen fanns.

import { byggInstallningsRad } from "./ui.js";

const NYCKEL = "kif_textstorlek";
const LAGEN = [
  { varde: "normal", etikett: "Normal", klass: null },
  { varde: "stor", etikett: "Stor", klass: "text-stor" },
  { varde: "extrastor", etikett: "Extra stor", klass: "text-extrastor" },
];

function aktuelltLage() {
  try {
    const v = localStorage.getItem(NYCKEL);
    return LAGEN.some(l => l.varde === v) ? v : "normal";
  } catch (fel) {
    return "normal";
  }
}

// Kallas vid appstart (även på inloggningsskärmen) och vid varje ändring.
export function initTextstorlek() {
  const lage = aktuelltLage();
  const rot = document.documentElement;
  LAGEN.forEach(l => { if (l.klass) rot.classList.toggle(l.klass, l.varde === lage); });
}

function sparaLage(varde) {
  try { localStorage.setItem(NYCKEL, varde); } catch (fel) { /* privat läge - gäller bara nu */ }
  initTextstorlek();
}

// Inställningsrad (etikett + tre radioknappar på en rad) för Appinställningar.
export function byggTextstorlekValjare() {
  const kontroll = document.createElement("div");
  kontroll.className = "installning-kontroll";
  const nu = aktuelltLage();
  LAGEN.forEach(l => {
    const rad = document.createElement("label");
    rad.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "textstorlek";
    radio.value = l.varde;
    radio.checked = l.varde === nu;
    radio.onchange = () => sparaLage(l.varde);
    rad.appendChild(radio);
    rad.appendChild(document.createTextNode(" " + l.etikett));
    kontroll.appendChild(rad);
  });

  return byggInstallningsRad(
    "Textstorlek",
    "Större text i hela appen, t.ex. för att se bättre ute på planen. Gäller bara den här telefonen.",
    kontroll
  );
}
