// Header-lagvalet: gör "lagnamn-rubriken" till en listruta (synlig på ALLA
                                                             // sidor, i app-headern) istället för bara en rubriktext - så man kan byta
// lag utan att gå in i Inställningar → Hantera lag först. Samma bytLag-
  // mekanik som fanns där (ny token, sidladdning) återanvänds.
//
  // Den här modulen är den ENDA som sätter innehållet i #lagnamn-rubrik från
// och med nu - andra skärmar (poang.js, lag.js) ska INTE längre skriva dit
// direkt, annars tävlar de om samma element.

import { anropaMedToken, sparaToken } from "./auth.js";
import { visaToast } from "./ui.js";

export async function initHeaderLagval(on401) {
  const rubrikPlats = document.getElementById("lagnamn-rubrik");
  if (!rubrikPlats) return;
  
  let minaLagRes, migRes;
  try {
    [minaLagRes, migRes] = await Promise.all([
      anropaMedToken("/lag/mina", {}, on401),
      anropaMedToken("/mig", {}, on401),
    ]);
  } catch (fel) {
    return; // headern får bara stå tom/oförändrad om detta misslyckas - inte kritiskt nog för en toast
  }
  if (!minaLagRes.ok || !migRes.ok) return;
  const minaLag = await minaLagRes.json();
  const mig = await migRes.json();
  if (!Array.isArray(minaLag) || minaLag.length === 0) return;
  
  byggValjare(minaLag, mig.lagkod, on401);
}

function byggValjare(minaLag, aktuell_lagkod, on401) {
  const gammalPlats = document.getElementById("lagnamn-rubrik");
  const select = document.createElement("select");
  select.id = "lagnamn-rubrik"; // behåll samma id - andra delar av CSS/koden pekar på det
  select.className = "lagnamn-valjare";
  
  minaLag.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l.lagkod;
    opt.textContent = l.lagnamn;
    if (l.lagkod === aktuell_lagkod) opt.selected = true;
    select.appendChild(opt);
  });
  
  select.onchange = () => bytLagFranHeader(select.value, on401);
  gammalPlats.replaceWith(select);
}

async function bytLagFranHeader(lagkod, on401) {
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