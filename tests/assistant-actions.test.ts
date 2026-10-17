import { beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({claims:new Set<string>(),cartCalls:0,fail:false}));
vi.mock("../lib/server/db",()=>({
  query:async(sql:string,params:any[])=>{
    if(sql.startsWith("INSERT INTO rate_limits")){
      if(state.claims.has(params[0]))return [];
      state.claims.add(params[0]);return [{key:params[0]}];
    }
    if(sql.startsWith("DELETE FROM rate_limits")){state.claims.delete(params[0]);return [];}
    return [];
  },
  transaction:async(run:any)=>run(async()=>[]),
}));
vi.mock("../lib/server/session",()=>({requireUser:async()=>({id:"qa-user",role:"customer"}),verifyToken:(token:string)=>JSON.parse(token),signToken:(data:any)=>JSON.stringify(data)}));
vi.mock("../lib/server/account",()=>({
  cartMutation:async()=>{state.cartCalls++;if(state.fail)throw new Error("Temporary stock failure");return {ok:true};},
  wishlists:async()=>({ok:true}),
}));
vi.mock("../lib/server/commerce",()=>({cancelOrder:async()=>({ok:true}),requestReturn:async()=>({ok:true})}));
vi.mock("../lib/server/catalog",()=>({catalogue:async()=>({products:[]}),cartItems:async()=>({items:[],subtotalPaise:0})}));
vi.mock("../lib/ai",()=>({aiEnabled:()=>false,complete:vi.fn()}));
import { assistant } from "../lib/server/assistant";
const confirmation=JSON.stringify({kind:"action",sub:"qa-user",action:"cart",id:"qa-variant"});
beforeEach(()=>{state.claims.clear();state.cartCalls=0;state.fail=false;});

it("rejects replays of the same confirmed cart action",async()=>{
  await expect(assistant("POST",{confirmation})).resolves.toMatchObject({reply:"Your confirmed action is complete."});
  await expect(assistant("POST",{confirmation})).rejects.toMatchObject({status:409});
  expect(state.cartCalls).toBe(1);
});
it("allows only one of two simultaneous confirmations to mutate the cart",async()=>{
  const results=await Promise.allSettled([assistant("POST",{confirmation}),assistant("POST",{confirmation})]);
  expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
  expect(state.cartCalls).toBe(1);
});
it("allows a failed action to be retried and rejects cross-account tokens",async()=>{
  state.fail=true;
  await expect(assistant("POST",{confirmation})).rejects.toThrow("Temporary stock failure");
  state.fail=false;
  await expect(assistant("POST",{confirmation})).resolves.toMatchObject({result:{ok:true}});
  const other=JSON.stringify({kind:"action",sub:"other-user",action:"cart",id:"qa-variant"});
  await expect(assistant("POST",{confirmation:other})).rejects.toThrow("expired");
  expect(state.cartCalls).toBe(2);
});
it("rejects unsupported mutation methods",async()=>{
  await expect(assistant("PATCH",{confirmation})).rejects.toMatchObject({status:405});
  expect(state.cartCalls).toBe(0);
});
