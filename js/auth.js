// Allt som rör inloggning: token-lagring, det autentiserade anropet som
// alla andra skärmar (poäng, grupper, spelare, ...) ska använda för att
// prata med sin Worker, samt själva inloggningsformulärets logik.
//
// Flödet är numera BARA e-post (ingen lagkod) - se auth-worker.js för
// den fulla motiveringen. Tre steg i UI:t:
//   1. Ange e-post -> skicka kod
//   2. Ange koden -> antingen loggas man in direkt (redan medlem
//      nagonstans), ELLER visas steg 3 om eposten är helt ny.
//   3. (bara for nya epostadresser) Ange lagnamn+sport -> skapar laget.
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

export async function skickaKod(epost) {
  const res = await fetch(AUTH_WORKER_URL + "/auth/starta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ epost }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Kunde inte skicka kod. Försök igen.");
}

// Returnerar { klar: true } om inloggningen är fullständig (token sparad),
// eller { klar: false, pending_token } om eposten var ny och steg 3
// (Skapa lag) behöver visas härnäst.
export async function verifieraKod(epost, kod) {
  const res = await fetch(AUTH_WORKER_URL + "/auth/verifiera", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ epost, kod }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fel kod. Försök igen.");
  if (data.token) {
    sparaToken(data.token);
    return { klar: true };
  }
  if (data.ny_anvandare && data.pending_token) {
    return { klar: false, pending_token: data.pending_token };
  }
  throw new Error("Oväntat svar från servern.");
}

export async function skapaLag(lagnamn, sport, pending_token) {
  const res = await fetch(AUTH_WORKER_URL + "/auth/nytt-lag", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + pending_token },
    body: JSON.stringify({ lagnamn, sport }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.error || "Kunde inte skapa laget. Försök igen.");
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
  const stegNyttLag = document.getElementById("login-steg-nytt-lag");
  const felEpost = document.getElementById("login-fel-1");
  const felKod = document.getElementById("login-fel-2");
  const felNyttLag = document.getElementById("login-fel-3");
  let vantande_epost = null;
  let pending_token = null;

  function doljAllaSteg() {
    stegEpost.classList.add("dold");
    stegKod.classList.add("dold");
    stegNyttLag.classList.add("dold");
    felEpost.textContent = "";
    felKod.textContent = "";
    felNyttLag.textContent = "";
  }

  function visaEpostSteg() {
    doljAllaSteg();
    stegEpost.classList.remove("dold");
  }

  function visaKodSteg() {
    doljAllaSteg();
    stegKod.classList.remove("dold");
    document.getElementById("in-kod").value = "";
  }

  function visaNyttLagSteg() {
    doljAllaSteg();
    stegNyttLag.classList.remove("dold");
  }

  document.getElementById("skicka-kod-knapp").addEventListener("click", async () => {
    const epost = document.getElementById("in-epost").value.trim();
    felEpost.textContent = "";
    if (!epost) {
      felEpost.textContent = "Ange din e-postadress.";
      return;
    }
    const knapp = document.getElementById("skicka-kod-knapp");
    knapp.disabled = true;
    try {
      await skickaKod(epost);
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
      const resultat = await verifieraKod(vantande_epost, kod);
      if (resultat.klar) {
        callbacks.efterInloggning();
      } else {
        pending_token = resultat.pending_token;
        visaNyttLagSteg();
      }
    } catch (fel) {
      felKod.textContent = fel.message;
    } finally {
      knapp.disabled = false;
    }
  });

  document.getElementById("skapa-lag-knapp").addEventListener("click", async () => {
    const lagnamn = document.getElementById("in-nytt-lagnamn").value.trim();
    const sport = document.getElementById("in-nytt-sport").value;
    felNyttLag.textContent = "";
    if (!lagnamn) {
      felNyttLag.textContent = "Ange ett lagnamn.";
      return;
    }
    const knapp = document.getElementById("skapa-lag-knapp");
    knapp.disabled = true;
    try {
      await skapaLag(lagnamn, sport, pending_token);
      callbacks.efterInloggning();
    } catch (fel) {
      felNyttLag.textContent = fel.message;
    } finally {
      knapp.disabled = false;
    }
  });

  document.getElementById("tillbaka-knapp").addEventListener("click", visaEpostSteg);
  const tillbakaFranNyttLag = document.getElementById("tillbaka-fran-nytt-lag-knapp");
  if (tillbakaFranNyttLag) tillbakaFranNyttLag.addEventListener("click", visaEpostSteg);
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

  // Inbjudningslänk: e-postadressen ligger i URL-fragmentet
  // (#epost=...) - förifyll fältet så den inbjudna bara behöver
  // trycka "Skicka kod". Fragmentet plockas bort direkt efteråt så
  // adressen inte ligger kvar i adressfältet/historiken.
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const inbjudenEpost = (hash.get("epost") || "").trim();
    if (inbjudenEpost) {
      document.getElementById("in-epost").value = inbjudenEpost;
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  } catch (fel) {
    // Trasigt fragment - strunta i det, vanliga inloggningen funkar ändå.
  }
}