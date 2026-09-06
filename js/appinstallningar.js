// Appinställningar - personliga val som sparas lokalt i webbläsaren (inte
// per lag): ljud + vibration för timrarna (Poäng-skärmens tidtagarur och
// alla intervalltimrar) samt "Håll skärmen vaken". Nås via Inställningar →
// Appinställningar. All logik/lagring bor kvar i ljud.js resp. skarmvaken.js
// - den här filen sätter bara ihop skärmen.

import { byggSkarmvakenValjare } from "./skarmvaken.js";
import { byggLjudOchVibrationsval } from "./ljud.js";
import { byggInstalleraValjare } from "./installera.js";

export function initAppinstallningar() {
  const container = document.getElementById("appinstallningar-container");
  container.innerHTML = "";

  const rubrik = document.createElement("h2");
  rubrik.className = "grupper-rubrik";
  rubrik.textContent = "Appinställningar";
  container.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Personliga inställningar som gäller den här webbläsaren, inte hela laget.";
  container.appendChild(info);

  // Eget kort - INTE .avsluta-form, vars label/input-regler (tänkta för
  // textfält) annars slår mot radioknapparna här.
  const kort = document.createElement("div");
  kort.className = "appinstallningar-kort";
  kort.appendChild(byggSkarmvakenValjare());
  kort.appendChild(byggLjudOchVibrationsval());
  kort.appendChild(byggInstalleraValjare());
  container.appendChild(kort);
}
