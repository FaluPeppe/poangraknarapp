// Hantera poängmatcher-skärmen (Inställningar-hubben). Listar ALLA sparade
// matcher för laget och låter en tränare ändra namn/datum/tid, poängen per
// grupp, och vilka spelare som räknas till varje grupp - eller ta bort en
// match helt. Speglar Shiny-appens "Hantera Poängmatcher".
//
// Skiljer sig från "Tidigare matcher" på Avsluta-skärmen (avsluta.js), som
// bara VISAR historiken, och från Statistik (statistik.js) som räknar över
// den. All redigering av redan sparade matcher bor HÄR.
//
// Serverdelen: GET /omgangar, GET /omgang?id=, POST /omgang/andra,
// POST /omgang/ta-bort (se worker.js).

import { anropaMedToken } from "./auth.js";
import { visaToast, textFargForBg, formateraDatumTid } from "./ui.js";

export async function initPoangmatcher(on401) {
  const container = document.getElementById("poangmatcher-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/omgangar", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta sparade poängmatcher.");
    return;
  }
  const omgangar = await res.json();
  rendera(omgangar, on401);
}

function rendera(omgangar, on401) {
  const container = document.getElementById("poangmatcher-container");
  container.innerHTML = "";

  if (omgangar.length === 0) {
    const tom = document.createElement("p");
    tom.style.color = "#888";
    tom.textContent = "Inga sparade poängmatcher än.";
    container.appendChild(tom);
    return;
  }

  const lista = document.createElement("div");
  lista.className = "historik-lista";
  omgangar.forEach(o => {
    const kort = document.createElement("div");
    kort.className = "poangmatch-rad";

    const info = document.createElement("div");
    info.className = "poangmatch-info";
    info.onclick = () => oppnaRedigering(o.id, on401);
    const namn = document.createElement("div");
    namn.className = "historik-kort-rubrik";
    namn.style.marginBottom = "2px";
    namn.textContent = o.namn;
    const meta = document.createElement("div");
    meta.style.cssText = "font-size:12px;color:#888;";
    meta.textContent = formateraDatumTid(o.datum, o.tid);
    info.appendChild(namn);
    info.appendChild(meta);
    kort.appendChild(info);

    const knappar = document.createElement("div");
    knappar.className = "poangmatch-knappar";
    const andraKnapp = document.createElement("button");
    andraKnapp.className = "chip-ikonknapp";
    andraKnapp.textContent = "✏️";
    andraKnapp.title = "Ändra";
    andraKnapp.onclick = () => oppnaRedigering(o.id, on401);
    const taBortKnapp = document.createElement("button");
    taBortKnapp.className = "chip-ikonknapp";
    taBortKnapp.textContent = "✕";
    taBortKnapp.title = "Ta bort";
    taBortKnapp.onclick = () => bekraftaTaBort(o, on401);
    knappar.appendChild(andraKnapp);
    knappar.appendChild(taBortKnapp);
    kort.appendChild(knappar);

    lista.appendChild(kort);
  });
  container.appendChild(lista);
}

// ---- Redigeringsdialog ----
async function oppnaRedigering(omgang_id, on401) {
  let detaljRes, roosterRes;
  try {
    [detaljRes, roosterRes] = await Promise.all([
      anropaMedToken(`/omgang?id=${encodeURIComponent(omgang_id)}`, {}, on401),
      anropaMedToken("/spelare/alla", {}, on401),
    ]);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte hämta poängmatchen.");
    return;
  }
  if (!detaljRes.ok || !roosterRes.ok) {
    visaToast("Kunde inte hämta poängmatchen.");
    return;
  }
  const omgang = await detaljRes.json();
  const roster = await roosterRes.json();
  visaRedigeringsdialog(omgang, roster, on401);
}

function visaRedigeringsdialog(omgang, roster, on401) {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  const dialog = document.createElement("div");
  dialog.className = "dialog-ruta";

  const rubrik = document.createElement("h3");
  rubrik.textContent = "Ändra poängmatch";
  dialog.appendChild(rubrik);

  const namnLabel = document.createElement("label");
  namnLabel.className = "poangmatch-falt-etikett";
  namnLabel.textContent = "Namn";
  dialog.appendChild(namnLabel);
  const namnInput = document.createElement("input");
  namnInput.type = "text";
  namnInput.className = "poangmatch-falt";
  namnInput.value = omgang.namn;
  dialog.appendChild(namnInput);

  const datumtidRad = document.createElement("div");
  datumtidRad.className = "poangmatch-datumtid";
  const datumWrap = document.createElement("div");
  const datumLabel = document.createElement("label");
  datumLabel.className = "poangmatch-falt-etikett";
  datumLabel.textContent = "Datum";
  const datumInput = document.createElement("input");
  datumInput.type = "date";
  datumInput.className = "poangmatch-falt";
  datumInput.value = omgang.datum;
  datumWrap.appendChild(datumLabel);
  datumWrap.appendChild(datumInput);
  const tidWrap = document.createElement("div");
  const tidLabel = document.createElement("label");
  tidLabel.className = "poangmatch-falt-etikett";
  tidLabel.textContent = "Tid";
  const tidInput = document.createElement("input");
  tidInput.type = "time";
  tidInput.className = "poangmatch-falt";
  tidInput.value = omgang.tid;
  tidWrap.appendChild(tidLabel);
  tidWrap.appendChild(tidInput);
  datumtidRad.appendChild(datumWrap);
  datumtidRad.appendChild(tidWrap);
  dialog.appendChild(datumtidRad);

  const poangRubrik = document.createElement("p");
  poangRubrik.className = "poangmatch-falt-etikett";
  poangRubrik.style.marginTop = "12px";
  poangRubrik.textContent = "Poäng och spelare per lag";
  dialog.appendChild(poangRubrik);

  // Per grupp: färgad etikett + poängfält, sedan en kryssruta per spelare.
  // grupp_element[i] = { lagnamn, poangInput, kryssrutor: [<input>] }
  const grupp_element = omgang.grupper.map(g => {
    const block = document.createElement("div");
    block.className = "poangmatch-grupp";

    const topp = document.createElement("div");
    topp.className = "poangmatch-grupp-topp";
    const chip = document.createElement("span");
    chip.className = "grupp-chip";
    chip.style.background = g.lagfarg;
    chip.style.color = textFargForBg(g.lagfarg);
    chip.textContent = g.lagnamn;
    const poangInput = document.createElement("input");
    poangInput.type = "number";
    poangInput.min = "0";
    poangInput.className = "poangmatch-poang";
    poangInput.value = g.poang;
    topp.appendChild(chip);
    topp.appendChild(poangInput);
    block.appendChild(topp);

    const valda = new Set(g.spelare.map(s => s.id));
    const kryssrutor = [];
    if (roster.length === 0) {
      const ingen = document.createElement("p");
      ingen.className = "grupper-info-liten";
      ingen.textContent = "Ingen spelarlista tillgänglig.";
      block.appendChild(ingen);
    } else {
      const rad = document.createElement("div");
      rad.className = "positioner-kryssrad";
      roster.forEach(sp => {
        const label = document.createElement("label");
        label.className = "positioner-kryss-etikett";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = sp.id;
        cb.checked = valda.has(sp.id);
        kryssrutor.push(cb);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(" " + sp.namn + (sp.aktiv ? "" : " (inaktiv)")));
        rad.appendChild(label);
      });
      block.appendChild(rad);
    }

    dialog.appendChild(block);
    return { lagnamn: g.lagnamn, poangInput, kryssrutor };
  });

  const hjalp = document.createElement("p");
  hjalp.className = "grupper-info-liten";
  hjalp.style.marginTop = "10px";
  hjalp.textContent = 'Har du redan öppnat Statistik, gå in där igen efteråt för att se ändringen.';
  dialog.appendChild(hjalp);

  const knappRad = document.createElement("div");
  knappRad.className = "dialog-knapprad-huvud";
  const avbryt = document.createElement("button");
  avbryt.className = "dialog-knapp-sekundar";
  avbryt.textContent = "Avbryt";
  avbryt.onclick = () => overlay.remove();
  const spara = document.createElement("button");
  spara.className = "dialog-knapp-primar";
  spara.textContent = "Spara";
  spara.onclick = () => {
    const namn = namnInput.value.trim();
    if (!namn) {
      visaToast("Namnet får inte vara tomt.");
      return;
    }
    const lag_poang = {};
    const spelare_per_grupp = {};
    grupp_element.forEach(ge => {
      lag_poang[ge.lagnamn] = Math.max(0, parseInt(ge.poangInput.value, 10) || 0);
      spelare_per_grupp[ge.lagnamn] = ge.kryssrutor.filter(cb => cb.checked).map(cb => cb.value);
    });
    spara.disabled = true;
    avbryt.disabled = true;
    sparaRedigering(overlay, omgang.id, {
      namn,
      datum: datumInput.value,
      tid: tidInput.value,
      lag_poang,
      spelare_per_grupp,
    }, on401).finally(() => { spara.disabled = false; avbryt.disabled = false; });
  };
  knappRad.appendChild(avbryt);
  knappRad.appendChild(spara);
  dialog.appendChild(knappRad);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

async function sparaRedigering(overlay, id, data, on401) {
  try {
    const res = await anropaMedToken("/omgang/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    }, on401);
    const svar = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(svar.error || "Servern svarade med fel");
    overlay.remove();
    visaToast("Poängmatchen uppdaterad.");
    await initPoangmatcher(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

// ---- Ta bort ----
function bekraftaTaBort(omgang, on401) {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  const dialog = document.createElement("div");
  dialog.className = "dialog-ruta";

  const rubrik = document.createElement("h3");
  rubrik.textContent = "Ta bort poängmatch?";
  dialog.appendChild(rubrik);
  const p = document.createElement("p");
  p.textContent = `"${omgang.namn}" (${formateraDatumTid(omgang.datum, omgang.tid)}) tas bort permanent, inklusive lagresultat och spelarkopplingar. Går inte att ångra.`;
  dialog.appendChild(p);

  const knappRad = document.createElement("div");
  knappRad.className = "dialog-knapprad-huvud";
  const avbryt = document.createElement("button");
  avbryt.className = "dialog-knapp-sekundar";
  avbryt.textContent = "Avbryt";
  avbryt.onclick = () => overlay.remove();
  const taBort = document.createElement("button");
  taBort.className = "dialog-knapp-primar";
  taBort.textContent = "Ja, ta bort";
  taBort.onclick = async () => {
    taBort.disabled = true;
    avbryt.disabled = true;
    try {
      const res = await anropaMedToken("/omgang/ta-bort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: omgang.id }),
      }, on401);
      const svar = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(svar.error || "Servern svarade med fel");
      overlay.remove();
      visaToast("Poängmatchen borttagen.");
      await initPoangmatcher(on401);
    } catch (fel) {
      taBort.disabled = false;
      avbryt.disabled = false;
      if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte ta bort.");
    }
  };
  knappRad.appendChild(avbryt);
  knappRad.appendChild(taBort);
  dialog.appendChild(knappRad);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}
