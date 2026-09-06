// Avsluta match-skärmen (Fas 4). Sparar en ögonblicksbild av grupper+poäng
// till historiken, kopplar (valfritt) ihop det med spelare via den lokala
// gruppindelningen från grupper.js, och nollställer poängen inför nästa
// match.

import { anropaMedToken } from "./auth.js";
import { visaToast, textFargForBg, formateraDatumTid } from "./ui.js";
import { hamtaGruppindelningForSparning } from "./grupper.js";

export async function initAvsluta(on401) {
  const container = document.getElementById("avsluta-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let poangRes, historikRes;
  try {
    [poangRes, historikRes] = await Promise.all([
      anropaMedToken("/poang", {}, on401),
      anropaMedToken("/historik", {}, on401),
    ]);
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
  if (!poangRes.ok || !historikRes.ok) {
    visaToast("Kunde inte hämta match- eller historikdata.");
    return;
  }

  const grupper = await poangRes.json();
  const historik = await historikRes.json();
  rendera(grupper, historik, on401);
}

function rendera(grupper, historik, on401) {
  const container = document.getElementById("avsluta-container");
  container.innerHTML = "";

  // ---- Formulär: namn + sammanfattning + spara-knapp ----
  const form = document.createElement("div");
  form.className = "avsluta-form";

  const label = document.createElement("label");
  label.textContent = "Namn på matchen";
  label.htmlFor = "omgang-namn-input";
  form.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.id = "omgang-namn-input";
  input.placeholder = "T.ex. Tisdagsträning U13";
  // Förifyll med datum + tid så man kan spara direkt och döpa om efteråt.
  input.value = formateraDatumTid();
  form.appendChild(input);

  const sammanfattning = document.createElement("div");
  sammanfattning.className = "grupp-sammanfattning";
  grupper.forEach(g => {
    const chip = document.createElement("span");
    chip.className = "grupp-chip";
    chip.style.background = g.grupp_farg;
    chip.style.color = textFargForBg(g.grupp_farg);
    chip.textContent = `${g.grupp_namn}: ${g.poang}`;
    sammanfattning.appendChild(chip);
  });
  form.appendChild(sammanfattning);

  const sparaKnapp = document.createElement("button");
  sparaKnapp.className = "knapp-primar";
  sparaKnapp.textContent = "✓ Avsluta match och spara";
  sparaKnapp.disabled = grupper.length === 0;
  sparaKnapp.onclick = () => sparaMatch(on401);
  form.appendChild(sparaKnapp);

  if (grupper.length === 0) {
    const varning = document.createElement("p");
    varning.className = "login-fel";
    varning.textContent = "Inga grupper att avsluta - gå till Poäng-skärmen först.";
    form.appendChild(varning);
  }

  container.appendChild(form);

  // ---- Historik ----
  const historikRubrik = document.createElement("h3");
  historikRubrik.textContent = "Tidigare matcher";
  historikRubrik.className = "historik-rubrik";
  container.appendChild(historikRubrik);

  if (historik.length === 0) {
    const tom = document.createElement("p");
    tom.style.color = "#888";
    tom.textContent = "Inga sparade matcher än.";
    container.appendChild(tom);
    return;
  }

  const historikLista = document.createElement("div");
  historikLista.className = "historik-lista";
  historik.forEach(o => {
    const kort = document.createElement("div");
    kort.className = "historik-kort";

    const rubrik = document.createElement("div");
    rubrik.className = "historik-kort-rubrik";
    rubrik.textContent = `${o.namn} — ${formateraDatumTid(o.datum, o.tid)}`;
    kort.appendChild(rubrik);

    const grupprad = document.createElement("div");
    grupprad.className = "grupp-sammanfattning";
    o.grupper.forEach(g => {
      const chip = document.createElement("span");
      chip.className = "grupp-chip";
      chip.style.background = g.lagfarg;
      chip.style.color = textFargForBg(g.lagfarg);
      chip.textContent = g.spelare.length > 0
        ? `${g.lagnamn}: ${g.poang} (${g.spelare.join(", ")})`
        : `${g.lagnamn}: ${g.poang}`;
      grupprad.appendChild(chip);
    });
    kort.appendChild(grupprad);

    historikLista.appendChild(kort);
  });
  container.appendChild(historikLista);
}

async function sparaMatch(on401) {
  const input = document.getElementById("omgang-namn-input");
  const omgang_namn = input.value.trim();
  if (!omgang_namn) {
    visaToast("Ange ett namn på matchen.");
    return;
  }
  try {
    const res = await anropaMedToken("/avsluta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        omgang_namn,
        spelare_per_grupp: hamtaGruppindelningForSparning(),
      }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast("Matchen sparad!");
    await initAvsluta(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara matchen.");
  }
}
