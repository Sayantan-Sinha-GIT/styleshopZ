import { Suspense } from "react";
import { StorefrontHome } from "@/components/shop/StorefrontHome";
export default function Page() {
  return (
    <Suspense fallback={<div className="page">Loading the shop…</div>}>
      <StorefrontHome />
    </Suspense>
  );
}
