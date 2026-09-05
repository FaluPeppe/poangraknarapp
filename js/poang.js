// Poäng-skärmen. Utökad med en enkel tidtagarur (skiljer sig från
// Intervaller/Fas 6, som är en hel löp/vila-blocklista - det här är EN
// nedräkning, t.ex. för en poängmatchs speltid), en "Nollställ poäng"-
// knapp (utan att spara historik), och genvägar till Dela in grupper och
// Avsluta match.

import { anropaMedToken } from "./auth.js";
import { visaToast, textFargForBg } from "./ui.js";
import { nav } from "./nav.js";
import { spelaLjud, vibrera } from "./ljud.js";

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
  let res;
  try {
    res = await anropaMedToken("/poang", {}, on401);
  } catch (fel) {
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta poäng.");
    return;
  }
  const data = await res.json();
  rendera(data, on401);
}

function rendera(grupper, on401) {
  const container = document.getElementById("lag-container");
  container.innerHTML = "";

  container.appendChild(byggTidtagare(on401));
  container.appendChild(byggGenvagsrad(on401));

  const lagRad = document.createElement("div");
  lagRad.className = "lag-container-inre";
  grupper.forEach(g => {
    const txt = textFargForBg(g.grupp_farg);
    const kort = document.createElement("div");
    kort.className = "lag-kort";
    kort.style.background = g.grupp_farg;
    kort.style.color = txt;

    const namn = document.createElement("div");
    namn.className = "lag-namn";
    namn.textContent = g.grupp_namn;

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
    plusKnapp.onclick = () => poangKlick(g.grupp_namn, 1, on401);

    const minusKnapp = document.createElement("button");
    minusKnapp.className = "poang-knapp-liten";
    minusKnapp.textContent = "− 1 poäng";
    minusKnapp.onclick = () => poangKlick(g.grupp_namn, -1, on401);

    kort.appendChild(namn);
    kort.appendChild(poangEl);
    kort.appendChild(plusKnapp);
    kort.appendChild(minusKnapp);
    lagRad.appendChild(kort);
  });
  container.appendChild(lagRad);
}

// OBS: "Antal grupper"-stegaren bor numera på Dela in grupper-skärmen
// (js/grupper.js), inte här. Grupperna byggs alltid FRÅN färgpaletten i
// Inställningar → Hantera färger, i den ordningen.

function byggGenvagsrad(on401) {
  const rad = document.createElement("div");
  rad.className = "poang-genvagar";

  const grupperKnapp = document.createElement("button");
  grupperKnapp.className = "narvaro-knapp";
  grupperKnapp.textContent = "👥 Dela in i grupper";
  grupperKnapp.onclick = () => nav.gaTillGrupper("poang");
  rad.appendChild(grupperKnapp);

  const avslutaKnapp = document.createElement("button");
  avslutaKnapp.className = "knapp-avsluta-genvag";
  avslutaKnapp.textContent = "✓ Avsluta Poängmatch och spara";
  avslutaKnapp.onclick = () => nav.gaTillAvsluta();
  rad.appendChild(avslutaKnapp);

  const nollstallKnapp = document.createElement("button");
  nollstallKnapp.className = "knapp-nollstall-poang";
  nollstallKnapp.textContent = "↺ Nollställ poäng";
  nollstallKnapp.onclick = () => nollstallPoang(on401);
  rad.appendChild(nollstallKnapp);

  return rad;
}

async function poangKlick(gruppNamn, varde, on401) {
  const el = document.getElementById("poang_" + gruppNamn);
  const nuvarande = parseInt(el.getAttribute("data-poang"), 10) || 0;
  const nytt = Math.max(0, nuvarande + varde);
  el.textContent = nytt;
  el.setAttribute("data-poang", nytt);

  try {
    const res = await anropaMedToken("/poang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grupp_namn: gruppNamn, poang: nytt }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
  } catch (fel) {
    el.textContent = nuvarande;
    el.setAttribute("data-poang", nuvarande);
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