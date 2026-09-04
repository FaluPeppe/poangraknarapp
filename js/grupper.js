// Dela in grupper-skärmen (Fas 2). Två olika sorters tillstånd, medvetet
// hanterade olika - precis som i Shiny-appen:
//   - NÄRVARO är delad mellan alla tränares enheter -> sparas i databasen
//     via /narvaro (se worker.js).
//   - GRUPPINDELNING (vem hamnar i vilken grupp) är bara lokal för den här
//     sessionen/enheten -> hålls i minnet här, skickas ALDRIG till servern.
//     Det gör att flera tränare kan experimentera med olika indelningar
//     samtidigt utan att krocka med varandra.

import { anropaMedToken } from "./auth.js";
import { visaToast, textFargForBg } from "./ui.js";

// spelar_id -> grupp_namn (eller inget = ej tilldelad). Modulnivå med
// avsikt - ska leva kvar så länge sidan är öppen, även om man byter skärm
// och kommer tillbaka, men ALDRIG skickas till servern eller sparas i
// localStorage (då skulle den sluta vara "bara för den här sessionen").
const gruppindelning = new Map();

export async function initGrupper(on401) {
  const container = document.getElementById("grupper-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let spelareRes, grupperRes;
  try {
    [spelareRes, grupperRes] = await Promise.all([
      anropaMedToken("/spelare", {}, on401),
      anropaMedToken("/poang", {}, on401), // återanvänder gruppnamn+färg härifrån
    ]);
  } catch (fel) {
    return; // 401 redan hanterat via on401
  }

  if (!spelareRes.ok || !grupperRes.ok) {
    visaToast("Kunde inte hämta spelare eller grupper.");
    return;
  }

  const spelare = await spelareRes.json();
  const grupper = await grupperRes.json();

  // Städa bort ev. gamla tilldelningar för spelare som inte längre finns
  // eller inte längre är närvarande - annars visas "spökräkningar".
  const narvarande_ids = new Set(spelare.filter(s => !s.franvarande).map(s => s.id));
  for (const id of gruppindelning.keys()) {
    if (!narvarande_ids.has(id)) gruppindelning.delete(id);
  }

  rendera(spelare, grupper, on401);
}

function rendera(spelare, grupper, on401) {
  const container = document.getElementById("grupper-container");
  container.innerHTML = "";

  // ---- Sammanfattning: antal spelare per grupp ----
  const sammanfattning = document.createElement("div");
  sammanfattning.className = "grupp-sammanfattning";
  grupper.forEach(g => {
    const antal = [...gruppindelning.values()].filter(v => v === g.grupp_namn).length;
    const txt = textFargForBg(g.grupp_farg);
    const chip = document.createElement("span");
    chip.className = "grupp-chip";
    chip.style.background = g.grupp_farg;
    chip.style.color = txt;
    chip.textContent = `${g.grupp_namn}: ${antal}`;
    sammanfattning.appendChild(chip);
  });
  container.appendChild(sammanfattning);

  // ---- Spelarlista ----
  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  spelare.forEach(s => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad" + (s.franvarande ? " franvarande" : "");

    const info = document.createElement("div");
    info.className = "spelar-info";
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
    rad.appendChild(info);

    const narvaroKnapp = document.createElement("button");
    narvaroKnapp.className = "narvaro-knapp";
    narvaroKnapp.textContent = s.franvarande ? "Frånvarande" : "Närvarande";
    narvaroKnapp.onclick = () => toggleNarvaro(s.id, !s.franvarande, on401);
    rad.appendChild(narvaroKnapp);

    if (!s.franvarande) {
      const gruppKnapp = document.createElement("button");
      gruppKnapp.className = "grupp-knapp";
      const nuvarandeGrupp = gruppindelning.get(s.id);
      const nuvarandeFarg = grupper.find(g => g.grupp_namn === nuvarandeGrupp);
      if (nuvarandeFarg) {
        gruppKnapp.style.background = nuvarandeFarg.grupp_farg;
        gruppKnapp.style.color = textFargForBg(nuvarandeFarg.grupp_farg);
        gruppKnapp.textContent = nuvarandeGrupp;
      } else {
        gruppKnapp.textContent = "Ingen grupp";
      }
      gruppKnapp.onclick = () => {
        vaxlaGrupp(s.id, grupper);
        rendera(spelare, grupper, on401);
      };
      rad.appendChild(gruppKnapp);
    }

    lista.appendChild(rad);
  });
  container.appendChild(lista);
}

// Cyklar spelarens gruppval: ingen grupp -> grupp 1 -> grupp 2 -> ... ->
// ingen grupp igen. Rent lokalt, ingen serverkontakt.
function vaxlaGrupp(spelar_id, grupper) {
  const namn_i_ordning = grupper.map(g => g.grupp_namn);
  const nuvarande = gruppindelning.get(spelar_id);
  const index = namn_i_ordning.indexOf(nuvarande);
  const nasta_index = index + 1;
  if (nasta_index >= namn_i_ordning.length) {
    gruppindelning.delete(spelar_id);
  } else {
    gruppindelning.set(spelar_id, namn_i_ordning[nasta_index]);
  }
}

async function toggleNarvaro(spelar_id, franvarande, on401) {
  try {
    const res = await anropaMedToken("/narvaro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spelar_id, franvarande }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    if (franvarande) gruppindelning.delete(spelar_id); // frånvarande hör inte till någon grupp
    await initGrupper(on401); // enklast: hämta om hela listan, samma mönster som poäng-skärmen
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte spara närvaron, försök igen.");
    }
  }
}

// Läses av avsluta.js (Fas 4) när en match sparas, för att koppla spelare
// till rätt grupp i historiken. Bygger {grupp_namn: [spelar_id, ...]} från
// den lokala (osparade) gruppindelningen - returnerar bara grupper som
// faktiskt har någon tilldelad, för en kompaktare payload.
export function hamtaGruppindelningForSparning() {
  const resultat = {};
  for (const [spelar_id, grupp_namn] of gruppindelning.entries()) {
    if (!resultat[grupp_namn]) resultat[grupp_namn] = [];
    resultat[grupp_namn].push(spelar_id);
  }
  return resultat;
}
