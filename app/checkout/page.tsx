import { Suspense } from "react";
import { CheckoutScreen } from "@/components/shop/OrderScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <CheckoutScreen />
    </Suspense>
  );
}
