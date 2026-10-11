import { requireUser, rate } from './session';
import { assert, text } from './rules';
const root='https://api.olamaps.io/places/v1';
async function ola(path:string,params:Record<string,string>) {
  assert(process.env.OLA_MAPS_API_KEY,'Location search is unavailable. You can enter your address manually.',503);
  const url=new URL(root+path);for(const [k,v] of Object.entries({...params,api_key:process.env.OLA_MAPS_API_KEY!}))url.searchParams.set(k,v);
  const res=await fetch(url,{headers:{'X-Request-Id':crypto.randomUUID()},signal:AbortSignal.timeout(8000),cache:'no-store'}).catch(()=>null);
  assert(res?.ok,'Maps could not connect. Retry, or enter your address manually.',503);
  return res.json() as Promise<any>;
}
function point(params:URLSearchParams) {
  if(!params.has('lat') || !params.has('lng'))return null;
  const lat=Number(params.get('lat')),lng=Number(params.get('lng'));
  assert(Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lng)&&Math.abs(lng)<=180,'Invalid map coordinates.');
  return {lat,lng};
}
export async function places(req:Request,params:URLSearchParams,reverse:boolean) {
  const u=await requireUser();await rate('places:'+u.id,120,900);
  const near=point(params);
  if(reverse){
    assert(near,'Choose a map location.');
    const data=await ola('/reverse-geocode',{latlng:near.lat+','+near.lng});
    const result=data.results?.[0];
    assert(result,'No street address found at this pin. Move closer to a road, or enter the address manually.',404);
    const components=result.address_components || [];
    const find=(...types:string[])=>components.find((c:any)=>c.types?.some((t:string)=>types.includes(t)))?.long_name || '';
    return {address:{displayName:result.formatted_address || '',line1:[find('street_number','premise'),find('route','neighborhood')].filter(Boolean).join(', '),line2:find('sublocality','sublocality_level_1'),city:find('locality','administrative_area_level_2'),state:find('administrative_area_level_1'),pincode:find('postal_code')},...near};
  }
  const q=text(params.get('q'),'Place',2,120);
  const data=await ola('/autocomplete',{input:q,...(near?{location:near.lat+','+near.lng,radius:'50000'}:{})});
  return {suggestions:(data.predictions || []).slice(0,7).flatMap((p:any)=>{
    const loc=p.geometry?.location;
    if(!loc || !Number.isFinite(Number(loc.lat)) || !Number.isFinite(Number(loc.lng)))return [];
    return [{title:p.structured_formatting?.main_text || p.description?.split(',')[0] || q,subtitle:p.structured_formatting?.secondary_text || p.description || '',lat:Number(loc.lat),lng:Number(loc.lng)}];
  })};
}
