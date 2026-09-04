// Hantera lag-skärmen (Fas 6a). Just nu bara lagnamnet - lagkoden är
// identiteten och ändras aldrig här.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

export async function initLag(on401) {
  const container = document.getElementById("lag-installningar-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let migRes;
  try {
    migRes = await anropaMedToken("/mig", {}, on401);
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
  if (!migRes.ok) {
    visaToast("Kunde inte hämta laginfo.");
    return;
  }
  const mig = await migRes.json();
  rendera(mig, on401);
}

function rendera(mig, on401) {
  const container = document.getElementById("lag-installningar-container");
  container.innerHTML = "";
  const jag_ar_admin = mig.roll === "admin";

  const form = document.createElement("div");
  form.className = "avsluta-form";

  const label = document.createElement("label");
  label.textContent = "Lagnamn";
  form.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.id = "lagnamn-input";
  input.value = mig.lagnamn;
  input.disabled = !jag_ar_admin;
  form.appendChild(input);

  if (jag_ar_admin) {
    const knapp = document.createElement("button");
    knapp.className = "knapp-primar";
    knapp.textContent = "Spara";
    knapp.onclick = () => sparaLagnamn(on401);
    form.appendChild(knapp);
  } else {
    const info = document.createElement("p");
    info.style.color = "#888";
    info.style.fontSize = "13px";
    info.textContent = "Bara admins kan ändra lagnamnet.";
    form.appendChild(info);
  }

  container.appendChild(form);
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
    const rubrik = document.getElementById("lagnamn-rubrik");
    if (rubrik) rubrik.textContent = lagnamn;
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}
