import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const state=vi.hoisted(()=>({transaction:vi.fn()}));
vi.mock("../lib/server/db",()=>({query:vi.fn(),transaction:state.transaction}));
import { cancelOrder, paymentWebhook } from "../lib/server/commerce";
beforeEach(()=>{state.transaction.mockReset();vi.stubEnv("RAZORPAY_WEBHOOK_SECRET","fixture-webhook-secret");});
afterEach(()=>vi.unstubAllEnvs());
function signed(raw:string){return new Request("https://shop.example/api/payments/webhook",{method:"POST",headers:{"x-razorpay-signature":createHmac("sha256","fixture-webhook-secret").update(raw).digest("hex")},body:raw});}

it("validates a cancellation reason before any database or payment side effect",async()=>{
  await expect(cancelOrder("fixture","fixture","x")).rejects.toMatchObject({status:400});
  expect(state.transaction).not.toHaveBeenCalled();
});
it("returns validation errors for signed malformed webhook bodies",async()=>{
  for(const raw of ["{broken","null","[]"])
    await expect(paymentWebhook(signed(raw))).rejects.toMatchObject({status:400});
  expect(state.transaction).not.toHaveBeenCalled();
});
it("rejects captured payment events with unsafe scalar values before opening a transaction",async()=>{
  const entity={id:"pay_fixture",order_id:"order_fixture",amount:100,currency:"INR",status:"captured"};
  for(const override of [{id:3},{order_id:[]},{amount:"100"},{amount:1.5},{amount:-1},{currency:"USD"},{status:"authorized"}]){
    const raw=JSON.stringify({event:"payment.captured",payload:{payment:{entity:{...entity,...override}}}});
    await expect(paymentWebhook(signed(raw))).rejects.toMatchObject({status:400});
  }
  expect(state.transaction).not.toHaveBeenCalled();
});
