import { Suspense } from "react";
import { AdminScreen } from "@/components/shop/ManagementScreens";

export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading owner controls…</div>}>
      <AdminScreen />
    </Suspense>
  );
}
