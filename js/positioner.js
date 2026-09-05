// Hantera positioner-skärmen. Utökad med "Byt sport" (färdiga
// standarduppsättningar) och redigering, i Shiny-appens stil.
//
// Viktig princip: en position räknas som "standard" om den finns med i
// NÅGON av idrotternas färdiga listor (STANDARDPOSITIONER nedan). Bara
// STANDARD-positioner byts ut när man byter sport - egna, fritt tillagda
// positioner (t.ex. "Foto-ansvarig" eller vad som helst) rörs ALDRIG av
// ett sportbyte, oavsett vilken sport man väljer.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";
import { SPORT_SVG, IKON_ATTRIBUTION_HTML } from "./sport-ikoner.js";

const STANDARDPOSITIONER = {
  Fotboll: ["Målvakt", "Försvarare", "Mittfältare (centralt)", "Mittfältare (ytter)", "Anfallare", "Ytter"],
  Handboll: ["Målvakt", "Vänsterkant", "Vänster nia", "Mitt nia", "Höger nia", "Högerkant", "Linjespelare"],
  Innebandy: ["Målvakt", "Back", "Center", "Forward"],
  Basket: ["Guard", "Forward", "Center"],
  Ishockey: ["Målvakt", "Back", "Center", "Forward"],
  Futsal: ["Målvakt", "Försvarare", "Mittfältare", "Anfallare"],
  Bandy: ["Målvakt", "Back", "Halva", "Center", "Forward"],
  Volleyboll: ["Passare", "Diagonal", "Kant", "Mittblockerare", "Libero"],
};
// Emoji-mappen SPORT_IKON ar ersatt av egna SVG-piktogram - se sport-ikoner.js.
const ALLA_STANDARDNAMN = new Set(Object.values(STANDARDPOSITIONER).flat());

let redigerar_id = null;

export async function initPositioner(on401) {
  const container = document.getElementById("positioner-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/positioner", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta positioner.");
    return;
  }
  const positioner = await res.json();
  rendera(positioner, on401);
}

function rendera(positioner, on401) {
  const container = document.getElementById("positioner-container");
  container.innerHTML = "";

  container.appendChild(byggBytSport(positioner, on401));

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Positioner för det här laget";
  container.appendChild(rubrik);

  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  positioner.forEach(p => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";

    if (redigerar_id === p.id) {
      const redigering = document.createElement("div");
      redigering.className = "spelare-redigera";
      const namnInput = document.createElement("input");
      namnInput.type = "text";
      namnInput.value = p.namn;
      const knappar = document.createElement("div");
      knappar.className = "spelare-redigera-knappar";
      const sparaKnapp = document.createElement("button");
      sparaKnapp.className = "spara-knapp";
      sparaKnapp.textContent = "Spara";
      sparaKnapp.onclick = () => sparaRedigering(p.id, namnInput.value, on401);
      const avbrytKnapp = document.createElement("button");
      avbrytKnapp.className = "avbryt-knapp";
      avbrytKnapp.textContent = "Avbryt";
      avbrytKnapp.onclick = () => { redigerar_id = null; initPositioner(on401); };
      knappar.appendChild(sparaKnapp);
      knappar.appendChild(avbrytKnapp);
      redigering.appendChild(namnInput);
      redigering.appendChild(knappar);
      rad.appendChild(redigering);
    } else {
      const info = document.createElement("div");
      info.className = "spelar-info";
      info.textContent = p.namn;
      rad.appendChild(info);

      const redigeraKnapp = document.createElement("button");
      redigeraKnapp.className = "farg-ikonknapp";
      redigeraKnapp.textContent = "✏️";
      redigeraKnapp.onclick = () => { redigerar_id = p.id; rendera(positioner, on401); };
      rad.appendChild(redigeraKnapp);

      const taBortKnapp = document.createElement("button");
      taBortKnapp.className = "farg-ikonknapp farg-ikonknapp-ta-bort";
      taBortKnapp.textContent = "✕";
      taBortKnapp.onclick = () => taBortPosition(p.id, on401);
      rad.appendChild(taBortKnapp);
    }

    lista.appendChild(rad);
  });
  container.appendChild(lista);

  const laggTillRubrik = document.createElement("h3");
  laggTillRubrik.className = "historik-rubrik";
  laggTillRubrik.textContent = "Lägg till en egen position";
  container.appendChild(laggTillRubrik);

  const laggTill = document.createElement("div");
  laggTill.className = "spelare-lagg-till";
  laggTill.innerHTML = `
    <input type="text" id="ny-position-namn" placeholder="Ny position...">
    <button id="lagg-till-position-knapp">Lägg till</button>
  `;
  container.appendChild(laggTill);
  document.getElementById("lagg-till-position-knapp").onclick = () => laggTillPosition(on401);
}

function byggBytSport(positioner, on401) {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Byt sport";
  wrapper.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Byter till en annan idrotts standarduppsättning - tar bort positioner som inte hör dit (du får en varning om spelare berörs) och lägger till de som saknas. Egna tillagda positioner kan alltid läggas till/redigeras oavsett.";
  wrapper.appendChild(info);

  const sportRad = document.createElement("div");
  sportRad.className = "sport-pillar";

  // Fotboll och Futsal delar samma bild (ingen egen futsal-ikon i samma
  // stil hittades) - men visas nu som VANLIGA, likadana knappar. De sätter
  // fortfarande OLIKA positioner (Futsal har en enklare uppsättning) -
  // bara bilden är delad, inte funktionen.
  Object.keys(STANDARDPOSITIONER).forEach(sport => {
    const knapp = document.createElement("button");
    knapp.className = "spelar-pill sport-pill-med-ikon";
    knapp.innerHTML = `${SPORT_SVG[sport] || ""}<span>${sport}</span>`;
    knapp.onclick = () => bytSport(sport, positioner, on401);
    sportRad.appendChild(knapp);
  });
  wrapper.appendChild(sportRad);

  const attribution = document.createElement("p");
  attribution.className = "ikon-attribution";
  attribution.innerHTML = IKON_ATTRIBUTION_HTML;
  wrapper.appendChild(attribution);

  return wrapper;
}

async function bytSport(sport, positioner, on401) {
  const nya_namn = STANDARDPOSITIONER[sport];
  const nuvarande_namn = positioner.map(p => p.namn);

  const ta_bort = positioner.filter(p => ALLA_STANDARDNAMN.has(p.namn) && !nya_namn.includes(p.namn));
  const lagg_till = nya_namn.filter(n => !nuvarande_namn.includes(n));

  if (ta_bort.length === 0 && lagg_till.length === 0) {
    visaToast(`Positionerna stämmer redan överens med ${sport}.`);
    return;
  }

  // Kolla vilka spelare som berörs (har någon av ta_bort-positionerna) -
  // för att kunna varna INNAN något ändras, precis som i Shiny-appen.
  let beromda_spelare = [];
  if (ta_bort.length > 0) {
    try {
      const res = await anropaMedToken("/spelare/alla", {}, on401);
      if (res.ok) {
        const alla_spelare = await res.json();
        const ta_bort_namn = new Set(ta_bort.map(p => p.namn));
        beromda_spelare = alla_spelare.filter(s =>
          (s.positioner || "").split(",").map(x => x.trim()).some(pos => ta_bort_namn.has(pos))
        );
      }
    } catch (fel) {
      // Om det skulle strula - fortsätt ändå, bara utan spelarvarningen.
    }
  }

  visaBekraftelsedialog(sport, ta_bort, lagg_till, beromda_spelare, on401);
}

function visaBekraftelsedialog(sport, ta_bort, lagg_till, beromda_spelare, on401) {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";

  const dialog = document.createElement("div");
  dialog.className = "dialog-ruta";

  const rubrik = document.createElement("h3");
  rubrik.textContent = `Byt till ${sport}`;
  dialog.appendChild(rubrik);

  if (ta_bort.length > 0) {
    const p1 = document.createElement("p");
    p1.textContent = `Byte till ${sport} tar bort: ${ta_bort.map(p => p.namn).join(", ")}.`;
    dialog.appendChild(p1);
  }
  if (beromda_spelare.length > 0) {
    const p2 = document.createElement("p");
    p2.textContent = `${beromda_spelare.length} spelare har någon av dessa positioner: ${beromda_spelare.map(s => s.namn).join(", ")}.`;
    dialog.appendChild(p2);
  }
  if (lagg_till.length > 0) {
    const p3 = document.createElement("p");
    p3.textContent = `Lägger också till: ${lagg_till.join(", ")}.`;
    dialog.appendChild(p3);
  }
  if (beromda_spelare.length > 0) {
    const p4 = document.createElement("p");
    p4.textContent = "Vill du behålla positionerna hos dem, eller ta bort helt?";
    dialog.appendChild(p4);
  }

  // ---- Knappar: de TVÅ VANLIGA valen är lika stora och tydligast -
  // "Byt och ta bort" (den mer oåterkalleliga varianten som även rör
  // spelarnas egna data) är MEDVETET mindre och avskild, så man inte
  // råkar trycka på den av misstag.
  const knappRad = document.createElement("div");
  knappRad.className = "dialog-knapprad-huvud";
  const avbrytKnapp = document.createElement("button");
  avbrytKnapp.className = "dialog-knapp-sekundar";
  avbrytKnapp.textContent = "Avbryt";
  avbrytKnapp.onclick = () => overlay.remove();
  const behallKnapp = document.createElement("button");
  behallKnapp.className = "dialog-knapp-primar";
  behallKnapp.textContent = "Byt (behåll hos spelare)";
  behallKnapp.onclick = () => { overlay.remove(); genomforBytSport(ta_bort, lagg_till, [], on401); };
  knappRad.appendChild(avbrytKnapp);
  knappRad.appendChild(behallKnapp);
  dialog.appendChild(knappRad);

  if (beromda_spelare.length > 0) {
    const taBortKnapp = document.createElement("button");
    taBortKnapp.className = "dialog-knapp-farlig";
    taBortKnapp.textContent = `Byt och ta bort (från ${beromda_spelare.length} spelare)`;
    taBortKnapp.onclick = () => { overlay.remove(); genomforBytSport(ta_bort, lagg_till, beromda_spelare, on401); };
    dialog.appendChild(taBortKnapp);
  }

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

async function genomforBytSport(ta_bort, lagg_till, rensa_hos_spelare, on401) {
  try {
    for (const p of ta_bort) {
      await anropaMedToken("/positioner/ta-bort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id }),
      }, on401);
    }
    for (const namn of lagg_till) {
      await anropaMedToken("/positioner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namn }),
      }, on401);
    }
    if (rensa_hos_spelare.length > 0) {
      const ta_bort_namn = new Set(ta_bort.map(p => p.namn));
      for (const s of rensa_hos_spelare) {
        const kvarvarande = (s.positioner || "").split(",").map(x => x.trim()).filter(x => x && !ta_bort_namn.has(x)).join(", ");
        await anropaMedToken("/spelare/andra", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: s.id, namn: s.namn, positioner: kvarvarande, kategori: s.kategori || "" }),
        }, on401);
      }
    }
    visaToast("Positionerna uppdaterade.");
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Något gick fel vid bytet - kolla listan och försök igen om något saknas.");
  }
}

async function laggTillPosition(on401) {
  const falt = document.getElementById("ny-position-namn");
  const namn = falt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  try {
    const res = await anropaMedToken("/positioner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte lägga till.");
  }
}

async function sparaRedigering(id, namn, on401) {
  namn = namn.trim();
  if (!namn) {
    visaToast("Namnet får inte vara tomt.");
    return;
  }
  try {
    const res = await anropaMedToken("/positioner/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, namn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    redigerar_id = null;
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

async function taBortPosition(id, on401) {
  try {
    const res = await anropaMedToken("/positioner/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte ta bort.");
  }
}