import { Suspense } from "react";
import { CartScreen } from "@/components/shop/OrderScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <CartScreen />
    </Suspense>
  );
}
