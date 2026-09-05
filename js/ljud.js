// Delat ljud+vibration-val för timrar (Poäng-skärmens tidtagarur OCH
                                        // Intervaller). Sparas lokalt i webbläsaren (personlig smaksak, inte
                                                                                      // laginställning) - samma val gäller båda timrarna, precis som Peter ville.
//
  // VIKTIGT om vibration: fungerar bara på Android (Chrome m.fl.) - iOS
// Safari stödjer inte Vibration API alls, oavsett app eller "Lägg till på
// hemskärmen". vibrera() är no-op där, helt ofarligt att anropa ändå.

const LJUD_NYCKEL = "kif_timer_ljud";
const VIBRATION_NYCKEL = "kif_timer_vibration";

export const LJUDALTERNATIV = {
  pip: { namn: "Enkelt pip", toner: [{ frekvens: 880, langd: 0.25 }] },
  trippel: { namn: "Tre pip", toner: [{ frekvens: 880, langd: 0.12 }, { frekvens: 880, langd: 0.12 }, { frekvens: 880, langd: 0.12 }] },
  signal: { namn: "Lång signal", toner: [{ frekvens: 660, langd: 0.8 }] },
  ingen: { namn: "Inget ljud", toner: [] },
};

export function hamtaValtLjud() {
  return localStorage.getItem(LJUD_NYCKEL) || "pip";
}

export function sparaValtLjud(val) {
  localStorage.setItem(LJUD_NYCKEL, val);
}

export function vibrationPatorn() {
  return localStorage.getItem(VIBRATION_NYCKEL) !== "av"; // på som standard
}

export function sattVibration(pa) {
  localStorage.setItem(VIBRATION_NYCKEL, pa ? "pa" : "av");
}

export function spelaLjud() {
  const val = LJUDALTERNATIV[hamtaValtLjud()];
  if (!val || val.toner.length === 0) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let start = ctx.currentTime;
    val.toner.forEach(ton => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = ton.frekvens;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + ton.langd);
      osc.start(start);
      osc.stop(start + ton.langd);
      start += ton.langd + 0.05;
    });
  } catch (fel) {
    // Ljud är en bonus, inte kritiskt - strular Web Audio struntar vi i det.
  }
}

// monster i millisekunder, t.ex. [300] (en vibration) eller [200,100,200]
// (vibrera-paus-vibrera). Ingen effekt alls pa iOS - fungerar bara pa
// Android-webblasare som stodjer Vibration API.
export function vibrera(monster = [300]) {
  if (!vibrationPatorn()) return;
  try {
    if (navigator.vibrate) navigator.vibrate(monster);
  } catch (fel) {
    // Ofarligt att strunta i - vibration ar alltid en bonus, aldrig kritiskt.
  }
}

// Bygger ett återanvändbart formulärfragment: ljudval + vibrationskryssruta.
// Returnerar ett <div> att stoppa in var som helst i en skärms inställningar.
export function byggLjudOchVibrationsval() {
  const wrapper = document.createElement("div");
  wrapper.className = "ljud-vibration-val";
  
  const ljudRad = document.createElement("div");
  const ljudLabel = document.createElement("label");
  ljudLabel.textContent = "Ljud när tiden är slut: ";
  const ljudSelect = document.createElement("select");
  ljudSelect.className = "ljud-val-select";
  Object.entries(LJUDALTERNATIV).forEach(([key, v]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = v.namn;
    if (key === hamtaValtLjud()) opt.selected = true;
    ljudSelect.appendChild(opt);
  });
  ljudSelect.onchange = () => sparaValtLjud(ljudSelect.value);
  ljudRad.appendChild(ljudLabel);
  ljudRad.appendChild(ljudSelect);
  wrapper.appendChild(ljudRad);
  
  const vibrationRad = document.createElement("label");
  vibrationRad.className = "vibration-etikett";
  const vibrationCheck = document.createElement("input");
  vibrationCheck.type = "checkbox";
  vibrationCheck.checked = vibrationPatorn();
  vibrationCheck.onchange = () => sattVibration(vibrationCheck.checked);
  vibrationRad.appendChild(vibrationCheck);
  vibrationRad.appendChild(document.createTextNode(" Vibrera också (fungerar bara på Android, inte iPhone)"));
  wrapper.appendChild(vibrationRad);
  
  return wrapper;
}