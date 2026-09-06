// Håller skärmen vaken med Screen Wake Lock API - så skärmen inte hinner
// slockna mitt i en match. Personlig inställning, sparas lokalt i webb-
// läsaren (inte per lag).
//
// Tre lägen:
//   "pa"  - hela tiden appen är framme (standard). Locken släpps ändå
//           automatiskt så fort appen inte är den synliga fliken/appen, så
//           det kostar bara batteri medan man faktiskt tittar på appen.
//   "10"  - på i 10 minuter räknat från appstart / att man ändrar valet.
//   "0"   - aldrig, telefonens egen tidsgräns gäller.
//
// OBS om webbläsarstöd:
//  - Wake Lock API finns i Android Chrome och i Safari 16.4+ (iOS 16.4,
//    våren 2023). Äldre iOS saknar det helt - då gör funktionen ingenting
//    (ingen krasch), skärmen slocknar enligt telefonens egna inställning.
//  - VIKTIGT för iPhone: Safari beviljar bara en wake lock DIREKT EFTER en
//    användargest (ett tap). Vid appstart finns ingen sådan, så vi haker på
//    första tryck/klick och begär locken där - och vid varje efterföljande
//    tryck tills den beviljats. Android Chrome bryr sig inte om detta och
//    får locken direkt vid start.
//  - Låst energiläge (Low Power Mode) på iPhone stänger av wake lock helt.
//    Inget en webbsida kan göra åt det - stäng av energisparläget.

import { byggInstallningsRad } from "./ui.js";

const NYCKEL = "kif_skarmvaken_minuter"; // behåller nyckeln - äldre "5"/"10" ligger kvar
const STANDARD = "pa";

let aktivt_lock = null;
let alltid = false;       // "pa"-läget: ingen bortre gräns
let slutar_vid = 0;       // ms-tidstämpel då locken ska släppas (bara minut-läget)
let slapp_timer = null;
let lyssnare_kopplade = false;

export function hamtaSkarmvakenLage() {
  return localStorage.getItem(NYCKEL) || STANDARD;
}

export function sparaSkarmvakenLage(varde) {
  localStorage.setItem(NYCKEL, varde);
  initSkarmvaken(); // applicera direkt - annars måste sidan laddas om
}

function aktiv() {
  return alltid || (slutar_vid > 0 && Date.now() < slutar_vid);
}

async function begarLock() {
  if (aktivt_lock || !aktiv()) return;
  if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
  try {
    aktivt_lock = await navigator.wakeLock.request("screen");
    // Släpps automatiskt när fliken döljs - nolla då så vi kan ta om den.
    aktivt_lock.addEventListener("release", () => { aktivt_lock = null; });
  } catch (fel) {
    // iOS utan användargest, Låst energiläge, dold flik, m.m. - inte
    // kritiskt. Nästa tap (vidGest) eller återkomst till fliken försöker igen.
    aktivt_lock = null;
  }
}

function slappLock() {
  if (aktivt_lock) {
    aktivt_lock.release().catch(() => {});
    aktivt_lock = null;
  }
}

function vidGest() {
  if (aktiv()) begarLock();
}

function vidSynlig() {
  if (document.visibilityState === "visible") begarLock();
}

// Kopplas EN gång och lever hela appens livstid - lätt (begarLock() faller
// igenom snabbt när locken redan finns eller tiden gått ut). capture:true
// så vi hör trycket även om något stoppar bubbling.
function kopplaLyssnare() {
  if (lyssnare_kopplade) return;
  lyssnare_kopplade = true;
  document.addEventListener("pointerdown", vidGest, true);
  document.addEventListener("visibilitychange", vidSynlig);
}

// Kallas vid appstart och varje gång inställningen ändras.
export function initSkarmvaken() {
  if (slapp_timer) { clearTimeout(slapp_timer); slapp_timer = null; }

  // Migrera äldre värden ("1"/"5" min) till "10" - de korta lägena är borta.
  const ratt = localStorage.getItem(NYCKEL);
  if (ratt === "1" || ratt === "5") localStorage.setItem(NYCKEL, "10");

  const lage = hamtaSkarmvakenLage();

  if (lage === "0") { // "Aldrig"
    alltid = false;
    slutar_vid = 0;
    slappLock();
    return;
  }

  if (lage === "pa") { // "Hela tiden appen är öppen"
    alltid = true;
    slutar_vid = 0;
    kopplaLyssnare();
    begarLock(); // Android/Chrome får locken direkt; iPhone tar första trycket
    return;
  }

  // Minut-läge
  const minuter = parseInt(lage, 10);
  if (!minuter || minuter <= 0) {
    alltid = false;
    slutar_vid = 0;
    slappLock();
    return;
  }
  alltid = false;
  slutar_vid = Date.now() + minuter * 60 * 1000;
  slapp_timer = setTimeout(() => { slutar_vid = 0; slappLock(); }, minuter * 60 * 1000);
  kopplaLyssnare();
  begarLock();
}

// Bygger en inställningsrad (etikett + radioknappar på samma rad) för
// Appinställningar-skärmen.
export function byggSkarmvakenValjare() {
  const alternativ = [
    { varde: "pa", etikett: "Hela tiden" },
    { varde: "10", etikett: "10 min" },
    { varde: "0", etikett: "Aldrig" },
  ];
  const kontroll = document.createElement("div");
  kontroll.className = "installning-kontroll";
  const nuvarande = hamtaSkarmvakenLage();
  alternativ.forEach(a => {
    const radRad = document.createElement("label");
    radRad.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "skarmvaken-minuter";
    radio.value = a.varde;
    radio.checked = nuvarande === a.varde;
    radio.onchange = () => sparaSkarmvakenLage(a.varde);
    radRad.appendChild(radio);
    radRad.appendChild(document.createTextNode(" " + a.etikett));
    kontroll.appendChild(radRad);
  });

  return byggInstallningsRad(
    "Håll skärmen vaken",
    'Förhindrar att skärmen slocknar mitt i en match. "Hela tiden" gäller så länge appen är framme - byter du app eller låser telefonen släpps den. På iPhone: aktiveras vid första tryck i appen och fungerar inte i Låst energiläge.',
    kontroll
  );
}
