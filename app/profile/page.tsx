import { Suspense } from "react";
import { ProfileScreen } from "@/components/shop/AccountScreens";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <ProfileScreen />
    </Suspense>
  );
}
