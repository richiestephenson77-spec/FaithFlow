(function(root){
'use strict';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const axis=y=>y<0?y+1:y;
const year=a=>a<=0?a-1:a;
const format=y=>y<0?`${Math.abs(y).toLocaleString('en-US')} BC`:`AD ${y.toLocaleString('en-US')}`;
const project=([lon,lat])=>[(lon-20)*30,(44-lat)*36];
const path=points=>points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')+'Z';
function resample(ring,n=80){
 let pts=ring.map(project); if(pts.length>1&&pts[0][0]===pts.at(-1)[0]&&pts[0][1]===pts.at(-1)[1])pts.pop();
 const lengths=pts.map((p,i)=>Math.hypot(p[0]-pts[(i+1)%pts.length][0],p[1]-pts[(i+1)%pts.length][1]));
 const total=lengths.reduce((a,b)=>a+b,0); if(!total)return Array.from({length:n},()=>pts[0]);
 let edge=0,offset=0;
 return Array.from({length:n},(_,i)=>{const d=i*total/n;while(edge<pts.length-1&&offset+lengths[edge]<d){offset+=lengths[edge++];}const t=(d-offset)/(lengths[edge]||1),a=pts[edge],b=pts[(edge+1)%pts.length];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];});
}
function align(a,b){
 let best=Infinity,out=b;
 for(const candidate of [b,[...b].reverse()])for(let shift=0;shift<b.length;shift++){
  let score=0;for(let i=0;i<a.length;i++)score+=(a[i][0]-candidate[(i+shift)%b.length][0])**2+(a[i][1]-candidate[(i+shift)%b.length][1])**2;
  if(score<best){best=score;out=candidate.map((_,i)=>candidate[(i+shift)%b.length]);}
 }return out;
}
function pair(a,b){
 const ids=new Set([...a.territories,...b.territories].map(x=>x.id));
 return [...ids].map(id=>{const left=a.territories.find(x=>x.id===id),right=b.territories.find(x=>x.id===id);const p=resample((left||right).ring);return {id,left,right,a:p,b:align(p,resample((right||left).ring))};});
}
function blend(p,t){return p.map(x=>({id:x.id,info:t<.5?(x.left||x.right):(x.right||x.left),opacity:x.left&&x.right?1:x.left?1-t:t,points:x.a.map((a,i)=>[a[0]+(x.b[i][0]-a[0])*t,a[1]+(x.b[i][1]-a[1])*t])}));}
function position(s,value){const v=clamp(value,0,s.length-1),i=Math.min(Math.floor(v),s.length-2),t=v-i;return {i,t,year:year(Math.round(axis(s[i].year)+(axis(s[i+1].year)-axis(s[i].year))*t)),nearest:t<.5?i:i+1};}
const api={clamp,axis,year,format,project,path,resample,pair,blend,position};root.AtlasEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
