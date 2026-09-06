// Intervaller-skärmen. Tre delar:
//   1. En körande nedräkningsmotor (löp/vila-block, flera varv).
//   2. Ett formulär för att bygga/spara DEN AKTUELLA blocklistan - sparas
//      per LAG och per INLOGGAD PERSON som "senast använda" (/intervall).
//   3. NAMNGIVNA, SPARADE FÖRVAL (/intervall/forval) - flera olika
//      inställningar man kan spara och snabbt växla mellan, visas som
//      knappar längst ner. Skiljer sig från (2): (2) är bara EN, namnlös,
//      "det jag körde senast"; det här är flera, med egna namn.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";
import { spelaLjud, vibrera } from "./ljud.js";

// ---- Timer-tillstånd (modulnivå - ska överleva så länge sidan är öppen) ----
let block = [{ typ: "lop", sekunder: 15 }, { typ: "vila", sekunder: 10 }];
let varv = 4;
let kor = false;
let block_index = 0;
let varv_index = 0;
let sekunder_kvar = block[0].sekunder;
let timer_id = null;
let sparade_forval = [];

export async function initIntervaller(on401) {
  const container = document.getElementById("intervaller-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res, forvalRes;
  try {
    [res, forvalRes] = await Promise.all([
      anropaMedToken("/intervall", {}, on401),
      anropaMedToken("/intervall/forval", {}, on401),
    ]);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!res.ok || !forvalRes.ok) {
    visaToast("Kunde inte hämta sparade inställningar.");
    return;
  }
  const data = await res.json();
  if (data.installning) {
    block = data.installning.block;
    varv = data.installning.varv;
    aterstall_timer();
  }
  sparade_forval = await forvalRes.json();
  rendera(on401);
}

function rendera(on401) {
  const container = document.getElementById("intervaller-container");
  container.innerHTML = "";

  // ---- Klocka ----
  const klockaDiv = document.createElement("div");
  klockaDiv.className = "intervall-klocka";
  klockaDiv.classList.toggle("sista-varvet", arSistaVarvet());
  const aktuellt_block = block[block_index];
  klockaDiv.classList.add(aktuellt_block.typ === "lop" ? "intervall-lop" : "intervall-vila");

  const etikett = document.createElement("div");
  etikett.className = "intervall-etikett";
  etikett.textContent = aktuellt_block.typ === "lop" ? "LÖP" : "VILA";
  klockaDiv.appendChild(etikett);

  const tid = document.createElement("div");
  tid.className = "intervall-tid";
  tid.id = "intervall-tid";
  tid.textContent = formatera_tid(sekunder_kvar);
  klockaDiv.appendChild(tid);

  const varvText = document.createElement("div");
  varvText.className = "intervall-varv";
  varvText.id = "intervall-varv-text";
  varvText.textContent = `Varv ${visatVarvNr()} av ${varv}`;
  klockaDiv.appendChild(varvText);

  const sistaBadge = document.createElement("div");
  sistaBadge.className = "intervall-sista";
  sistaBadge.id = "intervall-sista";
  sistaBadge.textContent = "SISTA VARVET";
  sistaBadge.hidden = !arSistaVarvet();
  klockaDiv.appendChild(sistaBadge);

  container.appendChild(klockaDiv);

  // ---- Start/Paus + Nollställ ----
  const knappRad = document.createElement("div");
  knappRad.className = "intervall-knapprad";
  const startKnapp = document.createElement("button");
  startKnapp.className = "knapp-primar";
  startKnapp.id = "intervall-start-knapp";
  startKnapp.textContent = kor ? "Pausa" : "Starta";
  startKnapp.onclick = () => { vaxlaKorning(); rendera(on401); };
  const nollstallKnapp = document.createElement("button");
  nollstallKnapp.className = "narvaro-knapp";
  nollstallKnapp.textContent = "Nollställ";
  nollstallKnapp.onclick = () => { stoppaTimer(); aterstall_timer(); rendera(on401); };
  knappRad.appendChild(startKnapp);
  knappRad.appendChild(nollstallKnapp);
  container.appendChild(knappRad);

  // ---- Inställningar: blocklista + varv (ljud/vibration ligger numera
  // under Inställningar → Appinställningar) ----
  const installningar = document.createElement("div");
  installningar.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Ställ in";
  installningar.appendChild(rubrik);

  block.forEach((b, i) => {
    const blockRad = document.createElement("div");
    blockRad.className = "intervall-block-rad";

    const typVal = document.createElement("select");
    typVal.innerHTML = `<option value="lop">Löp</option><option value="vila">Vila</option>`;
    typVal.value = b.typ;
    typVal.onchange = () => { block[i].typ = typVal.value; };

    const sekVal = document.createElement("input");
    sekVal.type = "number";
    sekVal.min = "1";
    sekVal.value = b.sekunder;
    sekVal.onchange = () => { block[i].sekunder = Math.max(1, parseInt(sekVal.value, 10) || 1); };

    const taBortBlockKnapp = document.createElement("button");
    taBortBlockKnapp.className = "narvaro-knapp";
    taBortBlockKnapp.textContent = "✕";
    taBortBlockKnapp.disabled = block.length <= 1;
    taBortBlockKnapp.onclick = () => {
      block.splice(i, 1);
      aterstall_timer();
      rendera(on401);
    };

    blockRad.appendChild(typVal);
    blockRad.appendChild(sekVal);
    blockRad.appendChild(document.createTextNode("sek"));
    blockRad.appendChild(taBortBlockKnapp);
    installningar.appendChild(blockRad);
  });

  const laggTillBlockKnapp = document.createElement("button");
  laggTillBlockKnapp.className = "narvaro-knapp";
  laggTillBlockKnapp.textContent = "+ Lägg till block";
  laggTillBlockKnapp.onclick = () => {
    block.push({ typ: "lop", sekunder: 15 });
    rendera(on401);
  };
  installningar.appendChild(laggTillBlockKnapp);

  const varvLabel = document.createElement("label");
  varvLabel.textContent = "Antal varv (upprepningar av hela listan ovan)";
  installningar.appendChild(varvLabel);

  // − [ fält ] +  på en rad. Fältet går fortfarande att skriva i manuellt.
  const varvRad = document.createElement("div");
  varvRad.className = "varv-stegare";

  const varvNer = document.createElement("button");
  varvNer.type = "button";
  varvNer.className = "varv-stegare-knapp";
  varvNer.id = "varv-ner";
  varvNer.textContent = "−";
  varvNer.disabled = varv <= 1;
  varvNer.onclick = () => stegaVarv(varv - 1);

  const varvInput = document.createElement("input");
  varvInput.type = "number";
  varvInput.min = "1";
  varvInput.inputMode = "numeric";
  varvInput.className = "varv-stegare-falt";
  varvInput.id = "varv-falt";
  varvInput.value = varv;
  varvInput.onchange = () => stegaVarv(varvInput.value);

  const varvUpp = document.createElement("button");
  varvUpp.type = "button";
  varvUpp.className = "varv-stegare-knapp";
  varvUpp.textContent = "+";
  varvUpp.onclick = () => stegaVarv(varv + 1);

  varvRad.appendChild(varvNer);
  varvRad.appendChild(varvInput);
  varvRad.appendChild(varvUpp);
  installningar.appendChild(varvRad);

  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "knapp-primar";
  sparaKnapp.textContent = "Spara inställning";
  sparaKnapp.onclick = () => sparaInstallning(on401);
  installningar.appendChild(sparaKnapp);

  container.appendChild(installningar);

  // ---- Sparade förval (namngivna knappar) ----
  container.appendChild(byggForvalSektion(on401));
}

function byggForvalSektion(on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Sparade förval";
  wrapper.appendChild(rubrik);

  if (sparade_forval.length === 0) {
    const tom = document.createElement("p");
    tom.className = "grupper-info-liten";
    tom.textContent = "Inga sparade förval än - bygg en inställning ovan och spara den som ett förval.";
    wrapper.appendChild(tom);
  } else {
    const forvalRad = document.createElement("div");
    forvalRad.className = "forval-rad";
    sparade_forval.forEach(f => {
      const knappGrupp = document.createElement("span");
      knappGrupp.className = "forval-knappgrupp";

      const laddaKnapp = document.createElement("button");
      laddaKnapp.className = "forval-knapp";
      laddaKnapp.textContent = f.namn;
      laddaKnapp.onclick = () => {
        stoppaTimer();
        block = f.block.map(b => ({ ...b })); // kopia - rör inte det sparade förvalets egna data
        varv = f.varv;
        aterstall_timer();
        rendera(on401);
      };
      knappGrupp.appendChild(laddaKnapp);

      const taBortKnapp = document.createElement("button");
      taBortKnapp.className = "forval-ta-bort";
      taBortKnapp.textContent = "✕";
      taBortKnapp.title = `Ta bort "${f.namn}"`;
      taBortKnapp.onclick = () => taBortForval(f.id, on401);
      knappGrupp.appendChild(taBortKnapp);

      forvalRad.appendChild(knappGrupp);
    });
    wrapper.appendChild(forvalRad);
  }

  const nyttNamnRad = document.createElement("div");
  nyttNamnRad.className = "spelare-lagg-till";
  nyttNamnRad.innerHTML = `
    <input type="text" id="nytt-forval-namn" placeholder="Namn på förval, t.ex. Kort löppass">
    <button id="spara-forval-knapp">💾 Spara aktuell som förval</button>
  `;
  wrapper.appendChild(nyttNamnRad);
  nyttNamnRad.querySelector("#spara-forval-knapp").onclick = () => sparaForval(on401);

  return wrapper;
}

function formatera_tid(sek) {
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Sista varvet markeras bara när det finns mer än ETT varv - annars är
// "sista" trivialt sant hela passet och säger inget.
function arSistaVarvet() {
  return varv >= 2 && varv_index + 1 >= varv;
}

// Klampat så displayen aldrig visar "Varv 4 av 2" om varv sänkts mitt i.
function visatVarvNr() {
  return Math.min(varv_index + 1, varv);
}

// Uppdaterar varv-texten, "Sista varvet"-markören och ringen runt klockan -
// utan en full omrendering (som skulle stjäla fokus ur textfält).
function uppdateraVarvVisning() {
  const varvEl = document.getElementById("intervall-varv-text");
  if (varvEl) varvEl.textContent = `Varv ${visatVarvNr()} av ${varv}`;
  const sistaEl = document.getElementById("intervall-sista");
  if (sistaEl) sistaEl.hidden = !arSistaVarvet();
  const klockaDiv = document.querySelector(".intervall-klocka");
  if (klockaDiv) klockaDiv.classList.toggle("sista-varvet", arSistaVarvet());
}

// − / + / manuell inmatning av antal varv. Ingen full omrendering.
function stegaVarv(nytt) {
  varv = Math.max(1, parseInt(nytt, 10) || 1);
  const falt = document.getElementById("varv-falt");
  if (falt) falt.value = varv;
  const ner = document.getElementById("varv-ner");
  if (ner) ner.disabled = varv <= 1;
  uppdateraVarvVisning();
}

function aterstall_timer() {
  kor = false;
  block_index = 0;
  varv_index = 0;
  sekunder_kvar = block[0].sekunder;
}

function vaxlaKorning() {
  if (kor) {
    stoppaTimer();
  } else {
    kor = true;
    timer_id = setInterval(tick, 1000);
  }
}

function stoppaTimer() {
  kor = false;
  if (timer_id) {
    clearInterval(timer_id);
    timer_id = null;
  }
}

// Exporterad bara för test - kör ETT sekundsteg av klockan utan att vänta
// på en riktig setInterval-tick.
export function tick() {
  sekunder_kvar--;
  if (sekunder_kvar < 0) {
    block_index++;
    if (block_index >= block.length) {
      block_index = 0;
      varv_index++;
      if (varv_index >= varv) {
        // Klart! Stanna på sista blocket, sekunder 0.
        varv_index = varv - 1;
        block_index = block.length - 1;
        sekunder_kvar = 0;
        stoppaTimer();
        uppdateraDom();
        spelaLjud();
        vibrera();
        return;
      }
    }
    sekunder_kvar = block[block_index].sekunder;
  }
  uppdateraDom();
}

// Uppdaterar bara siffrorna i DOM:en direkt (utan en hel omrendering) - en
// omrendering skulle bygga om HELA inställningsformuläret varje sekund,
// vilket bland annat skulle stjäla fokus ur ett textfält man just skriver i.
function uppdateraDom() {
  const tidEl = document.getElementById("intervall-tid");
  if (tidEl) tidEl.textContent = formatera_tid(sekunder_kvar);
  uppdateraVarvVisning();
  const klockaDiv = tidEl?.closest(".intervall-klocka");
  if (klockaDiv) {
    klockaDiv.classList.toggle("intervall-lop", block[block_index].typ === "lop");
    klockaDiv.classList.toggle("intervall-vila", block[block_index].typ === "vila");
    const etikettEl = klockaDiv.querySelector(".intervall-etikett");
    if (etikettEl) etikettEl.textContent = block[block_index].typ === "lop" ? "LÖP" : "VILA";
  }
}

async function sparaInstallning(on401) {
  try {
    const res = await anropaMedToken("/intervall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block, varv }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast("Inställningen sparad.");
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

async function sparaForval(on401) {
  const input = document.getElementById("nytt-forval-namn");
  const namn = input.value.trim();
  if (!namn) {
    visaToast("Ange ett namn på förvalet.");
    return;
  }
  try {
    const res = await anropaMedToken("/intervall/forval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn, block, varv }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast(`Förvalet "${namn}" sparat.`);
    sparade_forval.push({ id: data.id, namn, block: block.map(b => ({ ...b })), varv });
    rendera(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara förvalet.");
  }
}

async function taBortForval(id, on401) {
  try {
    const res = await anropaMedToken("/intervall/forval/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    sparade_forval = sparade_forval.filter(f => f.id !== id);
    rendera(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte ta bort förvalet.");
  }
}