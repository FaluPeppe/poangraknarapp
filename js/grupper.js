// Dela in grupper-skärmen. Ombyggd för att matcha Shiny-appens design:
//
//   - EN EGEN, LOKAL/PERSONLIG närvaromarkering här (skiljer sig från den
//     DELADE listan i Inställningar → Hantera närvaro, se narvaro.js).
//     Det gör att du och en tränarkollega kan jobba med OLIKA urval samtidigt
//     utan att krocka - t.ex. du med U13-gruppen, hen med U15-gruppen,
//     samtidigt, på samma delade spelartrupp.
//   - Ett "Förslag" som visar den aktuella (lokala) gruppindelningen, med
//     en liten cirkelknapp per ANNAN grupp på varje spelarrad - tryck för
//     att flytta henne dit direkt.
//   - En "Ej tilldelade"-ruta för lokalt närvarande spelare som ännu inte
//     har en grupp - gör det snabbt att lägga till t.ex. någon som kom
//     sent, eller är tillbaka från särskild träning.
//
// INGET av detta - varken den lokala närvaromarkeringen eller
// gruppindelningen - sparas till servern. Allt lever bara i minnet här,
// så länge sidan är öppen.

import { anropaMedToken } from "./auth.js";
import { visaToast, textFargForBg } from "./ui.js";

// spelar_id -> true/false. Modulnivå (överlever navigering mellan flikar,
// men ALDRIG skickas till servern). Sås första gången från den DELADE
// listan (så den lokala starten är rimlig), men är sedan helt fristående.
const lokaltNarvarande = new Map();
let lokalt_narvaro_sadd = false;

// spelar_id -> grupp_namn. Samma modulnivå-princip som ovan.
const gruppindelning = new Map();

let slumpmetod = "slump"; // "slump" | "position" | "kategori"

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
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
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

  // Så den lokala närvaron EN gång, från den delade listan - efter det är
  // den helt fristående och rörs aldrig av den delade listans ändringar.
  if (!lokalt_narvaro_sadd) {
    spelare.forEach(s => lokaltNarvarande.set(s.id, !s.franvarande));
    lokalt_narvaro_sadd = true;
  }
  // Nytillkomna spelare (t.ex. nyss aktiverade) får ett rimligt default.
  spelare.forEach(s => {
    if (!lokaltNarvarande.has(s.id)) lokaltNarvarande.set(s.id, !s.franvarande);
  });

  // Städa bort gruppval för spelare som inte längre är lokalt närvarande.
  for (const id of gruppindelning.keys()) {
    if (!lokaltNarvarande.get(id)) gruppindelning.delete(id);
  }

  rendera(spelare, grupper, on401);
}

function rendera(spelare, grupper, on401) {
  const container = document.getElementById("grupper-container");
  container.innerHTML = "";

  const narvarande_spelare = spelare.filter(s => lokaltNarvarande.get(s.id));

  // ---- Instruktion + räknare ----
  const info = document.createElement("p");
  info.className = "grupper-info";
  info.innerHTML = `Bocka i/ur för att lägga till eller ta bort spelare, och slumpa (om) baserat på urvalet.<br>
    <span class="grupper-info-liten">Det här påverkar bara din egen indelning här och nu - inte den delade närvarolistan i Inställningar.</span>`;
  container.appendChild(info);

  const raknare = document.createElement("p");
  raknare.className = "grupper-raknare";
  raknare.textContent = `${narvarande_spelare.length} av ${spelare.length} spelare markerade som närvarande.`;
  container.appendChild(raknare);

  // ---- Pill-rad: lokal närvaromarkering ----
  const pillRad = document.createElement("div");
  pillRad.className = "spelar-pillar";
  spelare.forEach(s => {
    const pill = document.createElement("button");
    pill.className = "spelar-pill" + (lokaltNarvarande.get(s.id) ? " vald" : "");
    pill.textContent = s.namn;
    pill.onclick = () => {
      const nu = !lokaltNarvarande.get(s.id);
      lokaltNarvarande.set(s.id, nu);
      if (!nu) gruppindelning.delete(s.id); // inte längre med -> ingen grupp
      rendera(spelare, grupper, on401);
    };
    pillRad.appendChild(pill);
  });
  container.appendChild(pillRad);

  const markeraRad = document.createElement("div");
  markeraRad.className = "markera-rad";
  const markeraAllaKnapp = document.createElement("button");
  markeraAllaKnapp.className = "narvaro-knapp";
  markeraAllaKnapp.textContent = "Markera alla";
  markeraAllaKnapp.onclick = () => {
    spelare.forEach(s => lokaltNarvarande.set(s.id, true));
    rendera(spelare, grupper, on401);
  };
  const avmarkeraAllaKnapp = document.createElement("button");
  avmarkeraAllaKnapp.className = "narvaro-knapp";
  avmarkeraAllaKnapp.textContent = "Avmarkera alla";
  avmarkeraAllaKnapp.onclick = () => {
    spelare.forEach(s => { lokaltNarvarande.set(s.id, false); gruppindelning.delete(s.id); });
    rendera(spelare, grupper, on401);
  };
  markeraRad.appendChild(markeraAllaKnapp);
  markeraRad.appendChild(avmarkeraAllaKnapp);
  container.appendChild(markeraRad);

  // ---- Antal grupper + slumpmetod ----
  const delasIRubrik = document.createElement("p");
  delasIRubrik.className = "grupper-delas-i";
  delasIRubrik.textContent = `Delas in i ${grupper.length} grupp${grupper.length === 1 ? "" : "er"}.`;
  container.appendChild(delasIRubrik);

  if (narvarande_spelare.length > 0 && grupper.length > 0) {
    container.appendChild(byggSlumpmetodval(narvarande_spelare, grupper, spelare, on401));
  }

  // ---- Förslag: en färgad ruta per grupp med spelarnas namn + flytta-knappar ----
  const forslagRubrik = document.createElement("h3");
  forslagRubrik.className = "historik-rubrik";
  forslagRubrik.textContent = "Förslag";
  container.appendChild(forslagRubrik);
  const forslagUnderrubrik = document.createElement("p");
  forslagUnderrubrik.className = "grupper-info-liten";
  forslagUnderrubrik.textContent = "Tryck på en cirkel bredvid en spelare för att flytta henne dit.";
  container.appendChild(forslagUnderrubrik);

  grupper.forEach(g => {
    container.appendChild(byggGruppBlock(g, grupper, narvarande_spelare, spelare, on401));
  });

  // ---- Ej tilldelade ----
  const ejTilldelade = narvarande_spelare.filter(s => !gruppindelning.has(s.id));
  if (ejTilldelade.length > 0) {
    container.appendChild(byggEjTilldelade(ejTilldelade, grupper, spelare, on401));
  }

  // ---- Godkänn-knapp ----
  // OBS: varje tilldelning ovan gäller redan direkt (inget "utkast"-läge
  // att skilja på i vår modell) - den här knappen är en tydlig
  // avslutningspunkt som matchar Shiny-appens flöde, men gör inget
  // funktionellt utöver att bekräfta att du är klar.
  const godkannKnapp = document.createElement("button");
  godkannKnapp.className = "knapp-godkann";
  godkannKnapp.textContent = "✓ Godkänn och kör igång";
  godkannKnapp.onclick = () => visaToast("Klart! Gruppindelningen gäller redan.");
  container.appendChild(godkannKnapp);

  // OBS: gruppadministration (lägg till/ändra/ta bort grupper/färger) finns
  // INTE längre här - det görs i Inställningar → Hantera färger. Antalet
  // grupper styrs med en stegare på Poäng-skärmen. Den här skärmen bara
  // ANVÄNDER de grupper som redan finns.
}

function byggSlumpmetodval(narvarande_spelare, grupper, spelare, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("p");
  rubrik.style.cssText = "font-weight:600;margin-bottom:8px;";
  rubrik.textContent = "Hur ska grupperna slumpas?";
  wrapper.appendChild(rubrik);

  const alternativ = [
    { varde: "slump", etikett: "Helt slumpmässigt" },
    { varde: "position", etikett: "Jämn fördelning av positioner" },
    { varde: "kategori", etikett: "Jämn fördelning av kategori" },
  ];
  alternativ.forEach(a => {
    const radRad = document.createElement("label");
    radRad.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "slumpmetod";
    radio.value = a.varde;
    radio.checked = slumpmetod === a.varde;
    radio.onchange = () => { slumpmetod = a.varde; };
    radRad.appendChild(radio);
    radRad.appendChild(document.createTextNode(" " + a.etikett));
    wrapper.appendChild(radRad);
  });

  const slumpaKnapp = document.createElement("button");
  slumpaKnapp.className = "knapp-slumpa";
  slumpaKnapp.textContent = "🎲 Slumpa om";
  slumpaKnapp.onclick = () => {
    if (slumpmetod === "slump") fordelaSlumpmassigt(narvarande_spelare, grupper);
    else if (slumpmetod === "position") fordelaEfterFalt(narvarande_spelare, grupper, s => forstaVarde(s.positioner));
    else fordelaEfterFalt(narvarande_spelare, grupper, s => forstaVarde(s.kategori));
    rendera(spelare, grupper, on401);
  };
  wrapper.appendChild(slumpaKnapp);

  return wrapper;
}

function byggGruppBlock(grupp, alla_grupper, narvarande_spelare, spelare, on401) {
  const txt = textFargForBg(grupp.grupp_farg);
  const block = document.createElement("div");
  block.className = "grupp-block";
  block.style.background = grupp.grupp_farg;
  block.style.color = txt;

  const rubrik = document.createElement("div");
  rubrik.className = "grupp-block-rubrik";
  const medlemmar = narvarande_spelare.filter(s => gruppindelning.get(s.id) === grupp.grupp_namn);
  rubrik.textContent = `${grupp.grupp_namn} (${medlemmar.length})`;
  block.appendChild(rubrik);

  const andra_grupper = alla_grupper.filter(g => g.grupp_namn !== grupp.grupp_namn);

  medlemmar.forEach(s => {
    const rad = document.createElement("div");
    rad.className = "grupp-block-rad";

    const namn = document.createElement("span");
    namn.textContent = s.namn;
    rad.appendChild(namn);

    const knappGrupp = document.createElement("span");
    knappGrupp.className = "flytta-knapp-grupp";
    andra_grupper.forEach(mal => {
      const flyttaKnapp = document.createElement("button");
      flyttaKnapp.className = "flytta-knapp";
      flyttaKnapp.style.background = mal.grupp_farg;
      flyttaKnapp.style.color = textFargForBg(mal.grupp_farg);
      flyttaKnapp.title = `Flytta till ${mal.grupp_namn}`;
      flyttaKnapp.textContent = "→";
      flyttaKnapp.onclick = () => {
        gruppindelning.set(s.id, mal.grupp_namn);
        rendera(spelare, alla_grupper, on401);
      };
      knappGrupp.appendChild(flyttaKnapp);
    });
    rad.appendChild(knappGrupp);

    block.appendChild(rad);
  });

  return block;
}

function byggEjTilldelade(ejTilldelade, grupper, spelare, on401) {
  const box = document.createElement("div");
  box.className = "ej-tilldelade-box";

  const rubrik = document.createElement("div");
  rubrik.style.fontWeight = "700";
  rubrik.textContent = "Ej tilldelade";
  box.appendChild(rubrik);

  const beskrivning = document.createElement("p");
  beskrivning.className = "grupper-info-liten";
  beskrivning.textContent = "Bockade som närvarande men inte i något lag än - t.ex. någon som kom sent.";
  box.appendChild(beskrivning);

  ejTilldelade.forEach(s => {
    const rad = document.createElement("div");
    rad.className = "grupp-block-rad ej-tilldelad-rad";
    const namn = document.createElement("span");
    namn.textContent = s.namn;
    rad.appendChild(namn);

    const knappGrupp = document.createElement("span");
    knappGrupp.className = "flytta-knapp-grupp";
    grupper.forEach(g => {
      const knapp = document.createElement("button");
      knapp.className = "flytta-knapp";
      knapp.style.background = g.grupp_farg;
      knapp.style.color = textFargForBg(g.grupp_farg);
      knapp.title = `Lägg till i ${g.grupp_namn}`;
      knapp.textContent = "→";
      knapp.onclick = () => {
        gruppindelning.set(s.id, g.grupp_namn);
        rendera(spelare, grupper, on401);
      };
      knappGrupp.appendChild(knapp);
    });
    rad.appendChild(knappGrupp);

    box.appendChild(rad);
  });

  return box;
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

function fordelaSlumpmassigt(narvarande, grupper) {
  const blandade = blandaLista(narvarande);
  blandade.forEach((s, i) => gruppindelning.set(s.id, grupper[i % grupper.length].grupp_namn));
}

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