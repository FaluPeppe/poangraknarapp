// Håller skärmen vaken en valbar tid med Screen Wake Lock API - så
// skärmen inte hinner slockna mitt i en match. Personlig inställning,
// sparas lokalt i webbläsaren (inte per lag).
//
// OBS om webbläsarstöd: Wake Lock API stöds i moderna Chrome/Edge/Safari
// (iOS 16.4+) och Android Chrome, men INTE i äldre webbläsare. Om den
// saknas gör funktionen helt enkelt ingenting (ingen krasch) - skärmen
// beter sig då som vanligt (slocknar enligt telefonens egna inställning).

const NYCKEL = "kif_skarmvaken_minuter";
const STANDARD_MINUTER = "10"; // "0" = av/aldrig

let aktivt_lock = null;
let avslut_timer = null;

export function hamtaSkarmvakenMinuter() {
  return localStorage.getItem(NYCKEL) || STANDARD_MINUTER;
}

export function sparaSkarmvakenMinuter(varde) {
  localStorage.setItem(NYCKEL, varde);
  // Applicera direkt - annars måste sidan laddas om för att en ändring
  // ska märkas.
  stoppaSkarmvaken();
  initSkarmvaken();
}

async function begarLock() {
  if (!("wakeLock" in navigator)) return; // stöds inte - gör inget, ingen krasch
  try {
    aktivt_lock = await navigator.wakeLock.request("screen");
  } catch (fel) {
    // Kan t.ex. nekas om fliken inte är synlig just då - inte kritiskt,
    // visibilitychange-lyssnaren nedan försöker igen när den blir synlig.
    aktivt_lock = null;
  }
}

function stoppaSkarmvaken() {
  if (avslut_timer) {
    clearTimeout(avslut_timer);
    avslut_timer = null;
  }
  if (aktivt_lock) {
    aktivt_lock.release().catch(() => {});
    aktivt_lock = null;
  }
}

// Kallas EN gång vid appstart, och igen varje gång installningen ändras.
export function initSkarmvaken() {
  const minuter = parseInt(hamtaSkarmvakenMinuter(), 10);
  if (!minuter || minuter <= 0) return; // "Aldrig" - gör ingenting

  begarLock();
  avslut_timer = setTimeout(() => {
    stoppaSkarmvaken();
  }, minuter * 60 * 1000);

  // Wake locken släpps automatiskt av webbläsaren när fliken döljs (t.ex.
  // byter app) - försök återta den när man kommer tillbaka, men bara om
  // vi fortfarande är inom den valda tidsperioden (avslut_timer lever kvar).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && avslut_timer && !aktivt_lock) {
      begarLock();
    }
  });
}

// Bygger valbaren (radioknappar) för Inställningar-hubben.
export function byggSkarmvakenValjare() {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form skarmvaken-val";

  const rubrik = document.createElement("p");
  rubrik.style.cssText = "font-weight:600;margin-bottom:4px;";
  rubrik.textContent = "Håll skärmen vaken";
  wrapper.appendChild(rubrik);

  const info = document.createElement("p");
  info.className = "grupper-info-liten";
  info.textContent = "Förhindrar att skärmen slocknar mitt i en match. Kräver stöd i webbläsaren (fungerar i de flesta moderna, men inte alla).";
  wrapper.appendChild(info);

  const alternativ = [
    { varde: "1", etikett: "1 minut" },
    { varde: "5", etikett: "5 minuter" },
    { varde: "10", etikett: "10 minuter" },
    { varde: "0", etikett: "Aldrig" },
  ];
  const nuvarande = hamtaSkarmvakenMinuter();
  alternativ.forEach(a => {
    const radRad = document.createElement("label");
    radRad.className = "radio-rad";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "skarmvaken-minuter";
    radio.value = a.varde;
    radio.checked = nuvarande === a.varde;
    radio.onchange = () => sparaSkarmvakenMinuter(a.varde);
    radRad.appendChild(radio);
    radRad.appendChild(document.createTextNode(" " + a.etikett));
    wrapper.appendChild(radRad);
  });

  return wrapper;
}