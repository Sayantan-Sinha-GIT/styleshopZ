import { createRemoteJWKSet, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { randomBytes, randomInt, createHmac } from 'node:crypto';
import { firebaseConfig } from '../firebase-config';
import { query, transaction } from './db';
import { assert, text, passwordText } from './rules';
import { cookie, sessionToken, rate, requireUser } from './session';

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
export function emailReady() { return !!process.env.BREVO_API_KEY && !!process.env.MAIL_FROM; }
function codeHash(userId:string, purpose:string, code:string) {
  assert(process.env.AUTH_SECRET, 'Account security is not configured.',503);
  return createHmac('sha256',process.env.AUTH_SECRET).update(`${userId}:${purpose}:${code}`).digest('hex');
}
export function loginResponse(user:any) {
  return Response.json({user:{id:user.id,name:user.name,email:user.email,role:user.role,email_verified_at:user.email_verified_at}}, {headers:{'Set-Cookie':cookie(sessionToken(user)),'Cache-Control':'no-store'}});
}
export async function googleAuthenticate(req:Request,b:any) {
  await rate('google:'+ (req.headers.get('cf-connecting-ip') || 'local'),30,900);
  const token=text(b.idToken,'Google token',50,10000);
  let claims;
  try {
    claims=(await jwtVerify(token,keys,{audience:firebaseConfig.projectId,issuer:`https://securetoken.google.com/${firebaseConfig.projectId}`,algorithms:['RS256']})).payload;
  } catch { assert(false,'Google sign-in expired. Please try again.',401); }
  assert(claims.sub && claims.email_verified===true && typeof claims.email==='string' && (claims.firebase as any)?.sign_in_provider==='google.com','Use a verified Google account.',401);
  // Firebase lookup also rejects disabled/deleted users and revoked refresh sessions.
  assert(process.env.FIREBASE_WEB_API_KEY,'Google sign-in is not configured.',503);
  const lookup=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_WEB_API_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(8000)});
  const account=(await lookup.json() as any).users?.[0];
  assert(lookup.ok && account && !account.disabled && account.localId===claims.sub,'Google account is unavailable.',401);
  if(account.validSince)assert(Number(claims.auth_time)>=Number(account.validSince),'Sign in to Google again.',401);
  const email=String(claims.email).toLowerCase();
  const randomPassword=await bcrypt.hash(randomBytes(32).toString('hex'),10);
  const user=await transaction(async q=>{
    await q('SELECT pg_advisory_xact_lock(hashtext($1))',[email]);
    let [u]=await q('SELECT * FROM users WHERE email=$1 FOR UPDATE',[email]);
    assert(!u || (!u.deleted_at && u.role!=='admin'),'This account uses the owner’s email/password sign-in only.',403);
    const [identity]=await q("SELECT user_id FROM auth_identities WHERE provider='google' AND provider_uid=$1",[claims.sub]);
    if(identity){const [linked]=await q('SELECT * FROM users WHERE id=$1 FOR UPDATE',[identity.user_id]);assert(linked && !linked.deleted_at && linked.role!=='admin' && linked.email===email,'This Google identity cannot access this account.',403);u=linked;}
    if(!u){[u]=await q("INSERT INTO users(email,name,role,password_hash,email_verified_at) VALUES($1,$2,'customer',$3,NOW()) RETURNING *",[email,String(claims.name || email.split('@')[0]).slice(0,100),randomPassword]);await q('INSERT INTO carts(user_id) VALUES($1)',[u.id]);}
    else if(!u.email_verified_at){[u]=await q('UPDATE users SET email_verified_at=NOW(),password_hash=$2,session_version=session_version+1 WHERE id=$1 RETURNING *',[u.id,randomPassword]);}
    await q("INSERT INTO auth_identities(provider,provider_uid,user_id) VALUES('google',$1,$2) ON CONFLICT(provider,provider_uid) DO NOTHING",[claims.sub,u.id]);
    return u;
  });
  return loginResponse(user);
}
export async function sendCode(user:any,purpose:'verify'|'reset') {
  assert(emailReady(),'Email delivery is awaiting the shop owner’s Brevo configuration.',503);
  await rate('email-code:'+purpose+':'+user.id,3,900);
  const code=String(randomInt(10000000,100000000)), hash=codeHash(user.id,purpose,code);
  const [record]=await query("INSERT INTO email_codes(user_id,purpose,code_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes') RETURNING id",[user.id,purpose,hash]);
  const from=process.env.MAIL_FROM!.trim();
  const res=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':process.env.BREVO_API_KEY!,'Content-Type':'application/json','accept':'application/json'},body:JSON.stringify({sender:{name:'styleshopZ',email:from},to:[{email:user.email}],subject:purpose==='verify'?'Verify your styleshopZ email':'Reset your styleshopZ password',textContent:`Your styleshopZ ${purpose==='verify'?'email verification':'password reset'} code is ${code}. It expires in 10 minutes. Never share this code. If you did not request it, ignore this email.`}),signal:AbortSignal.timeout(10000)}).catch(()=>null);
  if(!res?.ok){await query('UPDATE email_codes SET used_at=NOW() WHERE id=$1',[record.id]);assert(false,'Email could not be sent. Please try again shortly.',503);}
  // Only a successfully dispatched replacement invalidates previous codes.
  await query('UPDATE email_codes SET used_at=NOW() WHERE user_id=$1 AND purpose=$2 AND id<>$3 AND created_at<(SELECT created_at FROM email_codes WHERE id=$3) AND used_at IS NULL',[user.id,purpose,record.id]);
}
export async function emailVerification(req:Request,b:any) {
  const user=await requireUser();
  assert(user.role!=='admin','Owner accounts use fixed credentials.',403);
  if(user.email_verified_at)return {ok:true,verified:true};
  if(!b.code){await sendCode(user,'verify');return {ok:true,message:'Check your inbox for an eight-digit code.'};}
  await rate('verify-attempt:'+user.id,8,900);
  const code=text(b.code,'Code',8,8); assert(/^\d{8}$/.test(code),'Enter the eight-digit code.');
  await transaction(async q=>{
    const [r]=await q("SELECT * FROM email_codes WHERE user_id=$1 AND purpose='verify' AND code_hash=$2 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE",[user.id,codeHash(user.id,'verify',code)]);
    assert(r,'The code is incorrect or expired. Request a new code.');
    await q('UPDATE email_codes SET used_at=NOW() WHERE id=$1',[r.id]);
    await q('UPDATE users SET email_verified_at=NOW() WHERE id=$1',[user.id]);
  });
  return {ok:true,verified:true};
}
export async function emailReset(req:Request,b:any) {
  const email=text(b.email,'Email',5,254).toLowerCase();
  await rate('reset-request:'+email+':'+(req.headers.get('cf-connecting-ip') || 'local'),5,900);
  assert(emailReady(),'Password recovery is awaiting the shop owner’s Brevo configuration.',503);
  const [u]=await query("SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL AND role<>'admin'",[email]);
  if(!b.code){if(u)await sendCode(u,'reset');return {ok:true,message:'If this account exists, an eight-digit reset code has been sent.'};}
  const code=text(b.code,'Reset code',8,8), password=passwordText(b.password);
  assert(/^\d{8}$/.test(code),'Enter the eight-digit code.');
  const hash=await bcrypt.hash(password,10);
  await transaction(async q=>{
    const [r]=u ? await q("SELECT * FROM email_codes WHERE user_id=$1 AND purpose='reset' AND code_hash=$2 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE",[u.id,codeHash(u.id,'reset',code)]) : [];
    assert(r,'The code is incorrect or expired. Request a new code.');
    await q('UPDATE users SET password_hash=$2,session_version=session_version+1,email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1',[u.id,hash]);
    await q("UPDATE email_codes SET used_at=NOW() WHERE user_id=$1 AND purpose='reset' AND used_at IS NULL",[u.id]);
  });
  return Response.json({ok:true,message:'Password updated. Sign in with your new password.'},{headers:{'Set-Cookie':cookie('',true)}});
}
