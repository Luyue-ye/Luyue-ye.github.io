/* 足迹星盘：从北极上空俯视地球。地点数据在 content/footprints.yaml，这里一般不需要改动。 */
let LAND_CACHE=null;
let mapStop=null;window.stopMap=()=>{if(mapStop){mapStop();mapStop=null;}};
function initMap(){
  const box=$('#astro'),cv=$('#astroCv'),cardEl=$('#astroCard');if(!box)return;const ctx=cv.getContext('2d'),btns=[...document.querySelectorAll('.ac button')];
  const F=window.FP||{groups:[],places:{}},PL=F.places,GROUPS=F.groups;
  if(!window.d3||!window.topojson){box.hidden=true;return;}
  let land=null;if(LAND_CACHE)land=LAND_CACHE;else fetch('assets/land-110m.json').then(r=>r.json()).then(t=>{land=LAND_CACHE=topojson.feature(t,t.objects.land);}).catch(()=>{});
  const CLIP=118,D=Math.PI/180;
  const proj=d3.geoAzimuthalEquidistant().rotate([0,-90]).clipAngle(CLIP).precision(.5),path=d3.geoPath(proj,ctx);
  const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<=-Math.PI)a+=2*Math.PI;return a;};
  let S=300,lam=0,sgn=1,pts=[],sel=null,hover=null,drag=null,anim=null,raf=0,last=performance.now(),shown=null;
  function fit(){S=box.clientWidth||300;const d=Math.min(2,devicePixelRatio||1);cv.width=S*d;cv.height=S*d;ctx.setTransform(d,0,0,d,0,0);
    proj.scale(S*.5*.84/(CLIP*D)).translate([S/2,S/2]);}
  const angOf=lon=>{const p=proj([lon,0]);return Math.atan2(p[1]-S/2,p[0]-S/2);};
  fit();proj.rotate([0,-90]);const a0=angOf(0);proj.rotate([10,-90]);sgn=Math.sign(norm(angOf(0)-a0))||1;
  const toBottom=lon=>{proj.rotate([lam,-90]);return lam+norm(Math.PI/2-angOf(lon))/(sgn*D);};
  const homes=Object.keys(PL).filter(n=>PL[n].home);lam=toBottom(homes.length?PL[homes[0]].lon:110);
  function hit(x,y){let best=null,bd=13;pts.forEach(q=>{const d=Math.hypot(q.x-x,q.y-y);if(d<bd){bd=d;best=q;}});return best;}
  function select(n){sel=sel===n?null:n;btns.forEach(b=>b.classList.toggle('on',b.dataset.city===sel));if(sel)anim={t0:performance.now(),from:lam,to:toBottom(PL[sel].lon)};}
  function card(){const n=sel||(hover&&hover.n);if(!n){cardEl.hidden=true;shown=null;return;}
    const q=pts.find(p=>p.n===n);if(!q){cardEl.hidden=true;return;}
    if(shown!==n){const p=PL[n],g=GROUPS.find(g=>g.c.includes(n))||{zh:'',en:''},near=pts.filter(q2=>q2.n!==n&&Math.hypot(q2.x-q.x,q2.y-q.y)<12).map(q2=>q2.n);
      const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
      cardEl.innerHTML=`<div class="cz">${e(n)}</div>${p.en?`<div class="ce">${e(p.en)}</div>`:''}<div class="cg">${e(g.zh)}${g.en?' · '+e(g.en):''}${p.note?'　'+e(p.note):''}</div>${p.photo?`<img class="cp" src="${e(p.photo)}" alt="">`:''}${p.text?`<p>${md(p.text)}</p>`:''}${near.length?`<div class="cn">附近还有：${near.map(e).join(' · ')}</div>`:''}`;shown=n;}
    cardEl.hidden=false;const w=cardEl.offsetWidth,h=cardEl.offsetHeight;let l=q.x+16,t=q.y-24;if(l+w>S)l=q.x-16-w;if(l<0)l=Math.max(0,(S-w)/2);t=Math.max(0,Math.min(S-h,t));
    cardEl.style.left=l+'px';cardEl.style.top=t+'px';}
  function draw(now){const dt=Math.min(.05,(now-last)/1000);last=now;
    if(anim){const k=Math.min(1,(now-anim.t0)/1300),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;lam=anim.from+(anim.to-anim.from)*e;if(k>=1)anim=null;}
    else if(!sel&&!drag&&!hover&&!reduce)lam+=dt*1.6;
    proj.rotate([lam,-90]);const c=S/2,sc=proj.scale(),Rin=sc*CLIP*D,rw=S*.04;
    ctx.clearRect(0,0,S,S);ctx.lineWidth=.8;
    ctx.strokeStyle='rgba(236,232,221,.34)';[Rin,Rin+rw].forEach(r=>{ctx.beginPath();ctx.arc(c,c,r,0,6.2832);ctx.stroke();});
    ctx.strokeStyle='rgba(236,232,221,.12)';ctx.beginPath();ctx.arc(c,c,Rin+rw+6,0,6.2832);ctx.stroke();
    ctx.font=`italic ${Math.max(10,Math.round(S*.019))}px 'Cormorant Garamond', serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    for(let lon=-180;lon<180;lon+=5){const a=angOf(lon),L=lon%30===0?rw:lon%10===0?rw*.45:rw*.25;ctx.strokeStyle=`rgba(236,232,221,${lon%30===0?.4:.25})`;
      ctx.beginPath();ctx.moveTo(c+Rin*Math.cos(a),c+Rin*Math.sin(a));ctx.lineTo(c+(Rin+L)*Math.cos(a),c+(Rin+L)*Math.sin(a));ctx.stroke();
      if(lon%30===0){const b=a+sgn*.055,r=Rin+rw*.55;ctx.fillStyle='rgba(163,166,180,.85)';ctx.fillText(`${Math.abs(lon)}°${lon>0?'E':lon<0?'W':''}`,c+r*Math.cos(b),c+r*Math.sin(b));}}
    for(let lon=-180;lon<180;lon+=30){const a=angOf(lon);ctx.strokeStyle='rgba(236,232,221,.07)';ctx.beginPath();ctx.moveTo(c,c);ctx.lineTo(c+Rin*Math.cos(a),c+Rin*Math.sin(a));ctx.stroke();}
    [[0,[]],[23.44,[1,4]],[30,[3,5]],[60,[3,5]]].forEach(([lat,dash])=>{ctx.setLineDash(dash);ctx.strokeStyle=`rgba(236,232,221,${lat===0?.2:.12})`;ctx.beginPath();ctx.arc(c,c,sc*(90-lat)*D,0,6.2832);ctx.stroke();});ctx.setLineDash([]);
    if(land){ctx.beginPath();path(land);ctx.fillStyle='rgba(236,232,221,.055)';ctx.fill();ctx.strokeStyle='rgba(236,232,221,.26)';ctx.lineWidth=.6;ctx.stroke();}
    pts=[];Object.keys(PL).forEach(n=>{const p=proj([PL[n].lon,PL[n].lat]);if(p)pts.push({n,x:p[0],y:p[1]});});
    const P=n=>pts.find(q=>q.n===n);
    ctx.lineWidth=.8;GROUPS.forEach(g=>{const on=sel&&g.c.includes(sel);ctx.strokeStyle=on?'rgba(236,232,221,.75)':'rgba(201,204,216,.42)';ctx.beginPath();g.c.forEach((n,i)=>{const q=P(n);if(!q)return;i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.stroke();});
    pts.forEach(q=>{const big=!!PL[q.n].home,act=q.n===sel||(hover&&hover.n===q.n),r=big?2.4:1.6;
      const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r*(act?8:5));g.addColorStop(0,`rgba(236,232,221,${act?.45:.25})`);g.addColorStop(1,'rgba(236,232,221,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,r*(act?8:5),0,6.2832);ctx.fill();
      ctx.fillStyle='#F4F1E6';ctx.beginPath();ctx.arc(q.x,q.y,r,0,6.2832);ctx.fill();
      if(big||act){const l=act?10:6;ctx.strokeStyle='rgba(244,241,230,.7)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(q.x-l,q.y);ctx.lineTo(q.x+l,q.y);ctx.moveTo(q.x,q.y-l);ctx.lineTo(q.x,q.y+l);ctx.stroke();}});
    card();raf=requestAnimationFrame(draw);}
  const local=e=>{const b=cv.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top];};
  const angAt=e=>{const[x,y]=local(e);return Math.atan2(y-S/2,x-S/2);};
  cv.addEventListener('pointerdown',e=>{try{cv.setPointerCapture(e.pointerId);}catch(_){}drag={a:angAt(e),x:e.clientX,y:e.clientY,moved:false};});
  cv.addEventListener('pointermove',e=>{if(drag){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;if(drag.moved){const a=angAt(e);lam+=norm(a-drag.a)/(sgn*D);drag.a=a;anim=null;cv.style.cursor='grabbing';}return;}
    const[x,y]=local(e);hover=hit(x,y);cv.style.cursor=hover?'pointer':'grab';});
  cv.addEventListener('pointerup',e=>{const moved=drag&&drag.moved;drag=null;cv.style.cursor='grab';if(moved)return;const[x,y]=local(e),h=hit(x,y);if(h)select(h.n);else if(sel)select(sel);});
  cv.addEventListener('pointerleave',()=>{hover=null;});
  btns.forEach(b=>{b.onclick=()=>select(b.dataset.city);});
  const ro=new ResizeObserver(()=>fit());ro.observe(box);
  raf=requestAnimationFrame(draw);
  mapStop=()=>{cancelAnimationFrame(raf);ro.disconnect();};
}
