import { expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({variantWrites:0}));
vi.mock("../lib/server/db",()=>({
  query:vi.fn(),
  transaction:async(run:any)=>run(async(sql:string)=>{
    if(sql.startsWith("SELECT id FROM categories"))return [{id:"fixture-category"}];
    if(sql.startsWith("INSERT INTO variants"))state.variantWrites++;
    return [];
  }),
}));
vi.mock("../lib/server/session",()=>({requireUser:async()=>({id:"fixture-owner",role:"seller",seller_status:"approved",seller_id:"fixture-seller"})}));
import { saveProduct } from "../lib/server/management";
it("returns a validation error for malformed nested product variants",async()=>{
  const product={title:"Fixture product",brand:"QA",description:"Isolated malformed variant regression.",categoryId:"11111111-1111-4111-8111-111111111111",status:"live"};
  for(const variant of [null,[],true,1,"invalid",{}])
    await expect(saveProduct("POST",{...product,variants:[variant]},new URLSearchParams())).rejects.toMatchObject({status:400});
  expect(state.variantWrites).toBe(0);
});
