// Hantera positioner-skärmen. "Byt sport" (färdiga standarduppsättningar)
// och redigering, i Shiny-appens stil.
//
// Viktig princip: "Byt sport" LÄGGER TILL den valda idrottens standard-
// positioner - det tar aldrig bort något. Vill man rensa bort en position
// gör man det en och en med ✕ i listan; då visas vilka spelare som är
// taggade med den och man väljer om taggen ska bort från dem också.

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
      taBortKnapp.onclick = () => taBortPosition(p.id, p.namn, on401);
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
  info.textContent = "Lägger till den valda idrottens standardpositioner. Inget tas bort – vill du rensa bort en position gör du det med ✕ i listan nedan (du får se vilka spelare som har den).";
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

// "Byt sport" LÄGGER TILL den valda idrottens standarduppsättning - tar
// aldrig bort något. Vill man städa bort en position görs det med ✕ i
// listan (taBortPosition), som visar vilka spelare som berörs och låter en
// välja om taggen ska bort från dem också.
async function bytSport(sport, positioner, on401) {
  const nuvarande = new Set(positioner.map(p => p.namn));
  const lagg_till = STANDARDPOSITIONER[sport].filter(n => !nuvarande.has(n));

  if (lagg_till.length === 0) {
    visaToast(`${sport}s positioner finns redan i listan.`);
    return;
  }

  const { overlay, dialog } = byggDialog(`Lägg till ${sport}s positioner`);
  const p = document.createElement("p");
  p.textContent = `Lägger till: ${lagg_till.join(", ")}. Inget tas bort – vill du städa bort en position gör du det med ✕ i listan nedan.`;
  dialog.appendChild(p);

  const rad = document.createElement("div");
  rad.className = "dialog-knapprad-huvud";
  const avbryt = dlgKnapp("dialog-knapp-sekundar", "Avbryt", () => overlay.remove());
  const ok = dlgKnapp("dialog-knapp-primar", "Lägg till", async () => {
    ok.disabled = avbryt.disabled = true;
    overlay.remove();
    await laggTillFleraPositioner(lagg_till, on401);
  });
  rad.append(avbryt, ok);
  dialog.appendChild(rad);
  document.body.appendChild(overlay);
}

async function laggTillFleraPositioner(namn_lista, on401) {
  try {
    for (const namn of namn_lista) {
      await anropaMedToken("/positioner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namn }),
      }, on401);
    }
    visaToast("Positionerna tillagda.");
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Något gick fel - kolla listan.");
  }
}

// ---- Delade dialog-hjälpare ----
function byggDialog(rubrikText) {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  const dialog = document.createElement("div");
  dialog.className = "dialog-ruta";
  const rubrik = document.createElement("h3");
  rubrik.textContent = rubrikText;
  dialog.appendChild(rubrik);
  overlay.appendChild(dialog);
  return { overlay, dialog };
}

function dlgKnapp(klass, text, onclick) {
  const b = document.createElement("button");
  b.className = klass;
  b.textContent = text;
  b.onclick = onclick;
  return b;
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

// Ta bort en position. Är någon spelare taggad med den visas de först, och
// man får välja: ta bort ur lagets lista men behåll taggen på spelarna,
// eller ta bort helt (även från spelarna). Ingen spelare finns -> enkel
// bekräftelse.
async function taBortPosition(id, namn, on401) {
  let beromda = [];
  try {
    const res = await anropaMedToken("/spelare/alla", {}, on401);
    if (res.ok) {
      const alla = await res.json();
      beromda = alla.filter(s =>
        (s.positioner || "").split(",").map(x => x.trim()).includes(namn)
      );
    }
  } catch (fel) {
    if (fel.message === "Utloggad") return;
    // annars: fortsätt utan spelarlistan
  }

  const { overlay, dialog } = byggDialog(`Ta bort positionen "${namn}"?`);
  const antal = beromda.length;

  if (antal > 0) {
    const p1 = document.createElement("p");
    p1.textContent = `${antal} spelare är taggade med "${namn}": ${beromda.map(s => s.namn).join(", ")}.`;
    dialog.appendChild(p1);
    const p2 = document.createElement("p");
    p2.textContent = `"Behåll på spelarna" tar bort positionen ur lagets lista men låter taggen sitta kvar på spelarna. "Ta bort helt" rensar den även från de ${antal} spelarna.`;
    dialog.appendChild(p2);
  }

  const rad = document.createElement("div");
  rad.className = "dialog-knapprad-huvud";
  const avbryt = dlgKnapp("dialog-knapp-sekundar", "Avbryt", () => overlay.remove());
  const behall = dlgKnapp("dialog-knapp-primar", antal > 0 ? "Behåll på spelarna" : "Ta bort", async () => {
    behall.disabled = avbryt.disabled = true;
    overlay.remove();
    await utforTaBortPosition(id, namn, [], on401);
  });
  rad.append(avbryt, behall);
  dialog.appendChild(rad);

  if (antal > 0) {
    const helt = dlgKnapp("dialog-knapp-farlig", `Ta bort helt (från ${antal} spelare)`, async () => {
      helt.disabled = true;
      overlay.remove();
      await utforTaBortPosition(id, namn, beromda, on401);
    });
    dialog.appendChild(helt);
  }
  document.body.appendChild(overlay);
}

async function utforTaBortPosition(id, namn, rensa_hos_spelare, on401) {
  try {
    const res = await anropaMedToken("/positioner/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    for (const s of rensa_hos_spelare) {
      const kvar = (s.positioner || "").split(",").map(x => x.trim()).filter(x => x && x !== namn).join(", ");
      await anropaMedToken("/spelare/andra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, namn: s.namn, positioner: kvar, kategori: s.kategori || "" }),
      }, on401);
    }
    visaToast("Positionen borttagen.");
    await initPositioner(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte ta bort positionen.");
  }
}