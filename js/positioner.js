// Hantera positioner-skärmen (Fas 6b). Enkel lista - inget att redigera,
// bara lägga till och ta bort (matchar hur positioner faktiskt används:
// som en samling namn, inte poster med flera fält).

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

export async function initPositioner(on401) {
  const container = document.getElementById("positioner-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/positioner", {}, on401);
  } catch (fel) {
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta positioner.");
    return;
  }
  const positioner = await res.json();
  rendera(positioner, on401);
}

function rendera(positioner, on401) {
  const container = document.getElementById("positioner-container");
  container.innerHTML = "";

  const laggTill = document.createElement("div");
  laggTill.className = "spelare-lagg-till";
  laggTill.innerHTML = `
    <input type="text" id="ny-position-namn" placeholder="Ny position, t.ex. Mittfältare">
    <button id="lagg-till-position-knapp">+ Lägg till</button>
  `;
  container.appendChild(laggTill);
  document.getElementById("lagg-till-position-knapp").onclick = () => laggTillPosition(on401);

  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  positioner.forEach(p => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";
    const info = document.createElement("div");
    info.className = "spelar-info";
    info.textContent = p.namn;
    rad.appendChild(info);

    const taBortKnapp = document.createElement("button");
    taBortKnapp.className = "narvaro-knapp";
    taBortKnapp.textContent = "Ta bort";
    taBortKnapp.onclick = () => taBortPosition(p.id, on401);
    rad.appendChild(taBortKnapp);

    lista.appendChild(rad);
  });
  container.appendChild(lista);
}

async function laggTillPosition(on401) {
  const falt = document.getElementById("ny-position-namn");
  const namn = falt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  try {
    const res = await anropaMedToken("/positioner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte lägga till.");
  }
}

async function taBortPosition(id, on401) {
  try {
    const res = await anropaMedToken("/positioner/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte ta bort.");
  }
}
