// Entry point - laddas som <script type="module"> från index.html.
// Håller ihop appens skal: vilken vy som visas (login/app), vilken SKÄRM
// som visas inuti appen, och startar rätt skärms-modul.

import { hamtaToken, initLogin } from "./auth.js";
import { initPoang } from "./poang.js";
import { initGrupper } from "./grupper.js";
import { initSpelare } from "./spelare.js";
import { initAvsluta } from "./avsluta.js";
import { initMedlemmar } from "./medlemmar.js";
import { initLag } from "./lag.js";
import { initPositioner } from "./positioner.js";
import { initFarger } from "./farger.js";
import { initIntervaller } from "./intervaller.js";

function visaLoginVy() {
  document.getElementById("login-vy").classList.remove("dold");
  document.getElementById("app-vy").classList.add("dold");
}

function visaAppVy() {
  document.getElementById("login-vy").classList.add("dold");
  document.getElementById("app-vy").classList.remove("dold");
}

// ---- Navigering mellan skärmar inuti appen ----
const skarmar = {
  poang: { container: "lag-container", nav: "nav-poang-knapp", init: () => initPoang(visaLoginVy) },
  grupper: { container: "grupper-container", nav: "nav-grupper-knapp", init: () => initGrupper(visaLoginVy) },
  spelare: { container: "spelare-container", nav: "nav-spelare-knapp", init: () => initSpelare(visaLoginVy) },
  avsluta: { container: "avsluta-container", nav: "nav-avsluta-knapp", init: () => initAvsluta(visaLoginVy) },
  medlemmar: { container: "medlemmar-container", nav: "nav-medlemmar-knapp", init: () => initMedlemmar(visaLoginVy) },
  lag: { container: "lag-installningar-container", nav: "nav-lag-knapp", init: () => initLag(visaLoginVy) },
  positioner: { container: "positioner-container", nav: "nav-positioner-knapp", init: () => initPositioner(visaLoginVy) },
  farger: { container: "farger-container", nav: "nav-farger-knapp", init: () => initFarger(visaLoginVy) },
  intervaller: { container: "intervaller-container", nav: "nav-intervaller-knapp", init: () => initIntervaller(visaLoginVy) },
};

function visaSkarm(namn) {
  Object.entries(skarmar).forEach(([n, s]) => {
    const arAktiv = n === namn;
    document.getElementById(s.container).classList.toggle("dold", !arAktiv);
    document.getElementById(s.nav).classList.toggle("aktiv", arAktiv);
  });
  skarmar[namn].init();
}

document.getElementById("nav-poang-knapp").addEventListener("click", () => visaSkarm("poang"));
document.getElementById("nav-grupper-knapp").addEventListener("click", () => visaSkarm("grupper"));
document.getElementById("nav-spelare-knapp").addEventListener("click", () => visaSkarm("spelare"));
document.getElementById("nav-avsluta-knapp").addEventListener("click", () => visaSkarm("avsluta"));
document.getElementById("nav-medlemmar-knapp").addEventListener("click", () => visaSkarm("medlemmar"));
document.getElementById("nav-lag-knapp").addEventListener("click", () => visaSkarm("lag"));
document.getElementById("nav-positioner-knapp").addEventListener("click", () => visaSkarm("positioner"));
document.getElementById("nav-farger-knapp").addEventListener("click", () => visaSkarm("farger"));
document.getElementById("nav-intervaller-knapp").addEventListener("click", () => visaSkarm("intervaller"));

async function startaAppen() {
  visaAppVy();
  visaSkarm("poang"); // startskärm, samma som Shiny-appens Poängräkning
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
