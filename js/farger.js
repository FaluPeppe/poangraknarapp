// Hantera färger-skärmen. Ombyggd i Shiny-appens stil: en ordnad lista med
// upp/ner-pilar (ordningen styr vilken färg en ny grupp får FÖRST, se
// worker.js:/poang/antal), penna för att redigera, kryss för att ta bort -
// plus en palett med vanliga färger att välja bland när man lägger till en
// ny, istället för bara en fri färgväljare.
//
// OBS: det här är den RIKTIGA fargpaletten (samma tabell som Shiny-appens
// "Hantera färger") - separat från grupperna på Poäng-skärmen, som numera
// ALLTID byggs FRÅN den här paletten (se /poang/antal i worker.js).

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

let redigerar_id = null;

// Vanliga färger att välja bland - namn+hex. Klick på en swatch fyller i
// fälten nedan direkt (går fortfarande bra att skriva ett eget namn/hex).
const VANLIGA_FARGER = [
  { namn: "Röd", hex: "#D32F2F" },
  { namn: "Orange", hex: "#E8720C" },
  { namn: "Gul", hex: "#FBC02D" },
  { namn: "Grön", hex: "#388E3C" },
  { namn: "Turkos", hex: "#00897B" },
  { namn: "Blå", hex: "#1976D2" },
  { namn: "Marinblå", hex: "#1A237E" },
  { namn: "Lila", hex: "#8B3FA0" },
  { namn: "Rosa", hex: "#E91E8C" },
  { namn: "Vinröd", hex: "#7B1F2B" },
  { namn: "Brun", hex: "#795548" },
  { namn: "Vit", hex: "#FFFFFF" },
  { namn: "Grå", hex: "#9E9E9E" },
  { namn: "Svart", hex: "#1A1A1A" },
];

export async function initFarger(on401) {
  const container = document.getElementById("farger-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/farger", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta färger.");
    return;
  }
  const farger = await res.json();
  rendera(farger, on401);
}

function rendera(farger, on401) {
  const container = document.getElementById("farger-container");
  container.innerHTML = "";

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Ordningen bestämmer vilken färg en ny grupp får först på Poäng-skärmen - flytta en färg högst upp om du vill att den ska väljas i första hand.";
  container.appendChild(info);

  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  farger.forEach((f, index) => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";

    if (redigerar_id === f.id) {
      rad.appendChild(byggRedigeringsformular(f, on401));
    } else {
      const swatch = document.createElement("span");
      swatch.className = "farg-swatch";
      swatch.style.background = f.hex;

      const info2 = document.createElement("div");
      info2.className = "spelar-info";
      info2.appendChild(swatch);
      info2.appendChild(document.createTextNode(f.namn));
      rad.appendChild(info2);

      const knappar = document.createElement("div");
      knappar.className = "farg-knapprad";

      const uppKnapp = document.createElement("button");
      uppKnapp.className = "farg-ikonknapp";
      uppKnapp.textContent = "▲";
      uppKnapp.disabled = index === 0;
      uppKnapp.onclick = () => flyttaFarg(f.id, "upp", on401);
      knappar.appendChild(uppKnapp);

      const nerKnapp = document.createElement("button");
      nerKnapp.className = "farg-ikonknapp";
      nerKnapp.textContent = "▼";
      nerKnapp.disabled = index === farger.length - 1;
      nerKnapp.onclick = () => flyttaFarg(f.id, "ner", on401);
      knappar.appendChild(nerKnapp);

      const redigeraKnapp = document.createElement("button");
      redigeraKnapp.className = "farg-ikonknapp";
      redigeraKnapp.textContent = "✏️";
      redigeraKnapp.onclick = () => { redigerar_id = f.id; rendera(farger, on401); };
      knappar.appendChild(redigeraKnapp);

      const taBortKnapp = document.createElement("button");
      taBortKnapp.className = "farg-ikonknapp farg-ikonknapp-ta-bort";
      taBortKnapp.textContent = "✕";
      taBortKnapp.onclick = () => taBortFarg(f.id, on401);
      knappar.appendChild(taBortKnapp);

      rad.appendChild(knappar);
    }

    lista.appendChild(rad);
  });
  container.appendChild(lista);

  container.appendChild(byggLaggTill(on401));
}

function byggRedigeringsformular(f, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "spelare-redigera";
  const namnInput = document.createElement("input");
  namnInput.type = "text";
  namnInput.className = "redigera-namn";
  namnInput.value = f.namn;
  const hexInput = document.createElement("input");
  hexInput.type = "color";
  hexInput.className = "redigera-hex";
  hexInput.value = f.hex;
  const knappar = document.createElement("div");
  knappar.className = "spelare-redigera-knappar";
  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "spara-knapp";
  sparaKnapp.textContent = "Spara";
  sparaKnapp.onclick = () => sparaRedigering(f.id, namnInput.value, hexInput.value, on401);
  const avbrytKnapp = document.createElement("button");
  avbrytKnapp.className = "avbryt-knapp";
  avbrytKnapp.textContent = "Avbryt";
  avbrytKnapp.onclick = () => { redigerar_id = null; initFarger(on401); };
  knappar.appendChild(sparaKnapp);
  knappar.appendChild(avbrytKnapp);
  wrapper.appendChild(namnInput);
  wrapper.appendChild(hexInput);
  wrapper.appendChild(knappar);
  return wrapper;
}

function byggLaggTill(on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Lägg till en ny färg";
  wrapper.appendChild(rubrik);

  const paletthjalp = document.createElement("p");
  paletthjalp.className = "grupper-info-liten";
  paletthjalp.textContent = "Välj en vanlig färg nedan, eller skriv ett eget namn och välj en exakt nyans.";
  wrapper.appendChild(paletthjalp);

  const palettRad = document.createElement("div");
  palettRad.className = "farg-palett";
  VANLIGA_FARGER.forEach(f => {
    const swatchKnapp = document.createElement("button");
    swatchKnapp.type = "button";
    swatchKnapp.className = "farg-palett-swatch";
    swatchKnapp.style.background = f.hex;
    swatchKnapp.title = f.namn;
    swatchKnapp.onclick = () => {
      document.getElementById("ny-farg-namn").value = f.namn;
      document.getElementById("ny-farg-hex").value = f.hex;
    };
    palettRad.appendChild(swatchKnapp);
  });
  wrapper.appendChild(palettRad);

  const inputRad = document.createElement("div");
  inputRad.className = "spelare-lagg-till";
  inputRad.innerHTML = `
    <input type="text" id="ny-farg-namn" placeholder="Namn, t.ex. Orange">
    <input type="color" id="ny-farg-hex" value="#E8720C">
    <button id="lagg-till-farg-knapp">+ Lägg till</button>
  `;
  wrapper.appendChild(inputRad);
  wrapper.querySelector("#lagg-till-farg-knapp").onclick = () => laggTillFarg(on401);

  return wrapper;
}

async function laggTillFarg(on401) {
  const namnFalt = document.getElementById("ny-farg-namn");
  const hexFalt = document.getElementById("ny-farg-hex");
  const namn = namnFalt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  try {
    const res = await anropaMedToken("/farger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn, hex: hexFalt.value }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initFarger(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte lägga till.");
  }
}

async function sparaRedigering(id, namn, hex, on401) {
  namn = namn.trim();
  if (!namn) {
    visaToast("Namnet får inte vara tomt.");
    return;
  }
  try {
    const res = await anropaMedToken("/farger/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, namn, hex }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    redigerar_id = null;
    await initFarger(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

async function taBortFarg(id, on401) {
  try {
    const res = await anropaMedToken("/farger/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initFarger(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte ta bort.");
  }
}

async function flyttaFarg(id, riktning, on401) {
  try {
    const res = await anropaMedToken("/farger/flytta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, riktning }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initFarger(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte flytta färgen.");
  }
}