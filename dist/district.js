import {STREET_LAMPS} from './street-lamps.js?v=20261013-life89b';
// Plaza scenery now comes entirely from the shared saved layout.
export function buildDistrict({box,sign}){
 const stone='#c9c4b7';
 for(const [x,z,w,d]of [[16,-6,6,58],[7,-28,22,6],[32,-28,32,5],[-34,-14,5,52],[-17,-28,34,5],[0,-60,8,14],[0,-66,52,6]])box(x,.04,z,w,.08,d,stone);
 for(const [x,z]of STREET_LAMPS){if(Math.abs(x)<=30&&z>=-66&&z<=-22)continue;box(x,1.6,z,.16,3.2,.16,'#344c57');box(x,3.3,z,.6,.45,.6,'#ffe4a6',false,{streetLamp:true,noShadow:true});box(x,3.58,z,.9,.15,.9,'#344c57',false);}
 sign('PLAZA',16,2.6,-19,2.5);
}
