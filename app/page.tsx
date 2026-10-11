import { Suspense } from "react";
import { HomeScreen } from "@/components/shop/CatalogScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <HomeScreen />
    </Suspense>
  );
}
