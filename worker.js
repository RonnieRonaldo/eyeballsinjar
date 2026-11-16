const price = "pri_01m7cekc2zqnpdg9cmtyg8daz8";
const file = "printable-specimen-jars.pdf";
const privateHeaders = { "Cache-Control": "private, no-store" };

function message(text, status) {
  return new Response(text, { status, headers: privateHeaders });
}

async function receiveContact(request, env) {
  if (request.method !== "POST") return message("Please submit the contact form.", 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin) return message("Please use the contact page.", 403);
  const length = Number(request.headers.get("Content-Length"));
  if (!length || length > 48000) return message("Please use a shorter message.", 413);
  if (!request.headers.get("Content-Type")?.startsWith("application/x-www-form-urlencoded")) return message("Invalid form.", 415);
  try {
    const form = await request.formData();
    if (form.get("website")) return message("Received.", 200);
    const email = String(form.get("email") || "").trim();
    const body = String(form.get("message") || "").trim();
    const topic = form.get("topic");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !body || body.length > 3000 ||
        !["Printing and jar sizes", "Payment or download help", "Other question"].includes(topic)) {
      return message("Please check the form fields.", 400);
    }
    const received = new Date().toISOString();
    const key = "contact/" + received.replaceAll(":", "-") + "-" + crypto.randomUUID() + ".json";
    await env.DOWNLOADS.put(key, JSON.stringify({received, email, topic, message: body}, null, 2),
      {httpMetadata: {contentType: "application/json"}});
    return message("Thank you. Your message has been received.", 201);
  } catch {
    return message("Your message could not be saved. Please try again.", 503);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/contact") return receiveContact(request, env);
    if (!["/api/store-ready", "/api/download"].includes(path)) return env.ASSETS.fetch(request);
    try {
      if (!env.PADDLE_API_KEY || !env.DOWNLOADS) return message("The shop is temporarily unavailable.", 503);
      if (path === "/api/store-ready") {
        return await env.DOWNLOADS.head(file) ? message("Ready", 200) : message("The PDF is unavailable.", 503);
      }
      if (request.method !== "POST") return message("Use the download button.", 405);
      const form = await request.formData();
      const id = form.get("transaction");
      const proof = form.get("proof");
      if (!/^txn_[a-z0-9]{26}$/.test(id) || !/^[a-f0-9]{64}$/.test(proof)) return message("Invalid order details.", 400);
      const result = await fetch("https://api.paddle.com/transactions/" + id, {
        headers: { Authorization: "Bearer " + env.PADDLE_API_KEY }
      });
      if (!result.ok) return message("We could not verify this order. Please try again.", result.status === 404 ? 404 : 503);
      const { data } = await result.json();
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(proof));
      const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
      if (data.custom_data?.jar_claim !== hash || !data.items.some(item => item.price.id === price)) {
        return message("This download belongs to another order.", 403);
      }
      if (data.status === "canceled") return message("This order was canceled.", 410);
      if (!["paid", "completed"].includes(data.status)) return message("Your payment is still being verified. Please try again shortly.", 409);
      const pdf = await env.DOWNLOADS.get(file);
      if (!pdf) return message("Your PDF is temporarily unavailable. Please try again.", 503);
      return new Response(pdf.body, { headers: { ...privateHeaders, "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="printable-specimen-jars.pdf"' } });
    } catch {
      return message("Download service temporarily unavailable. Please try again.", 503);
    }
  }
};
