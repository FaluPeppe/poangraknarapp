// Liten "brygga" som löser ett cirkulärt import-problem: main.js importerar
// poang.js (för att starta den), men poang.js behöver också kunna hoppa
// till andra skärmar (t.ex. genvägen "Dela in spelare i grupper"). Istället
// för att poang.js importerar main.js (cirkulärt), fyller main.js i dessa
// funktioner vid start, och poang.js bara anropar dem.
export const nav = {
  gaTillGrupper: (ursprung) => {}, // ursprung: "narvaro" | "poang" - styr vart "← Tillbaka" leder
  gaTillbakaFranGrupper: () => {}, // tillbaka dit man kom ifrån (samma som "← Tillbaka")

  // Hoppa direkt mellan två Hantera-skärmar, t.ex. från Hantera spelare till
  // Hantera positioner när man upptäcker att inga positioner finns än.
  // aterkomst (valfri) = namnet på Hantera-skärmen "← Tillbaka" ska gå till
  // NÄSTA gång, istället för hubben - konsumeras (nollställs) direkt.
  gaTillHanteraSkarm: (namn, aterkomst) => {},

  // Satt av spelare.js precis innan den hoppar iväg till Hantera
  // positioner/kategorier - vilken spelare (id) som ska öppnas i
  // redigeringsläge nästa gång Hantera spelare renderas. spelare.js
  // läser och nollställer detta själv.
  spelareAttOppna: null,
};