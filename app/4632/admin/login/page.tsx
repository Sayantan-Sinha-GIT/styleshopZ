import { Suspense } from "react";
import { LoginScreen } from "@/components/shop/AccountScreens";

export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading owner sign-in…</div>}>
      <LoginScreen ownerOnly />
    </Suspense>
  );
}
