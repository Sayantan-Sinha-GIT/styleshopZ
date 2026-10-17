import { expect, it } from "vitest";
import { assistantSearch } from "../lib/server/assistant-search";

it("finds the product when the user asks to add it to the cart", () => {
  const params=assistantSearch("Please add headphones to my cart under ₹2,999.50");
  expect(params?.get("q")).toBe("headphones");
  expect(params?.get("max_price")).toBe("299950");
  expect(assistantSearch("show my cart")).toBeNull();
});
it("preserves product model numbers and applies lower and upper budgets", () => {
  const params=assistantSearch("Find iPhone 15 above INR 15,000 and below Rs. 80,000");
  expect(params?.get("q")).toBe("iPhone 15");
  expect(params?.get("min_price")).toBe("1500000");
  expect(params?.get("max_price")).toBe("8000000");
});
it("keeps unsupported huge lower budgets empty instead of recommending cheaper items", () => {
  const params=assistantSearch("headphones above ₹99999999999999999999999999");
  expect(params?.get("min_price")).toBe("100000000");
  expect(params?.get("max_price")).toBe("0");
});
it("separates order and policy requests from product search", () => {
  for(const message of ["track my order","cancel my order","return this item","delivery policy"])
    expect(assistantSearch(message)).toBeNull();
});
