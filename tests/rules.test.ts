import { it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { signToken, verifyToken } from "../lib/auth";
import {
  totals,
  discountFor,
  lineItems,
  canReturn,
  address,
} from "../lib/server/rules";
import { hmacValid } from "../lib/server/commerce";
it("server totals use threshold, express fee and rounded capped coupons", () => {
  expect(totals(49899).totalPaise).toBe(53899);
  expect(totals(49900).deliveryFeePaise).toBe(0);
  expect(totals(50000, 1000, "express").totalPaise).toBe(58900);
  expect(
    discountFor({ discount_type: "percent", discount_value: 15 }, 9999),
  ).toBe(1500);
  expect(
    discountFor({ discount_type: "flat", discount_value: 99999 }, 100),
  ).toBe(100);
});
it("rejects duplicate, fractional and excessive quantities", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  for (const items of [
    [],
    [{ variantId: id, quantity: 1.5 }],
    [{ variantId: id, quantity: 11 }],
    [
      { variantId: id, quantity: 1 },
      { variantId: id, quantity: 2 },
    ],
  ])
    expect(() => lineItems(items)).toThrow();
  expect(lineItems([{ variantId: id, quantity: 10 }])[0].quantity).toBe(10);
});
it("validates Indian addresses", () => {
  const a = {
    name: "Test Customer",
    phone: "9876543210",
    line1: "10 Test Road",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
  };
  expect(address(a).pincode).toBe("700001");
  expect(() => address({ ...a, pincode: "000000" })).toThrow();
  expect(() => address({ ...a, phone: "1234567890" })).toThrow();
});
it("limits returns to delivered items within seven days", () => {
  const now = 1800000000000;
  expect(
    canReturn("delivered", new Date(now - 7 * 86400000).toISOString(), now),
  ).toBe(true);
  expect(
    canReturn("delivered", new Date(now - 7 * 86400000 - 1).toISOString(), now),
  ).toBe(false);
  expect(canReturn("shipped", new Date(now).toISOString(), now)).toBe(false);
  expect(canReturn("delivered", new Date(now + 1).toISOString(), now)).toBe(
    false,
  );
});
it("rejects session tampering and expiry", () => {
  const token = signToken({ sub: "test" });
  expect(verifyToken(token)?.sub).toBe("test");
  expect(verifyToken(token.slice(0, -5) + "aaaaa")).toBeNull();
  expect(verifyToken(signToken({ sub: "test" }, -1))).toBeNull();
  expect(verifyToken("invalid")).toBeNull();
});
it("validates exact webhook bytes and complete HMAC", () => {
  const body = '{"amount":1234}',
    secret = "test-secret",
    signature = createHmac("sha256", secret).update(body).digest("hex");
  expect(hmacValid(body, signature, secret)).toBe(true);
  expect(hmacValid(body + " ", signature, secret)).toBe(false);
  expect(hmacValid(body, signature.slice(0, 32), secret)).toBe(false);
  expect(hmacValid(body, signature, undefined)).toBe(false);
});
