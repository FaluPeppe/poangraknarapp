// Om appen - vem som gjort appen och varför, "Vad är nytt" (andringslogg.js)
// och ett formulär för buggar/önskemål som mejlas till utvecklaren via
// POST /aterkoppling. Avsändarens e-post läggs på av servern utifrån
// inloggningen, så den behöver (och kan) inte anges här.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";
import { byggAndringslogg, VERSION } from "./andringslogg.js";

export function initOmAppen(on401) {
  const container = document.getElementById("omappen-container");
  container.innerHTML = "";
  container.appendChild(byggPresentation());
  container.appendChild(byggAterkoppling(on401));
  container.appendChild(byggTipsaVan(on401));
  container.appendChild(byggAndringslogg());
}

// ---- Tipsa en vän (POST /tipsa) - flyttad hit från Hantera lag ----
function byggTipsaVan(on401) {
  const form = document.createElement("div");
  form.className = "avsluta-form";
  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Tipsa en vän om appen";
  form.appendChild(rubrik);
  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Skickar ett mejl med en länk till appen. Ingen koppling till dina lag – "
    + "din e-postadress står som avsändare att svara till.";
  form.appendChild(info);

  const epostLabel = document.createElement("label");
  epostLabel.textContent = "Väns e-postadress";
  form.appendChild(epostLabel);
  const epostInput = document.createElement("input");
  epostInput.type = "email";
  epostInput.id = "tipsa-epost";
  epostInput.placeholder = "van@exempel.se";
  form.appendChild(epostInput);

  const medLabel = document.createElement("label");
  medLabel.textContent = "Egen hälsning (valfritt)";
  form.appendChild(medLabel);
  const medInput = document.createElement("textarea");
  medInput.id = "tipsa-meddelande";
  medInput.rows = 2;
  medInput.maxLength = 500;
  medInput.className = "lag-textarea";
  form.appendChild(medInput);

  const knapp = document.createElement("button");
  knapp.className = "knapp-primar";
  knapp.textContent = "Skicka tips";
  knapp.onclick = () => skickaTips(knapp, on401);
  form.appendChild(knapp);
  return form;
}

async function skickaTips(knapp, on401) {
  const epost = document.getElementById("tipsa-epost").value.trim();
  const meddelande = document.getElementById("tipsa-meddelande").value.trim();
  if (!epost) {
    visaToast("Ange en e-postadress.");
    return;
  }
  knapp.disabled = true;
  try {
    const res = await anropaMedToken("/tipsa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epost, meddelande }),
    }, on401);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast(`Tips skickat till ${epost}.`);
    document.getElementById("tipsa-epost").value = "";
    document.getElementById("tipsa-meddelande").value = "";
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte skicka tipset.");
  } finally {
    knapp.disabled = false;
  }
}

function byggPresentation() {
  const kort = document.createElement("div");
  kort.className = "avsluta-form omappen-text";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = `Poängräknarapp (v${VERSION})`;
  kort.appendChild(rubrik);

  [
    "Appen är gjord av Peter Möller, tränare i Korsnäs IF i Falun. Den byggdes först utifrån "
      + "mina egna behov på träningarna, och har sedan vuxit med önskemål och idéer från tränarvänner.",
    "Jag gör det här helt ideellt på min fritid. Även om Korsnäs IF:s logga kan dyka upp som "
      + "ikon när du lägger appen på hemskärmen är det inte Korsnäs IF som står bakom appen.",
    "Hittar du en bugg, saknar något eller har en idé? Skriv gärna nedan – jag läser allt.",
  ].forEach(text => {
    const p = document.createElement("p");
    p.textContent = text;
    kort.appendChild(p);
  });
  return kort;
}

function byggAterkoppling(on401) {
  const form = document.createElement("div");
  form.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Skicka återkoppling";
  form.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Skickas till utvecklaren tillsammans med e-postadressen du är inloggad med, "
    + "så att jag kan svara dig.";
  form.appendChild(info);

  const typLabel = document.createElement("label");
  typLabel.textContent = "Vad gäller det?";
  form.appendChild(typLabel);
  const typVal = document.createElement("select");
  typVal.id = "aterkoppling-typ";
  typVal.className = "omappen-typ";
  typVal.innerHTML = `
    <option value="onskemal">Önskemål / ny funktion</option>
    <option value="bugg">Bugg – något fungerar inte</option>
    <option value="ovrigt">Övrigt</option>
  `;
  form.appendChild(typVal);

  const medLabel = document.createElement("label");
  medLabel.textContent = "Meddelande";
  form.appendChild(medLabel);
  const medInput = document.createElement("textarea");
  medInput.id = "aterkoppling-meddelande";
  medInput.rows = 5;
  medInput.maxLength = 3000;
  medInput.className = "lag-textarea";
  medInput.placeholder = "Beskriv gärna så konkret som möjligt – vid en bugg: vad gjorde du, och vad hände?";
  form.appendChild(medInput);

  const knapp = document.createElement("button");
  knapp.className = "knapp-primar";
  knapp.textContent = "Skicka";
  knapp.onclick = () => skickaAterkoppling(knapp, on401);
  form.appendChild(knapp);
  return form;
}

async function skickaAterkoppling(knapp, on401) {
  const typ = document.getElementById("aterkoppling-typ").value;
  const falt = document.getElementById("aterkoppling-meddelande");
  const meddelande = falt.value.trim();
  if (!meddelande) {
    visaToast("Skriv ett meddelande först.");
    return;
  }
  knapp.disabled = true;
  try {
    const res = await anropaMedToken("/aterkoppling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typ, meddelande, version: VERSION, enhet: navigator.userAgent }),
    }, on401);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast("Tack! Meddelandet är skickat.");
    falt.value = "";
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte skicka meddelandet.");
  } finally {
    knapp.disabled = false;
  }
}
