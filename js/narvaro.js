// Hantera närvaro-skärmen. Den DELADE listan (samma för alla tränare i
// laget, sparas i databasen via /narvaro) - flyttad hit från "Dela in
// grupper", som numera har sin EGEN, lokala/personliga närvaromarkering
// (se grupper.js). De två är medvetet separata:
//   - HÄR: "är Elin med på träningen idag" - delat, en sanning för laget.
//   - DÄR (grupper.js): "vill JAG jobba med Elin i min gruppindelning just
//     nu" - personligt, kan skilja sig åt mellan tränare, påverkar aldrig
//     denna lista.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

export async function initNarvaro(on401) {
  const container = document.getElementById("narvaro-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/spelare", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta spelare.");
    return;
  }
  const spelare = await res.json();
  rendera(spelare, on401);
}

function rendera(spelare, on401) {
  const container = document.getElementById("narvaro-container");
  container.innerHTML = "";

  const info = document.createElement("p");
  info.style.cssText = "color:#666;font-size:13px;margin-bottom:12px;";
  info.textContent = "Delad lista för hela laget - alla tränare ser och uppdaterar samma närvaro.";
  container.appendChild(info);

  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  spelare.forEach(s => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad" + (s.franvarande ? " franvarande" : "");

    const namn = document.createElement("div");
    namn.className = "spelar-info";
    namn.textContent = s.namn;
    rad.appendChild(namn);

    const knapp = document.createElement("button");
    knapp.className = "narvaro-knapp";
    knapp.textContent = s.franvarande ? "Frånvarande" : "Närvarande";
    knapp.onclick = () => toggleNarvaro(s.id, !s.franvarande, on401);
    rad.appendChild(knapp);

    lista.appendChild(rad);
  });
  container.appendChild(lista);
}

async function toggleNarvaro(spelar_id, franvarande, on401) {
  try {
    const res = await anropaMedToken("/narvaro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spelar_id, franvarande }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initNarvaro(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte spara närvaron, försök igen.");
  }
}