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

  // ---- Fördela automatiskt (slump/position/kategori) ----
  // Alla tre jobbar bara mot NÄRVARANDE spelare, och skriver bara till den
  // lokala gruppindelningen (samma som manuell tilldelning) - inget sparas
  // förrän man ev. avslutar matchen (Fas 4).
  const narvarande = spelare.filter(s => !s.franvarande);
  if (narvarande.length > 0 && grupper.length > 0) {
    const fordelaRad = document.createElement("div");
    fordelaRad.className = "fordela-rad";

    const slumpKnapp = document.createElement("button");
    slumpKnapp.className = "narvaro-knapp";
    slumpKnapp.textContent = "🎲 Slumpa";
    slumpKnapp.onclick = () => { fordelaSlumpmassigt(narvarande, grupper); rendera(spelare, grupper, on401); };
    fordelaRad.appendChild(slumpKnapp);

    const positionKnapp = document.createElement("button");
    positionKnapp.className = "narvaro-knapp";
    positionKnapp.textContent = "⚽ Efter position";
    positionKnapp.onclick = () => { fordelaEfterFalt(narvarande, grupper, s => forstaVarde(s.positioner)); rendera(spelare, grupper, on401); };
    fordelaRad.appendChild(positionKnapp);

    const kategoriKnapp = document.createElement("button");
    kategoriKnapp.className = "narvaro-knapp";
    kategoriKnapp.textContent = "🏷️ Efter kategori";
    kategoriKnapp.onclick = () => { fordelaEfterFalt(narvarande, grupper, s => forstaVarde(s.kategori)); rendera(spelare, grupper, on401); };
    fordelaRad.appendChild(kategoriKnapp);

    container.appendChild(fordelaRad);
  }

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

  // Gruppinställning (lägg till/ändra/ta bort) - EFTER spelarlistan.
  container.appendChild(renderaGruppadmin(grupper, on401));
  kopplaGruppadminKnappar(on401);
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

// ---- Automatisk fördelning ----
// "positioner" är ett kommaseparerat textfält (t.ex. "Målvakt, Back") -
// använder bara det FÖRSTA värdet som fördelningsnyckel. Samma hjälpare
// funkar för kategori (redan ett enda värde, men skadar inte att köra den
// genom samma funktion).
function forstaVarde(text) {
  if (!text) return "Okänd";
  const del = text.split(",")[0].trim();
  return del || "Okänd";
}

function blandaLista(lista) {
  const kopia = [...lista];
  for (let i = kopia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopia[i], kopia[j]] = [kopia[j], kopia[i]];
  }
  return kopia;
}

// Enkel, ren slumpmässig fördelning - blanda alla närvarande, dela ut
// jämnt (round-robin) över grupperna.
function fordelaSlumpmassigt(narvarande, grupper) {
  const blandade = blandaLista(narvarande);
  blandade.forEach((s, i) => gruppindelning.set(s.id, grupper[i % grupper.length].grupp_namn));
}

// Generisk fördelning efter ETT fält (position eller kategori) - hela
// poängen är att ANVÄNDA fältet för att sprida ut samma värde jämnt över
// grupperna, inte att kräva att alla har ett värde ifyllt (spelare utan
// värde hamnar bara i en gemensam "Okänd"-hink och fördelas som vanligt).
// Metoden är ett enkelt, begripligt närmevärde - inte en perfekt
// balanserare - men räcker gott för att undvika att t.ex. alla målvakter
// hamnar i samma grupp.
function fordelaEfterFalt(narvarande, grupper, vardeFn) {
  const hinkar = new Map();
  narvarande.forEach(s => {
    const varde = vardeFn(s);
    if (!hinkar.has(varde)) hinkar.set(varde, []);
    hinkar.get(varde).push(s);
  });

  let grupp_index = 0;
  for (const hink of hinkar.values()) {
    const blandad_hink = blandaLista(hink);
    blandad_hink.forEach(s => {
      gruppindelning.set(s.id, grupper[grupp_index % grupper.length].grupp_namn);
      grupp_index++;
    });
  }
}

// ---- Gruppadministration (lägg till/ändra/ta bort grupperna själva) ----
// Visas UNDER spelarlistan - Peter ville se närvarande spelare först och
// gruppinställningen därefter.
let redigerar_grupp = null;

function renderaGruppadmin(grupper, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Grupper";
  wrapper.appendChild(rubrik);

  grupper.forEach(g => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";

    if (redigerar_grupp === g.grupp_namn) {
      const redigering = document.createElement("div");
      redigering.className = "spelare-redigera";
      const namnInput = document.createElement("input");
      namnInput.type = "text";
      namnInput.value = g.grupp_namn;
      const fargInput = document.createElement("input");
      fargInput.type = "color";
      fargInput.value = g.grupp_farg;
      const knappar = document.createElement("div");
      knappar.className = "spelare-redigera-knappar";
      const sparaKnapp = document.createElement("button");
      sparaKnapp.className = "spara-knapp";
      sparaKnapp.textContent = "Spara";
      sparaKnapp.onclick = () => sparaGruppRedigering(g.grupp_namn, namnInput.value, fargInput.value, on401);
      const avbrytKnapp = document.createElement("button");
      avbrytKnapp.className = "avbryt-knapp";
      avbrytKnapp.textContent = "Avbryt";
      avbrytKnapp.onclick = () => { redigerar_grupp = null; initGrupper(on401); };
      knappar.appendChild(sparaKnapp);
      knappar.appendChild(avbrytKnapp);
      redigering.appendChild(namnInput);
      redigering.appendChild(fargInput);
      redigering.appendChild(knappar);
      rad.appendChild(redigering);
    } else {
      const swatch = document.createElement("span");
      swatch.style.cssText = "display:inline-block;width:20px;height:20px;border-radius:50%;margin-right:10px;flex-shrink:0;";
      swatch.style.background = g.grupp_farg;
      const info = document.createElement("div");
      info.className = "spelar-info";
      info.style.cssText = "cursor:pointer;display:flex;align-items:center;";
      info.appendChild(swatch);
      info.appendChild(document.createTextNode(g.grupp_namn));
      info.onclick = () => { redigerar_grupp = g.grupp_namn; initGrupper(on401); };
      rad.appendChild(info);

      const taBortKnapp = document.createElement("button");
      taBortKnapp.className = "narvaro-knapp";
      taBortKnapp.textContent = "Ta bort";
      taBortKnapp.onclick = () => taBortGrupp(g.grupp_namn, on401);
      rad.appendChild(taBortKnapp);
    }
    wrapper.appendChild(rad);
  });

  const laggTill = document.createElement("div");
  laggTill.className = "spelare-lagg-till";
  laggTill.innerHTML = `
    <input type="text" id="ny-grupp-namn" placeholder="Ny grupp, t.ex. Gul">
    <input type="color" id="ny-grupp-farg" value="#3388ff">
    <button id="lagg-till-grupp-knapp">+ Lägg till</button>
  `;
  wrapper.appendChild(laggTill);

  return wrapper;
}

function kopplaGruppadminKnappar(on401) {
  const laggTillKnapp = document.getElementById("lagg-till-grupp-knapp");
  if (laggTillKnapp) laggTillKnapp.onclick = () => laggTillGrupp(on401);
}

async function laggTillGrupp(on401) {
  const namnFalt = document.getElementById("ny-grupp-namn");
  const fargFalt = document.getElementById("ny-grupp-farg");
  const grupp_namn = namnFalt.value.trim();
  if (!grupp_namn) {
    visaToast("Ange ett gruppnamn.");
    return;
  }
  try {
    const res = await anropaMedToken("/poang/grupp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grupp_namn, grupp_farg: fargFalt.value }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initGrupper(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte lägga till.");
  }
}

async function sparaGruppRedigering(gammalt_namn, nytt_namn, grupp_farg, on401) {
  nytt_namn = nytt_namn.trim();
  if (!nytt_namn) {
    visaToast("Namnet får inte vara tomt.");
    return;
  }
  try {
    const res = await anropaMedToken("/poang/grupp/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gammalt_namn, nytt_namn, grupp_farg }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    redigerar_grupp = null;
    await initGrupper(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

async function taBortGrupp(grupp_namn, on401) {
  try {
    const res = await anropaMedToken("/poang/grupp/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grupp_namn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initGrupper(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte ta bort.");
  }
}