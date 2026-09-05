// Appinställningar - personliga val som sparas lokalt i webbläsaren (inte
// per lag): ljud + vibration för timrarna (Poäng-skärmens tidtagarur och
// alla intervalltimrar) samt "Håll skärmen vaken". Nås via Inställningar →
// Appinställningar. All logik/lagring bor kvar i ljud.js resp. skarmvaken.js
// - den här filen sätter bara ihop skärmen.

import { byggSkarmvakenValjare } from "./skarmvaken.js";
import { byggLjudOchVibrationsval } from "./ljud.js";

export function initAppinstallningar() {
  const container = document.getElementById("appinstallningar-container");
  container.innerHTML = "";

  const rubrik = document.createElement("h2");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Appinställningar";
  container.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Personliga inställningar som gäller den här webbläsaren, inte hela laget.";
  container.appendChild(info);

  const kort = document.createElement("div");
  kort.className = "avsluta-form";
  kort.appendChild(byggSkarmvakenValjare());
  kort.appendChild(byggLjudOchVibrationsval());
  container.appendChild(kort);
}
