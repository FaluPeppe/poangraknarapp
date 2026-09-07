// Hantera kategorier-skärmen. Samma mönster som positioner.js (lägg
// till/ändra/ta bort), men utan "Byt sport" - kategorier är fritt valda av
// laget (t.ex. "Nybörjare"/"Van", eller åldersgrupper) och har ingen
// standarduppsättning att erbjuda.
//
// Tabellen backfillas EN gång från spelarnas gamla fritext-kategorier (se
// kategorier.sql i worker-repot) så befintliga kategorier dyker upp här
// automatiskt första gången skärmen används - inget försvinner.

import { anropaMedToken } from "./auth.js";
import { visaToast, byggDialog, dlgKnapp } from "./ui.js";

let redigerar_id = null;

export async function initKategorier(on401) {
  const container = document.getElementById("kategorier-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let res;
  try {
    res = await anropaMedToken("/kategorier", {}, on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!res.ok) {
    visaToast("Kunde inte hämta kategorier.");
    return;
  }
  const kategorier = await res.json();
  rendera(kategorier, on401);
}

function rendera(kategorier, on401) {
  const container = document.getElementById("kategorier-container");
  container.innerHTML = "";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Kategorier för det här laget";
  container.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Används för att tagga spelare under Hantera spelare - t.ex. ålder, nivå eller annat ni vill kunna jämna ut på vid gruppindelning.";
  container.appendChild(info);

  const lista = document.createElement("div");
  lista.className = "spelar-lista";
  kategorier.forEach(k => {
    const rad = document.createElement("div");
    rad.className = "spelar-rad";

    if (redigerar_id === k.id) {
      const redigering = document.createElement("div");
      redigering.className = "spelare-redigera";
      const namnInput = document.createElement("input");
      namnInput.type = "text";
      namnInput.value = k.namn;
      const knappar = document.createElement("div");
      knappar.className = "spelare-redigera-knappar";
      const sparaKnapp = document.createElement("button");
      sparaKnapp.className = "spara-knapp";
      sparaKnapp.textContent = "Spara";
      sparaKnapp.onclick = () => sparaRedigering(k.id, namnInput.value, on401);
      const avbrytKnapp = document.createElement("button");
      avbrytKnapp.className = "avbryt-knapp";
      avbrytKnapp.textContent = "Avbryt";
      avbrytKnapp.onclick = () => { redigerar_id = null; initKategorier(on401); };
      knappar.appendChild(sparaKnapp);
      knappar.appendChild(avbrytKnapp);
      redigering.appendChild(namnInput);
      redigering.appendChild(knappar);
      rad.appendChild(redigering);
    } else {
      const infoRad = document.createElement("div");
      infoRad.className = "spelar-info";
      infoRad.textContent = k.namn;
      rad.appendChild(infoRad);

      const redigeraKnapp = document.createElement("button");
      redigeraKnapp.className = "farg-ikonknapp";
      redigeraKnapp.textContent = "✏️";
      redigeraKnapp.onclick = () => { redigerar_id = k.id; rendera(kategorier, on401); };
      rad.appendChild(redigeraKnapp);

      const taBortKnapp = document.createElement("button");
      taBortKnapp.className = "farg-ikonknapp farg-ikonknapp-ta-bort";
      taBortKnapp.textContent = "✕";
      taBortKnapp.onclick = () => taBortKategori(k.id, k.namn, on401);
      rad.appendChild(taBortKnapp);
    }

    lista.appendChild(rad);
  });
  container.appendChild(lista);

  const laggTillRubrik = document.createElement("h3");
  laggTillRubrik.className = "historik-rubrik";
  laggTillRubrik.textContent = "Lägg till en kategori";
  container.appendChild(laggTillRubrik);

  const laggTill = document.createElement("div");
  laggTill.className = "spelare-lagg-till";
  laggTill.innerHTML = `
    <input type="text" id="ny-kategori-namn" placeholder="Ny kategori...">
    <button id="lagg-till-kategori-knapp">Lägg till</button>
  `;
  container.appendChild(laggTill);
  document.getElementById("lagg-till-kategori-knapp").onclick = () => laggTillKategori(on401);
}

async function laggTillKategori(on401) {
  const falt = document.getElementById("ny-kategori-namn");
  const namn = falt.value.trim();
  if (!namn) {
    visaToast("Ange ett namn.");
    return;
  }
  try {
    const res = await anropaMedToken("/kategorier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await initKategorier(on401);
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
    const res = await anropaMedToken("/kategorier/andra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, namn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    redigerar_id = null;
    await initKategorier(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

// Ta bort en kategori. Är någon spelare taggad med den visas de först, och
// man får välja: ta bort ur lagets lista men behåll taggen på spelarna,
// eller ta bort helt (även från spelarna). Samma flöde som taBortPosition
// i positioner.js.
async function taBortKategori(id, namn, on401) {
  let beromda = [];
  try {
    const res = await anropaMedToken("/spelare/alla", {}, on401);
    if (res.ok) {
      const alla = await res.json();
      beromda = alla.filter(s =>
        (s.kategori || "").split(",").map(x => x.trim()).includes(namn)
      );
    }
  } catch (fel) {
    if (fel.message === "Utloggad") return;
    // annars: fortsätt utan spelarlistan
  }

  const { overlay, dialog } = byggDialog(`Ta bort kategorin "${namn}"?`);
  const antal = beromda.length;

  if (antal > 0) {
    const p1 = document.createElement("p");
    p1.textContent = `${antal} spelare är taggade med "${namn}": ${beromda.map(s => s.namn).join(", ")}.`;
    dialog.appendChild(p1);
    const p2 = document.createElement("p");
    p2.textContent = `"Behåll på spelarna" tar bort kategorin ur lagets lista men låter taggen sitta kvar på spelarna. "Ta bort helt" rensar den även från de ${antal} spelarna.`;
    dialog.appendChild(p2);
  }

  const rad = document.createElement("div");
  rad.className = "dialog-knapprad-huvud";
  const avbryt = dlgKnapp("dialog-knapp-sekundar", "Avbryt", () => overlay.remove());
  const behall = dlgKnapp("dialog-knapp-primar", antal > 0 ? "Behåll på spelarna" : "Ta bort", async () => {
    behall.disabled = avbryt.disabled = true;
    overlay.remove();
    await utforTaBortKategori(id, namn, [], on401);
  });
  rad.append(avbryt, behall);
  dialog.appendChild(rad);

  if (antal > 0) {
    const helt = dlgKnapp("dialog-knapp-farlig", `Ta bort helt (från ${antal} spelare)`, async () => {
      helt.disabled = true;
      overlay.remove();
      await utforTaBortKategori(id, namn, beromda, on401);
    });
    dialog.appendChild(helt);
  }
  document.body.appendChild(overlay);
}

async function utforTaBortKategori(id, namn, rensa_hos_spelare, on401) {
  try {
    const res = await anropaMedToken("/kategorier/ta-bort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }, on401);
    if (!res.ok) throw new Error("Servern svarade med fel");
    for (const s of rensa_hos_spelare) {
      const kvar = (s.kategori || "").split(",").map(x => x.trim()).filter(x => x && x !== namn).join(", ");
      await anropaMedToken("/spelare/andra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, namn: s.namn, positioner: s.positioner || "", kategori: kvar }),
      }, on401);
    }
    visaToast("Kategorin borttagen.");
    await initKategorier(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast("Kunde inte ta bort kategorin.");
  }
}

