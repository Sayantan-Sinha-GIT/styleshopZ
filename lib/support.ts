export const supportCategories = [
  ["order_delivery", "Order or delivery"],
  ["payment_refund", "Payment or refund"],
  ["return_replacement", "Return or replacement"],
  ["product_issue", "Product issue"],
  ["account_access", "Account or sign-in"],
  ["seller_shop", "Seller shop"],
  ["technical_issue", "App or website"],
  ["other", "Something else"],
] as const;

export function supportCategoryLabel(value: string): string {
  return supportCategories.find(([key]) => key === value)?.[1] || "Something else";
}
