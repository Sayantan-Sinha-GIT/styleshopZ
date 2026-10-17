// Keep product intent and price bounds deterministic; the language model cannot
// choose prices, bypass the catalogue, or reinterpret the customer's budget.
export function assistantSearch(message: string): URLSearchParams | null {
  const cartAction = /\b(?:add|put)\b/.test(message.toLowerCase()) && /\bcart\b/.test(message.toLowerCase());
  if (/\b(cancel|return|order|track|policy|delivery)\b/i.test(message) || (/\bcart\b/i.test(message) && !cartAction)) return null;
  const budgetPattern = /\b(under|below|up to|above|over|at least)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)/gi;
  const params = new URLSearchParams({ limit: "4", sort: "price_asc" });
  const term = message.replace(budgetPattern, (_, direction: string, amount: string) => {
    const paise = Math.round(Number(amount.replaceAll(",", "")) * 100);
    if (Number.isSafeInteger(paise) && paise >= 0 && paise <= 100000000) {
      params.set(/above|over|at least/i.test(direction) ? "min_price" : "max_price", String(paise));
    } else if (/above|over|at least/i.test(direction)) {
      params.set("min_price", "100000000");
      params.set("max_price", "0");
    } else {
      params.set("max_price", "100000000");
    }
    return " ";
  }).replace(/\b(please|find|show|me|a|an|the|best|for|with|and|recommend|search|buy|add|put|to|my|wishlist|save|cart)\b/gi, " ").trim().replace(/\s+/g, " ");
  params.set("q", term);
  return params;
}
