// "Vad är nytt" - en helt statisk, hårdkodad changelog. Inget backend-
// beroende (till skillnad från nästan allt annat i appen) - lägg bara till
// en ny post överst i LOGG och höj VERSION när ni skeppar något
// användarmärkbart. Inte varje enskild commit - en hel arbetsomgångs
// ändringar blir EN post/version, inte en per liten justering.
//
// Versionsschema (från 2026-10-03), X.Y.Z:
//   Z (1.4 -> 1.4.1)  små justeringar/fixar av något som redan finns
//   Y (1.4 -> 1.5)    ny funktion eller tydlig förändring - nollställer Z
//   X (1.x -> 2.0)    bara en riktigt stor omgörning
// Siffrorna är inte decimaler: efter 1.9 kommer 1.10. v1.0 = den dag
// changeloggen infördes (2026-09-29).

export const VERSION = "1.4.2";

const LOGG = [
  { datum: "2026-10-04", text: "Större och tydligare spelarnamn i grupperna – både i Dela in grupper och när du trycker på en grupp i Poäng." },
  { datum: "2026-10-03", text: "Hantera lag är luftigare: varje del ligger i ett eget kort, och ledarna visas som en lista i sitt kort." },
  { datum: "2026-10-03", text: "Hantera lag har ny ordning: anslutna ledare och inbjudan överst, lämna laget längst ner. Tipsa en vän finns nu under Om appen." },
  { datum: "2026-10-03", text: "Större text för den som vill: välj Normal, Stor eller Extra stor under Inställningar → Appinställningar." },
  { datum: "2026-10-03", text: "Hantera lag visar nu när varje ledare senast var aktiv i laget." },
  { datum: "2026-10-03", text: "Ny skärm Om appen under Inställningar – vem som gjort appen, Vad är nytt, och ett formulär för att skicka buggar och önskemål." },
  { datum: "2026-09-29", text: "Se om en inbjuden ledare har loggat in eller inte (Inbjuden/Ansluten) i Hantera lag." },
  { datum: "2026-09-29", text: "Snabbare väg till att lägga upp positioner eller kategorier direkt från Hantera spelare, om laget saknar dem än." },
  { datum: "2026-09-29", text: "Lättare att ändra tiden i tidtagaruret på Poäng-skärmen - tryck på siffrorna istället för att skriva i en liten ruta." },
];

function formateraDatum(iso) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function byggAndringslogg() {
  const wrapper = document.createElement("div");
  wrapper.className = "avsluta-form";

  const rubrik = document.createElement("h3");
  rubrik.className = "historik-rubrik";
  rubrik.textContent = `Vad är nytt (v${VERSION})`;
  wrapper.appendChild(rubrik);

  const lista = document.createElement("ul");
  lista.className = "andringslogg-lista";
  LOGG.forEach(post => {
    const li = document.createElement("li");
    const datum = document.createElement("span");
    datum.className = "andringslogg-datum";
    datum.textContent = formateraDatum(post.datum);
    li.appendChild(datum);
    li.appendChild(document.createTextNode(post.text));
    lista.appendChild(li);
  });
  wrapper.appendChild(lista);

  return wrapper;
}
