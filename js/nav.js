// Liten "brygga" som löser ett cirkulärt import-problem: main.js importerar
// poang.js (för att starta den), men poang.js behöver också kunna hoppa
// till andra skärmar (t.ex. genvägen "Dela in spelare i grupper"). Istället
// för att poang.js importerar main.js (cirkulärt), fyller main.js i dessa
// funktioner vid start, och poang.js bara anropar dem.
export const nav = {
  gaTillGrupper: (ursprung) => {}, // ursprung: "narvaro" | "poang" - styr vart "← Tillbaka" leder
  gaTillbakaFranGrupper: () => {}, // tillbaka dit man kom ifrån (samma som "← Tillbaka")
  gaTillAvsluta: () => {},
};