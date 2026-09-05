// Delad "Antal grupper"-stegare (▼ N ▲). Används på både Poäng-skärmen och
// Dela in grupper-skärmen - samma kontroll, olika omritning efteråt.
//
// Antalet kan aldrig bli färre än 2. Taket (= antal färger i paletten, se
// Inställningar → Hantera färger) vaktas av servern, som svarar med ett fel
// som visas som toast. Grupperna byggs alltid FRÅN färgpaletten, i dess
// ordning (inte alfabetiskt) - se /poang/antal i worker.js.

import { anropaMedToken } from "./auth.js";
import { visaToast } from "./ui.js";

// antal        - nuvarande antal grupper
// on401        - utloggnings-callback som skickas vidare till anropaMedToken
// efterAndring - körs (await:as) när servern bekräftat det nya antalet
export function byggAntalGrupperStegare(antal, on401, efterAndring) {
  const wrapper = document.createElement("div");
  wrapper.className = "antal-grupper-stegare";

  const etikett = document.createElement("span");
  etikett.textContent = "Antal grupper:";
  wrapper.appendChild(etikett);

  const nerKnapp = document.createElement("button");
  nerKnapp.className = "farg-ikonknapp";
  nerKnapp.textContent = "▼";
  nerKnapp.disabled = antal <= 2;
  nerKnapp.onclick = () => andra(antal - 1, on401, efterAndring);
  wrapper.appendChild(nerKnapp);

  const varde = document.createElement("span");
  varde.className = "antal-grupper-varde";
  varde.textContent = antal;
  wrapper.appendChild(varde);

  const uppKnapp = document.createElement("button");
  uppKnapp.className = "farg-ikonknapp";
  uppKnapp.textContent = "▲";
  uppKnapp.onclick = () => andra(antal + 1, on401, efterAndring);
  wrapper.appendChild(uppKnapp);

  return wrapper;
}

async function andra(nytt_antal, on401, efterAndring) {
  if (nytt_antal < 2) return;
  try {
    const res = await anropaMedToken("/poang/antal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ antal: nytt_antal }),
    }, on401);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Servern svarade med fel");
    await efterAndring(nytt_antal);
  } catch (fel) {
    if (fel.message !== "Utloggad") visaToast(fel.message || "Kunde inte ändra antal grupper.");
  }
}
