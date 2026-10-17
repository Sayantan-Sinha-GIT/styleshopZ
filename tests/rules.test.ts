import { it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { signToken, verifyToken } from "../lib/auth";
import {
  totals,
  discountFor,
  lineItems,
  canReturn,
  address,
  integer,
  uuid,
  passwordText,
  safeShopLink,
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
it("rejects malformed nested line items and normalizes case before duplicate detection", () => {
  for (const value of [[null], [true], [[]], ["item"]]) expect(() => lineItems(value)).toThrow("valid cart items");
  const id="abcdefab-cdef-4abc-8abc-abcdefabcdef";
  expect(uuid(id.toUpperCase())).toBe(id);
  expect(()=>lineItems([{variantId:id,quantity:1},{variantId:id.toUpperCase(),quantity:1}])).toThrow("duplicate");
});
it("does not coerce booleans, arrays or empty values into integers", () => {
  for (const value of [true,false,null,undefined,[],[1],{},""," ",NaN,Infinity]) expect(()=>integer(value,0,10)).toThrow();
  expect(integer("0",0,10)).toBe(0);
  expect(integer("10",0,10)).toBe(10);
});
it("caps password UTF-8 bytes before bcrypt can silently truncate Unicode", () => {
  expect(passwordText("a".repeat(72))).toHaveLength(72);
  expect(passwordText("é".repeat(36))).toHaveLength(36);
  expect(()=>passwordText("é".repeat(37))).toThrow("72 UTF-8 bytes");
  expect(()=>passwordText("😀".repeat(19))).toThrow("72 UTF-8 bytes");
});
it("rejects internal links that browsers normalize to an external host", () => {
  expect(new URL("/\\outside.example","https://shop.example").origin).toBe("https://outside.example");
  for(const link of ["//outside.example","/\\outside.example","/\n/outside.example","https://outside.example","javascript:alert(1)"])
    expect(()=>safeShopLink(link)).toThrow("internal shop link");
  expect(safeShopLink("/search?category=electronics")).toBe("/search?category=electronics");
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
  expect(address({...a,latitude:'22.54',longitude:'88.34'}).latitude).toBe(22.54);
  for(const coords of [{latitude:91,longitude:88},{latitude:22,longitude:181},{latitude:'NaN',longitude:88},{latitude:22,longitude:null}])expect(()=>address({...a,...coords})).toThrow();
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
