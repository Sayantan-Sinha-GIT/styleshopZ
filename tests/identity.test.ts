import { beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
const state=vi.hoisted(()=>({user:{id:'11111111-1111-4111-a111-111111111111',email:'fixture@example.test',name:'Fixture',role:'customer',email_verified_at:'2026-10-01',session_version:0} as any,disabled:false,queries:[] as any[],mailOk:true,mailBody:null as any}));
vi.mock('../lib/server/db',()=>{
  const query=vi.fn(async(sql:string,params:any[]=[])=>{
    state.queries.push({sql,params});
    if(sql.startsWith('SELECT * FROM users WHERE email'))return [state.user];
    if(sql.startsWith('SELECT user_id FROM auth_identities'))return [];
    if(sql.startsWith('INSERT INTO email_codes'))return [{id:'code-fixture'}];
    return [];
  });
  return {query,transaction:async(run:any)=>run(query)};
});
vi.mock('../lib/server/session',()=>({rate:vi.fn(),requireUser:async()=>state.user,cookie:(token:string)=>'styleshopz_session='+token,sessionToken:(user:any)=>'fixture-session-'+user.id}));
let privateKey:CryptoKey,identity:typeof import('../lib/server/identity');
beforeAll(async()=>{
  const pair=await generateKeyPair('RS256');privateKey=pair.privateKey;
  const publicJwk={...await exportJWK(pair.publicKey),kid:'fixture-key',alg:'RS256',use:'sig'};
  vi.stubGlobal('fetch',vi.fn(async(input:any,init:any)=>{
    const url=String(input);
    if(url.includes('/jwk/'))return Response.json({keys:[publicJwk]});
    if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'fixture-uid',disabled:state.disabled,validSince:'1'}]});
    if(url.includes('api.brevo.com')){state.mailBody=JSON.parse(init.body);return new Response('{}',{status:state.mailOk?201:503});}
    throw new Error('Unexpected network destination');
  }));
  identity=await import('../lib/server/identity');
});
beforeEach(()=>{state.user.role='customer';state.disabled=false;state.queries=[];state.mailOk=true;state.mailBody=null;vi.stubEnv('FIREBASE_WEB_API_KEY','fixture-public-web-key');vi.stubEnv('AUTH_SECRET','fixture-secret-for-tests-with-more-than-32-characters');vi.stubEnv('BREVO_API_KEY','fixture-brevo-key');vi.stubEnv('MAIL_FROM','sender@example.test');});
afterAll(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
async function token(overrides:any={},audience='styleshopz-market-2026'){
  return new SignJWT({email:'fixture@example.test',email_verified:true,name:'Fixture',firebase:{sign_in_provider:'google.com'},auth_time:Math.floor(Date.now()/1000),...overrides}).setProtectedHeader({alg:'RS256',kid:'fixture-key'}).setSubject('fixture-uid').setAudience(audience).setIssuer('https://securetoken.google.com/styleshopz-market-2026').setIssuedAt().setExpirationTime('5m').sign(privateKey);
}
const request=new Request('https://styleshop.example/api/auth/google',{method:'POST'});
it('accepts a cryptographically verified Google identity and creates a secure app session',async()=>{
  const response=await identity.googleAuthenticate(request,{idToken:await token()});
  expect(response.status).toBe(200);expect(response.headers.get('set-cookie')).toContain('styleshopz_session=');
  expect((await response.json()).user.role).toBe('customer');
});
it('rejects tokens for another project, unverified mail, other providers and disabled users',async()=>{
  await expect(identity.googleAuthenticate(request,{idToken:await token({},'another-project')})).rejects.toThrow('expired');
  await expect(identity.googleAuthenticate(request,{idToken:await token({email_verified:false})})).rejects.toThrow('verified Google');
  await expect(identity.googleAuthenticate(request,{idToken:await token({firebase:{sign_in_provider:'password'}})})).rejects.toThrow('verified Google');
  state.disabled=true;
  await expect(identity.googleAuthenticate(request,{idToken:await token()})).rejects.toThrow('unavailable');
});
it('refuses Google sign-in for the fixed admin account even with a valid signed Google token',async()=>{
  state.user.role='admin';
  await expect(identity.googleAuthenticate(request,{idToken:await token()})).rejects.toThrow('email/password');
  expect(state.queries.some(q=>q.sql.includes('INSERT INTO auth_identities'))).toBe(false);
});
it('sends an eight-digit Brevo code but stores only its keyed hash',async()=>{
  await identity.sendCode(state.user,'verify');
  const code=state.mailBody.textContent.match(/\b\d{8}\b/)[0];
  expect(state.mailBody.to).toEqual([{email:state.user.email}]);
  const insert=state.queries.find(q=>q.sql.startsWith('INSERT INTO email_codes'));
  expect(insert.params[2]).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(state.queries)).not.toContain(code);
  expect(insert.sql).toContain("INTERVAL '10 minutes'");
});
it('does not invalidate a previous code when its replacement email fails',async()=>{
  state.mailOk=false;
  await expect(identity.sendCode(state.user,'reset')).rejects.toThrow('could not be sent');
  expect(state.queries.some(q=>q.sql.includes('id<>'))).toBe(false);
  expect(state.queries.some(q=>q.sql==='UPDATE email_codes SET used_at=NOW() WHERE id=$1')).toBe(true);
});
it('fails explicitly when the owner has not supplied Brevo credentials',async()=>{
  vi.stubEnv('BREVO_API_KEY','');
  await expect(identity.sendCode(state.user,'verify')).rejects.toThrow('Brevo configuration');
  expect(state.mailBody).toBeNull();
});
