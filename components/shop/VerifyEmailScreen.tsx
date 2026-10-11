'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {api,useStore,AuthGate,Field,ErrorText} from './Store';
export function VerifyEmailScreen(){return <div className="page narrow"><AuthGate><Verification/></AuthGate></div>;}
function Verification(){
  const {user,setUser,config}=useStore(),params=useSearchParams();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const next=params.get('next');const destination=next?.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\')?next:'/customer';
  const send=async()=>{setBusy(true);setError('');try{const r=await api('auth/verify-email','POST',{});setMessage(r.message || 'Your email is already verified.');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  return <section className="panel stack"><h1>{user?.email_verified_at?'You’re verified':'Check your inbox'}</h1><p className="muted">{user?.email_verified_at?'Your email address is confirmed.':`Enter the eight-digit verification code sent to ${user?.email}. Codes expire after 10 minutes.`}</p>{user?.email_verified_at?<Link className="button" href={destination}>Continue shopping</Link>:<><form className="stack" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api('auth/verify-email','POST',{code:new FormData(e.currentTarget).get('code')});setUser((await api('auth/me')).user);location.assign(destination);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><Field label="Eight-digit verification code" name="code" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} autoComplete="one-time-code" required/><ErrorText error={error}/><button className="button" disabled={busy||!config.verificationEmail}>{busy?'Verifying…':'Verify email'}</button></form><div className="row"><button type="button" className="button quiet small" disabled={busy||!config.verificationEmail} onClick={send}>Send a new code</button><Link href="/customer" className="text-link small">Back to your account</Link></div>{message&&<p role="status" className="success">{message}</p>}{!config.verificationEmail&&<p className="small muted">Email verification will be available when the shop owner finishes connecting Brevo. Google sign-in is available now.</p>}</>}</section>;
}
