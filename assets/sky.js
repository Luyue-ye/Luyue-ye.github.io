/* 背景动效：太阳面的纸纹、星图、风、鱼、涟漪；月亮面的星空、流星、光晕。一般不需要改动。 */
(function(){
  let ph='';for(let k=0;k<8;k++){const r=9,d=2*r*(1-Math.abs(k-4)/4),dir=k<4?-1:1,sx=k===0?12:12+dir*d;
    ph+=`<svg viewBox="0 0 24 24"><defs><mask id="pm${k}"><rect width="24" height="24" fill="white"/>${k===4?'':`<circle cx="${sx.toFixed(2)}" cy="12" r="${r}" fill="black"/>`}</mask></defs><circle cx="12" cy="12" r="${r}" fill="none" stroke="#A3A6B4" stroke-width=".6" opacity=".5"/><circle cx="12" cy="12" r="${r}" fill="#E6E2D3" mask="url(#pm${k})"/></svg>`;}
  $('#phases').innerHTML=ph;
})();

(function(){
  const cv=$('#sky'),cx=cv.getContext('2d');let W=0,H=0,dpr=1,stars=[],brights=[],paper=null,t=0;
  let meteors=[],nextMeteor=performance.now()+600,ripples=[],winds=[],nextWind=performance.now()+2500,fish=[],nextFish=performance.now()+1500,lastRip={x:-999,y:-999,t:0};
  const R=(a,b)=>a+Math.random()*(b-a);
  let halos=[];
  window.navFx=(x,y)=>{if(reduce||!document.documentElement.classList.contains('moon'))return;halos.push({x,y,t0:performance.now(),dur:2600});};
  function seed(n){let s=n;return()=>((s=(s*16807)%2147483647)-1)/2147483646;}
  function resize(){dpr=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
    const rnd=seed(7),n=Math.round(W*H/5200);stars=[];for(let i=0;i<n;i++)stars.push({x:rnd()*W,y:rnd()*H,r:rnd()<.9?.5+rnd()*.7:1.1+rnd()*.6,a:.25+rnd()*.6,tw:rnd()<.25,ph:rnd()*6.28,sp:.6+rnd()*1.4});
    const rb=seed(11),nb=Math.max(8,Math.round(W*H/55000));brights=[];for(let i=0;i<nb;i++)brights.push({x:rb()*W,y:rb()*H,r:.9+rb()*.7,l:3+rb()*4});
    const pc=document.createElement('canvas');pc.width=pc.height=220;const p=pc.getContext('2d'),r2=seed(3);
    for(let i=0;i<2600;i++){p.fillStyle=`rgba(${r2()<.5?'120,96,50':'255,255,255'},${(r2()*.09).toFixed(3)})`;p.fillRect(r2()*220,r2()*220,1,1);}
    for(let i=0;i<40;i++){p.strokeStyle='rgba(120,96,50,0.035)';p.beginPath();const x=r2()*220,y=r2()*220;p.moveTo(x,y);p.lineTo(x+r2()*30-15,y+r2()*6-3);p.stroke();}
    paper=cx.createPattern(pc,'repeat');}
  function chart(a){const b=$('#toggle').getBoundingClientRect(),ox=b.left+b.width/2,oy=b.top+b.height/2;
    cx.save();cx.globalAlpha=a;cx.fillStyle=paper;cx.fillRect(0,0,W,H);
    cx.strokeStyle='rgba(160,106,28,0.13)';cx.lineWidth=.7;
    [110,170,250,360,500,680,900].forEach((r,i)=>{cx.beginPath();cx.setLineDash(i===2||i===5?[2,6]:[]);cx.arc(ox,oy,r,0,6.2832);cx.stroke();});
    cx.setLineDash([]);
    for(let i=0;i<72;i++){const g=i*Math.PI/36,l=i%6===0?12:5;cx.beginPath();cx.moveTo(ox+250*Math.cos(g),oy+250*Math.sin(g));cx.lineTo(ox+(250+l)*Math.cos(g),oy+(250+l)*Math.sin(g));cx.stroke();}
    cx.strokeStyle='rgba(160,106,28,0.07)';
    for(let i=0;i<24;i++){const g=i*Math.PI/12;cx.beginPath();cx.moveTo(ox+170*Math.cos(g),oy+170*Math.sin(g));cx.lineTo(ox+1200*Math.cos(g),oy+1200*Math.sin(g));cx.stroke();}
    cx.restore();}

  function addRipple(x,y,big){ripples.push({x,y,t0:performance.now(),max:big?110:60,dur:big?2200:1600});}
  addEventListener('pointermove',e=>{if(reduce||document.documentElement.classList.contains('moon'))return;const now=performance.now();
    if(Math.hypot(e.clientX-lastRip.x,e.clientY-lastRip.y)>46&&now-lastRip.t>90){addRipple(e.clientX,e.clientY,false);lastRip={x:e.clientX,y:e.clientY,t:now};}},{passive:true});
  addEventListener('pointerdown',e=>{if(!reduce&&!document.documentElement.classList.contains('moon'))addRipple(e.clientX,e.clientY,true);},{passive:true});

  function drawFish(f,now){const n=12,L=f.len,w=f.len*.22,ph=now/1000*f.beat,pts=[];
    for(let i=0;i<=n;i++){const s=i/n,off=Math.sin(ph-s*3)*L*.07*s*s;pts.push([L*.5-s*L,off,w*Math.pow(Math.sin(Math.PI*Math.min(1,s*1.15+.05)),.8)*(1-s*.55)]);}
    cx.save();cx.translate(f.x,f.y);cx.rotate(f.th);
    cx.beginPath();cx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<=n;i++)cx.lineTo(pts[i][0],pts[i][1]-pts[i][2]/2);
    const tl=pts[n],tw=Math.sin(ph-3)*L*.12;
    cx.lineTo(tl[0]-L*.22,tl[1]-L*.16+tw);cx.lineTo(tl[0]-L*.14,tl[1]+tw*.6);cx.lineTo(tl[0]-L*.22,tl[1]+L*.16+tw);
    for(let i=n;i>=1;i--)cx.lineTo(pts[i][0],pts[i][1]+pts[i][2]/2);
    cx.closePath();cx.fill();
    const fin=Math.sin(ph*1.3)*.25;[[-1],[1]].forEach(([k])=>{cx.beginPath();cx.moveTo(L*.15,k*w*.35);cx.quadraticCurveTo(L*.02,k*(w*.9+fin*w),-L*.06,k*w*.4);cx.closePath();cx.fill();});
    cx.restore();}
  function sunFx(a,now){cx.save();
    if(!reduce&&now>nextWind){const y0=R(.1,.9)*H,n=Math.round(R(3,5));for(let i=0;i<n;i++)winds.push({y:y0+R(-60,60),t0:now+i*R(80,260),dur:R(2600,3800),len:R(140,260),amp:R(4,10),k:R(.012,.022)});nextWind=now+R(4500,8000);}
    winds=winds.filter(w=>now<w.t0+w.dur);
    cx.strokeStyle='rgba(160,106,28,0.22)';cx.lineWidth=.8;
    winds.forEach(w=>{const k=(now-w.t0)/w.dur;if(k<0)return;const hx=-w.len+k*(W+w.len*2);cx.globalAlpha=a*Math.sin(Math.PI*k);cx.beginPath();
      for(let x=0;x<=w.len;x+=6){const X=hx-x,Y=w.y+Math.sin(X*w.k+now/700)*w.amp;x?cx.lineTo(X,Y):cx.moveTo(X,Y);}cx.stroke();});
    if(!reduce&&now>nextFish&&fish.length<3){const left=Math.random()<.5,sx=left?-90:W+90,sy=R(.12,.88)*H,tx=left?R(.45,.8)*W:R(.2,.55)*W,ty=sy+R(-.2,.2)*H,th=Math.atan2(ty-sy,tx-sx);
      fish.push({x:sx,y:sy,tx,ty,th,sp:R(30,46),len:R(38,58),beat:R(4,6),wob:R(0,6.28),last:now,born:now,gone:0});nextFish=now+R(6000,12000);}
    cx.fillStyle='rgba(92,70,36,0.12)';
    fish=fish.filter(f=>{const dt=Math.min(.05,(now-f.last)/1000);f.last=now;f.th+=Math.sin(now/1600+f.wob)*.003;f.x+=Math.cos(f.th)*f.sp*dt;f.y+=Math.sin(f.th)*f.sp*dt;
      if(!f.gone&&((f.tx-f.x)*Math.cos(f.th)+(f.ty-f.y)*Math.sin(f.th))<-50)f.gone=now;
      const fa=f.gone?1-(now-f.gone)/1800:1;if(fa<=0)return false;
      cx.globalAlpha=a*fa;drawFish(f,now);return f.x>-160&&f.x<W+160;});
        ripples=ripples.filter(r=>now<r.t0+r.dur);
    cx.strokeStyle='rgba(160,106,28,1)';cx.lineWidth=.8;
    ripples.forEach(r=>{const k=(now-r.t0)/r.dur;for(let j=0;j<2;j++){const kk=k-j*.18;if(kk<=0)continue;cx.globalAlpha=a*.3*(1-kk)*(1-kk);cx.beginPath();cx.ellipse(r.x,r.y,4+kk*r.max,(4+kk*r.max)*.55,0,0,6.2832);cx.stroke();}});
    cx.restore();}
  function sky(a,now){cx.save();
    stars.forEach(s=>{let al=s.a;if(s.tw&&!reduce)al*=.55+.45*Math.sin(now/1000*s.sp+s.ph);cx.globalAlpha=a*al;cx.fillStyle='#E6E2D3';cx.beginPath();cx.arc(s.x,s.y,s.r,0,6.2832);cx.fill();});
    cx.strokeStyle='#ECE8DD';cx.fillStyle='#F4F1E6';
    brights.forEach(s=>{cx.globalAlpha=a*.95;cx.beginPath();cx.arc(s.x,s.y,s.r,0,6.2832);cx.fill();cx.globalAlpha=a*.55;cx.lineWidth=.6;cx.beginPath();cx.moveTo(s.x-s.l,s.y);cx.lineTo(s.x+s.l,s.y);cx.moveTo(s.x,s.y-s.l);cx.lineTo(s.x,s.y+s.l);cx.stroke();
      const g=cx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.l*1.2);g.addColorStop(0,'rgba(236,232,221,.18)');g.addColorStop(1,'rgba(236,232,221,0)');cx.globalAlpha=a;cx.fillStyle=g;cx.beginPath();cx.arc(s.x,s.y,s.l*1.2,0,6.2832);cx.fill();cx.fillStyle='#F4F1E6';});
    if(!reduce){if(now>nextMeteor){const ang=R(.35,.8);meteors.push({x:R(.15,1.1)*W,y:R(-.05,.55)*H,t0:now,dur:R(700,1300),dist:R(180,380),L:R(70,160),dx:-Math.cos(ang),dy:Math.sin(ang),w:R(.7,1.3)});nextMeteor=now+R(700,2800);}
      meteors=meteors.filter(m=>{const k=(now-m.t0)/m.dur;if(k>=1)return false;const hx=m.x+m.dx*k*m.dist,hy=m.y+m.dy*k*m.dist;
        const gr=cx.createLinearGradient(hx,hy,hx-m.dx*m.L,hy-m.dy*m.L);gr.addColorStop(0,'rgba(236,232,221,.8)');gr.addColorStop(1,'rgba(236,232,221,0)');
        cx.globalAlpha=a*Math.sin(Math.PI*k);cx.strokeStyle=gr;cx.lineWidth=m.w;cx.beginPath();cx.moveTo(hx,hy);cx.lineTo(hx-m.dx*m.L,hy-m.dy*m.L);cx.stroke();
        cx.fillStyle='rgba(236,232,221,.9)';cx.beginPath();cx.arc(hx,hy,m.w*.9,0,6.2832);cx.fill();return true;});}
    halos=halos.filter(o=>now<o.t0+o.dur);
    halos.forEach(o=>{const k=(now-o.t0)/o.dur,e=Math.sin(Math.PI*Math.min(1,k*1.15)),r=70+k*150;
      const g=cx.createRadialGradient(o.x,o.y,0,o.x,o.y,r);g.addColorStop(0,'rgba(236,232,221,.20)');g.addColorStop(.45,'rgba(201,204,216,.09)');g.addColorStop(1,'rgba(201,204,216,0)');
      cx.globalAlpha=a*e;cx.fillStyle=g;cx.beginPath();cx.arc(o.x,o.y,r,0,6.2832);cx.fill();});
    cx.restore();}
  function frame(now){const target=document.documentElement.classList.contains('moon')?1:0;t+=(target-t)*(reduce?1:.045);if(Math.abs(target-t)<.002)t=target;
    cx.clearRect(0,0,W,H);if(t<1){chart(1-t);sunFx(1-t,now);}if(t>0)sky(t,now);requestAnimationFrame(frame);}
  addEventListener('resize',resize);resize();requestAnimationFrame(frame);
})();
