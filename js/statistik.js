// Statistik-skärmen. Tre tidsperioder (senaste veckan/månaden, eller välj
// specifika matcher själv) och två vyer (poäng per spelare, poäng per
// grupp) - matchar Shiny-appens "Statistik"-skärm.
//
// Ingen "Visa statistik"-knapp: listan hämtas direkt när skärmen öppnas och
// uppdateras automatiskt när man byter val. Snabba klick (t.ex. bocka i
// flera matcher) buntas ihop med en kort fördröjning så det inte blir en
// störtflod av anrop.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

let vald_period = "vecka";
let vald_visa = "spelare";
let valda_omgangar = new Set();
let hamta_timer = null;

export async function initStatistik(on401) {
  if (hamta_timer) { clearTimeout(hamta_timer); hamta_timer = null; }

  const container = document.getElementById("statistik-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let historikRes;
  try {
    historikRes = await anropaMedToken("/historik", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!historikRes.ok) {
    visaToast("Kunde inte hämta historik.");
    return;
  }
  const historik = await historikRes.json();
  rendera(historik, null, on401);
  hamtaStatistik(historik, on401); // visa direkt, utan fördröjning
}

// Buntar ihop snabba ändringar till ETT anrop.
function begarStatistik(historik, on401) {
  if (hamta_timer) clearTimeout(hamta_timer);
  hamta_timer = setTimeout(() => hamtaStatistik(historik, on401), 250);
}

function rendera(historik, resultat, on401) {
  const container = document.getElementById("statistik-container");
  container.innerHTML = "";

  // ---- Tidsperiod ----
  const periodForm = document.createElement("div");
  periodForm.className = "avsluta-form";
  const periodRubrik = document.createElement("p");
  periodRubrik.style.cssText = "font-weight:700;margin:0 0 6px 0;";
  periodRubrik.textContent = "Tidsperiod";
  periodForm.appendChild(periodRubrik);

  [
    { varde: "vecka", etikett: "Senaste veckan" },
    { varde: "manad", etikett: "Senaste månaden" },
    { varde: "valj", etikett: "Välj Poängmatcher själv" },
  ].forEach(p => {
    const radRad = document.createElement("label");
    radRad.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "statistik-period";
    radio.value = p.varde;
    radio.checked = vald_period === p.varde;
    radio.onchange = () => {
      vald_period = p.varde;
      rendera(historik, resultat, on401); // visa/dölj matchlistan
      begarStatistik(historik, on401);
    };
    radRad.appendChild(radio);
    radRad.appendChild(document.createTextNode(" " + p.etikett));
    periodForm.appendChild(radRad);
  });

  if (vald_period === "valj") {
    if (historik.length === 0) {
      const tom = document.createElement("p");
      tom.className = "grupper-info-liten";
      tom.textContent = "Inga sparade matcher att välja bland än.";
      periodForm.appendChild(tom);
    } else {
      historik.forEach(o => {
        const radRad = document.createElement("label");
        radRad.className = "radio-rad";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = valda_omgangar.has(o.id);
        cb.onchange = () => {
          if (cb.checked) valda_omgangar.add(o.id); else valda_omgangar.delete(o.id);
          begarStatistik(historik, on401);
        };
        radRad.appendChild(cb);
        radRad.appendChild(document.createTextNode(` ${o.namn} (${o.datum})`));
        periodForm.appendChild(radRad);
      });
    }
  }

  const visaRubrik = document.createElement("p");
  visaRubrik.style.cssText = "font-weight:700;margin:12px 0 6px 0;";
  visaRubrik.textContent = "Visa";
  periodForm.appendChild(visaRubrik);
  [
    { varde: "spelare", etikett: "Poäng per spelare" },
    { varde: "lag", etikett: "Poäng per lag" },
  ].forEach(v => {
    const radRad = document.createElement("label");
    radRad.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "statistik-visa";
    radio.value = v.varde;
    radio.checked = vald_visa === v.varde;
    radio.onchange = () => { vald_visa = v.varde; begarStatistik(historik, on401); };
    radRad.appendChild(radio);
    radRad.appendChild(document.createTextNode(" " + v.etikett));
    periodForm.appendChild(radRad);
  });

  container.appendChild(periodForm);

  if (resultat) {
    container.appendChild(byggResultatlista(resultat));
  } else if (vald_period === "valj" && valda_omgangar.size === 0 && historik.length > 0) {
    const hint = document.createElement("p");
    hint.className = "grupper-info-liten";
    hint.style.margin = "12px 0 0 0";
    hint.textContent = "Bocka i minst en match ovan för att se statistik.";
    container.appendChild(hint);
  }
}

function byggResultatlista(rader) {
  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  if (rader.length === 0) {
    const tom = document.createElement("p");
    tom.style.color = "#888";
    tom.textContent = "Ingen data för den valda perioden.";
    lista.appendChild(tom);
    return lista;
  }
  rader.forEach((r, i) => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";
    const namn = document.createElement("div");
    namn.className = "spelar-info";
    namn.textContent = `${i + 1}. ${r.namn}`;
    rad.appendChild(namn);
    const poang = document.createElement("div");
    poang.style.fontWeight = "700";
    poang.textContent = r.poang;
    rad.appendChild(poang);
    lista.appendChild(rad);
  });
  return lista;
}

async function hamtaStatistik(historik, on401) {
  if (vald_period === "valj" && valda_omgangar.size === 0) {
    rendera(historik, null, on401); // inget valt än - visa platshållartext
    return;
  }
  const params = new URLSearchParams({ period: vald_period, visa: vald_visa });
  if (vald_period === "valj") {
    params.set("omgangar", [...valda_omgangar].join(","));
  }
  try {
    const res = await anropaMedToken(`/statistik?${params.toString()}`, {}, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    rendera(historik, data.rader, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte hämta statistik.");
  }
}
