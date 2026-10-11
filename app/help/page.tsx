import { Suspense } from "react";
import { HelpScreen } from "@/components/shop/SupportScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <HelpScreen />
    </Suspense>
  );
}
