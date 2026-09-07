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

  let spelareRes, positionerRes, kategorierRes;
  try {
    [spelareRes, positionerRes, kategorierRes] = await Promise.all([
      anropaMedToken("/spelare/alla", {}, on401),
      anropaMedToken("/positioner", {}, on401),
      anropaMedToken("/kategorier", {}, on401),
    ]);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!spelareRes.ok || !positionerRes.ok || !kategorierRes.ok) {
    visaToast("Kunde inte hämta spelare, positioner eller kategorier.");
    return;
  }
  const spelare = await spelareRes.json();
  const positioner = await positionerRes.json();
  const kategorier = await kategorierRes.json();
  rendera(spelare, positioner, kategorier, on401);
}

function rendera(spelare, positioner, kategorier, on401) {
  const container = document.getElementById("spelare-container");
  container.innerHTML = "";

  const aktiva = spelare.filter(s => s.aktiv);
  const inaktiva = spelare.filter(s => !s.aktiv);

  // ---- Chips: aktiva spelare ----
  const chipRad = document.createElement("div");
  chipRad.className = "spelar-chiprad";
  aktiva.forEach(s => chipRad.appendChild(byggChip(s, spelare, positioner, kategorier, on401)));
  container.appendChild(chipRad);

  // ---- Lägg till en spelare ----
  container.appendChild(byggLaggTillEn(positioner, kategorier, on401));

  const bulkKnapp = document.createElement("button");
  bulkKnapp.className = "narvaro-knapp";
  bulkKnapp.textContent = "👥 Lägg till flera spelare på en gång";
  bulkKnapp.onclick = () => { bulk_synlig = !bulk_synlig; rendera(spelare, positioner, kategorier, on401); };
  container.appendChild(bulkKnapp);

  if (bulk_synlig) {
    container.appendChild(byggBulkFormular(positioner, kategorier, on401));
  }

  // ---- Inaktiva spelare (om några finns) ----
  if (inaktiva.length > 0) {
    const inaktivRubrik = document.createElement("h3");
    inaktivRubrik.className = "historik-rubrik";
    inaktivRubrik.textContent = "Inaktiva spelare";
    container.appendChild(inaktivRubrik);
    const inaktivChipRad = document.createElement("div");
    inaktivChipRad.className = "spelar-chiprad";
    inaktiva.forEach(s => inaktivChipRad.appendChild(byggChip(s, spelare, positioner, kategorier, on401)));
    container.appendChild(inaktivChipRad);
  }
}

function byggChip(s, spelare, positioner, kategorier, on401) {
  if (redigerar_id === s.id) {
    return byggRedigeringsformular(s, spelare, positioner, kategorier, on401);
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
  redigeraKnapp.onclick = () => { redigerar_id = s.id; rendera(spelare, positioner, kategorier, on401); };
  chip.appendChild(redigeraKnapp);

  const aktivKnapp = document.createElement("button");
  aktivKnapp.className = "chip-ikonknapp";
  aktivKnapp.textContent = s.aktiv ? "✕" : "↺";
  aktivKnapp.title = s.aktiv ? "Inaktivera" : "Aktivera";
  aktivKnapp.onclick = () => satAktiv(s.id, !s.aktiv, on401);
  chip.appendChild(aktivKnapp);

  return chip;
}

function byggRedigeringsformular(s, spelare, positioner, kategorier, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "spelare-redigera spelare-redigera-chip";

  const namnInput = document.createElement("input");
  namnInput.type = "text";
  namnInput.className = "redigera-namn";
  namnInput.value = s.namn;
  namnInput.placeholder = "Namn";
  wrapper.appendChild(namnInput);

  const valdaPositioner = (s.positioner || "").split(",").map(x => x.trim()).filter(Boolean);
  wrapper.appendChild(byggKryssgrupp("Positioner", positioner, valdaPositioner, "redigera-position-kryss"));

  const valdaKategorier = (s.kategori || "").split(",").map(x => x.trim()).filter(Boolean);
  wrapper.appendChild(byggKryssgrupp("Kategori", kategorier, valdaKategorier, "redigera-kategori-kryss"));

  const knappar = document.createElement("div");
  knappar.className = "spelare-redigera-knappar";
  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "spara-knapp";
  sparaKnapp.textContent = "Spara";
  const avbrytKnapp = document.createElement("button");
  avbrytKnapp.className = "avbryt-knapp";
  avbrytKnapp.textContent = "Avbryt";
  knappar.appendChild(sparaKnapp);
  knappar.appendChild(avbrytKnapp);
  wrapper.appendChild(knappar);

  sparaKnapp.onclick = () => sparaRedigering(s.id, wrapper, on401);
  avbrytKnapp.onclick = () => {
    redigerar_id = null;
    initSpelare(on401);
  };
  return wrapper;
}

// Kryssrutegrid för positioner/kategorier i redigeringsformuläret - samma
// stil som kryssrutorna i "Lägg till spelare" (byggLaggTillEn). Tom lista
// (laget har inga positioner/kategorier definierade än) -> visa inget alls,
// samma princip som positionerna redan följde: bara de valbara, hanterade
// taggarna kan sättas, ingen fri text.
function byggKryssgrupp(rubrikText, alternativ, valda, cssKlass) {
  const wrapper = document.createElement("div");
  wrapper.style.width = "100%";
  if (alternativ.length === 0) return wrapper;

  const label = document.createElement("p");
  label.className = "grupper-info-liten";
  label.style.margin = "4px 0 2px";
  label.textContent = rubrikText;
  wrapper.appendChild(label);

  const rad = document.createElement("div");
  rad.className = "positioner-kryssrad";
  alternativ.forEach(a => {
    const etikett = document.createElement("label");
    etikett.className = "positioner-kryss-etikett";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = a.namn;
    cb.className = cssKlass;
    cb.checked = valda.includes(a.namn);
    etikett.appendChild(cb);
    etikett.appendChild(document.createTextNode(" " + a.namn));
    rad.appendChild(etikett);
  });
  wrapper.appendChild(rad);
  return wrapper;
}

function byggLaggTillEn(positioner, kategorier, on401) {
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
    <button id="lagg-till-spelare-knapp">+ Lägg till</button>
  `;
  wrapper.appendChild(raden);

  wrapper.appendChild(byggKryssgrupp("Positioner (valfritt)", positioner, [], "ny-spelare-position-kryss"));
  wrapper.appendChild(byggKryssgrupp("Kategori (valfritt)", kategorier, [], "ny-spelare-kategori-kryss"));

  wrapper.querySelector("#lagg-till-spelare-knapp").onclick = () => laggTillSpelare(on401);
  return wrapper;
}

function byggBulkFormular(positioner, kategorier, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Lägg till flera spelare";
  wrapper.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Fyll i namn på de rader du vill använda - tomma rader hoppas bara över. Positioner och kategori är valfria (flera går att kryssa i).";
  wrapper.appendChild(info);

  if (positioner.length > 0 || kategorier.length > 0) {
    const header = document.createElement("div");
    header.className = "bulk-header-rad";
    header.innerHTML = `
      <span>Namn</span>
      ${positioner.length > 0 ? "<span>Positioner</span>" : ""}
      ${kategorier.length > 0 ? "<span>Kategori</span>" : ""}
    `;
    wrapper.appendChild(header);
  }

  for (let i = 0; i < bulk_rader; i++) {
    const rad = document.createElement("div");
    rad.className = "bulk-spelare-rad";
    const namnInput = document.createElement("input");
    namnInput.type = "text";
    namnInput.className = "bulk-namn";
    namnInput.placeholder = `Spelare ${i + 1}`;
    rad.appendChild(namnInput);

    if (positioner.length > 0) rad.appendChild(byggBulkKryssgrupp(positioner, "bulk-position-kryss"));
    if (kategorier.length > 0) rad.appendChild(byggBulkKryssgrupp(kategorier, "bulk-kategori-kryss"));

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

// Kryssrutegrid för en bulk-rad - samma idé som byggKryssgrupp, men utan
// egen rubrik (rubriken sitter i header-raden ovanför hela listan istället,
// EN gång, inte per rad) och i ett tightare eget format (.bulk-kryssrad).
function byggBulkKryssgrupp(alternativ, cssKlass) {
  const grupp = document.createElement("div");
  grupp.className = "bulk-kryssrad";
  alternativ.forEach(a => {
    const etikett = document.createElement("label");
    etikett.className = "bulk-kryss-etikett";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = a.namn;
    cb.className = cssKlass;
    etikett.appendChild(cb);
    etikett.appendChild(document.createTextNode(" " + a.namn));
    grupp.appendChild(etikett);
  });
  return grupp;
}

async function laggTillSpelare(on401) {
  const namnFalt = document.getElementById("nytt-spelare-namn");
  const namn = namnFalt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  const valdaPositioner = [...document.querySelectorAll(".ny-spelare-position-kryss:checked")].map(cb => cb.value);
  const valdaKategorier = [...document.querySelectorAll(".ny-spelare-kategori-kryss:checked")].map(cb => cb.value);
  try {
    const res = await anropaMedToken("/spelare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn, positioner: valdaPositioner.join(", "), kategori: valdaKategorier.join(", ") }),
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
    .map(r => ({
      namn: r.querySelector(".bulk-namn").value.trim(),
      positioner: [...r.querySelectorAll(".bulk-position-kryss:checked")].map(cb => cb.value).join(", "),
      kategori: [...r.querySelectorAll(".bulk-kategori-kryss:checked")].map(cb => cb.value).join(", "),
    }))
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
        body: JSON.stringify({ namn: rad.namn, positioner: rad.positioner, kategori: rad.kategori }),
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
  const positioner = [...wrapper.querySelectorAll(".redigera-position-kryss:checked")].map(cb => cb.value).join(", ");
  const kategori = [...wrapper.querySelectorAll(".redigera-kategori-kryss:checked")].map(cb => cb.value).join(", ");
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