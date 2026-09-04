// Hantera spelare-skärmen (Fas 3). Ingen HARD delete - en spelare som
// slutat inaktiveras istället (samma princip som databasens 'aktiv'-kolumn
// redan är byggd för), så gammal matchhistorik inte tappar sin koppling.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

let redigerar_id = null; // id på spelaren som just nu visar redigeringsfält, eller null

export async function initSpelare(on401) {
  const container = document.getElementById("spelare-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/spelare/alla", {}, on401);
  } catch (fel) {
    return; // 401 redan hanterat
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta spelare.");
    return;
  }
  const spelare = await res.json();
  rendera(spelare, on401);
}

function rendera(spelare, on401) {
  const container = document.getElementById("spelare-container");
  container.innerHTML = "";

  // ---- Lägg till ny spelare ----
  const laggTill = document.createElement("div");
  laggTill.className = "spelare-lagg-till";
  laggTill.innerHTML = `
    <input type="text" id="nytt-spelare-namn" placeholder="Namn">
    <input type="text" id="nytt-spelare-positioner" placeholder="Positioner (valfritt)">
    <button id="lagg-till-spelare-knapp">+ Lägg till</button>
  `;
  container.appendChild(laggTill);
  document.getElementById("lagg-till-spelare-knapp").onclick = () => laggTillSpelare(on401);

  // ---- Spelarlista ----
  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  spelare.forEach(s => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad" + (!s.aktiv ? " franvarande" : "");

    if (redigerar_id === s.id) {
      rad.appendChild(byggRedigeringsformular(s, on401));
    } else {
      const info = document.createElement("div");
      info.className = "spelar-info";
      info.style.cursor = "pointer";
      const namn = document.createElement("div");
      namn.className = "spelar-namn";
      namn.textContent = s.namn;
      info.appendChild(namn);
      if (s.positioner) {
        const pos = document.createElement("div");
        pos.className = "spelar-positioner";
        pos.textContent = s.positioner;
        info.appendChild(pos);
      }
      info.onclick = () => {
        redigerar_id = s.id;
        rendera(spelare, on401);
      };
      rad.appendChild(info);

      const aktivKnapp = document.createElement("button");
      aktivKnapp.className = "narvaro-knapp";
      aktivKnapp.textContent = s.aktiv ? "Inaktivera" : "Aktivera";
      aktivKnapp.onclick = () => satAktiv(s.id, !s.aktiv, on401);
      rad.appendChild(aktivKnapp);
    }

    lista.appendChild(rad);
  });
  container.appendChild(lista);
}

function byggRedigeringsformular(s, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "spelare-redigera";
  wrapper.innerHTML = `
    <input type="text" class="redigera-namn" value="${escapeHtml(s.namn)}">
    <input type="text" class="redigera-positioner" value="${escapeHtml(s.positioner || "")}" placeholder="Positioner">
    <div class="spelare-redigera-knappar">
      <button class="spara-knapp">Spara</button>
      <button class="avbryt-knapp">Avbryt</button>
    </div>
  `;
  wrapper.querySelector(".spara-knapp").onclick = () => sparaRedigering(s.id, wrapper, on401);
  wrapper.querySelector(".avbryt-knapp").onclick = () => {
    redigerar_id = null;
    initSpelare(on401);
  };
  return wrapper;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function laggTillSpelare(on401) {
  const namnFalt = document.getElementById("nytt-spelare-namn");
  const positionerFalt = document.getElementById("nytt-spelare-positioner");
  const namn = namnFalt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  try {
    const res = await anropaMedToken("/spelare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn, positioner: positionerFalt.value.trim() }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initSpelare(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte lägga till spelaren.");
  }
}

async function sparaRedigering(id, wrapper, on401) {
  const namn = wrapper.querySelector(".redigera-namn").value.trim();
  const positioner = wrapper.querySelector(".redigera-positioner").value.trim();
  if (!namn) {
    visaToast("Namnet får inte vara tomt.");
    return;
  }
  try {
    const res = await anropaMedToken("/spelare/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, namn, positioner }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    redigerar_id = null;
    await initSpelare(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte spara ändringen.");
  }
}

async function satAktiv(id, aktiv, on401) {
  try {
    const res = await anropaMedToken("/spelare/aktiv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, aktiv }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initSpelare(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte spara ändringen.");
  }
}
