export const rateCache = new Map();
export function todayInArmenia(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Yerevan',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function validDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;}
export async function dailyRates(date=todayInArmenia(),fetcher=fetch){
 if(!validDate(date)||date>todayInArmenia())throw Error('Choose today or a past movement date.');
 const cached=rateCache.get(date);if(cached&&cached.expires>Date.now())return cached.value;
 const r=await fetcher('https://api.frankfurter.dev/v2/rates?base=AMD&quotes=EUR,USD&date='+date,{signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('Daily exchange rates are unavailable. Please try again before saving.');
 const rows=await r.json(),rates={AMD:1},dates={AMD:date};
 for(const c of ['EUR','USD']){const row=Array.isArray(rows)&&rows.find(x=>x.base==='AMD'&&x.quote===c);if(!row||!Number.isFinite(row.rate)||row.rate<=0||!validDate(row.date)||row.date>date)throw Error('Daily exchange rates are incomplete. Please try again.');rates[c]=1/row.rate;dates[c]=row.date;}
 const value={rates,dates,requestedDate:date,source:'Frankfurter',fetchedAt:new Date().toISOString()};
 if(rateCache.size>200)rateCache.clear();rateCache.set(date,{value,expires:Date.now()+(date===todayInArmenia()?300000:86400000)});return value;
}
export function validSnapshot(fx,date){return fx?.requestedDate===date&&['AMD','EUR','USD'].every(c=>Number.isFinite(fx.rates?.[c])&&fx.rates[c]>0&&validDate(fx.dates?.[c])&&fx.dates[c]<=date)&&fx.rates.AMD===1;}
export async function snapshotMovements(next,previous,getRates=dailyRates){
 const old=new Map(previous.transactions.map(t=>[t.id,t]));
 const accounts=new Map(next.accounts.map(a=>[a.id,a]));
 const oldAccounts=new Map(previous.accounts.map(a=>[a.id,a]));
 const requests=new Map();const forDate=d=>{if(!requests.has(d))requests.set(d,getRates(d));return requests.get(d)};
 for(const t of next.transactions){if(!accounts.has(t.account)||!Number.isFinite(t.amount)||t.amount<=0||!validDate(t.date)||t.date>todayInArmenia())throw Error('Invalid movement amount, account, or date.');
 const before=old.get(t.id),same=before&&before.date===t.date&&oldAccounts.get(before.account)?.currency===accounts.get(t.account).currency;
 t.fx=same&&validSnapshot(before.fx,t.date)?before.fx:await forDate(t.date);
 }
 return next;
}
