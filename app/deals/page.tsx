import { Suspense } from "react";
import { DealsScreen } from "@/components/shop/CatalogScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <DealsScreen />
    </Suspense>
  );
}
