// Poäng-skärmen. Utökad med en enkel tidtagarur (skiljer sig från
// Intervaller/Fas 6, som är en hel löp/vila-blocklista - det här är EN
// nedräkning, t.ex. för en poängmatchs speltid), en "Nollställ poäng"-
// knapp (utan att spara historik), och genvägar till Dela in grupper och
// Avsluta match.

import { anropaMedToken } from "./auth.js";
import { visaToast, textFargForBg, formateraDatumTid } from "./ui.js";
import { nav } from "./nav.js";
import { spelaLjud, vibrera } from "./ljud.js";
import { byggAntalGrupperStegare } from "./antalgrupper.js";
import { hamtaGruppindelning, byggFlyttaKnapp, hamtaGruppindelningForSparning } from "./grupper.js";

// ---- Tidtagarur-tillstånd (modulnivå - överlever navigering mellan
// flikar, precis som Intervaller-timerns tillstånd) ----
const STANDARD_MINUTER = 2;
const STANDARD_SEKUNDER = 0;
const VARNINGSGRANS_SEKUNDER = 10; // siffrorna blir röda de sista 10 sekunderna
let timer_installning_laddad = false; // laddar sparad tid bara EN gång per sidladdning
let timer_minuter = STANDARD_MINUTER;
let timer_sekunder_satt = STANDARD_SEKUNDER;
let timer_sekunder_kvar = STANDARD_MINUTER * 60 + STANDARD_SEKUNDER;
let timer_kor = false;
let timer_har_startats = false; // skiljer "aldrig startad" (visa min/sek-fält) från "pausad" (dölj dem, kan återuppta)
let timer_id = null;

// Ljud+vibration-valet delas med Intervaller-skärmen - se ljud.js.

export async function initPoang(on401) {
  let migRes;
  try {
    migRes = await anropaMedToken("/mig", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!migRes.ok) {
    visaToast("Kunde inte hämta laginfo.");
    return;
  }
  const mig = await migRes.json();
  // OBS: lagnamnet i headern hanteras nu av header.js (som gjort den till
  // en listruta för att byta lag) - inte här längre.

  if (!timer_installning_laddad) {
    await laddaTidtagarInstallning(on401);
    timer_installning_laddad = true;
  }

  await laddaPoang(on401);
}

async function laddaTidtagarInstallning(on401) {
  try {
    const res = await anropaMedToken("/tidtagare", {}, on401);
    if (!res.ok) return; // behåll standardvärdet 2:00 om något går fel
    const data = await res.json();
    if (data.installning) {
      timer_minuter = data.installning.minuter;
      timer_sekunder_satt = data.installning.sekunder;
      if (!timer_kor) timer_sekunder_kvar = timer_minuter * 60 + timer_sekunder_satt;
    }
  } catch (fel) {
    // Tyst - standardvärdet 2:00 duger fint om detta misslyckas.
  }
}

async function laddaPoang(on401) {
  const container = document.getElementById("lag-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';
  let poangRes, spelareRes;
  try {
    [poangRes, spelareRes] = await Promise.all([
      anropaMedToken("/poang", {}, on401),
      anropaMedToken("/spelare", {}, on401),
    ]);
  } catch (fel) {
    return;
  }
  if (!poangRes.ok || !spelareRes.ok) {
    visaToast("Kunde inte hämta poäng.");
    return;
  }
  const grupper = await poangRes.json();
  const spelare = await spelareRes.json();
  rendera(grupper, spelare, on401);
}

function rendera(grupper, spelare, on401) {
  const container = document.getElementById("lag-container");
  container.innerHTML = "";

  container.appendChild(byggTidtagare(on401));
  container.appendChild(byggGruppinstallning(grupper.length, on401));
  container.appendChild(byggLagRad(grupper, spelare, on401));
  container.appendChild(byggAvslutningsrad(grupper, on401));
}

// Kortrutnätet - en egen funktion så den kan byggas om FÖR SIG (uppdaterade
// antal-siffror efter en flytt i bottenbladet) utan att rita om hela
// skärmen (tidtagaruret får då inte råka nollställas visuellt).
function byggLagRad(grupper, spelare, on401) {
  const lagRad = document.createElement("div");
  lagRad.className = "lag-container-inre";
  lagRad.id = "lag-rad";

  grupper.forEach(g => {
    const txt = textFargForBg(g.grupp_farg);
    const kort = document.createElement("div");
    kort.className = "lag-kort";
    kort.style.background = g.grupp_farg;
    kort.style.color = txt;

    const namn = document.createElement("div");
    namn.className = "lag-namn";
    namn.textContent = g.grupp_namn;

    const antal = hamtaGruppindelning();
    const medlemsantal = spelare.filter(s => antal.get(s.id) === g.grupp_namn).length;
    const antalEl = document.createElement("div");
    antalEl.className = "lag-antal";
    antalEl.textContent = medlemsantal === 1 ? "1 spelare" : `${medlemsantal} spelare`;

    const poangEl = document.createElement("div");
    poangEl.className = "lag-poang";
    poangEl.id = "poang_" + g.grupp_namn;
    poangEl.textContent = g.poang;
    poangEl.setAttribute("data-poang", g.poang);

    // Stor +1-knapp (huvudsakliga interaktionen), liten -1 därunder för
    // att rätta misstag - matchar hur ofta respektive knapp faktiskt
    // används under en match.
    const plusKnapp = document.createElement("button");
    plusKnapp.className = "poang-knapp-stor";
    plusKnapp.style.background = txt;
    plusKnapp.style.color = g.grupp_farg;
    plusKnapp.textContent = "+1";
    plusKnapp.onclick = () => poangKlick(g, 1, on401);

    const minusKnapp = document.createElement("button");
    minusKnapp.className = "poang-knapp-liten";
    minusKnapp.textContent = "− 1 poäng";
    minusKnapp.onclick = () => poangKlick(g, -1, on401);

    kort.appendChild(namn);
    kort.appendChild(antalEl);
    kort.appendChild(poangEl);
    kort.appendChild(plusKnapp);
    kort.appendChild(minusKnapp);

    // Tryck NÅGONSTANS på kortet (men inte på +1/−1-knapparna) -> visa
    // vilka spelare som är i gruppen, i ett bottenblad ovanpå Poäng-vyn
    // (inte en fullskärmsdialog - ska kännas som att man är kvar här).
    kort.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      visaSpelareBottenblad(g, grupper, spelare, on401);
    });

    lagRad.appendChild(kort);
  });

  return lagRad;
}

function uppdateraLagRad(grupper, spelare, on401) {
  const gammal = document.getElementById("lag-rad");
  if (gammal) gammal.replaceWith(byggLagRad(grupper, spelare, on401));
}

// ---- Delad bottenblad-öppnare ----
// Ett bottenblad glider upp underifrån och lämnar Poäng-vyn synlig/nedtonad
// bakom - används istället för en fullskärmsdialog eller en navigering bort
// till en annan skärm, så det känns som att man är kvar här. Stängs genom
// tryck på den mörka bakgrunden ELLER ✕-knappen. Anroparen fyller i
// rubrik/kantfärg och bygger själva innehållet i den returnerade `innehall`
// -behållaren.
function oppnaBottenblad({ rubrik, kantfarg }) {
  const overlay = document.createElement("div");
  overlay.className = "bottenblad-overlay";

  const blad = document.createElement("div");
  blad.className = "bottenblad";
  if (kantfarg) blad.style.borderTop = `5px solid ${kantfarg}`;
  overlay.appendChild(blad);

  const header = document.createElement("div");
  header.className = "bottenblad-header";
  const titel = document.createElement("h3");
  titel.textContent = rubrik;
  header.appendChild(titel);
  const stangKnapp = document.createElement("button");
  stangKnapp.className = "bottenblad-stang";
  stangKnapp.textContent = "✕";
  stangKnapp.setAttribute("aria-label", "Stäng");
  header.appendChild(stangKnapp);
  blad.appendChild(header);

  const innehall = document.createElement("div");
  innehall.className = "bottenblad-innehall";
  blad.appendChild(innehall);

  function stang() {
    overlay.classList.remove("synlig");
    setTimeout(() => overlay.remove(), 200);
  }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) stang(); });
  stangKnapp.onclick = stang;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("synlig"));

  return { innehall, stang };
}

// ---- Bottenblad: vilka spelare tillhör den här gruppen just nu ----
// Använder SAMMA lokala gruppindelning som Dela in grupper (grupper.js) -
// en flytt här syns direkt där också, och tvärtom. Sparas aldrig till
// servern (se grupper.js för resonemanget).
function visaSpelareBottenblad(grupp, alla_grupper, spelare, on401) {
  const { innehall, stang } = oppnaBottenblad({ rubrik: grupp.grupp_namn, kantfarg: grupp.grupp_farg });

  function ritaInnehall() {
    innehall.innerHTML = "";
    const gruppindelning = hamtaGruppindelning();
    const medlemmar = spelare.filter(s => gruppindelning.get(s.id) === grupp.grupp_namn);

    if (medlemmar.length === 0) {
      const tom = document.createElement("p");
      tom.className = "grupper-info-liten";
      tom.textContent = "Inga spelare tilldelade den här gruppen än.";
      innehall.appendChild(tom);
      const genvag = document.createElement("button");
      genvag.className = "narvaro-knapp";
      genvag.textContent = "👥 Dela in i grupper";
      genvag.onclick = () => { stang(); nav.gaTillGrupper("poang"); };
      innehall.appendChild(genvag);
      return;
    }

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
        const knapp = byggFlyttaKnapp(mal, "Flytta till", () => {
          gruppindelning.set(s.id, mal.grupp_namn);
          uppdateraLagRad(alla_grupper, spelare, on401);
          ritaInnehall();
        });
        knappGrupp.appendChild(knapp);
      });
      rad.appendChild(knappGrupp);

      innehall.appendChild(rad);
    });
  }
  ritaInnehall();
}

// ---- Bottenblad: avsluta matchen och spara den ----
// Ersätter den gamla navigeringen till en egen "Avsluta"-skärm under
// Inställningar (kändes malplacerad från Poäng, och tvingade fram en titt
// på historiken bara för att spara) - historiken finns ändå kvar under
// Inställningar → Hantera poängmatcher för den som vill bläddra i den.
function visaAvslutaBottenblad(grupper, on401) {
  const { innehall, stang } = oppnaBottenblad({ rubrik: "Avsluta match" });
  innehall.classList.add("avsluta-form");

  const label = document.createElement("label");
  label.textContent = "Namn på matchen";
  label.htmlFor = "omgang-namn-input";
  innehall.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.id = "omgang-namn-input";
  input.placeholder = "T.ex. Tisdagsträning U13";
  // Förifyll med datum + tid - kan spara direkt eller döpa om innan.
  // Markeras automatiskt vid fokus (samma globala hjälp som alla textfält
  // i appen har, se main.js), så det är lätt att skriva över.
  input.value = formateraDatumTid();
  innehall.appendChild(input);

  const sammanfattning = document.createElement("div");
  sammanfattning.className = "grupp-sammanfattning";
  grupper.forEach(g => {
    const chip = document.createElement("span");
    chip.className = "grupp-chip";
    chip.style.background = g.grupp_farg;
    chip.style.color = textFargForBg(g.grupp_farg);
    chip.textContent = `${g.grupp_namn}: ${g.poang}`;
    sammanfattning.appendChild(chip);
  });
  innehall.appendChild(sammanfattning);

  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "knapp-primar";
  sparaKnapp.style.background = "#2e7d32"; // samma grönt som Avsluta-genvägen på Poäng-vyn
  sparaKnapp.textContent = "✓ Spara";
  sparaKnapp.onclick = async () => {
    const omgang_namn = input.value.trim();
    if (!omgang_namn) {
      visaToast("Ange ett namn på matchen.");
      return;
    }
    sparaKnapp.disabled = true;
    try {
      const res = await anropaMedToken("/avsluta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ omgang_namn, spelare_per_grupp: hamtaGruppindelningForSparning() }),
      }, on401);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
      stang();
      visaToast("Matchen sparad!");
      await laddaPoang(on401); // hämtar om - poängen är redan nollställd på servern
    } catch (fel) {
      sparaKnapp.disabled = false;
      if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara matchen.");
    }
  };
  innehall.appendChild(sparaKnapp);
}

// Grupp-relaterade kontroller ovanför poängkorten: gå till Dela in grupper,
// och "Antal grupper"-stegaren (delad med Dela in grupper-skärmen, se
// antalgrupper.js). Grupperna byggs alltid FRÅN färgpaletten i Inställningar
// → Hantera färger, i den ordningen.
function byggGruppinstallning(antalGrupper, on401) {
  const rad = document.createElement("div");
  rad.className = "poang-gruppinstallning";

  const grupperKnapp = document.createElement("button");
  grupperKnapp.className = "narvaro-knapp";
  grupperKnapp.textContent = "👥 Dela in i grupper";
  grupperKnapp.onclick = () => nav.gaTillGrupper("poang");
  rad.appendChild(grupperKnapp);

  rad.appendChild(byggAntalGrupperStegare(antalGrupper, on401, () => laddaPoang(on401)));

  return rad;
}

// Avslutande åtgärder UNDER poängkorten: spara matchen i historiken, eller
// nollställa poängen (utan att spara). Nollställ är medvetet grå och lågmäld
// - den ska inte konkurrera med "Avsluta och spara" och inte förväxlas med
// en av västfärgerna.
function byggAvslutningsrad(grupper, on401) {
  const rad = document.createElement("div");
  rad.className = "poang-avslutning";

  const avslutaKnapp = document.createElement("button");
  avslutaKnapp.className = "knapp-avsluta-genvag";
  avslutaKnapp.textContent = "✓ Avsluta Poängmatch och spara";
  avslutaKnapp.disabled = grupper.length === 0;
  avslutaKnapp.onclick = () => visaAvslutaBottenblad(grupper, on401);
  rad.appendChild(avslutaKnapp);

  const nollstallKnapp = document.createElement("button");
  nollstallKnapp.className = "knapp-nollstall-poang";
  nollstallKnapp.textContent = "↺ Nollställ poäng";
  nollstallKnapp.onclick = () => nollstallPoang(on401);
  rad.appendChild(nollstallKnapp);

  return rad;
}

// OBS: tar emot HELA gruppobjektet (inte bara namnet) och uppdaterar dess
// g.poang i samma veva som DOM:en - annars tappar "Avsluta match"-bladets
// sammanfattning (som läser g.poang ur samma grupper-array) synken och
// visar de gamla siffrorna från senaste sidladdningen/nollställningen.
async function poangKlick(g, varde, on401) {
  const el = document.getElementById("poang_" + g.grupp_namn);
  const nuvarande = parseInt(el.getAttribute("data-poang"), 10) || 0;
  const nytt = Math.max(0, nuvarande + varde);
  el.textContent = nytt;
  el.setAttribute("data-poang", nytt);
  g.poang = nytt;

  try {
    const res = await anropaMedToken("/poang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grupp_namn: g.grupp_namn, poang: nytt }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
  } catch (fel) {
    el.textContent = nuvarande;
    el.setAttribute("data-poang", nuvarande);
    g.poang = nuvarande;
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte spara poängen, försök igen.");
    }
  }
}

async function nollstallPoang(on401) {
  if (!window.confirm("Nollställa poängen för alla grupper? Sparas INTE i historiken.")) return;
  try {
    const res = await anropaMedToken("/poang/nollstall", { method: "POST" }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await laddaPoang(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte nollställa poängen.");
  }
}

// ---- Tidtagarur ----
function byggTidtagare(on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "tidtagare";

  const visad_tid = timer_har_startats ? timer_sekunder_kvar : (timer_minuter * 60 + timer_sekunder_satt);
  const display = document.createElement("div");
  display.className = "tidtagare-display" + (visad_tid <= VARNINGSGRANS_SEKUNDER && visad_tid > 0 ? " tidtagare-varning" : "");
  display.id = "tidtagare-display";
  display.textContent = formateraTid(visad_tid);
  wrapper.appendChild(display);

  // Min/sek-fälten visas bara INNAN klockan någonsin startats - en pausad
  // klocka ska återupptas från där den var, inte låta en ändrad inställning
  // smyga sig in. (Ljud/vibration ställs numera under Inställningar →
  // Appinställningar.)
  if (!timer_har_startats) {
    const installningsRad = document.createElement("div");
    installningsRad.className = "tidtagare-installning";
    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.min = "0";
    minInput.id = "tidtagare-min";
    minInput.value = timer_minuter;
    const minLabel = document.createElement("span");
    minLabel.textContent = "min";
    const sekInput = document.createElement("input");
    sekInput.type = "number";
    sekInput.min = "0";
    sekInput.max = "59";
    sekInput.id = "tidtagare-sek";
    sekInput.value = timer_sekunder_satt;
    const sekLabel = document.createElement("span");
    sekLabel.textContent = "sek";
    installningsRad.appendChild(minInput);
    installningsRad.appendChild(minLabel);
    installningsRad.appendChild(sekInput);
    installningsRad.appendChild(sekLabel);
    wrapper.appendChild(installningsRad);
  }

  const knappRad = document.createElement("div");
  knappRad.className = "tidtagare-knapprad";
  const startKnapp = document.createElement("button");
  startKnapp.className = "knapp-primar";
  startKnapp.id = "tidtagare-start-knapp";
  startKnapp.textContent = timer_kor ? "Pausa" : "▶ Starta";
  startKnapp.onclick = () => { vaxlaTidtagare(on401); };
  const nollstallTidKnapp = document.createElement("button");
  nollstallTidKnapp.className = "narvaro-knapp";
  nollstallTidKnapp.textContent = "↺ Nollställ";
  nollstallTidKnapp.onclick = () => { nollstallTidtagare(on401); };
  knappRad.appendChild(startKnapp);
  knappRad.appendChild(nollstallTidKnapp);
  wrapper.appendChild(knappRad);

  return wrapper;
}

function formateraTid(sek) {
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function vaxlaTidtagare(on401) {
  if (timer_kor) {
    // PAUSA - stanna klockan, behåll timer_sekunder_kvar orört, så nästa
    // Starta återupptar exakt därifrån (inte en nollställning).
    timer_kor = false;
    if (timer_id) { clearInterval(timer_id); timer_id = null; }
    const startKnapp = document.getElementById("tidtagare-start-knapp");
    if (startKnapp) startKnapp.textContent = "▶ Starta";
    return;
  }

  if (!timer_har_startats) {
    // FÖRSTA starten - läs av min/sek-fälten, spara som senast använda.
    const minInput = document.getElementById("tidtagare-min");
    const sekInput = document.getElementById("tidtagare-sek");
    const minuter = Math.max(0, parseInt(minInput.value, 10) || 0);
    const sekunder = Math.max(0, Math.min(59, parseInt(sekInput.value, 10) || 0));
    if (minuter === 0 && sekunder === 0) {
      visaToast("Ange en tid längre än 0 sekunder.");
      return;
    }
    timer_minuter = minuter;
    timer_sekunder_satt = sekunder;
    timer_sekunder_kvar = minuter * 60 + sekunder;
    timer_har_startats = true;
    sparaTidtagarInstallning(on401); // i bakgrunden - inget att vänta på för att starta klockan

    const installningsRad = document.querySelector(".tidtagare-installning");
    if (installningsRad) installningsRad.remove();
  }
  // ÅTERUPPTA (eller precis satt igång) - timer_sekunder_kvar är redan
  // rätt värde i båda fallen, rör den inte här.

  timer_kor = true;
  const startKnapp = document.getElementById("tidtagare-start-knapp");
  if (startKnapp) startKnapp.textContent = "Pausa";

  timer_id = setInterval(() => tidtagareTick(on401), 1000);
}

export function tidtagareTick(on401) {
  timer_sekunder_kvar--;
  const display = document.getElementById("tidtagare-display");
  if (display) {
    display.textContent = formateraTid(Math.max(0, timer_sekunder_kvar));
    display.classList.toggle("tidtagare-varning", timer_sekunder_kvar <= VARNINGSGRANS_SEKUNDER && timer_sekunder_kvar > 0);
  }
  if (timer_sekunder_kvar <= 0) {
    timer_kor = false;
    if (timer_id) { clearInterval(timer_id); timer_id = null; }
    spelaLjud();
    vibrera();
    visaToast("Tiden är slut!");
  }
}

function nollstallTidtagare(on401) {
  timer_kor = false;
  timer_har_startats = false;
  if (timer_id) { clearInterval(timer_id); timer_id = null; }
  timer_sekunder_kvar = timer_minuter * 60 + timer_sekunder_satt;
  laddaPoang(on401);
}

async function sparaTidtagarInstallning(on401) {
  try {
    await anropaMedToken("/tidtagare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minuter: timer_minuter, sekunder: timer_sekunder_satt }),
    }, on401);
  } catch (fel) {
    // Tyst - att spara den senast använda tiden är en bekvämlighet, inte
    // kritiskt nog att avbryta eller varna för om det skulle misslyckas.
  }
}