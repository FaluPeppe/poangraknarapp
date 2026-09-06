// Entry point - laddas som <script type="module"> från index.html.
// Håller ihop appens skal: vilken vy som visas (login/app), och navigering
// inuti appen i TVÅ nivåer:
//   1. Fyra huvudflikar (snabbåtkomst under en pågående träning): Närvaro,
//      Poäng, Intervaller, Inställningar.
//   2. "Inställningar" är i sig en hubb med "Hantera"-knappar (sällan
//      använda saker: spelare, lag, positioner, färger, tränare, avsluta
//      match) - en "← Tillbaka"-knapp leder tillbaka till hubben, inte till
//      någon av de tre andra huvudflikarna.
//   Utöver flikarna finns underskärmen "Dela in grupper" - ingen egen flik,
//   nås via en knapp på Närvaro- eller Poäng-skärmen, med "← Tillbaka" dit
//   man kom ifrån.

import { hamtaToken, initLogin } from "./auth.js";
import { initPoang } from "./poang.js";
import { initGrupper } from "./grupper.js";
import { initSpelare } from "./spelare.js";
import { initNarvaro } from "./narvaro.js";
import { initAvsluta } from "./avsluta.js";
import { initMedlemmar } from "./medlemmar.js";
import { initLag } from "./lag.js";
import { initPositioner } from "./positioner.js";
import { initFarger } from "./farger.js";
import { initStatistik } from "./statistik.js";
import { initPoangmatcher } from "./poangmatcher.js";
import { initIntervaller } from "./intervaller.js";
import { nav } from "./nav.js";
import { initHeaderLagval } from "./header.js";
import { initSkarmvaken } from "./skarmvaken.js";
import { initAppinstallningar } from "./appinstallningar.js";

function visaLoginVy() {
  document.getElementById("login-vy").classList.remove("dold");
  document.getElementById("app-vy").classList.add("dold");
}

function visaAppVy() {
  document.getElementById("login-vy").classList.add("dold");
  document.getElementById("app-vy").classList.remove("dold");
}

// ---- Huvudflikarna (alltid synliga, en är alltid aktiv) ----
const huvudflikar = {
  narvaro: { container: "narvaro-container", nav: "nav-narvaro-knapp", init: () => initNarvaro(visaLoginVy) },
  poang: { container: "lag-container", nav: "nav-poang-knapp", init: () => initPoang(visaLoginVy) },
  intervaller: { container: "intervaller-container", nav: "nav-intervaller-knapp", init: () => initIntervaller(visaLoginVy) },
};

// ---- Hantera-skärmarna (nås via Inställningar-hubben, inte egna flikar) ----
const hanteraSkarmar = {
  spelare: { container: "spelare-container", knapp: "hantera-spelare-knapp", init: () => initSpelare(visaLoginVy) },
  avsluta: { container: "avsluta-container", knapp: "hantera-avsluta-knapp", init: () => initAvsluta(visaLoginVy) },
  medlemmar: { container: "medlemmar-container", knapp: "hantera-medlemmar-knapp", init: () => initMedlemmar(visaLoginVy) },
  lag: { container: "lag-installningar-container", knapp: "hantera-lag-knapp", init: () => initLag(visaLoginVy) },
  positioner: { container: "positioner-container", knapp: "hantera-positioner-knapp", init: () => initPositioner(visaLoginVy) },
  farger: { container: "farger-container", knapp: "hantera-farger-knapp", init: () => initFarger(visaLoginVy) },
  poangmatcher: { container: "poangmatcher-container", knapp: "hantera-poangmatcher-knapp", init: () => initPoangmatcher(visaLoginVy) },
  statistik: { container: "statistik-container", knapp: "hantera-statistik-knapp", init: () => initStatistik(visaLoginVy) },
  appinstallningar: { container: "appinstallningar-container", knapp: "hantera-appinstallningar-knapp", init: () => initAppinstallningar() },
};

const alla_containers = [
  ...Object.values(huvudflikar).map(s => s.container),
  ...Object.values(hanteraSkarmar).map(s => s.container),
  "grupper-container",
  "installningar-hubb",
];

function doljAllt() {
  alla_containers.forEach(id => document.getElementById(id).classList.add("dold"));
  document.getElementById("installningar-tillbaka-knapp").classList.add("dold");
  document.getElementById("grupper-tillbaka-knapp").classList.add("dold");
  Object.values(huvudflikar).forEach(s => document.getElementById(s.nav).classList.remove("aktiv"));
  document.getElementById("nav-installningar-knapp").classList.remove("aktiv");
}

function visaHuvudflik(namn) {
  doljAllt();
  document.getElementById(huvudflikar[namn].container).classList.remove("dold");
  document.getElementById(huvudflikar[namn].nav).classList.add("aktiv");
  huvudflikar[namn].init();
}

function visaInstallningarHubb() {
  doljAllt();
  document.getElementById("installningar-hubb").classList.remove("dold");
  document.getElementById("nav-installningar-knapp").classList.add("aktiv");
}

function visaHanteraSkarm(namn) {
  doljAllt();
  document.getElementById(hanteraSkarmar[namn].container).classList.remove("dold");
  document.getElementById("installningar-tillbaka-knapp").classList.remove("dold");
  document.getElementById("nav-installningar-knapp").classList.add("aktiv"); // fortfarande "inom" Inställningar
  hanteraSkarmar[namn].init();
}

// "Dela in grupper" - underskärm utan egen flik. "← Tillbaka" leder dit man
// kom ifrån (Närvaro eller Poäng), och den fliken hålls markerad medan man
// är här.
let grupperUrsprung = "narvaro"; // "narvaro" | "poang"

function visaGrupperSkarm(ursprung) {
  grupperUrsprung = huvudflikar[ursprung] ? ursprung : "narvaro";
  doljAllt();
  document.getElementById("grupper-container").classList.remove("dold");
  document.getElementById("grupper-tillbaka-knapp").classList.remove("dold");
  document.getElementById(huvudflikar[grupperUrsprung].nav).classList.add("aktiv");
  initGrupper(visaLoginVy);
}

document.getElementById("nav-narvaro-knapp").addEventListener("click", () => visaHuvudflik("narvaro"));
document.getElementById("nav-poang-knapp").addEventListener("click", () => visaHuvudflik("poang"));
document.getElementById("nav-intervaller-knapp").addEventListener("click", () => visaHuvudflik("intervaller"));
document.getElementById("nav-installningar-knapp").addEventListener("click", visaInstallningarHubb);
document.getElementById("installningar-tillbaka-knapp").addEventListener("click", visaInstallningarHubb);
const gaTillbakaFranGrupper = () => visaHuvudflik(grupperUrsprung);
document.getElementById("grupper-tillbaka-knapp").addEventListener("click", gaTillbakaFranGrupper);

// Koppla in nav-bryggan - se nav.js för varför detta görs indirekt.
nav.gaTillGrupper = (ursprung) => visaGrupperSkarm(ursprung);
nav.gaTillbakaFranGrupper = gaTillbakaFranGrupper;
nav.gaTillAvsluta = () => visaHanteraSkarm("avsluta");

Object.entries(hanteraSkarmar).forEach(([namn, s]) => {
  // OBS: "avsluta" har medvetet ingen egen knapp i hubben längre - nås bara
  // via genvägen på Poäng-skärmen (nav.gaTillAvsluta) - därav null-kollen.
  const knappEl = document.getElementById(s.knapp);
  if (knappEl) knappEl.addEventListener("click", () => visaHanteraSkarm(namn));
});

async function startaAppen() {
  visaAppVy();
  initHeaderLagval(visaLoginVy); // bygger om lagnamn-rubriken till en listruta
  initSkarmvaken();
  visaHuvudflik("narvaro"); // startskärm - Peter vill se närvaro först
}

initLogin({
  visaLoginVy,
  efterInloggning: startaAppen,
});

if (hamtaToken()) {
  startaAppen();
} else {
  visaLoginVy();
}