import { Suspense } from "react";
import { OrdersScreen } from "@/components/shop/OrderScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <OrdersScreen />
    </Suspense>
  );
}
