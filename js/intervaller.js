// Intervaller-skärmen (Fas 6d). Två delar:
//   1. Ett formulär för att bygga/spara en blocklista (löp/vila-sekvens +
//      antal varv) - sparas per LAG och per INLOGGAD PERSON (samma person
//      kan ju behöva olika tider för olika lag).
//   2. En körande nedräkningsmotor helt i webbläsaren - ingen serverkontakt
//      medan klockan går, bara vid start/paus/spara.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

// ---- Timer-tillstånd (modulnivå - ska överleva så länge sidan är öppen) ----
let block = [{ typ: "lop", sekunder: 15 }, { typ: "vila", sekunder: 10 }];
let varv = 4;
let kor = false;
let block_index = 0;
let varv_index = 0;
let sekunder_kvar = block[0].sekunder;
let timer_id = null;

export async function initIntervaller(on401) {
  const container = document.getElementById("intervaller-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/intervall", {}, on401);
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
  if (!res.ok) {
    visaToast("Kunde inte hämta sparad inställning.");
    return;
  }
  const data = await res.json();
  if (data.installning) {
    block = data.installning.block;
    varv = data.installning.varv;
    aterstall_timer();
  }
  rendera(on401);
}

function rendera(on401) {
  const container = document.getElementById("intervaller-container");
  container.innerHTML = "";

  // ---- Klocka ----
  const klockaDiv = document.createElement("div");
  klockaDiv.className = "intervall-klocka";
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
  varvText.textContent = `Varv ${varv_index + 1} av ${varv}`;
  klockaDiv.appendChild(varvText);

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

  // ---- Inställningar: blocklista + varv ----
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
  const varvInput = document.createElement("input");
  varvInput.type = "number";
  varvInput.min = "1";
  varvInput.value = varv;
  varvInput.onchange = () => { varv = Math.max(1, parseInt(varvInput.value, 10) || 1); };
  installningar.appendChild(varvInput);

  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "knapp-primar";
  sparaKnapp.textContent = "Spara inställning";
  sparaKnapp.onclick = () => sparaInstallning(on401);
  installningar.appendChild(sparaKnapp);

  container.appendChild(installningar);
}

function formatera_tid(sek) {
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
  const varvEl = document.getElementById("intervall-varv-text");
  if (tidEl) tidEl.textContent = formatera_tid(sekunder_kvar);
  if (varvEl) varvEl.textContent = `Varv ${varv_index + 1} av ${varv}`;
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
