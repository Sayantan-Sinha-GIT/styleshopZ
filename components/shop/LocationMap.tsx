'use client';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useEffect } from 'react';
import { MapPin } from '@phosphor-icons/react';
export type Point={lat:number;lng:number};
function Events({center,onMove}:{center:Point;onMove:(p:Point)=>void}) {
  const map=useMap();
  useMapEvents({moveend:()=>{const c=map.getCenter();onMove({lat:c.lat,lng:c.lng});}});
  useEffect(()=>{const c=map.getCenter();if(Math.abs(c.lat-center.lat)>0.000001 || Math.abs(c.lng-center.lng)>0.000001)map.flyTo([center.lat,center.lng],16,{duration:.7});},[center.lat,center.lng,map]);
  useEffect(()=>{const id=setTimeout(()=>map.invalidateSize(),150);return ()=>clearTimeout(id);},[map]);
  return null;
}
export default function LocationMap({center,onMove}:{center:Point;onMove:(p:Point)=>void}) {
  return <div className="location-map" data-lenis-prevent><MapContainer center={[center.lat,center.lng]} zoom={15} scrollWheelZoom={false} aria-label="Delivery map: drag to position the pin"><TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'/><Events center={center} onMove={onMove}/></MapContainer><MapPin className="map-center-pin" size={42} weight="fill"/></div>;
}
