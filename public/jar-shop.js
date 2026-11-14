const token = "live_1828e3bc6d51f5faac5ad2842d5";
const price = "pri_01m7cekc2zqnpdg9cmtyg8daz8";
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const buys = document.querySelectorAll("[data-buy]");
let initialized = false;

async function buy() {
  buys.forEach(b => b.disabled = true);
  try {
    if (!(await fetch("/api/store-ready", { cache: "no-store" })).ok) throw Error();
    if (!initialized) {
      Paddle.Initialize({ token, eventCallback(event) {
        if (event.name === "checkout.completed") {
          localStorage.setItem("jar-receipt", JSON.stringify({ id: event.data.transaction_id, claim: event.data.custom_data?.jar_claim || sessionStorage.getItem("jar-current-claim") }));
          location.assign("/jar-download.html");
        }
      } });
      initialized = true;
    }
    const proof = hex(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(proof));
    const claim = hex(new Uint8Array(digest));
    localStorage.setItem("jar-proof-" + claim, proof);
    Paddle.Checkout.open({ items: [{ priceId: price, quantity: 1 }], customData: { jar_claim: claim } });
    sessionStorage.setItem("jar-current-claim", claim);
  } catch {
    alert("Checkout is temporarily unavailable. Please try again later.");
  } finally {
    buys.forEach(b => b.disabled = false);
  }
}
buys.forEach(b => b.addEventListener("click", buy));
