// "Lägg till på hemskärmen"-sektionen i Appinställningar.
//
//  - Android/Chrome: en riktig knapp som triggar den inbyggda install-
//    rutan. Prompten fångas i en inline-script i index.html (så den inte
//    hinner gå förlorad) och läggs på window.__installPrompt.
//  - iPhone/Safari: Apple tillåter ingen knapp - vi visar instruktionen
//    (Dela-ikonen -> "Lägg till på hemskärmen").
//  - Redan installerad (körs i standalone-läge): visar bara det.

import { byggInstallningsRad } from "./ui.js";

function arInstallerad() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function arIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function byggInstalleraValjare() {
  const kontroll = document.createElement("div");
  kontroll.className = "installera-kontroll";
  fyll(kontroll);

  // Prompten kan fyra EFTER att skärmen ritats - rita om sektionen då.
  const uppdatera = () => fyll(kontroll);
  window.addEventListener("installprompt-redo", uppdatera);
  window.addEventListener("app-installerad", uppdatera);

  return byggInstallningsRad(
    "Lägg till på hemskärmen",
    "Öppnar appen i eget fönster, som en vanlig app.",
    kontroll
  );
}

function fyll(kontroll) {
  kontroll.innerHTML = "";

  if (arInstallerad()) {
    kontroll.appendChild(text("Appen är redan tillagd på hemskärmen."));
    return;
  }

  if (window.__installPrompt) {
    const knapp = document.createElement("button");
    knapp.className = "knapp-primar";
    knapp.textContent = "Lägg till på hemskärmen";
    knapp.onclick = async () => {
      const prompt = window.__installPrompt;
      if (!prompt) return;
      knapp.disabled = true;
      try {
        prompt.prompt();
        await prompt.userChoice;
      } catch (fel) {
        // avbruten - inget att göra
      }
      window.__installPrompt = null;
      fyll(kontroll);
    };
    kontroll.appendChild(knapp);
    return;
  }

  if (arIOS()) {
    kontroll.appendChild(text('Tryck på Dela-ikonen längst ner i Safari och välj "Lägg till på hemskärmen".'));
    return;
  }

  kontroll.appendChild(text("Öppna appen i Chrome (Android) eller Safari (iPhone) för att kunna lägga till den."));
}

function text(t) {
  const p = document.createElement("p");
  p.className = "installera-info";
  p.textContent = t;
  return p;
}
