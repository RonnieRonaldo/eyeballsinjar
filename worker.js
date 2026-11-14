const price = "pri_01m7cekc2zqnpdg9cmtyg8daz8";
const file = "printable-specimen-jars.pdf";
const privateHeaders = { "Cache-Control": "private, no-store" };

function message(text, status) {
  return new Response(text, { status, headers: privateHeaders });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
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
