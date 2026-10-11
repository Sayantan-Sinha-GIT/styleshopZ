import { OrderScreen } from "@/components/shop/OrderScreens";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderScreen id={id} />;
}
