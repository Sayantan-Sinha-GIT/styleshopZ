import { Suspense } from "react";
import { AdminScreen } from "@/components/shop/ManagementScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <AdminScreen />
    </Suspense>
  );
}
