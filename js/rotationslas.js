// Låser skärmens rotation till stående läge - personlig inställning, PÅ som
// standard, sparas lokalt i webbläsaren (inte per lag).
//
// OBS om webbläsarstöd:
//  - Screen Orientation API (screen.orientation.lock) fungerar bara när
//    sidan körs som installerad app i fristående läge ("standalone" - dvs
//    tillagd på hemskärmen och öppnad DÄRIFRÅN). I en vanlig webbläsarflik
//    nekar webbläsaren alltid låsningen; felet fångas tyst och skärmen
//    roterar då som vanligt.
//  - Fungerar i Android Chrome när appen är tillagd på hemskärmen.
//  - iPhone/Safari saknar HELT stöd för screen.orientation.lock, oavsett
//    hemskärm eller inte - inställningen gör då ingenting där. manifest.
//    webmanifest har ändå "orientation": "portrait" som en extra spärr
//    Android respekterar direkt vid start av den installerade appen,
//    oavsett den här inställningen.

import { byggInstallningsRad } from "./ui.js";

const NYCKEL = "kif_rotationslas";

export function rotationslastLage() {
  return localStorage.getItem(NYCKEL) !== "av"; // låst som standard
}

export function sparaRotationslasLage(last) {
  localStorage.setItem(NYCKEL, last ? "pa" : "av");
  initRotationslas();
}

// Kallas vid appstart och varje gång inställningen ändras.
export function initRotationslas() {
  if (!screen.orientation || typeof screen.orientation.lock !== "function") return;
  if (rotationslastLage()) {
    screen.orientation.lock("portrait").catch(() => {
      // Inte installerad/fristående, eller webbläsare utan stöd (iPhone) -
      // inte kritiskt, appen fungerar ändå, den bara roterar.
    });
  } else if (typeof screen.orientation.unlock === "function") {
    try { screen.orientation.unlock(); } catch (fel) { /* strunt samma */ }
  }
}

// Bygger en inställningsrad (etikett + kryssruta) för Appinställningar.
export function byggRotationslasValjare() {
  const kontroll = document.createElement("div");
  kontroll.className = "installning-kontroll";
  const rad = document.createElement("label");
  rad.className = "radio-rad";
  const kryss = document.createElement("input");
  kryss.type = "checkbox";
  kryss.checked = rotationslastLage();
  kryss.onchange = () => sparaRotationslasLage(kryss.checked);
  rad.appendChild(kryss);
  rad.appendChild(document.createTextNode(" Lås till stående läge"));
  kontroll.appendChild(rad);

  return byggInstallningsRad(
    "Skärmrotation",
    "Hindrar appen från att rotera till liggande läge. Fungerar bara när appen är tillagd på hemskärmen och öppnas därifrån (Android). På iPhone stöds ingen låsning alls - appen roterar oavsett.",
    kontroll
  );
}
