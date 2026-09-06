// Hantera lag-skärmen (Fas 6a, utökad). Lagnamn, skapa ytterligare lag, byta
// mellan sina lag, bjuda in ledare (admin), tipsa en vän om appen, och lämna
// laget.
//
// UTELÄMNAT MEDVETET (matchar inte vår inloggningsmodell eller är separat
// funktionalitet som förtjänar sin egen omgång):
//   - "Anslut till ett lag med kod" - borttagen. Lagkoden var en
//     återanvändbar delad hemlighet; all åtkomst går numera via
//     admin-inbjudan på e-post (medlemmar.js -> POST /medlemmar).
//   - "Bekräfta din e-post" - vår inloggning kräver alltid en verifierad
//     e-post via engångskod, så den är redan känd.
//   - "Koppla bort den här enheten" - vi har ingen enhetsparkoppling
//     separat från inloggningen (JWT), så begreppet finns inte hos oss.
//   - "Dela lag" och "Min hemskärmslänk" - inte byggda än, kan tas i en
//     egen omgång.

import { anropaMedToken, sparaToken, taBortToken } from "./auth.js";
import { visaToast } from "./ui.js";
import { initMedlemmar } from "./medlemmar.js";

export async function initLag(on401) {
  const container = document.getElementById("lag-installningar-container");
  container.innerHTML = '<span style="color:#888;">Laddar...</span>';

  let migRes, minaLagRes, medlemmarRes;
  try {
    [migRes, minaLagRes, medlemmarRes] = await Promise.all([
      anropaMedToken("/mig", {}, on401),
      anropaMedToken("/lag/mina", {}, on401),
      anropaMedToken("/medlemmar", {}, on401),
    ]);
  } catch (fel) {
    if (fel.message !== "Utloggad") {
      visaToast("Kunde inte ansluta till servern. Kolla webbläsarens konsol (F12) för detaljer.");
      console.error(fel);
    }
    return;
  }
  if (!migRes.ok || !minaLagRes.ok || !medlemmarRes.ok) {
    visaToast("Kunde inte hämta laginfo.");
    return;
  }
  const mig = await migRes.json();
  const minaLag = await minaLagRes.json();
  const medlemmar = await medlemmarRes.json();
  rendera(mig, minaLag, medlemmar, on401);
}

function rendera(mig, minaLag, medlemmar, on401) {
  const container = document.getElementById("lag-installningar-container");
  container.innerHTML = "";
  const jag_ar_admin = mig.roll === "admin";

  // ---- Lagnamn ----
  const namnForm = document.createElement("div");
  namnForm.className = "avsluta-form";
  const label = document.createElement("label");
  label.textContent = "Lagnamn";
  namnForm.appendChild(label);
  const input = document.createElement("input");
  input.type = "text";
  input.id = "lagnamn-input";
  input.value = mig.lagnamn;
  input.disabled = !jag_ar_admin;
  namnForm.appendChild(input);
  if (jag_ar_admin) {
    const knapp = document.createElement("button");
    knapp.className = "knapp-primar";
    knapp.textContent = "Spara";
    knapp.onclick = () => sparaLagnamn(on401);
    namnForm.appendChild(knapp);
  } else {
    const info = document.createElement("p");
    info.style.cssText = "color:#888;font-size:13px;";
    info.textContent = "Bara admins kan ändra lagnamnet.";
    namnForm.appendChild(info);
  }
  container.appendChild(namnForm);

  // ---- Byt lag (om man är med i fler än ett) ----
  if (minaLag.length > 1) {
    const byt = document.createElement("div");
    byt.className = "avsluta-form";
    const rubrik = document.createElement("h3");
    rubrik.className = "historik-rubrik";
    rubrik.textContent = "Byt lag";
    byt.appendChild(rubrik);

    minaLag.forEach(l => {
      const rad = document.createElement("div");
      rad.className = "spelar-rad";
      const namnDiv = document.createElement("div");
      namnDiv.className = "spelar-info";
      namnDiv.innerHTML = `<div class="spelar-namn">${escapeHtml(l.lagnamn)}</div><div class="spelar-positioner">${l.roll === "admin" ? "Admin" : "Medlem"}</div>`;
      rad.appendChild(namnDiv);
      if (l.lagkod === mig.lagkod) {
        const chip = document.createElement("span");
        chip.className = "badge";
        chip.textContent = "Aktivt";
        rad.appendChild(chip);
      } else {
        const bytKnapp = document.createElement("button");
        bytKnapp.className = "narvaro-knapp";
        bytKnapp.textContent = "Byt hit";
        bytKnapp.onclick = () => bytLag(l.lagkod, on401);
        rad.appendChild(bytKnapp);
      }
      byt.appendChild(rad);
    });
    container.appendChild(byt);
  }

  // ---- Skapa ytterligare ett lag ----
  const skapa = document.createElement("div");
  skapa.className = "avsluta-form";
  const skapaRubrik = document.createElement("h3");
  skapaRubrik.className = "historik-rubrik";
  skapaRubrik.textContent = "Skapa ytterligare ett lag";
  skapa.appendChild(skapaRubrik);
  const skapaInfo = document.createElement("p");
  skapaInfo.style.cssText = "color:#888;font-size:13px;margin-top:-6px;";
  skapaInfo.textContent = "Kopplas till samma e-postadress som ditt nuvarande lag.";
  skapa.appendChild(skapaInfo);
  const skapaLabel = document.createElement("label");
  skapaLabel.textContent = "Lagnamn";
  skapa.appendChild(skapaLabel);
  const skapaInput = document.createElement("input");
  skapaInput.type = "text";
  skapaInput.id = "nytt-lag-namn";
  skapaInput.placeholder = "T.ex. KIF P16";
  skapa.appendChild(skapaInput);
  const skapaKnapp = document.createElement("button");
  skapaKnapp.className = "knapp-primar";
  skapaKnapp.textContent = "+ Skapa nytt lag";
  skapaKnapp.onclick = () => skapaNyttLag(on401);
  skapa.appendChild(skapaKnapp);
  container.appendChild(skapa);

  // ---- Anslutna ledare (tidigare en egen "Tränare"-knapp i hubben) ----
  const ledareRubrik = document.createElement("h3");
  ledareRubrik.className = "historik-rubrik";
  ledareRubrik.textContent = "Anslutna ledare";
  container.appendChild(ledareRubrik);
  const ledareInfo = document.createElement("p");
  ledareInfo.style.cssText = "color:#888;font-size:13px;margin-top:-6px;";
  ledareInfo.textContent = "Vilka som kan logga in och hantera det här laget. "
    + (jag_ar_admin ? "Bjud in fler med deras e-postadress." : "");
  container.appendChild(ledareInfo);
  const ledarePlats = document.createElement("div");
  ledarePlats.id = "lag-ledare-sektion";
  ledarePlats.innerHTML = '<span style="color:#888;">Laddar...</span>';
  container.appendChild(ledarePlats);
  initMedlemmar(on401, "lag-ledare-sektion"); // fylls i asynkront, ovanstående skelett finns redan i DOM:en

  // ---- Tipsa en vän (ingen lagkoppling) ----
  container.appendChild(byggTipsaVan(on401));

  // ---- Fler val: lämna laget (bakom en expander så man inte råkar trycka) ----
  container.appendChild(byggFlerVal(mig, medlemmar, on401));
}

// ---- Tipsa en vän ----
function byggTipsaVan(on401) {
  const form = document.createElement("div");
  form.className = "avsluta-form";
  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = "Tipsa en vän om appen";
  form.appendChild(rubrik);
  const info = document.createElement("p");
  info.style.cssText = "color:#888;font-size:13px;margin-top:-6px;";
  info.textContent = "Skickar ett mejl med en länk till appen. Ingen koppling till dina lag – "
    + "din e-postadress står som avsändare att svara till.";
  form.appendChild(info);

  const epostLabel = document.createElement("label");
  epostLabel.textContent = "Väns e-postadress";
  form.appendChild(epostLabel);
  const epostInput = document.createElement("input");
  epostInput.type = "email";
  epostInput.id = "tipsa-epost";
  epostInput.placeholder = "van@exempel.se";
  form.appendChild(epostInput);

  const medLabel = document.createElement("label");
  medLabel.textContent = "Egen hälsning (valfritt)";
  form.appendChild(medLabel);
  const medInput = document.createElement("textarea");
  medInput.id = "tipsa-meddelande";
  medInput.rows = 2;
  medInput.maxLength = 500;
  medInput.className = "lag-textarea";
  form.appendChild(medInput);

  const knapp = document.createElement("button");
  knapp.className = "knapp-primar";
  knapp.textContent = "Skicka tips";
  knapp.onclick = () => skickaTips(knapp, on401);
  form.appendChild(knapp);
  return form;
}

async function skickaTips(knapp, on401) {
  const epost = document.getElementById("tipsa-epost").value.trim();
  const meddelande = document.getElementById("tipsa-meddelande").value.trim();
  if (!epost) {
    visaToast("Ange en e-postadress.");
    return;
  }
  knapp.disabled = true;
  try {
    const res = await anropaMedToken("/tipsa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epost, meddelande }),
    }, on401);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast(`Tips skickat till ${epost}.`);
    document.getElementById("tipsa-epost").value = "";
    document.getElementById("tipsa-meddelande").value = "";
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte skicka tipset.");
  } finally {
    knapp.disabled = false;
  }
}

// ---- Fler val (expander) + Lämna laget ----
function byggFlerVal(mig, medlemmar, on401) {
  const wrap = document.createElement("div");
  wrap.className = "lag-fler-val";

  const toggle = document.createElement("button");
  toggle.className = "lag-fler-val-toggle";
  toggle.textContent = "Fler val ▾";
  wrap.appendChild(toggle);

  const innehall = document.createElement("div");
  innehall.hidden = true;
  toggle.onclick = () => {
    innehall.hidden = !innehall.hidden;
    toggle.textContent = innehall.hidden ? "Fler val ▾" : "Fler val ▴";
  };

  const lamnaKnapp = document.createElement("button");
  lamnaKnapp.className = "lag-lamna-knapp";
  lamnaKnapp.textContent = "Lämna laget";
  lamnaKnapp.onclick = () => startaLamnaLaget(mig, medlemmar, on401);
  innehall.appendChild(lamnaKnapp);

  wrap.appendChild(innehall);
  return wrap;
}

// Avgör vilket fall det är och öppnar rätt dialog. Servern dubbelkollar allt.
function startaLamnaLaget(mig, medlemmar, on401) {
  const min = (mig.epost || "").toLowerCase();
  const jag = medlemmar.find(m => m.epost.toLowerCase() === min);
  const andra = medlemmar.filter(m => m.epost.toLowerCase() !== min);
  const admins = medlemmar.filter(m => m.roll === "admin");

  if (andra.length === 0) {
    dialogRaderaLag(mig, on401);                       // Fall C
  } else if (jag && jag.roll === "admin" && admins.length === 1) {
    dialogUtseAdmin(mig, andra, on401);                // Fall B
  } else {
    dialogLamnaEnkelt(mig, on401);                     // Fall A
  }
}

function byggOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  const dialog = document.createElement("div");
  dialog.className = "dialog-ruta";
  overlay.appendChild(dialog);
  return { overlay, dialog };
}

// Fall A: vanlig avgång.
function dialogLamnaEnkelt(mig, on401) {
  const { overlay, dialog } = byggOverlay();
  const rubrik = document.createElement("h3");
  rubrik.textContent = "Lämna laget?";
  dialog.appendChild(rubrik);
  const p = document.createElement("p");
  p.textContent = `Du lämnar "${mig.lagnamn}" och förlorar åtkomsten. En admin kan bjuda in dig igen senare.`;
  dialog.appendChild(p);

  const rad = document.createElement("div");
  rad.className = "dialog-knapprad-huvud";
  const avbryt = dlgKnapp("dialog-knapp-sekundar", "Avbryt", () => overlay.remove());
  const ok = dlgKnapp("dialog-knapp-primar", "Lämna laget", () => utforLamna({}, overlay, [avbryt, ok], on401));
  rad.append(avbryt, ok);
  dialog.appendChild(rad);
  document.body.appendChild(overlay);
}

// Fall B: enda admin - måste utse en efterträdare.
function dialogUtseAdmin(mig, andra, on401) {
  const { overlay, dialog } = byggOverlay();
  const rubrik = document.createElement("h3");
  rubrik.textContent = "Utse en ny administratör";
  dialog.appendChild(rubrik);
  const p = document.createElement("p");
  p.textContent = `Du är enda administratör för "${mig.lagnamn}". När du lämnar måste någon annan kunna hantera laget. Välj vem som blir administratör:`;
  dialog.appendChild(p);

  let vald = null;
  const bekraftelse = document.createElement("p");
  bekraftelse.className = "dialog-bekraftelse";
  bekraftelse.hidden = true;

  const lista = document.createElement("div");
  lista.className = "dialog-radiolista";
  andra.forEach(m => {
    const label = document.createElement("label");
    label.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "ny-admin";
    radio.value = m.epost;
    radio.onchange = () => {
      vald = m.epost;
      bekraftelse.hidden = false;
      bekraftelse.textContent = `${m.epost} blir administratör för "${mig.lagnamn}". Det kan du inte ändra efter att du lämnat.`;
      ok.disabled = false;
      ok.textContent = `Gör ${m.epost} till admin och lämna laget`;
    };
    label.append(radio, document.createTextNode(" " + m.epost));
    lista.appendChild(label);
  });
  dialog.appendChild(lista);
  dialog.appendChild(bekraftelse);

  const rad = document.createElement("div");
  rad.className = "dialog-knapprad-huvud";
  const avbryt = dlgKnapp("dialog-knapp-sekundar", "Avbryt", () => overlay.remove());
  const ok = dlgKnapp("dialog-knapp-primar", "Välj någon ovan först", () => {
    if (vald) utforLamna({ ny_admin_epost: vald }, overlay, [avbryt, ok], on401);
  });
  ok.disabled = true;
  rad.append(avbryt, ok);
  dialog.appendChild(rad);
  document.body.appendChild(overlay);
}

// Fall C: sista personen - hela laget raderas. Skriv lagnamnet för att låsa upp.
function dialogRaderaLag(mig, on401) {
  const { overlay, dialog } = byggOverlay();
  const rubrik = document.createElement("h3");
  rubrik.textContent = `Ta bort "${mig.lagnamn}" permanent?`;
  dialog.appendChild(rubrik);

  const varning = document.createElement("p");
  varning.className = "dialog-varning";
  varning.innerHTML = `Du är den sista i laget. Lämnar du tas <strong>hela laget bort för alltid</strong> – `
    + `alla spelare, all närvaro, alla sparade poängmatcher, all statistik, positioner och färger. `
    + `Det går inte att ångra.`;
  dialog.appendChild(varning);

  const label = document.createElement("label");
  label.className = "poangmatch-falt-etikett";
  label.textContent = `Skriv "${mig.lagnamn}" för att bekräfta:`;
  dialog.appendChild(label);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "poangmatch-falt";
  input.autocomplete = "off";
  dialog.appendChild(input);

  const rad = document.createElement("div");
  rad.className = "dialog-knapprad-huvud";
  const avbryt = dlgKnapp("dialog-knapp-sekundar", "Avbryt", () => overlay.remove());
  const ok = dlgKnapp("dialog-knapp-fara", `Ta bort "${mig.lagnamn}" för alltid`, () => {
    if (input.value.trim() === mig.lagnamn) {
      utforLamna({ bekrafta_lagnamn: input.value.trim() }, overlay, [avbryt, ok], on401);
    }
  });
  ok.disabled = true;
  input.oninput = () => { ok.disabled = input.value.trim() !== mig.lagnamn; };
  rad.append(avbryt, ok);
  dialog.appendChild(rad);
  document.body.appendChild(overlay);
}

function dlgKnapp(klass, text, onclick) {
  const b = document.createElement("button");
  b.className = klass;
  b.textContent = text;
  b.onclick = onclick;
  return b;
}

async function utforLamna(body, overlay, knappar, on401) {
  knappar.forEach(k => { k.disabled = true; });
  try {
    const res = await anropaMedToken("/lag/lamna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, on401);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    overlay.remove();
    if (data.ny_token) {
      // Med i andra lag - byt dit och ladda om.
      sparaToken(data.ny_token);
      window.location.reload();
    } else {
      // Inga andra lag - logga ut.
      taBortToken();
      visaToast(data.raderat ? "Laget borttaget." : "Du har lämnat laget.");
      setTimeout(() => window.location.reload(), 1200);
    }
  } catch (fel) {
    knappar.forEach(k => { k.disabled = false; }); // låt användaren försöka igen / avbryta
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte lämna laget.");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
    // lagnamn-rubrik är numera en listruta (header.js) - uppdatera texten
    // på den VALDA optionen, inte elementet som helhet.
    const rubrik = document.getElementById("lagnamn-rubrik");
    if (rubrik && rubrik.tagName === "SELECT") {
      const valdOption = rubrik.options[rubrik.selectedIndex];
      if (valdOption) valdOption.textContent = lagnamn;
    } else if (rubrik) {
      rubrik.textContent = lagnamn;
    }
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte spara.");
  }
}

async function skapaNyttLag(on401) {
  const input = document.getElementById("nytt-lag-namn");
  const lagnamn = input.value.trim();
  if (!lagnamn) {
    visaToast("Ange ett lagnamn.");
    return;
  }
  try {
    const res = await anropaMedToken("/lag/skapa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lagnamn }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    visaToast(`"${lagnamn}" skapat! Byt till det nedan när du vill.`);
    await initLag(on401);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte skapa laget.");
  }
}

// Byter aktivt lag: hämtar en NY token för det valda laget och laddar om
// hela sidan - enklast och säkraste sättet att garantera att alla skärmar
// (poäng, grupper, spelare, ...) visar det NYA lagets data, inte en
// blandning av gammalt och nytt tillstånd.
async function bytLag(lagkod, on401) {
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
