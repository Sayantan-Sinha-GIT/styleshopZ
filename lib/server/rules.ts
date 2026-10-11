export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(
  value: any,
  message: string,
  status = 400,
): asserts value {
  if (!value) throw new ApiError(status, message);
}
export function text(
  value: unknown,
  label: string,
  min = 1,
  max = 150,
): string {
  assert(typeof value === "string", `${label} is required.`);
  const cleaned = value.trim();
  assert(
    cleaned.length >= min && cleaned.length <= max,
    `${label} must have ${min}–${max} characters.`,
  );
  return cleaned;
}
export function uuid(value: unknown): string {
  assert(
    typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ),
    "Invalid record ID.",
  );
  return value;
}
export function integer(
  value: unknown,
  min: number,
  max: number,
  label = "Quantity",
): number {
  const n = Number(value);
  assert(
    Number.isSafeInteger(n) && n >= min && n <= max,
    `${label} must be a whole number from ${min} to ${max}.`,
  );
  return n;
}
export function address(value: any) {
  assert(value && typeof value === "object", "Add a delivery address.");
  const a = {
    name: text(value.name, "Name", 2, 100),
    phone: text(value.phone, "Phone", 10, 16),
    line1: text(value.line1, "Address", 5, 200),
    line2: String(value.line2 || "")
      .trim()
      .slice(0, 200),
    city: text(value.city, "City", 2, 80),
    state: text(value.state, "State", 2, 80),
    pincode: text(value.pincode, "Pincode", 6, 6),
    latitude: value.latitude === undefined || value.latitude === null || value.latitude === '' ? null : Number(value.latitude),
    longitude: value.longitude === undefined || value.longitude === null || value.longitude === '' ? null : Number(value.longitude),
  };
  assert(
    (a.latitude === null && a.longitude === null) || (a.latitude !== null && a.longitude !== null && Number.isFinite(a.latitude) && Math.abs(a.latitude)<=90 && Number.isFinite(a.longitude) && Math.abs(a.longitude)<=180),
    'Choose a valid delivery pin on the map.',
  );
  assert(
    /^[1-9]\d{5}$/.test(a.pincode),
    "Enter a valid six-digit Indian pincode.",
  );
  assert(
    /^(?:\+91|91)?[6-9]\d{9}$/.test(a.phone.replace(/[\s-]/g, "")),
    "Enter a valid Indian mobile number.",
  );
  return a;
}
export function lineItems(
  value: any,
): { variantId: string; quantity: number }[] {
  assert(
    Array.isArray(value) && value.length > 0 && value.length <= 50,
    "Choose between 1 and 50 items.",
  );
  const items = value.map((v) => ({
    variantId: uuid(v.variantId),
    quantity: integer(v.quantity, 1, 10),
  }));
  assert(
    new Set(items.map((v) => v.variantId)).size === items.length,
    "Combine duplicate variants in your cart.",
  );
  return items.sort((a, b) => a.variantId.localeCompare(b.variantId));
}
export function discountFor(coupon: any, subtotal: number) {
  return Math.min(
    subtotal,
    coupon.discount_type === "percent"
      ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
      : Number(coupon.discount_value),
  );
}
export function totals(subtotal: number, discount = 0, delivery = "standard") {
  const fee = delivery === "express" ? 9900 : subtotal >= 49900 ? 0 : 4000;
  return {
    subtotalPaise: subtotal,
    discountPaise: discount,
    deliveryFeePaise: fee,
    totalPaise: Math.max(0, subtotal - discount) + fee,
  };
}
export const transitions: Record<string, string> = {
  placed: "packed",
  packed: "shipped",
  shipped: "out_for_delivery",
  out_for_delivery: "delivered",
};
export function canReturn(
  status: string,
  delivered: string | null,
  now = Date.now(),
) {
  return (
    status === "delivered" &&
    !!delivered &&
    now - new Date(delivered).getTime() >= 0 &&
    now - new Date(delivered).getTime() <= 7 * 86400000
  );
}
export function safeImage(value: any) {
  assert(
    typeof value === "string" &&
      (value.startsWith("/photos/") ||
        value.startsWith("/uploads/") ||
        /^https:\/\/[^\s]+\.supabase\.co\//.test(value)),
    "Use a shop image or an uploaded image.",
  );
  return value;
}
