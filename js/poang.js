// Poäng-skärmen (Fas 1 av migreringen). All logik som är SPECIFIK för
// just denna skärm ligger här - inloggning och delade UI-hjälpfunktioner
// importeras istället för att dupliceras.

import { anropaMedToken } from "./auth.js";
import { visaToast, visaTid, textFargForBg } from "./ui.js";

// on401: körs om token visar sig vara ogiltig/utgången mitt i - main.js
// bestämmer vad som ska hända (typiskt: byta till login-vyn).
export async function initPoang(on401) {
  const t0 = performance.now();
  let res;
  try {
    res = await anropaMedToken("/mig", {}, on401);
  } catch (fel) {
    return; // 401 redan hanterat via on401
  }
  visaTid(performance.now() - t0);
  if (!res.ok) {
    visaToast("Kunde inte hämta laginfo.");
    return;
  }
  const data = await res.json();
  const rubrik = document.getElementById("lagnamn-rubrik");
  if (rubrik) rubrik.textContent = data.lagnamn;
  await laddaPoang(on401);
}

async function laddaPoang(on401) {
  const container = document.getElementById("lag-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';
  const t0 = performance.now();
  let res;
  try {
    res = await anropaMedToken("/poang", {}, on401);
  } catch (fel) {
    return;
  }
  visaTid(performance.now() - t0);
  if (!res.ok) {
    visaToast("Kunde inte hämta poäng.");
    return;
  }
  const data = await res.json();
  rendraLag(data, on401);
}

function rendraLag(grupper, on401) {
  const container = document.getElementById("lag-container");
  container.innerHTML = "";
  grupper.forEach(g => {
    const txt = textFargForBg(g.grupp_farg);
    const kort = document.createElement("div");
    kort.className = "lag-kort";
    kort.style.background = g.grupp_farg;
    kort.style.color = txt;

    const namn = document.createElement("div");
    namn.className = "lag-namn";
    namn.textContent = g.grupp_namn;

    const poangEl = document.createElement("div");
    poangEl.className = "lag-poang";
    poangEl.id = "poang_" + g.grupp_namn;
    poangEl.textContent = g.poang;
    poangEl.setAttribute("data-poang", g.poang);

    const knappRad = document.createElement("div");
    knappRad.className = "knapp-rad";
    [1, 3, -1].forEach(varde => {
      const knapp = document.createElement("button");
      knapp.className = "poang-knapp";
      knapp.style.background = txt;
      knapp.style.color = g.grupp_farg;
      knapp.textContent = varde > 0 ? ("+" + varde) : varde;
      knapp.onclick = () => poangKlick(g.grupp_namn, varde, on401);
      knappRad.appendChild(knapp);
    });

    kort.appendChild(namn);
    kort.appendChild(poangEl);
    kort.appendChild(knappRad);
    container.appendChild(kort);
  });
}

async function poangKlick(gruppNamn, varde, on401) {
  const el = document.getElementById("poang_" + gruppNamn);
  const nuvarande = parseInt(el.getAttribute("data-poang"), 10) || 0;
  const nytt = Math.max(0, nuvarande + varde);
  el.textContent = nytt;
  el.setAttribute("data-poang", nytt);

  const t0 = performance.now();
  try {
    const res = await anropaMedToken("/poang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grupp_namn: gruppNamn, poang: nytt }),
    }, on401);
    visaTid(performance.now() - t0);
    if (!res.ok) throw new Error("Servern svarade med fel");
  } catch (fel) {
    el.textContent = nuvarande;
    el.setAttribute("data-poang", nuvarande);
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte spara poängen, försök igen.");
    }
  }
}
