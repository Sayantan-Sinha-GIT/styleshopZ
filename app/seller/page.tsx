import { Suspense } from "react";
import { SellerScreen } from "@/components/shop/ManagementScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <SellerScreen />
    </Suspense>
  );
}
