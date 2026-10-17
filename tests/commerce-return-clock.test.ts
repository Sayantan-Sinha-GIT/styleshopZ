import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({future:false,inserts:0}));
vi.mock("../lib/server/db",()=>({
  query:vi.fn(),
  transaction:async(run:any)=>run(async(sql:string)=>{
    if(sql.startsWith("SELECT i.*"))return [{id:"11111111-1111-4111-8111-111111111111",status:"delivered",delivered_at:state.future?"2026-10-16T00:00:11Z":"2026-10-16T00:00:09Z",eligibility_checked_at:"2026-10-16T00:00:10Z",unit_price_paise:10000,quantity:1}];
    if(sql.startsWith("SELECT * FROM returns"))return [];
    if(sql.startsWith("INSERT INTO returns")){state.inserts++;return [{id:"return-fixture",status:"requested",resolution:"refund"}];}
    return [];
  }),
}));
import { requestReturn } from "../lib/server/commerce";
beforeEach(()=>{state.future=false;state.inserts=0;vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-16T00:00:00Z"));});
afterEach(()=>vi.useRealTimers());
it("uses the database clock for freshly delivered items when the application clock is behind",async()=>{
  await expect(requestReturn("fixture-user",{orderItemId:"11111111-1111-4111-8111-111111111111",reason:"Return clock regression fixture"})).resolves.toMatchObject({status:"requested"});
  expect(state.inserts).toBe(1);
});
it("still rejects delivery timestamps in the future relative to the database clock",async()=>{
  state.future=true;
  await expect(requestReturn("fixture-user",{orderItemId:"11111111-1111-4111-8111-111111111111",reason:"Return clock regression fixture"})).rejects.toMatchObject({status:409});
  expect(state.inserts).toBe(0);
});
