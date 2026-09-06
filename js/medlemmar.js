// Anslutna ledare - vem som har tillgång till laget, och deras roller.
// Bara admins kan lägga till/ändra/ta bort - Workern kontrollerar detta på
// riktigt (färsk koll mot databasen, se worker.js), men vi anpassar även
// UI:t efter roll så en vanlig medlem inte ens ser knappar den ändå skulle
// nekas att använda.
//
// Bor numera INUTI Hantera lag-skärmen (lag.js) istället för att vara en
// egen Hantera-knapp - containerId skickas in av anroparen och kommas ihåg
// (CONTAINER_ID) så att de interna "ladda om"-anropen efter en ändring
// automatiskt målar om RÄTT container utan att lag.js behöver bry sig om
// det.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

let CONTAINER_ID = "medlemmar-container"; // standard - kan override:as av anroparen

export async function initMedlemmar(on401, containerId = CONTAINER_ID) {
  CONTAINER_ID = containerId;
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return; // kontainern kanske inte finns än (t.ex. lag.js hann inte rendera skelettet)
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let migRes, medlemmarRes;
  try {
    [migRes, medlemmarRes] = await Promise.all([
      anropaMedToken("/mig", {}, on401),
      anropaMedToken("/medlemmar", {}, on401),
    ]);
  } catch (fel) {
    // Natverksfel/CORS-fel etc hamnar har (401 hanteras separat via on401
    // inne i anropaMedToken, som da redan loggat ut - detta ar for ALLA
    // ANDRA fel, sa att skarmen aldrig bara fastnar pa "Laddar..." utan
    // nagon förklaring).
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webblasarens konsol (F12) for detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!migRes.ok || !medlemmarRes.ok) {
    visaToast("Kunde inte hämta ledare.");
    return;
  }

  const mig = await migRes.json();
  const medlemmar = await medlemmarRes.json();
  rendera(medlemmar, mig, on401);
}

function rendera(medlemmar, mig, on401) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;
  container.innerHTML = "";
  // OBS: detta är bara för att VISA rätt UI - den riktiga behörighets-
  // kontrollen sker alltid på servern (se worker.js: ar_admin_just_nu).
  const jag_ar_admin = mig.roll === "admin";

  if (jag_ar_admin) {
    const laggTill = document.createElement("div");
    laggTill.className = "spelare-lagg-till";
    laggTill.innerHTML = `
      <input type="email" id="ny-medlem-epost" placeholder="E-postadress">
      <select id="ny-medlem-roll">
        <option value="medlem">Medlem</option>
        <option value="admin">Admin</option>
      </select>
      <button id="lagg-till-medlem-knapp">+ Bjud in</button>
    `;
    container.appendChild(laggTill);
    document.getElementById("lagg-till-medlem-knapp").onclick = () => laggTillMedlem(on401);
  }

  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  medlemmar.forEach(m => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";

    const info = document.createElement("div");
    info.className = "spelar-info";
    const epost = document.createElement("div");
    epost.className = "spelar-namn";
    epost.textContent = m.epost;
    info.appendChild(epost);
    const roll = document.createElement("div");
    roll.className = "spelar-positioner";
    roll.textContent = m.roll === "admin" ? "Admin" : "Medlem";
    info.appendChild(roll);
    rad.appendChild(info);

    if (jag_ar_admin) {
      const rollKnapp = document.createElement("button");
      rollKnapp.className = "narvaro-knapp";
      rollKnapp.textContent = m.roll === "admin" ? "Gör till medlem" : "Gör till admin";
      rollKnapp.onclick = () => andraRoll(m.epost, m.roll === "admin" ? "medlem" : "admin", on401);
      rad.appendChild(rollKnapp);

      const taBortKnapp = document.createElement("button");
      taBortKnapp.className = "narvaro-knapp";
      taBortKnapp.textContent = "Ta bort";
      taBortKnapp.onclick = () => taBortMedlem(m.epost, on401);
      rad.appendChild(taBortKnapp);
    }

    lista.appendChild(rad);
  });
  container.appendChild(lista);
}

async function laggTillMedlem(on401) {
  const epostFalt = document.getElementById("ny-medlem-epost");
  const rollFalt = document.getElementById("ny-medlem-roll");
  const epost = epostFalt.value.trim();
  if (!epost) {
    visaToast("Ange en e-postadress.");
    return;
  }
  try {
    const res = await anropaMedToken("/medlemmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epost, roll: rollFalt.value }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast("Ledaren är tillagd.");
    await initMedlemmar(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte lägga till.");
  }
}

async function andraRoll(epost, ny_roll, on401) {
  try {
    const res = await anropaMedToken("/medlemmar/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epost, roll: ny_roll }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initMedlemmar(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte ändra rollen.");
  }
}

async function taBortMedlem(epost, on401) {
  try {
    const res = await anropaMedToken("/medlemmar/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epost }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initMedlemmar(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte ta bort.");
  }
}
