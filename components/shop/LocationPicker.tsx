'use client';
import dynamic from 'next/dynamic';
import { useState,useEffect,useRef,useCallback } from 'react';
import { Crosshair, MapPin, Check } from '@phosphor-icons/react';
import { Capacitor } from '@capacitor/core';
import { api,ErrorText, type Item } from './Store';
import type { Point } from './LocationMap';
const LocationMap=dynamic(()=>import('./LocationMap'),{ssr:false,loading:()=><div className="location-map skeleton"/>});
export function LocationPicker({initial,onConfirm}:{initial?:Item;onConfirm:(a:Item)=>void}) {
  const [center,setCenter]=useState<Point>({lat:Number(initial?.latitude)||22.5726,lng:Number(initial?.longitude)||88.3639});
  const [picked,setPicked]=useState<Point|null>(null),[query,setQuery]=useState(''),[suggestions,setSuggestions]=useState<Item[]>([]),[address,setAddress]=useState<Item|null>(null),[error,setError]=useState(''),[searching,setSearching]=useState(false),[locating,setLocating]=useState(false),[resolving,setResolving]=useState(false);
  const sequence=useRef(0),searchSeq=useRef(0),reverseTimer=useRef<ReturnType<typeof setTimeout>|null>(null), mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current++;searchSeq.current++;if(reverseTimer.current)clearTimeout(reverseTimer.current);};},[]);
  const move=useCallback((p:Point)=>{
    const seq=++sequence.current;setPicked(p);setAddress(null);setError('');setResolving(true);
    if(reverseTimer.current)clearTimeout(reverseTimer.current);
    reverseTimer.current=setTimeout(()=>{api(`places/reverse?lat=${p.lat}&lng=${p.lng}`).then(r=>{if(mounted.current&&seq===sequence.current)setAddress(r.address);}).catch(e=>{if(mounted.current&&seq===sequence.current)setError(e.message);}).finally(()=>{if(mounted.current&&seq===sequence.current)setResolving(false);});},650);
  },[]);
  useEffect(()=>{
    const seq=++searchSeq.current;
    if(query.trim().length<3){setSuggestions([]);setSearching(false);return;}
    const timer=setTimeout(()=>{setSearching(true);api(`places/search?q=${encodeURIComponent(query)}&lat=${center.lat}&lng=${center.lng}`).then(r=>{if(seq===searchSeq.current){setSuggestions(r.suggestions);setError(r.suggestions.length?'':'No places found. Try a nearby landmark or another spelling.');}}).catch(e=>{if(seq===searchSeq.current)setError(e.message);}).finally(()=>{if(seq===searchSeq.current)setSearching(false);});},450);
    return()=>clearTimeout(timer);
  },[query]);
  const gps=async()=>{
    setLocating(true);setError('');
    try{
      let coords;
      if(Capacitor.isNativePlatform()){
        const {Geolocation}=await import('@capacitor/geolocation');
        const permission=await Geolocation.requestPermissions();
        if(permission.location!=='granted' && permission.coarseLocation!=='granted')throw new Error('Location permission denied');
        coords=(await Geolocation.getCurrentPosition({enableHighAccuracy:permission.location==='granted',timeout:12000})).coords;
      }
      else coords=(await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:12000,maximumAge:30000}))).coords;
      const p={lat:coords.latitude,lng:coords.longitude};setCenter(p);move(p);
    }catch{setError('Location access was unavailable. Search your address or drag the map to your building.');}finally{setLocating(false);}
  };
  return <div className="map-picker">
    <div className="map-toolbar"><input aria-label="Find a delivery location" placeholder="Search a building, street or landmark" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/><button type="button" className="button secondary small" onClick={gps} disabled={locating}><Crosshair size={18}/>{locating?'Locating…':'Use my location'}</button></div>
    {searching&&<p className="map-status" role="status" style={{padding:'0 14px 12px'}}>Finding places…</p>}
    {!!suggestions.length&&<div className="map-search-results" aria-label="Matching locations">{suggestions.map((s,i)=><button type="button" key={i} onClick={()=>{setCenter({lat:s.lat,lng:s.lng});move({lat:s.lat,lng:s.lng});setQuery('');setSuggestions([]);}}>{s.title}<small>{s.subtitle}</small></button>)}</div>}
    <LocationMap center={center} onMove={move}/>
    <div className="map-address"><p className="map-status">{resolving?'Finding the address under your pin…':address?.displayName || 'Drag the map until the pin is on your building, then confirm.'}</p><ErrorText error={error}/><button type="button" className="button small" disabled={!picked||resolving} onClick={()=>{if(picked)onConfirm({...address,latitude:picked.lat,longitude:picked.lng});}}><Check size={16}/>Use this delivery pin</button><p className="small muted"><MapPin size={13} style={{display:'inline'}}/> Place search by Ola Maps · Check the house number and pincode below.</p></div>
  </div>;
}
