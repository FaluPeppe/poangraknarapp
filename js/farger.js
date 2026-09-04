// Hantera färger-skärmen (Fas 6c). Samma redigeringsmönster som
// spelare.js (klicka för att redigera inline).
//
// OBS: detta hanterar den RIKTIGA fargpaletten (samma tabell som Shiny-
// appens "Hantera färger") - MEDVETET separat från grupperna på Poäng-
// skärmen (prototyp_poang), som förblir sin egen isolerade tabell. Se
// kommentaren i worker.js för resonemanget.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

let redigerar_id = null;

export async function initFarger(on401) {
  const container = document.getElementById("farger-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/farger", {}, on401);
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
  if (!res.ok) {
    visaToast("Kunde inte hämta färger.");
    return;
  }
  const farger = await res.json();
  rendera(farger, on401);
}

function rendera(farger, on401) {
  const container = document.getElementById("farger-container");
  container.innerHTML = "";

  const laggTill = document.createElement("div");
  laggTill.className = "spelare-lagg-till";
  laggTill.innerHTML = `
    <input type="text" id="ny-farg-namn" placeholder="Namn, t.ex. Orange">
    <input type="color" id="ny-farg-hex" value="#ff8800">
    <button id="lagg-till-farg-knapp">+ Lägg till</button>
  `;
  container.appendChild(laggTill);
  document.getElementById("lagg-till-farg-knapp").onclick = () => laggTillFarg(on401);

  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  farger.forEach(f => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";

    if (redigerar_id === f.id) {
      rad.appendChild(byggRedigeringsformular(f, on401));
    } else {
      const swatch = document.createElement("span");
      swatch.style.display = "inline-block";
      swatch.style.width = "20px";
      swatch.style.height = "20px";
      swatch.style.borderRadius = "50%";
      swatch.style.background = f.hex;
      swatch.style.marginRight = "10px";
      swatch.style.flexShrink = "0";

      const info = document.createElement("div");
      info.className = "spelar-info";
      info.style.cursor = "pointer";
      info.style.display = "flex";
      info.style.alignItems = "center";
      info.appendChild(swatch);
      const namn = document.createElement("span");
      namn.textContent = f.namn;
      info.appendChild(namn);
      info.onclick = () => {
        redigerar_id = f.id;
        rendera(farger, on401);
      };
      rad.appendChild(info);

      const taBortKnapp = document.createElement("button");
      taBortKnapp.className = "narvaro-knapp";
      taBortKnapp.textContent = "Ta bort";
      taBortKnapp.onclick = () => taBortFarg(f.id, on401);
      rad.appendChild(taBortKnapp);
    }

    lista.appendChild(rad);
  });
  container.appendChild(lista);
}

function byggRedigeringsformular(f, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "spelare-redigera";
  const namnInput = document.createElement("input");
  namnInput.type = "text";
  namnInput.className = "redigera-namn";
  namnInput.value = f.namn;
  const hexInput = document.createElement("input");
  hexInput.type = "color";
  hexInput.className = "redigera-hex";
  hexInput.value = f.hex;
  const knappar = document.createElement("div");
  knappar.className = "spelare-redigera-knappar";
  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "spara-knapp";
  sparaKnapp.textContent = "Spara";
  sparaKnapp.onclick = () => sparaRedigering(f.id, namnInput.value, hexInput.value, on401);
  const avbrytKnapp = document.createElement("button");
  avbrytKnapp.className = "avbryt-knapp";
  avbrytKnapp.textContent = "Avbryt";
  avbrytKnapp.onclick = () => {
    redigerar_id = null;
    initFarger(on401);
  };
  knappar.appendChild(sparaKnapp);
  knappar.appendChild(avbrytKnapp);
  wrapper.appendChild(namnInput);
  wrapper.appendChild(hexInput);
  wrapper.appendChild(knappar);
  return wrapper;
}

async function laggTillFarg(on401) {
  const namnFalt = document.getElementById("ny-farg-namn");
  const hexFalt = document.getElementById("ny-farg-hex");
  const namn = namnFalt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  try {
    const res = await anropaMedToken("/farger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn, hex: hexFalt.value }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initFarger(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte lägga till.");
  }
}

async function sparaRedigering(id, namn, hex, on401) {
  namn = namn.trim();
  if (!namn) {
    visaToast("Namnet får inte vara tomt.");
    return;
  }
  try {
    const res = await anropaMedToken("/farger/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, namn, hex }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    redigerar_id = null;
    await initFarger(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

async function taBortFarg(id, on401) {
  try {
    const res = await anropaMedToken("/farger/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initFarger(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte ta bort.");
  }
}
