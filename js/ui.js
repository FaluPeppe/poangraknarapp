// Delade, DOM-lätta hjälpfunktioner som fler skärmar (poäng, grupper,
// spelare, ...) kommer att behöva. Håll den här filen fri från
// skärmspecifik logik - bara sådant som verkligen återanvänds.

export function visaToast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.add("visas");
  setTimeout(() => el.classList.remove("visas"), 2200);
}

// visaTid() togs bort - svarstidsmätningen visades inte längre i UI:t.

// En inställningsrad för Appinställningar: rubrik + liten hjälptext, och
// under dem själva kontrollen (radioknapparna i EN rad, kryssruta, ...).
// Radioknapparna ligger alltså på samma rad som varandra, inte staplade.
export function byggInstallningsRad(etikett, hjalptext, kontrollEl) {
  const rad = document.createElement("div");
  rad.className = "installning-rad";

  const namn = document.createElement("span");
  namn.className = "installning-namn";
  namn.textContent = etikett;
  rad.appendChild(namn);

  if (hjalptext) {
    const hj = document.createElement("span");
    hj.className = "installning-hjalp";
    hj.textContent = hjalptext;
    rad.appendChild(hj);
  }

  rad.appendChild(kontrollEl);
  return rad;
}

// Svensk datum/tid-text, t.ex. "Tisdag 3 sep kl. 17.32".
//   formateraDatumTid()                 -> nu
//   formateraDatumTid("2026-09-03", "17:32")
// datum: "ÅÅÅÅ-MM-DD"-sträng, Date, eller utelämnat (=nu). tid: "HH:MM" (=nu).
const VECKODAGAR = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
const MANADER = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function formateraDatumTid(datum, tid) {
  const nu = new Date();
  let d;
  if (datum instanceof Date) d = datum;
  else if (typeof datum === "string" && /^\d{4}-\d{2}-\d{2}/.test(datum)) d = new Date(datum.slice(0, 10) + "T00:00:00");
  else d = nu;

  let tt;
  if (typeof tid === "string" && /^\d{1,2}:\d{2}/.test(tid)) tt = tid.slice(0, 5).replace(":", ".");
  else tt = `${String(nu.getHours()).padStart(2, "0")}.${String(nu.getMinutes()).padStart(2, "0")}`;

  return `${VECKODAGAR[d.getDay()]} ${d.getDate()} ${MANADER[d.getMonth()]} kl. ${tt}`;
}

// Enkel ljushetsberäkning - samma princip som i den riktiga Shiny-appen,
// så text alltid syns tydligt oavsett bakgrundsfärg.
export function textFargForBg(hex) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  const ljushet = (r * 299 + g * 587 + b * 114) / 1000;
  return ljushet > 150 ? "#1A1A1A" : "white";
}