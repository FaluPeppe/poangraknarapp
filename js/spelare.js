// Hantera spelare-skärmen. Ombyggd kompakt i Shiny-appens stil: spelarna
// visas som chips (inte fulla rader) så truppen tar liten plats, plus en
// "Lägg till flera spelare på en gång"-vy för säsongsstart/nya lag. Ingen
// HARD delete - en spelare som slutat inaktiveras istället (databasens
// 'aktiv'-kolumn är byggd för det), så gammal matchhistorik inte tappar
// sin koppling.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

let redigerar_id = null;
let bulk_synlig = false;
let bulk_rader = 5;

export async function initSpelare(on401) {
  const container = document.getElementById("spelare-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let spelareRes, positionerRes;
  try {
    [spelareRes, positionerRes] = await Promise.all([
      anropaMedToken("/spelare/alla", {}, on401),
      anropaMedToken("/positioner", {}, on401),
    ]);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!spelareRes.ok || !positionerRes.ok) {
    visaToast("Kunde inte hämta spelare eller positioner.");
    return;
  }
  const spelare = await spelareRes.json();
  const positioner = await positionerRes.json();
  rendera(spelare, positioner, on401);
}

function rendera(spelare, positioner, on401) {
  const container = document.getElementById("spelare-container");
  container.innerHTML = "";

  const aktiva = spelare.filter(s => s.aktiv);
  const inaktiva = spelare.filter(s => !s.aktiv);

  // ---- Chips: aktiva spelare ----
  const chipRad = document.createElement("div");
  chipRad.className = "spelar-chiprad";
  aktiva.forEach(s => chipRad.appendChild(byggChip(s, spelare, positioner, on401)));
  container.appendChild(chipRad);

  // ---- Lägg till en spelare ----
  container.appendChild(byggLaggTillEn(positioner, on401));

  const bulkKnapp = document.createElement("button");
  bulkKnapp.className = "narvaro-knapp";
  bulkKnapp.textContent = "👥 Lägg till flera spelare på en gång";
  bulkKnapp.onclick = () => { bulk_synlig = !bulk_synlig; rendera(spelare, positioner, on401); };
  container.appendChild(bulkKnapp);

  if (bulk_synlig) {
    container.appendChild(byggBulkFormular(positioner, on401));
  }

  // ---- Inaktiva spelare (om några finns) ----
  if (inaktiva.length > 0) {
    const inaktivRubrik = document.createElement("h3");
    inaktivRubrik.className = "historik-rubrik";
    inaktivRubrik.textContent = "Inaktiva spelare";
    container.appendChild(inaktivRubrik);
    const inaktivChipRad = document.createElement("div");
    inaktivChipRad.className = "spelar-chiprad";
    inaktiva.forEach(s => inaktivChipRad.appendChild(byggChip(s, spelare, positioner, on401)));
    container.appendChild(inaktivChipRad);
  }
}

function byggChip(s, spelare, positioner, on401) {
  if (redigerar_id === s.id) {
    return byggRedigeringsformular(s, spelare, positioner, on401);
  }

  const chip = document.createElement("span");
  chip.className = "spelar-chip" + (!s.aktiv ? " spelar-chip-inaktiv" : "");

  const namn = document.createElement("span");
  namn.textContent = s.namn;
  namn.title = [s.positioner, s.kategori ? `Kategori: ${s.kategori}` : null].filter(Boolean).join(" · ");
  chip.appendChild(namn);

  const redigeraKnapp = document.createElement("button");
  redigeraKnapp.className = "chip-ikonknapp";
  redigeraKnapp.textContent = "✏️";
  redigeraKnapp.onclick = () => { redigerar_id = s.id; rendera(spelare, positioner, on401); };
  chip.appendChild(redigeraKnapp);

  const aktivKnapp = document.createElement("button");
  aktivKnapp.className = "chip-ikonknapp";
  aktivKnapp.textContent = s.aktiv ? "✕" : "↺";
  aktivKnapp.title = s.aktiv ? "Inaktivera" : "Aktivera";
  aktivKnapp.onclick = () => satAktiv(s.id, !s.aktiv, on401);
  chip.appendChild(aktivKnapp);

  return chip;
}

function byggRedigeringsformular(s, spelare, positioner, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "spelare-redigera spelare-redigera-chip";
  wrapper.innerHTML = `
    <input type="text" class="redigera-namn" value="${escapeHtml(s.namn)}" placeholder="Namn">
    <input type="text" class="redigera-positioner" value="${escapeHtml(s.positioner || "")}" placeholder="Positioner">
    <input type="text" class="redigera-kategori" value="${escapeHtml(s.kategori || "")}" placeholder="Kategori">
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

function byggLaggTillEn(positioner, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Lägg till spelare";
  wrapper.appendChild(rubrik);

  const raden = document.createElement("div");
  raden.className = "spelare-lagg-till";
  raden.innerHTML = `
    <input type="text" id="nytt-spelare-namn" placeholder="Namn">
    <input type="text" id="nytt-spelare-kategori" placeholder="Kategori (valfritt)">
    <button id="lagg-till-spelare-knapp">+ Lägg till</button>
  `;
  wrapper.appendChild(raden);

  if (positioner.length > 0) {
    const posLabel = document.createElement("p");
    posLabel.className = "grupper-info-liten";
    posLabel.textContent = "Positioner (valfritt)";
    wrapper.appendChild(posLabel);
    const posRad = document.createElement("div");
    posRad.className = "positioner-kryssrad";
    positioner.forEach(p => {
      const label = document.createElement("label");
      label.className = "positioner-kryss-etikett";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = p.namn;
      cb.className = "ny-spelare-position-kryss";
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + p.namn));
      posRad.appendChild(label);
    });
    wrapper.appendChild(posRad);
  }

  wrapper.querySelector("#lagg-till-spelare-knapp").onclick = () => laggTillSpelare(on401);
  return wrapper;
}

function byggBulkFormular(positioner, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Lägg till flera spelare";
  wrapper.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Fyll i namn på de rader du vill använda - tomma rader hoppas bara över. Position är valfri.";
  wrapper.appendChild(info);

  for (let i = 0; i < bulk_rader; i++) {
    const rad = document.createElement("div");
    rad.className = "bulk-spelare-rad";
    const namnInput = document.createElement("input");
    namnInput.type = "text";
    namnInput.className = "bulk-namn";
    namnInput.placeholder = `Spelare ${i + 1}`;
    const posSelect = document.createElement("select");
    posSelect.className = "bulk-position";
    const ingenOpt = document.createElement("option");
    ingenOpt.value = "";
    ingenOpt.textContent = "(ingen)";
    posSelect.appendChild(ingenOpt);
    positioner.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.namn;
      opt.textContent = p.namn;
      posSelect.appendChild(opt);
    });
    rad.appendChild(namnInput);
    rad.appendChild(posSelect);
    wrapper.appendChild(rad);
  }

  const flerRaderKnapp = document.createElement("button");
  flerRaderKnapp.className = "narvaro-knapp";
  flerRaderKnapp.textContent = "+ Fler rader";
  flerRaderKnapp.onclick = () => { bulk_rader += 5; initSpelare(on401); };
  wrapper.appendChild(flerRaderKnapp);

  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "knapp-godkann";
  sparaKnapp.textContent = "✓ Lägg till alla ifyllda";
  sparaKnapp.onclick = () => sparaBulk(wrapper, on401);
  wrapper.appendChild(sparaKnapp);

  return wrapper;
}

async function laggTillSpelare(on401) {
  const namnFalt = document.getElementById("nytt-spelare-namn");
  const kategoriFalt = document.getElementById("nytt-spelare-kategori");
  const namn = namnFalt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  const valdaPositioner = [...document.querySelectorAll(".ny-spelare-position-kryss:checked")].map(cb => cb.value);
  try {
    const res = await anropaMedToken("/spelare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn, positioner: valdaPositioner.join(", "), kategori: kategoriFalt.value.trim() }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initSpelare(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte lägga till spelaren.");
  }
}

async function sparaBulk(wrapper, on401) {
  const rader = [...wrapper.querySelectorAll(".bulk-spelare-rad")];
  const ifyllda = rader
    .map(r => ({ namn: r.querySelector(".bulk-namn").value.trim(), positioner: r.querySelector(".bulk-position").value }))
    .filter(r => r.namn.length > 0);

  if (ifyllda.length === 0) {
    visaToast("Fyll i minst ett namn.");
    return;
  }

  let antal_lyckade = 0;
  for (const rad of ifyllda) {
    try {
      const res = await anropaMedToken("/spelare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namn: rad.namn, positioner: rad.positioner }),
      }, on401);
      if (res.ok) antal_lyckade++;
    } catch (fel) {
      if (fel.message === "Utloggad") return; // avbryt hela batchen - redan utloggad
    }
  }

  bulk_synlig = false;
  bulk_rader = 5;
  visaToast(`${antal_lyckade} av ${ifyllda.length} spelare tillagda.`);
  await initSpelare(on401);
}

async function sparaRedigering(id, wrapper, on401) {
  const namn = wrapper.querySelector(".redigera-namn").value.trim();
  const positioner = wrapper.querySelector(".redigera-positioner").value.trim();
  const kategori = wrapper.querySelector(".redigera-kategori").value.trim();
  if (!namn) {
    visaToast("Namnet får inte vara tomt.");
    return;
  }
  try {
    const res = await anropaMedToken("/spelare/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, namn, positioner, kategori }),
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