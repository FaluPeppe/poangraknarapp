// Byter apple-touch-icon till lagets egna logga (Hantera lag), om admin
// satt en - annars ligger standardikonen (redan i index.html) kvar.
//
// Android/Chrome hanteras separat, SYNKRONT, i ett inline-script i
// index.html (pekar om <link rel="manifest"> mot workerns publika
// GET /manifest/:lagkod innan sidan hunnit avgöra om appen är
// installerbar). Den här filen sköter bara apple-touch-icon-taggen, som
// Safari läser separat och ignorerar manifestets ikoner för - det är
// ofarligt att göra ASYNKRONT här eftersom iPhone bara läser taggen när
// man manuellt öppnar Dela-menyn och trycker "Lägg till på hemskärmen",
// långt efter att sidan laddat klart.
//
// OBS: ändrar bara vad NÄSTA "Lägg till på hemskärmen" hämtar - en redan
// installerad ikon uppdateras inte i efterhand (samma begränsning som när
// vi bytte den hårdkodade Korsnäs-ikonen, se minnesanteckningen om PWA).

import { anropaMedToken } from "./auth.js";

export async function initHemskarmsikon(on401) {
  let res;
  try {
    res = await anropaMedToken("/lag/logotyp", {}, on401);
  } catch (fel) {
    return; // strunt samma - standardikonen i HTML:en duger fint
  }
  if (!res.ok) return;
  const data = await res.json();
  const logga = (data.logotyp_url || "").trim();
  if (!logga) return; // inget eget val - rör inte standardtaggen

  const appleLank = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleLank) appleLank.setAttribute("href", logga);
}
