// Närvaro-skärmen (huvudfliken "Närvaro"). Den DELADE listan - samma för
// alla tränare i laget, sparas i databasen via /narvaro.
//
// Kompakt pill-layout: tryck på en spelare för att växla närvarande/
// frånvarande. "Markera alla" / "Avmarkera alla" gäller hela laget. Knappen
// "Dela in i grupper" leder till den skärmen (grupper.js), som har sin
// EGEN, lokala/personliga närvaromarkering - de två är medvetet separata:
//   - HÄR: "är Elin med på träningen idag" - delat, en sanning för laget.
//   - I grupper.js: "vill JAG jobba med Elin i min gruppindelning just nu"
//     - personligt, kan skilja sig åt mellan tränare, sparas aldrig.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";
import { nav } from "./nav.js";

export async function initNarvaro(on401) {
  const container = document.getElementById("narvaro-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/spelare", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta spelare.");
    return;
  }
  const spelare = await res.json();
  rendera(spelare, on401);
}

function rendera(spelare, on401) {
  const container = document.getElementById("narvaro-container");
  container.innerHTML = "";

  const info = document.createElement("p");
  info.className = "grupper-info";
  info.innerHTML = `Tryck på en spelare för att växla mellan närvarande och frånvarande.<br>
    <span class="grupper-info-liten">Delad lista för hela laget - alla tränare ser och uppdaterar samma närvaro.</span>`;
  container.appendChild(info);

  const narvarande = spelare.filter(s => !s.franvarande);
  const raknare = document.createElement("p");
  raknare.className = "grupper-raknare";
  raknare.textContent = `${narvarande.length} av ${spelare.length} spelare markerade som närvarande.`;
  container.appendChild(raknare);

  const pillRad = document.createElement("div");
  pillRad.className = "spelar-pillar";
  spelare.forEach(s => {
    const pill = document.createElement("button");
    pill.className = "spelar-pill" + (s.franvarande ? "" : " vald");
    pill.textContent = s.namn;
    pill.onclick = () => toggleNarvaro(s.id, !s.franvarande, on401);
    pillRad.appendChild(pill);
  });
  container.appendChild(pillRad);

  const markeraRad = document.createElement("div");
  markeraRad.className = "markera-rad";
  const allaKnapp = document.createElement("button");
  allaKnapp.className = "narvaro-knapp";
  allaKnapp.textContent = "Markera alla";
  allaKnapp.onclick = () => sattAllaNarvaro(spelare, false, on401);
  const ingenKnapp = document.createElement("button");
  ingenKnapp.className = "narvaro-knapp";
  ingenKnapp.textContent = "Avmarkera alla";
  ingenKnapp.onclick = () => sattAllaNarvaro(spelare, true, on401);
  markeraRad.appendChild(allaKnapp);
  markeraRad.appendChild(ingenKnapp);
  container.appendChild(markeraRad);

  const grupperKnapp = document.createElement("button");
  grupperKnapp.className = "knapp-slumpa";
  grupperKnapp.textContent = "Dela in i grupper →";
  grupperKnapp.onclick = () => nav.gaTillGrupper("narvaro");
  container.appendChild(grupperKnapp);
}

async function toggleNarvaro(spelar_id, franvarande, on401) {
  try {
    const res = await anropaMedToken("/narvaro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spelar_id, franvarande }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initNarvaro(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte spara närvaron, försök igen.");
  }
}

// Ingen bulk-endpoint finns - skicka en /narvaro per spelare som faktiskt
// behöver ändras, parallellt, och rendera om en gång när allt är klart.
async function sattAllaNarvaro(spelare, franvarande, on401) {
  const attAndra = spelare.filter(s => !!s.franvarande !== franvarande);
  if (attAndra.length === 0) return;
  try {
    await Promise.all(attAndra.map(s =>
      anropaMedToken("/narvaro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spelar_id: s.id, franvarande }),
      }, on401).then(r => { if (!r.ok) throw new Error("Servern svarade med fel"); })
    ));
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte uppdatera alla, försök igen.");
  }
  await initNarvaro(on401);
}
