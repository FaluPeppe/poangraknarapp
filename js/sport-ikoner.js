// Sport-ikoner för "Byt sport"-knapparna i Hantera positioner. Riktiga
// ikoner (PNG) från Flaticon, av samma designer (Magnific) - se
// attributionen som visas i UI:t (byggAttribution() nedan, används av
// positioner.js). Licensen kräver att länken syns i appen, se
// https://www.flaticon.com/free-icons/sport ("Sport icons created by
// Magnific - Flaticon").
//
// Fotboll och Futsal delar samma bild (ingen egen futsal-ikon i samma
// serie hittades) - se positioner.js för hur de grupperas i UI:t.

function ikon(fil, alt) {
  return `<img src="img/${fil}" alt="${alt}" class="sport-ikon-bild">`;
}


export const SPORT_SVG = {
  Fotboll: ikon("sport-fotboll.png", "Fotboll"),
  Futsal: ikon("sport-fotboll.png", "Futsal"),
  Handboll: ikon("sport-handboll.png", "Handboll"),
  Basket: ikon("sport-basket.png", "Basket"),
  Ishockey: ikon("sport-ishockey.png", "Ishockey"),
  Bandy: ikon("sport-bandy.png", "Bandy"),
  Volleyboll: ikon("sport-volleyboll.png", "Volleyboll"),
  // Innebandy har ingen egen ikon i samma Flaticon-serie - återanvänder
  // Bandy-bilden istället (liknande sport, samma typ av klubba).
  Innebandy: ikon("sport-bandy.png", "Innebandy"),
};

// Attributionstexten Flaticons licens kräver - visas direkt under
// sport-knapparna i positioner.js, nära där bilderna faktiskt används.
export const IKON_ATTRIBUTION_HTML =
  '<a href="https://www.flaticon.com/free-icons/sport" title="sport icons" target="_blank" rel="noopener">Sport icons created by Magnific - Flaticon</a>';