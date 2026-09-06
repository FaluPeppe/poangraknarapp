// Hantera lag-skärmen (Fas 6a, utökad). Lagnamn + möjlighet att skapa
// ytterligare lag, ansluta till ett befintligt lag med kod, och byta
// mellan sina egna lag - samma funktioner som Shiny-appens "Hantera lag".
//
// UTELÄMNAT MEDVETET (matchar inte vår inloggningsmodell eller är separat
// funktionalitet som förtjänar sin egen omgång):
//   - "Bekräfta din e-post" - vår inloggning kräver alltid en verifierad
//     e-post via engångskod, så den är redan känd.
//   - "Koppla bort den här enheten" - vi har ingen enhetsparkoppling
//     separat från inloggningen (JWT), så begreppet finns inte hos oss.
//   - "Tipsa en vän om appen" - generisk marknadsföring, inte laghantering.
//   - "Dela lag" och "Min hemskärmslänk" - inte byggda än, kan tas i en
//     egen omgång.

import { anropaMedToken, sparaToken } from "./auth.js";
import { visaToast } from "./ui.js";

export async function initLag(on401) {
  const container = document.getElementById("lag-installningar-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let migRes, minaLagRes;
  try {
    [migRes, minaLagRes] = await Promise.all([
      anropaMedToken("/mig", {}, on401),
      anropaMedToken("/lag/mina", {}, on401),
    ]);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!migRes.ok || !minaLagRes.ok) {
    visaToast("Kunde inte hämta laginfo.");
    return;
  }
  const mig = await migRes.json();
  const minaLag = await minaLagRes.json();
  rendera(mig, minaLag, on401);
}

function rendera(mig, minaLag, on401) {
  const container = document.getElementById("lag-installningar-container");
  container.innerHTML = "";
  const jag_ar_admin = mig.roll === "admin";

  // ---- Lagnamn ----
  const namnForm = document.createElement("div");
  namnForm.className = "avsluta-form";
  const label = document.createElement("label");
  label.textContent = "Lagnamn";
  namnForm.appendChild(label);
  const input = document.createElement("input");
  input.type = "text";
  input.id = "lagnamn-input";
  input.value = mig.lagnamn;
  input.disabled = !jag_ar_admin;
  namnForm.appendChild(input);
  if (jag_ar_admin) {
    const knapp = document.createElement("button");
    knapp.className = "knapp-primar";
    knapp.textContent = "Spara";
    knapp.onclick = () => sparaLagnamn(on401);
    namnForm.appendChild(knapp);
  } else {
    const info = document.createElement("p");
    info.style.cssText = "color:#888;font-size:13px;";
    info.textContent = "Bara admins kan ändra lagnamnet.";
    namnForm.appendChild(info);
  }
  container.appendChild(namnForm);

  // ---- Byt lag (om man är med i fler än ett) ----
  if (minaLag.length > 1) {
    const byt = document.createElement("div");
    byt.className = "avsluta-form";
    const rubrik = document.createElement("h3");
    rubrik.className = "historik-rubrik";
    rubrik.textContent = "Byt lag";
    byt.appendChild(rubrik);

    minaLag.forEach(l => {
      const rad = document.createElement("div");
      rad.className = "spelar-rad";
      const namnDiv = document.createElement("div");
      namnDiv.className = "spelar-info";
      namnDiv.innerHTML = `<div class="spelar-namn">${escapeHtml(l.lagnamn)}</div><div class="spelar-positioner">${l.roll === "admin" ? "Admin" : "Medlem"}</div>`;
      rad.appendChild(namnDiv);
      if (l.lagkod === mig.lagkod) {
        const chip = document.createElement("span");
        chip.className = "badge";
        chip.textContent = "Aktivt";
        rad.appendChild(chip);
      } else {
        const bytKnapp = document.createElement("button");
        bytKnapp.className = "narvaro-knapp";
        bytKnapp.textContent = "Byt hit";
        bytKnapp.onclick = () => bytLag(l.lagkod, on401);
        rad.appendChild(bytKnapp);
      }
      byt.appendChild(rad);
    });
    container.appendChild(byt);
  }

  // ---- Skapa ytterligare ett lag ----
  const skapa = document.createElement("div");
  skapa.className = "avsluta-form";
  const skapaRubrik = document.createElement("h3");
  skapaRubrik.className = "historik-rubrik";
  skapaRubrik.textContent = "Skapa ytterligare ett lag";
  skapa.appendChild(skapaRubrik);
  const skapaInfo = document.createElement("p");
  skapaInfo.style.cssText = "color:#888;font-size:13px;margin-top:-6px;";
  skapaInfo.textContent = "Kopplas till samma e-postadress som ditt nuvarande lag.";
  skapa.appendChild(skapaInfo);
  const skapaLabel = document.createElement("label");
  skapaLabel.textContent = "Lagnamn";
  skapa.appendChild(skapaLabel);
  const skapaInput = document.createElement("input");
  skapaInput.type = "text";
  skapaInput.id = "nytt-lag-namn";
  skapaInput.placeholder = "T.ex. KIF P16";
  skapa.appendChild(skapaInput);
  const skapaKnapp = document.createElement("button");
  skapaKnapp.className = "knapp-primar";
  skapaKnapp.textContent = "+ Skapa nytt lag";
  skapaKnapp.onclick = () => skapaNyttLag(on401);
  skapa.appendChild(skapaKnapp);
  container.appendChild(skapa);

  // ---- Anslut till ett lag med kod ----
  const anslut = document.createElement("div");
  anslut.className = "avsluta-form";
  const anslutRubrik = document.createElement("h3");
  anslutRubrik.className = "historik-rubrik";
  anslutRubrik.textContent = "Anslut till ett lag med kod";
  anslut.appendChild(anslutRubrik);
  const anslutInfo = document.createElement("p");
  anslutInfo.style.cssText = "color:#888;font-size:13px;margin-top:-6px;";
  anslutInfo.textContent = "Om du har en kod till ett lag som inte redan finns i listan ovan.";
  anslut.appendChild(anslutInfo);
  const anslutLabel = document.createElement("label");
  anslutLabel.textContent = "Lagkod";
  anslut.appendChild(anslutLabel);
  const anslutInput = document.createElement("input");
  anslutInput.type = "text";
  anslutInput.id = "anslut-lagkod-input";
  anslut.appendChild(anslutInput);
  const anslutKnapp = document.createElement("button");
  anslutKnapp.className = "knapp-primar";
  anslutKnapp.textContent = "Anslut";
  anslutKnapp.onclick = () => anslutTillLag(on401);
  anslut.appendChild(anslutKnapp);
  container.appendChild(anslut);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function sparaLagnamn(on401) {
  const input = document.getElementById("lagnamn-input");
  const lagnamn = input.value.trim();
  if (!lagnamn) {
    visaToast("Lagnamnet får inte vara tomt.");
    return;
  }
  try {
    const res = await anropaMedToken("/lag/namn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lagnamn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast("Lagnamnet sparat.");
    // lagnamn-rubrik är numera en listruta (header.js) - uppdatera texten
    // på den VALDA optionen, inte elementet som helhet.
    const rubrik = document.getElementById("lagnamn-rubrik");
    if (rubrik && rubrik.tagName === "SELECT") {
      const valdOption = rubrik.options[rubrik.selectedIndex];
      if (valdOption) valdOption.textContent = lagnamn;
    } else if (rubrik) {
      rubrik.textContent = lagnamn;
    }
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

async function skapaNyttLag(on401) {
  const input = document.getElementById("nytt-lag-namn");
  const lagnamn = input.value.trim();
  if (!lagnamn) {
    visaToast("Ange ett lagnamn.");
    return;
  }
  try {
    const res = await anropaMedToken("/lag/skapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lagnamn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast(`"${lagnamn}" skapat! Byt till det nedan när du vill.`);
    await initLag(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte skapa laget.");
  }
}

async function anslutTillLag(on401) {
  const input = document.getElementById("anslut-lagkod-input");
  const lagkod = input.value.trim();
  if (!lagkod) {
    visaToast("Ange en lagkod.");
    return;
  }
  try {
    const res = await anropaMedToken("/lag/anslut", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lagkod }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast(`Du är nu med i "${data.lagnamn}"!`);
    await initLag(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte ansluta.");
  }
}

// Byter aktivt lag: hämtar en NY token för det valda laget och laddar om
// hela sidan - enklast och säkraste sättet att garantera att alla skärmar
// (poäng, grupper, spelare, ...) visar det NYA lagets data, inte en
// blandning av gammalt och nytt tillstånd.
async function bytLag(lagkod, on401) {
  try {
    const res = await anropaMedToken("/lag/byt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lagkod }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    sparaToken(data.token);
    window.location.reload();
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte byta lag.");
  }
}