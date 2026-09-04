// Allt som rör inloggning: token-lagring, det autentiserade anropet som
// alla andra skärmar (poäng, grupper, spelare, ...) ska använda för att
// prata med sin Worker, samt själva inloggningsformulärets logik.
//
// De rena funktionerna (hamtaToken/sparaToken/taBortToken/anropaMedToken)
// har medvetet INGET DOM-beroende - de går att testa direkt i Node utan
// webbläsare. DOM-kopplingen (formulär, knappar) ligger samlad i
// initLogin() längst ner.

import { AUTH_WORKER_URL, POANG_WORKER_URL } from "./config.js";

const TOKEN_NYCKEL = "kif_token";

export function hamtaToken() {
  return localStorage.getItem(TOKEN_NYCKEL);
}

export function sparaToken(token) {
  localStorage.setItem(TOKEN_NYCKEL, token);
}

export function taBortToken() {
  localStorage.removeItem(TOKEN_NYCKEL);
}

// Anropar poäng-Workern (eller vilken skärm-Worker som helst mot samma
// bas-URL) med token i Authorization-headern. Vid 401 (utgången/ogiltig
// token) körs on401-callbacken och ett fel kastas, så anroparen kan
// avbryta sin egen logik (t.ex. sluta rendera en skärm som ändå kommer
// bytas ut). Ingen DOM-kod här - anroparen bestämmer själv vad "utloggad"
// ska betyda för användaren.
export async function anropaMedToken(path, opts = {}, on401 = () => {}) {
  const token = hamtaToken();
  const headers = Object.assign({}, opts.headers, { "Authorization": "Bearer " + token });
  const res = await fetch(POANG_WORKER_URL + path, Object.assign({}, opts, { headers }));
  if (res.status === 401) {
    taBortToken();
    on401();
    throw new Error("Utloggad");
  }
  return res;
}

export async function skickaKod(lagkod, epost) {
  const res = await fetch(AUTH_WORKER_URL + "/auth/starta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lagkod, epost }),
  });
  if (!res.ok) throw new Error("Kunde inte skicka kod. Försök igen.");
}

export async function verifieraKod(lagkod, epost, kod) {
  const res = await fetch(AUTH_WORKER_URL + "/auth/verifiera", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lagkod, epost, kod }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.error || "Fel kod. Försök igen.");
  sparaToken(data.token);
}

// ---- DOM-koppling för inloggningsformuläret ----
// callbacks.visaLoginVy / visaAppVy: växlar synlig skärm (i main.js).
// callbacks.efterInloggning: körs när token finns (nyss inloggad ELLER
// redan inloggad sedan tidigare) - main.js hänger sedan poäng-skärmens
// laddning på den.
export function initLogin(callbacks) {
  const stegEpost = document.getElementById("login-steg-epost");
  const stegKod = document.getElementById("login-steg-kod");
  const felEpost = document.getElementById("login-fel-1");
  const felKod = document.getElementById("login-fel-2");
  let vantande_lagkod = null;
  let vantande_epost = null;

  function visaEpostSteg() {
    stegEpost.classList.remove("dold");
    stegKod.classList.add("dold");
    felEpost.textContent = "";
    felKod.textContent = "";
  }

  function visaKodSteg() {
    stegEpost.classList.add("dold");
    stegKod.classList.remove("dold");
    document.getElementById("in-kod").value = "";
  }

  document.getElementById("skicka-kod-knapp").addEventListener("click", async () => {
    const lagkod = document.getElementById("in-lagkod").value.trim();
    const epost = document.getElementById("in-epost").value.trim();
    felEpost.textContent = "";
    if (!lagkod || !epost) {
      felEpost.textContent = "Fyll i både lagkod och e-postadress.";
      return;
    }
    const knapp = document.getElementById("skicka-kod-knapp");
    knapp.disabled = true;
    try {
      await skickaKod(lagkod, epost);
      vantande_lagkod = lagkod;
      vantande_epost = epost;
      visaKodSteg();
    } catch (fel) {
      felEpost.textContent = fel.message;
    } finally {
      knapp.disabled = false;
    }
  });

  document.getElementById("verifiera-kod-knapp").addEventListener("click", async () => {
    const kod = document.getElementById("in-kod").value.trim();
    felKod.textContent = "";
    if (!/^\d{6}$/.test(kod)) {
      felKod.textContent = "Ange den 6-siffriga koden.";
      return;
    }
    const knapp = document.getElementById("verifiera-kod-knapp");
    knapp.disabled = true;
    try {
      await verifieraKod(vantande_lagkod, vantande_epost, kod);
      callbacks.efterInloggning();
    } catch (fel) {
      felKod.textContent = fel.message;
    } finally {
      knapp.disabled = false;
    }
  });

  document.getElementById("tillbaka-knapp").addEventListener("click", visaEpostSteg);
  document.getElementById("in-kod").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("verifiera-kod-knapp").click();
  });
  document.getElementById("in-epost").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("skicka-kod-knapp").click();
  });
  document.getElementById("logga-ut-knapp").addEventListener("click", () => {
    taBortToken();
    visaEpostSteg();
    callbacks.visaLoginVy();
  });

  visaEpostSteg();
}
