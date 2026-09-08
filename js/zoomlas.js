// Låser sid-zoom (pinch/dubbeltryck) via viewport-metataggen - personlig
// inställning, LÅST (ingen zoom) som standard, sparas lokalt i
// webbläsaren (inte per lag). Samma mönster som rotationslas.js.
//
// OBS om webbläsarstöd:
//  - Fungerar i Android Chrome, som respekterar maximum-scale/
//    user-scalable i viewport-metataggen.
//  - iPhone/Safari IGNORERAR user-scalable=no helt sedan iOS 10 - Apple
//    gör det med flit av tillgänglighetsskäl (alla ska kunna zooma om de
//    behöver), oavsett vad en sida ber om. Går alltså inte att låsa på
//    iPhone - samma begränsning som "Lås till stående läge".

import { byggInstallningsRad } from "./ui.js";

const NYCKEL = "kif_zoomlas";
const VIEWPORT_FRI = "width=device-width, initial-scale=1.0";
const VIEWPORT_LAST = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";

export function zoomlastLage() {
  return localStorage.getItem(NYCKEL) !== "av"; // låst som standard
}

export function sparaZoomlasLage(last) {
  localStorage.setItem(NYCKEL, last ? "pa" : "av");
  initZoomlas();
}

// Kallas vid appstart och varje gång inställningen ändras.
export function initZoomlas() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  meta.setAttribute("content", zoomlastLage() ? VIEWPORT_LAST : VIEWPORT_FRI);
}

// Bygger en inställningsrad (etikett + kryssruta) för Appinställningar.
export function byggZoomlasValjare() {
  const kontroll = document.createElement("div");
  kontroll.className = "installning-kontroll";
  const rad = document.createElement("label");
  rad.className = "radio-rad";
  const kryss = document.createElement("input");
  kryss.type = "checkbox";
  kryss.checked = zoomlastLage();
  kryss.onchange = () => sparaZoomlasLage(kryss.checked);
  rad.appendChild(kryss);
  rad.appendChild(document.createTextNode(" Lås zoom"));
  kontroll.appendChild(rad);

  return byggInstallningsRad(
    "Zoom",
    "Hindrar att sidan zoomas med pinch eller dubbeltryck. Fungerar bara i Android Chrome - iPhone/Safari tillåter alltid zoom av tillgänglighetsskäl, oavsett den här inställningen.",
    kontroll
  );
}
