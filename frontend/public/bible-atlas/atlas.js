(()=>{
'use strict';
const D=window.ATLAS_DATA,E=window.AtlasEngine,S=D.snapshots,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let value=0,playing=false,lastTime=0,frame=0,lastPair=-1,paired=[],lastStory=-1,dirty=true,selected=null;
let camera={x:495,y:385,zoom:1.45},view={x:0,y:0,w:960,h:720},pointers=new Map(),gesture=null;
const svg=$('map'),regionNodes=new Map();
function element(name,attrs={},text){const el=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el;}
function request(){dirty=true;if(!frame)frame=requestAnimationFrame(tick);}
function announce(){const pos=E.position(S,value);$('announcement').textContent=`${E.format(pos.year)}. ${S[pos.nearest].title}.`;}
function setValue(v,manual=true){if(manual)setPlaying(false);value=E.clamp(v,0,S.length-1);if(!$('animate').checked)value=Math.round(value);$('time').value=value;selected=null;$('place-card').hidden=true;request();}
function setPlaying(on){playing=on;$('play').setAttribute('aria-pressed',String(on));$('play').setAttribute('aria-label',on?'Pause timeline':'Play timeline');$('play').innerHTML=on?'Ⅱ <span>Pause</span>':'▶ <span>Play</span>';lastTime=0;if(on)request();}
function tick(now){frame=0;const dt=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;
 if(playing){const speed=Number($('speed').value);if($('animate').checked)value=Math.min(S.length-1,value+dt*speed);else{tick.acc=(tick.acc||0)+dt*speed;if(tick.acc>=1){value=Math.min(S.length-1,Math.round(value)+1);tick.acc=0;announce();}}$('time').value=value;dirty=true;if(value===S.length-1){setPlaying(false);announce();}}
 if(dirty){dirty=false;render();}if(playing)request();
}
function updateView(){const r=svg.getBoundingClientRect(),w=960/camera.zoom,h=w*(r.height/Math.max(1,r.width));view={x:camera.x-w/2,y:camera.y-h/2,w,h};svg.setAttribute('viewBox',`${view.x} ${view.y} ${w} ${h}`);}
function render(){
 updateView();const p=E.position(S,value),a=S[p.i],b=S[p.i+1];
 if(lastPair!==p.i){paired=E.pair(a,b);lastPair=p.i;$('regions').replaceChildren();regionNodes.clear();for(const item of paired){const node=element('path',{'data-region':item.id,'stroke-width':1.4,'vector-effect':'non-scaling-stroke','fill-opacity':.57,'stroke-opacity':.95});regionNodes.set(item.id,node);$('regions').append(node);}}
 const features=E.blend(paired,p.t);for(const f of features){const node=regionNodes.get(f.id);node.setAttribute('d',E.path(f.points));node.setAttribute('fill',f.info.color);node.setAttribute('stroke',f.info.color);node.setAttribute('opacity',f.opacity);}
 const between=p.t>.002&&p.t<.998;$('map-year').textContent=E.format(p.year);$('map-state').textContent=between?'Animated blend · not an exact-year map':'Selected historical scene';$('transition').textContent=between?`${E.format(a.year)} → ${E.format(b.year)}`:S[p.nearest].title;
 $('time').setAttribute('aria-valuetext',`${E.format(p.year)}. ${between?'Visual transition between '+a.title+' and '+b.title:S[p.nearest].title}`);
 $('prev').disabled=value<=0;$('next').disabled=value>=S.length-1;
 if(lastStory!==p.nearest){lastStory=p.nearest;updateStory(S[p.nearest],p.nearest);}
 drawLabels(features,p);drawCities(p); 
}
function updateStory(s,i){$('chapter').textContent=`${String(i+1).padStart(2,'0')} / ${S.length}`;$('story-date').textContent=E.format(s.year);$('story-title').textContent=s.title;$('story-text').textContent=s.summary;$('certainty').textContent=s.certainty;$('people').textContent=s.people;$('people-block').hidden=!s.people;$('scripture').textContent=s.scripture;$('scripture-block').hidden=!s.scripture;const source=D.sources[s.source];$('source').href=source.url;$('source').title=source.title;
 $('legend').replaceChildren();for(const f of s.territories){const btn=document.createElement('button'),sw=document.createElement('span');sw.className='swatch';sw.style.background=f.color;btn.append(sw,document.createTextNode(f.name));btn.addEventListener('click',()=>showRegion(f));$('legend').append(btn);}
 document.querySelectorAll('#eras button').forEach(btn=>btn.setAttribute('aria-current',String(i>=+btn.dataset.start&&i<=+btn.dataset.end)));
}
let occupied=[];
function screenPoint(p){const r=svg.getBoundingClientRect();return [(p[0]-view.x)/view.w*r.width,(p[1]-view.y)/view.h*r.height];}
function reserve(p,text,important=false){const [x,y]=screenPoint(p),r=svg.getBoundingClientRect(),w=Math.min(text.length*6.6,220),box=[x-w/2,y-9,x+w/2,y+9];if(x<25||x>r.width-25||y<20||y>r.height-30)return false;if((x<270&&y<120)||(x>r.width-72&&y<170))return false;if(!important&&occupied.some(b=>box[0]<b[2]+5&&box[2]>b[0]-5&&box[1]<b[3]+5&&box[3]>b[1]-5))return false;occupied.push(box);return true;}
function drawLabels(features,p){$('labels').replaceChildren();occupied=[];const unit=view.w/Math.max(1,svg.clientWidth);
 // Reserve the major cities before territory labels to avoid overlap.
 for(const c of activeCities(p.year)){const pt=E.project([c.lon,c.lat]);reserve([pt[0]+32*unit,pt[1]-9*unit],cityName(c,p.year));}
 for(const f of features){if(f.opacity<.3)continue;const pt=f.points.reduce((a,v)=>[a[0]+v[0]/f.points.length,a[1]+v[1]/f.points.length],[0,0]);const item=paired.find(q=>q.id===f.id);const names=item.left&&item.right&&item.left.name!==item.right.name?[[item.left.name,1-p.t],[item.right.name,p.t]]:[[f.info.name,1]];if(!reserve(pt,f.info.name))continue;for(const [name,alpha] of names){if(alpha<.05)continue;const t=element('text',{x:pt[0],y:pt[1],fill:'#34423b','font-size':13*unit,'font-family':'Georgia,serif','font-style':'italic','text-anchor':'middle','paint-order':'stroke',stroke:'#f6efd9','stroke-width':3*unit,'stroke-opacity':.7,opacity:alpha*f.opacity,'pointer-events':'none'},name);$('labels').append(t);}}
}
function cityName(c,y){return c.names.filter(n=>n[0]<=y).at(-1)?.[1]||c.names[0][1];}
function activeCities(y){return D.places.filter(c=>y>=(c.from??-3000)&&y<=(c.to??1900));}
function drawCities(p){$('cities').replaceChildren();const unit=view.w/Math.max(1,svg.clientWidth);occupied=[];
 for(const c of activeCities(p.year)){const pt=E.project([c.lon,c.lat]),name=cityName(c,p.year);if(!reserve([pt[0]+32*unit,pt[1]-9*unit],name))continue;const g=element('g',{role:'button',tabindex:0,'aria-label':`About ${name}`,cursor:'pointer'});g.append(element('circle',{cx:pt[0],cy:pt[1],r:15*unit,fill:'transparent'}),element('circle',{cx:pt[0],cy:pt[1],r:4*unit,fill:'#78562f',stroke:'#fff9e9','stroke-width':2*unit}),element('text',{x:pt[0]+8*unit,y:pt[1]-7*unit,fill:'#293c3b','font-size':11*unit,'font-weight':600,'paint-order':'stroke',stroke:'#f7f1de','stroke-width':3*unit},name));g.addEventListener('click',()=>showPlace(c,name));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPlace(c,name);}});$('cities').append(g);}
}
function showPlace(c,name){setPlaying(false);selected=c.id;$('place-title').textContent=name;$('place-note').textContent=c.note;$('place-card').hidden=false;$('close-place').focus();}
function showRegion(f){setPlaying(false);selected=f.id;$('place-title').textContent=f.name;$('place-note').textContent='Illustrative regional footprint. This shape is not a verified historical boundary and may combine areas of direct rule and influence. See the selected era’s background source for context.';$('place-card').hidden=false;$('close-place').focus();}
$('close-place').onclick=()=>{$('place-card').hidden=true;selected=null;$('time').focus();};
$('time').max=S.length-1;$('time').oninput=e=>setValue(Number(e.target.value));$('time').onchange=announce;
$('animate').checked=!reduced.matches;$('animate').onchange=()=>{setValue(Math.round(value));announce();};
reduced.addEventListener('change',e=>{if(e.matches){$('animate').checked=false;setValue(Math.round(value));}});
$('play').onclick=()=>{if(!playing&&value>=S.length-1)value=0;tick.acc=0;setPlaying(!playing);};
$('prev').onclick=()=>{setValue(Math.ceil(value)-1);announce();};$('next').onclick=()=>{setValue(Math.floor(value)+1);announce();};
function zoom(factor){camera.zoom=E.clamp(camera.zoom*factor,.8,8);request();}
$('zoom-in').onclick=()=>zoom(1.35);$('zoom-out').onclick=()=>zoom(1/1.35);$('reset').onclick=()=>{camera={x:495,y:385,zoom:1.45};request();};
// Chapter ranges are clamped to the data actually shipped and any chapter
// starting past the end is dropped, so truncating the timeline can't leave
// a button pointing at a snapshot that no longer exists.
const chapters=[['Origins',0,4],['Exodus & settlement',5,7],['Kings & prophets',8,11],['Exile & return',12,13],['Between Testaments',14,17],['Jesus & early Church',18,21]]
 .filter(([,start])=>start<=S.length-1).map(([name,start,end])=>[name,start,Math.min(end,S.length-1)]);
for(const [name,start,end]of chapters){const btn=document.createElement('button');btn.textContent=name;btn.dataset.start=start;btn.dataset.end=end;btn.onclick=()=>{setValue(start);announce();};$('eras').append(btn);}
// Ticks are derived from the snapshot count rather than hardcoded indices —
// a fixed list silently indexes past the end when the timeline is shortened.
const tickCount=Math.min(6,S.length);
for(let k=0;k<tickCount;k++){const i=tickCount<2?0:Math.round(k*(S.length-1)/(tickCount-1));const span=document.createElement('span');span.style.left=`${i/(S.length-1)*100}%`;span.textContent=E.format(S[i].year);$('ticks').append(span);}
const land=D.land.map(r=>E.path(r.map(E.project))).join(' ');$('land').setAttribute('d',land);$('land').setAttribute('fill-rule','evenodd');$('clip-land').setAttribute('d',land);$('clip-land').setAttribute('clip-rule','evenodd');
function gestureState(){const p=[...pointers.values()];if(p.length===1)return {type:'pan',point:p[0],camera:{...camera}};if(p.length>=2)return {type:'pinch',distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),camera:{...camera}};return null;}
svg.addEventListener('pointerdown',e=>{if(e.target.closest('[role="button"]'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});svg.setPointerCapture(e.pointerId);gesture=gestureState();svg.classList.add('dragging');});
svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gesture?.type==='pan'&&pointers.size===1){const ratio=960/gesture.camera.zoom/Math.max(1,svg.clientWidth);camera.x=E.clamp(gesture.camera.x-(e.clientX-gesture.point.x)*ratio,120,900);camera.y=E.clamp(gesture.camera.y-(e.clientY-gesture.point.y)*ratio,90,700);}else if(gesture?.type==='pinch'&&pointers.size>=2){const p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);camera.zoom=E.clamp(gesture.camera.zoom*dist/Math.max(1,gesture.distance),.8,8);}request();});
function endPointer(e){pointers.delete(e.pointerId);gesture=gestureState();if(!pointers.size)svg.classList.remove('dragging');}
svg.addEventListener('pointerup',endPointer);svg.addEventListener('pointercancel',endPointer);svg.addEventListener('lostpointercapture',endPointer);
svg.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.003));},{passive:false});
$('about').onclick=()=>{setPlaying(false);$('about-dialog').showModal();};for(const id of ['close-about','done-about'])$(id).onclick=()=>$('about-dialog').close();
$('back').onclick=()=>{if(window.parent!==window){window.parent.postMessage({type:'faithstring:bible-atlas:back'},window.location.origin);}else window.location.assign('/explore');};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('place-card').hidden=true;setPlaying(false);}});
new ResizeObserver(request).observe(svg);request();
})();
