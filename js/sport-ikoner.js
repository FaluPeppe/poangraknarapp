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

// Fallback: min egen handritade SVG för Innebandy (ingen matchande färdig
// ikon hittades i samma Flaticon-serie som de andra sex).
const INNEBANDY_SVG = `<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true">
    <circle cx="27" cy="9" r="6" fill="currentColor"/>
    <path d="M27 15 L29 32" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M29 32 L23 50" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M29 32 L36 50" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M28 21 L40 30" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M28 23 L38 34" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40 30 L51 50" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="53" cy="54" r="4" fill="currentColor"/>
  </svg>`;

export const SPORT_SVG = {
  Fotboll: ikon("sport-fotboll.png", "Fotboll"),
  Futsal: ikon("sport-fotboll.png", "Futsal"),
  Handboll: ikon("sport-handboll.png", "Handboll"),
  Basket: ikon("sport-basket.png", "Basket"),
  Ishockey: ikon("sport-ishockey.png", "Ishockey"),
  Bandy: ikon("sport-bandy.png", "Bandy"),
  Volleyboll: ikon("sport-volleyboll.png", "Volleyboll"),
  // Innebandy har ingen egen ikon i samma Flaticon-serie - använder min
  // handritade fallback-SVG istället (helt fri att använda, ingen licens).
  Innebandy: INNEBANDY_SVG,
};

// Attributionstexten Flaticons licens kräver - visas direkt under
// sport-knapparna i positioner.js, nära där bilderna faktiskt används.
export const IKON_ATTRIBUTION_HTML =
  '<a href="https://www.flaticon.com/free-icons/sport" title="sport icons" target="_blank" rel="noopener">Sport icons created by Magnific - Flaticon</a>';