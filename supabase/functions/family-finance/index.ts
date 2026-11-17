import { dailyRates, snapshotMovements, validSnapshot } from './rates.js';
const origin='https://chechuarmenia.github.io';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const json=(value,status=200)=>Response.json(value,{status,headers:cors});
Deno.serve(async req=>{
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return json({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY');
  const token=req.headers.get('authorization');if(!token?.startsWith('Bearer '))return json({error:'Please sign in'},401);
  const headers={apikey:key,Authorization:token,'Content-Type':'application/json'};
  const userResponse=await fetch(url+'/auth/v1/user',{headers});if(!userResponse.ok)return json({error:'Your session expired. Please sign in again.'},401);
  const user=await userResponse.json();if(!user.email_confirmed_at)return json({error:'Confirm your email before signing in.'},403);
  const member=await fetch(url+'/rest/v1/family_members?select=email',{headers});const members=member.ok?await member.json():[];if(!members.length)return json({error:'This account does not have access to this household.'},403);
  const path=new URL(req.url).searchParams.get('path');
  if(path==='rates'){if(req.method!=='GET')return json({error:'Method not allowed'},405);return json(await dailyRates(new URL(req.url).searchParams.get('date')||undefined));}
  const response=await fetch(url+'/rest/v1/family_state?id=eq.family&select=data,version',{headers});if(!response.ok)throw Error('Unable to load household');const rows=await response.json();if(rows.length!==1)return json({error:'Household migration is not complete yet.'},503);const current=rows[0];
  if(req.method==='GET'){let market=null,rateError='';try{market=await dailyRates()}catch(e){rateError=e.message}const dates=new Map();for(const t of current.data.transactions){if(validSnapshot(t.fx,t.date))continue;try{if(!dates.has(t.date))dates.set(t.date,await dailyRates(t.date));t.fx=dates.get(t.date)}catch{rateError='Some historical rates are unavailable. Refresh to retry.'}}return json({data:current.data,version:current.version,market,rateError});}
  if(req.method!=='PUT')return json({error:'Method not allowed'},405);
  const raw=await req.text();if(raw.length>2000000)return json({error:'Household data is too large'},413);
  const body=JSON.parse(raw),next=body.data;if(!next||!Array.isArray(next.accounts)||!Array.isArray(next.transactions))return json({error:'Invalid household'},400);
  if(body.version!==current.version)return json({error:'Another device updated the household. Refresh before trying again.'},409);
  for(const a of next.accounts)if(!['AMD','USD','EUR'].includes(a.currency)||!Number.isFinite(a.opening)||a.opening<0)throw Error('Invalid account');
  for(const t of next.transactions){if(!['income','expense','transfer'].includes(t.type)||!['Chechu','Vahan'].includes(t.person))throw Error('Invalid movement');if(t.type==='transfer'&&(!next.accounts.some(a=>a.id===t.to)||t.to===t.account||!Number.isFinite(t.received)||t.received<=0))throw Error('Invalid transfer');}
  await snapshotMovements(next,current.data);
  const saved=await fetch(url+'/rest/v1/rpc/save_family_state',{method:'POST',headers,body:JSON.stringify({expected_version:body.version,next_data:next})});if(!saved.ok)throw Error('Unable to save household');const result=await saved.json();if(!result.length)return json({error:'Another device updated the household. Refresh before trying again.'},409);return json({version:result[0].version,data:result[0].data});
 }catch(e){return json({error:e.message||'Unable to complete request. Please retry.'},503)}
});
