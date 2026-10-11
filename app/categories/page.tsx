import { Suspense } from "react";
import { CategoriesScreen } from "@/components/shop/CatalogScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <CategoriesScreen />
    </Suspense>
  );
}
