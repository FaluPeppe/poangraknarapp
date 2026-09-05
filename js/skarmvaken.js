// Håller skärmen vaken en valbar tid med Screen Wake Lock API - så
// skärmen inte hinner slockna mitt i en match. Personlig inställning,
// sparas lokalt i webbläsaren (inte per lag).
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

const NYCKEL = "kif_skarmvaken_minuter";
const STANDARD_MINUTER = "10"; // "0" = av/aldrig

let aktivt_lock = null;
let slutar_vid = 0;       // ms-tidstämpel då locken ska släppas (0 = inaktiv)
let slapp_timer = null;
let lyssnare_kopplade = false;

export function hamtaSkarmvakenMinuter() {
  return localStorage.getItem(NYCKEL) || STANDARD_MINUTER;
}

export function sparaSkarmvakenMinuter(varde) {
  localStorage.setItem(NYCKEL, varde);
  initSkarmvaken(); // applicera direkt - annars måste sidan laddas om
}

function aktiv() {
  return slutar_vid > 0 && Date.now() < slutar_vid;
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

  const minuter = parseInt(hamtaSkarmvakenMinuter(), 10);
  if (!minuter || minuter <= 0) { // "Aldrig"
    slutar_vid = 0;
    slappLock();
    return;
  }

  slutar_vid = Date.now() + minuter * 60 * 1000;
  slapp_timer = setTimeout(() => { slutar_vid = 0; slappLock(); }, minuter * 60 * 1000);

  kopplaLyssnare();
  begarLock(); // Android/Chrome får locken direkt; iPhone tar första trycket vid
}

// Bygger en inställningsrad (etikett + radioknappar på samma rad) för
// Appinställningar-skärmen.
export function byggSkarmvakenValjare() {
  const alternativ = [
    { varde: "1", etikett: "1 min" },
    { varde: "5", etikett: "5 min" },
    { varde: "10", etikett: "10 min" },
    { varde: "0", etikett: "Aldrig" },
  ];
  const kontroll = document.createElement("div");
  kontroll.className = "installning-kontroll";
  const nuvarande = hamtaSkarmvakenMinuter();
  alternativ.forEach(a => {
    const radRad = document.createElement("label");
    radRad.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "skarmvaken-minuter";
    radio.value = a.varde;
    radio.checked = nuvarande === a.varde;
    radio.onchange = () => sparaSkarmvakenMinuter(a.varde);
    radRad.appendChild(radio);
    radRad.appendChild(document.createTextNode(" " + a.etikett));
    kontroll.appendChild(radRad);
  });

  return byggInstallningsRad(
    "Håll skärmen vaken",
    "Förhindrar att skärmen slocknar mitt i en match. På iPhone: aktiveras vid första tryck i appen och fungerar inte i Låst energiläge.",
    kontroll
  );
}