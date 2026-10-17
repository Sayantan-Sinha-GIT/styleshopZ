import { expect, it } from "vitest";
import { cartItems } from "../lib/server/catalog";
it("keeps unavailable cart lines visible without claiming they can be purchased",async()=>{
  const available={title:"Fixture",quantity:1,stock:2,product_status:"live",product_deleted_at:null,seller_status:"approved",unit_price_paise:100};
  const rows=[available,{...available,seller_status:"suspended"},{...available,product_deleted_at:"2026-10-15"},{...available,product_status:"hidden"},{...available,stock:0}];
  const cart=await cartItems("fixture",async()=>rows as any);
  expect(cart.items.map(item=>item.in_stock)).toEqual([true,false,false,false,false]);
});
