// Egna, handritade piktogram (svart siluett/streck-stil, inspirerat av
                               // klassiska sport-ikonpaket) för de åtta idrotterna i "Byt sport". Ingen
// kopiering av något licensierat ikonpaket - dessa är enkla original som
// bygger på cirklar+streck, fill="currentColor" så de ärver textfärgen.
//
  // Futsal återanvänder samma pose som Fotboll (samma sorts löpning/skott) -
  // ingen anledning att rita en helt egen pose för en så lik idrott.

const VIEWBOX = "0 0 64 64";
const STIL = 'fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';

function svg(inre) {
  return `<svg viewBox="${VIEWBOX}" width="26" height="26" aria-hidden="true">${inre}</svg>`;
}

export const SPORT_SVG = {
  Fotboll: svg(`
               <circle cx="30" cy="10" r="6" fill="currentColor"/>
                 <path d="M30 16 L27 32" ${STIL}/>
                 <path d="M27 32 L19 44 L13 52" ${STIL}/>
                 <path d="M27 32 L38 38 L48 34" ${STIL}/>
                 <path d="M29 19 L19 23" ${STIL}/>
                 <path d="M29 19 L40 15" ${STIL}/>
                 <circle cx="52" cy="38" r="5" fill="currentColor"/>
                 `),
  Futsal: svg(`
              <circle cx="30" cy="10" r="6" fill="currentColor"/>
                <path d="M30 16 L27 32" ${STIL}/>
                <path d="M27 32 L19 44 L13 52" ${STIL}/>
                <path d="M27 32 L38 38 L48 34" ${STIL}/>
                <path d="M29 19 L19 23" ${STIL}/>
                <path d="M29 19 L40 15" ${STIL}/>
                <circle cx="52" cy="38" r="5" fill="currentColor"/>
                `),
  Handboll: svg(`
                <circle cx="30" cy="9" r="6" fill="currentColor"/>
                  <path d="M30 15 L30 34" ${STIL}/>
                  <path d="M30 34 L22 50" ${STIL}/>
                  <path d="M30 34 L37 51" ${STIL}/>
                  <path d="M30 19 L20 26" ${STIL}/>
                  <path d="M30 18 L43 9 L49 4" ${STIL}/>
                  <circle cx="49" cy="4" r="5" fill="currentColor"/>
                  `),
  Innebandy: svg(`
                 <circle cx="27" cy="9" r="6" fill="currentColor"/>
                   <path d="M27 15 L29 32" ${STIL}/>
                   <path d="M29 32 L23 50" ${STIL}/>
                   <path d="M29 32 L36 50" ${STIL}/>
                   <path d="M28 21 L40 30" ${STIL}/>
                   <path d="M28 23 L38 34" ${STIL}/>
                   <path d="M40 30 L51 50" ${STIL}/>
                   <circle cx="53" cy="54" r="4" fill="currentColor"/>
                   `),
  Basket: svg(`
              <circle cx="25" cy="9" r="6" fill="currentColor"/>
                <path d="M25 15 L29 31" ${STIL}/>
                <path d="M29 31 L21 47" ${STIL}/>
                <path d="M29 31 L35 49" ${STIL}/>
                <path d="M27 19 L17 15" ${STIL}/>
                <path d="M27 21 L33 35 L37 43" ${STIL}/>
                <circle cx="39" cy="47" r="5" fill="currentColor"/>
                `),
  Ishockey: svg(`
                <circle cx="27" cy="9" r="6" fill="currentColor"/>
                  <path d="M27 15 L29 30" ${STIL}/>
                  <path d="M29 30 L19 48" ${STIL}/>
                  <path d="M29 30 L37 48" ${STIL}/>
                  <path d="M28 21 L37 27" ${STIL}/>
                  <path d="M28 23 L35 31" ${STIL}/>
                  <path d="M37 27 L47 44" ${STIL}/>
                  <rect x="46" y="45" width="7" height="4" rx="1.5" fill="currentColor"/>
                  `),
  Bandy: svg(`
             <circle cx="27" cy="9" r="6" fill="currentColor"/>
               <path d="M27 15 L29 30" ${STIL}/>
               <path d="M29 30 L19 48" ${STIL}/>
               <path d="M29 30 L37 48" ${STIL}/>
               <path d="M28 21 L37 27" ${STIL}/>
               <path d="M28 23 L35 31" ${STIL}/>
               <path d="M37 27 Q46 36 50 44" ${STIL}/>
               <circle cx="52" cy="47" r="4" fill="currentColor"/>
               `),
  Volleyboll: svg(`
                  <circle cx="30" cy="8" r="6" fill="currentColor"/>
                    <path d="M30 14 L30 30" ${STIL}/>
                    <path d="M30 30 L23 40 L19 36" ${STIL}/>
                    <path d="M30 30 L36 44 L40 52" ${STIL}/>
                    <path d="M30 18 L21 22" ${STIL}/>
                    <path d="M30 16 L38 8" ${STIL}/>
                    <circle cx="40" cy="6" r="5" fill="currentColor"/>
                    `),
};