/* Lampwerk: the cable run behind the page, and the phone at the end. */
(function(){
"use strict";
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
var NS="http://www.w3.org/2000/svg";
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function ease(t){return 1-Math.pow(1-t,3)}

/* ---------- the cable run: a plot drawn behind the page as you scroll ---------- */
var bg=document.getElementById("bgplot"),runs=[],mods=[],cableLen=0,cable=null,docH=0;
function buildPlot(){
  if(!bg)return;
  bg.innerHTML="";runs=[];mods=[];
  var W=document.documentElement.clientWidth;docH=document.documentElement.scrollHeight;
  bg.style.height=docH+"px";
  var svg=el("svg",{width:W,height:docH,viewBox:"0 0 "+W+" "+docH},bg);
  var marg=(W-1180)/2,wide=marg>90;
  var xl=wide?marg/2:10,xr=wide?W-marg/2:W-10;
  /* faint crosses on a 1 m grid (120 px) */
  var g=el("g",{"class":"bg-grid"},svg),step=120,d="";
  for(var y=step;y<docH;y+=step)for(var x=step/2;x<W;x+=step)d+="M"+(x-3)+" "+y+"h6M"+x+" "+(y-3)+"v6";
  el("path",{d:d},g);
  /* where the cable crosses the page: the gaps above each section */
  var gaps=[],secs=document.querySelectorAll(".sec,.foot"),sy=scrollY;
  Array.prototype.forEach.call(secs,function(s){gaps.push(s.getBoundingClientRect().top+sy+(s.classList.contains("foot")?-40:26))});
  var r=18,side=0,cx=xl,cy=60,p="M"+cx+" "+cy;
  gaps.forEach(function(gy,i){
    var nx=side?xl:xr,dir=nx>cx?1:-1;
    p+="V"+(gy-r)+"Q"+cx+" "+gy+" "+(cx+dir*r)+" "+gy+"H"+(nx-dir*r)+"Q"+nx+" "+gy+" "+nx+" "+(gy+r);
    /* a distro box where the run crosses */
    var mx=(cx+nx)/2;mods.push({y:gy,kind:"box",x:mx,label:(i%2?"16 A":"32 A")+" · "+(String.fromCharCode(65+i))});
    /* a lamp in the margin, halfway down each run, on wide screens */
    var prev=i?gaps[i-1]:cy;if(wide&&gy-prev>380)mods.push({y:(prev+gy)/2,kind:"lamp",x:cx,dir:cx<W/2?1:-1,n:i+1});
    cx=nx;side=1-side;
  });
  p+="V"+(docH-24);
  cable=el("path",{d:p,"class":"bg-cable",pathLength:1000},svg);
  cableLen=cable.getTotalLength();
  /* modules: drawn when the cable reaches them */
  mods.forEach(function(m){
    var mg=el("g",{"class":"bg-mod"},svg);m.g=mg;
    if(m.kind==="box"){
      el("rect",{x:m.x-26,y:m.y-9,width:52,height:18,rx:3},mg);
      var t=el("text",{x:m.x,y:m.y+3.5,"text-anchor":"middle"},mg);t.textContent=m.label;
    }else{
      var x=m.x,y=m.y,dd=m.dir,len=Math.min(marg*1.1,260);
      /* the beam: two edges and a soft wedge of gel */
      el("path",{"class":"bg-beam",d:"M"+x+" "+y+"L"+(x+dd*len)+" "+(y-len*.42)+"A"+len+" "+len+" 0 0 "+(dd>0?1:0)+" "+(x+dd*len)+" "+(y+len*.42)+"Z"},mg);
      el("path",{"class":"bg-edge",d:"M"+x+" "+y+"L"+(x+dd*len)+" "+(y-len*.42)+"M"+x+" "+y+"L"+(x+dd*len)+" "+(y+len*.42)},mg);
      el("rect",{x:x-9,y:y-7,width:18,height:14,rx:2,transform:"rotate("+(dd>0?0:180)+" "+x+" "+y+")"},mg);
      el("path",{d:"M"+(x+dd*9)+" "+(y-7)+"l"+(dd*6)+" -4M"+(x+dd*9)+" "+(y+7)+"l"+(dd*6)+" 4"},mg);
      var lt=el("text",{x:x,y:y+26,"text-anchor":"middle"},mg);lt.textContent=String(m.n);
      el("path",{"class":"bg-dim",d:"M"+(x+dd*14)+" "+(y+40)+"H"+(x+dd*(len*.8))+"M"+(x+dd*14)+" "+(y+36)+"v8M"+(x+dd*(len*.8))+" "+(y+36)+"v8"},mg);
      var dt=el("text",{x:x+dd*(len*.47),y:y+54,"text-anchor":"middle"},mg);dt.textContent=(len*.8/120).toFixed(1)+" m";
    }
    /* where along the cable this module sits */
    m.at=nearest(m.y);
  });
  tick();
}
function nearest(y){
  /* binary search the cable's length for the first point at this height */
  var lo=0,hi=cableLen;
  for(var i=0;i<24;i++){var mid=(lo+hi)/2;if(cable.getPointAtLength(mid).y<y)lo=mid;else hi=mid}
  return lo/cableLen;
}
var raf=0;
function tick(){
  raf=0;if(!cable)return;
  var p=RM?1:clamp((scrollY+innerHeight*.8)/docH,0,1);
  cable.style.strokeDashoffset=String(1000*(1-p));
  mods.forEach(function(m){m.g.classList.toggle("on",p>=m.at)});
}
if(bg){
  addEventListener("scroll",function(){if(!raf)raf=requestAnimationFrame(tick)},{passive:true});
  var rt=0;addEventListener("resize",function(){clearTimeout(rt);rt=setTimeout(buildPlot,200)});
  if(document.readyState==="complete")buildPlot();else addEventListener("load",buildPlot);
  if(window.ResizeObserver){var lastH=0;new ResizeObserver(function(){var h=document.documentElement.scrollHeight;if(Math.abs(h-lastH)>40){lastH=h;clearTimeout(rt);rt=setTimeout(buildPlot,200)}}).observe(document.body)}
}

/* ---------- the phone ---------- */
var stage=document.getElementById("ph-stage");
if(!stage)return;
var chips=Array.prototype.slice.call(document.querySelectorAll("#ph-lights button"));
var state={key:true,fill:true,back:true};
var LX={key:1240,fill:310,back:520};
var hooks=[];
chips.forEach(function(b){b.addEventListener("click",function(){var k=b.dataset.l;state[k]=!state[k];b.setAttribute("aria-pressed",state[k]);hooks.forEach(function(f){f()})})});
function readout(){
  var on=["key","fill","back"].filter(function(k){return state[k]});
  var amps={key:7.8,fill:1.8,back:2.2},a=0;on.forEach(function(k){a+=amps[k]});
  var ratio=state.key&&state.fill?Math.round(LX.key/LX.fill)+":1":"—";
  return {on:on.length,amps:a,ratio:ratio,key:state.key?LX.key:0};
}
function fmt(n){return Math.round(n).toLocaleString("en-GB")}
var log=document.getElementById("ph-log");
function setLog(){var r=readout();if(log)log.textContent=r.on+" of 3 on · key to fill "+r.ratio+" · "+r.amps.toFixed(1)+" A"}
hooks.push(setLog);setLog();

var started=false;
function start(){
  if(started)return;started=true;
  var s=document.createElement("script");s.src="three.min.js";s.onload=function(){try{build()}catch(e){fail()}};s.onerror=fail;document.head.appendChild(s);
}
function fail(){stage.classList.add("no3d")}
if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();start()}},{rootMargin:"600px"});io.observe(stage)}else start();

/* the app's screen, drawn into a canvas the 3D screen uses as its texture */
function drawScreen(c,t){
  var x=c.getContext("2d"),W=c.width,H=c.height,s=W/390;
  x.setTransform(1,0,0,1,0,0);
  x.fillStyle="#0E0E0D";x.fillRect(0,0,W,H);
  x.scale(s,s);
  var T="#EDEDEA",TM="rgba(237,237,234,.52)",LN="rgba(237,237,234,.1)",GEL="#FFC21A";
  x.fillStyle=T;x.font="600 15px 'IBM Plex Sans',system-ui,sans-serif";x.fillText("9:41",34,34);
  x.fillStyle="#000";rr(x,140,14,110,32,16);x.fill();
  /* header */
  x.fillStyle=TM;x.font="400 12px 'IBM Plex Mono',ui-monospace,monospace";x.fillText("SCENE 12 · DAY 3",20,86);
  x.fillStyle=T;x.font="500 24px 'IBM Plex Sans',system-ui,sans-serif";x.fillText("Int. kitchen, night",20,116);
  /* setups */
  ["Wide","Close","Reverse"].forEach(function(n,i){var bx=20+i*84;x.fillStyle=i?"#151514":"#262624";rr(x,bx,132,78,30,7);x.fill();x.fillStyle=i?TM:T;x.font="400 13px 'IBM Plex Sans',system-ui,sans-serif";x.fillText(n,bx+12,152)});
  /* the plan */
  var px=20,py=180,pw=350,ph=380;
  x.fillStyle="#151514";rr(x,px,py,pw,ph,12);x.fill();
  x.strokeStyle=LN;x.lineWidth=1;
  for(var gx=px+35;gx<px+pw;gx+=35){x.beginPath();x.moveTo(gx,py);x.lineTo(gx,py+ph);x.stroke()}
  for(var gy=py+38;gy<py+ph;gy+=38){x.beginPath();x.moveTo(px,gy);x.lineTo(px+pw,gy);x.stroke()}
  x.strokeStyle="rgba(237,237,234,.45)";x.lineWidth=2;x.strokeRect(px+20,py+24,pw-40,ph-48);
  /* the subject, the camera */
  var sx=px+pw*.52,sy=py+ph*.5;
  var L=[{k:"key",x:px+70,y:py+90,n:"1",nm:"M18"},{k:"fill",x:px+pw-60,y:py+ph-110,n:"2",nm:"S60"},{k:"back",x:px+pw-80,y:py+70,n:"3",nm:"Orbiter"}];
  L.forEach(function(l){
    var a=Math.atan2(sy-l.y,sx-l.x),r=Math.hypot(sx-l.x,sy-l.y)+40,spread=l.k==="fill"?.6:.32;
    if(state[l.k]){
      var pulse=.18+.04*Math.sin(t*2+l.x);
      var g=x.createRadialGradient(l.x,l.y,0,l.x,l.y,r);g.addColorStop(0,"rgba(255,194,26,"+(pulse+.12)+")");g.addColorStop(1,"rgba(255,194,26,0)");
      x.fillStyle=g;x.beginPath();x.moveTo(l.x,l.y);x.arc(l.x,l.y,r,a-spread,a+spread);x.closePath();x.fill();
    }
  });
  x.strokeStyle=T;x.lineWidth=1.5;x.beginPath();x.arc(sx,sy,11,0,7);x.stroke();
  x.beginPath();x.moveTo(sx-6,sy-6);x.lineTo(sx+6,sy+6);x.moveTo(sx+6,sy-6);x.lineTo(sx-6,sy+6);x.stroke();
  var cx0=px+pw*.5,cy0=py+ph-44;
  x.fillStyle="#262624";rr(x,cx0-16,cy0-10,32,20,4);x.fill();x.strokeStyle=TM;x.lineWidth=1;rr(x,cx0-16,cy0-10,32,20,4);x.stroke();
  x.beginPath();x.moveTo(cx0-8,cy0-10);x.lineTo(cx0-18,cy0-26);x.moveTo(cx0+8,cy0-10);x.lineTo(cx0+18,cy0-26);x.strokeStyle=LN;x.stroke();
  L.forEach(function(l){
    var on=state[l.k];
    x.save();x.translate(l.x,l.y);x.rotate(Math.atan2(sy-l.y,sx-l.x));
    x.fillStyle=on?GEL:"#262624";rr(x,-13,-10,26,20,4);x.fill();
    if(!on){x.strokeStyle=TM;x.lineWidth=1;rr(x,-13,-10,26,20,4);x.stroke()}
    x.restore();
    x.fillStyle=on?T:TM;x.font="500 12px 'IBM Plex Mono',ui-monospace,monospace";x.fillText(l.n+" "+l.nm,l.x-18,l.y+28);
  });
  /* readouts */
  var r=readout();
  x.fillStyle="#151514";rr(x,20,576,170,92,12);x.fill();rr(x,200,576,170,92,12);x.fill();
  x.fillStyle=TM;x.font="400 12px 'IBM Plex Sans',system-ui,sans-serif";x.fillText("Key at subject",34,600);x.fillText("Load",214,600);
  x.fillStyle=T;x.font="500 30px 'IBM Plex Mono',ui-monospace,monospace";x.fillText(fmt(r.key),34,640);x.fillText(r.amps.toFixed(1),214,640);
  var kw=x.measureText(fmt(r.key)).width;
  x.fillStyle=TM;x.font="400 13px 'IBM Plex Mono',ui-monospace,monospace";x.fillText("lx",34+kw+6,640);
  x.fillText("A of 16",214,658);x.fillText("key to fill "+r.ratio,34,658);
  /* lamp list */
  L.forEach(function(l,i){var y=690+i*36;x.fillStyle=state[l.k]?GEL:"#262624";x.beginPath();x.arc(30,y+10,5,0,7);x.fill();x.fillStyle=state[l.k]?T:TM;x.font="400 14px 'IBM Plex Sans',system-ui,sans-serif";x.fillText(l.n+"  "+({key:"Arri M18 · key",fill:"SkyPanel S60 · fill",back:"Orbiter · back"})[l.k],46,y+15);x.strokeStyle=LN;x.beginPath();x.moveTo(20,y+30);x.lineTo(370,y+30);x.stroke()});
  /* send */
  x.fillStyle="rgba(237,237,234,.3)";rr(x,140,830,110,5,3);x.fill();
}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function rshape(T,w,h,r){var s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
function planeUV(geo,w,h){var p=geo.attributes.position,uv=geo.attributes.uv;for(var i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);uv.needsUpdate=true}

function build(){
  var T=window.THREE;
  var cv=document.getElementById("ph3");
  var renderer=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:"high-performance"});
  if(!renderer.getContext())throw 0;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  var scene=new T.Scene();
  var cam=new T.PerspectiveCamera(30,1,8,400);cam.position.set(0,0,34);

  /* a studio for reflections: dark room, three softboxes that follow the switches */
  var pm=new T.PMREMGenerator(renderer),envRT=null;
  function makeEnv(){
    var es=new T.Scene();es.background=new T.Color(0x050505);
    function box(col,i,x,y,z,w,h){if(!i)return;var m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(col).multiplyScalar(i),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m)}
    box(0xFFC21A,state.key?4:0,-12,7,8,9,12);
    box(0xEDEDEA,state.fill?1.4:0,13,-4,7,10,14);
    box(0xEDEDEA,state.back?3:0,8,9,-10,4,18);
    box(0xEDEDEA,.25,0,12,0,30,2);
    if(envRT)envRT.dispose();envRT=pm.fromScene(es,.02);scene.environment=envRT.texture;
  }
  makeEnv();

  /* lights: key in gel, soft fill, back for the edge */
  var amb=new T.AmbientLight(0xffffff,.08);scene.add(amb);
  var key=new T.SpotLight(0xFFC21A,1600,0,.5,.6,1.6);key.position.set(-24,14,14);scene.add(key);scene.add(key.target);
  var fill=new T.PointLight(0xEDEDEA,220,0,1.6);fill.position.set(24,-8,12);scene.add(fill);
  var back=new T.SpotLight(0xffffff,2600,0,.45,.5,1.6);back.position.set(16,18,-16);scene.add(back);scene.add(back.target);

  /* the beams, so you can see where the light comes from */
  var gc=document.createElement("canvas");gc.width=4;gc.height=256;var gx=gc.getContext("2d"),gg=gx.createLinearGradient(0,0,0,256);
  gg.addColorStop(0,"rgba(255,255,255,0)");gg.addColorStop(.25,"rgba(255,255,255,.55)");gg.addColorStop(1,"rgba(255,255,255,1)");gx.fillStyle=gg;gx.fillRect(0,0,4,256);
  var gtex=new T.CanvasTexture(gc);
  function cone(from,col,len,r0,r1,op){
    var geo=new T.CylinderGeometry(r1,r0,len,48,1,true);geo.translate(0,-len/2,0);
    var m=new T.Mesh(geo,new T.MeshBasicMaterial({color:col,alphaMap:gtex,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
    m.position.copy(from);var dir=new T.Vector3().sub(from).normalize();m.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),dir);m.userData.op=op;scene.add(m);return m;
  }
  var beams={key:cone(key.position,0xFFC21A,30,.6,9,.09),fill:cone(fill.position,0xEDEDEA,26,1.2,12,.035),back:cone(back.position,0xEDEDEA,28,.5,7,.06)};
  var LV={key:1600,fill:220,back:2600},cur={key:0,fill:0,back:0};

  /* the phone: 71.5 x 147 x 8.3 mm, a unit is 5 mm */
  var Wd=14.3,Hd=29.4,R=2.2,D=1.2,bev=.24;
  var phone=new T.Group(),inner=new T.Group();phone.add(inner);scene.add(phone);
  var frameMat=new T.MeshPhysicalMaterial({color:0x8a8984,metalness:1,roughness:.26,clearcoat:.3});
  var body=new T.Mesh(new T.ExtrudeGeometry(rshape(T,Wd-bev*2,Hd-bev*2,R-bev),{depth:D,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:6,curveSegments:24}),frameMat);
  body.position.z=-D/2;inner.add(body);
  var glass=new T.MeshPhysicalMaterial({color:0x020202,metalness:0,roughness:.05,clearcoat:1,clearcoatRoughness:.02});
  var front=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),glass);front.position.z=D/2+bev+.03;inner.add(front);
  var sc=document.createElement("canvas");sc.width=780;sc.height=1688;
  var tex=new T.CanvasTexture(sc);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
  var sw=Wd-1.1,sh=Hd-1.1,sg=new T.ShapeGeometry(rshape(T,sw,sh,R-.5),24);planeUV(sg,sw,sh);
  var screen=new T.Mesh(sg,new T.MeshBasicMaterial({map:tex,toneMapped:false}));screen.position.z=D/2+bev+.08;screen.renderOrder=1;inner.add(screen);
  var shine=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),new T.MeshPhysicalMaterial({color:0x000000,transparent:true,opacity:.18,roughness:.04,metalness:0,clearcoat:1,depthWrite:false}));shine.position.z=D/2+bev+.14;shine.renderOrder=2;inner.add(shine);
  var backMat=new T.MeshPhysicalMaterial({color:0x22221f,metalness:.2,roughness:.55,clearcoat:.4,clearcoatRoughness:.4});
  var bk=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),backMat);bk.position.z=-D/2-bev-.03;bk.rotation.y=Math.PI;inner.add(bk);
  /* camera plateau and lenses */
  var plat=new T.Mesh(new T.ExtrudeGeometry(rshape(T,6.4,6.4,1.5),{depth:.16,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:3,curveSegments:16}),new T.MeshPhysicalMaterial({color:0x2b2a27,metalness:.3,roughness:.25,clearcoat:.8}));
  plat.rotation.y=Math.PI;plat.position.set(Wd/2-4.0,Hd/2-4.0,-D/2-bev);inner.add(plat);
  var ringM=new T.MeshPhysicalMaterial({color:0x4a4945,metalness:1,roughness:.25}),lensM=new T.MeshPhysicalMaterial({color:0x050608,metalness:.2,roughness:.02,clearcoat:1});
  [[-1.45,1.45],[-1.45,-1.45],[1.5,0]].forEach(function(o){
    var ring=new T.Mesh(new T.CylinderGeometry(1.25,1.25,.5,40),ringM);ring.rotation.x=Math.PI/2;
    ring.position.set(plat.position.x-o[0]*-1,plat.position.y+o[1],-D/2-bev-.38);inner.add(ring);
    var gl=new T.Mesh(new T.CircleGeometry(.95,40),lensM);gl.rotation.y=Math.PI;gl.position.set(ring.position.x,ring.position.y,-D/2-bev-.64);inner.add(gl);
  });
  var fl=new T.Mesh(new T.CircleGeometry(.35,24),new T.MeshStandardMaterial({color:0xd8d2c0,roughness:.6}));fl.rotation.y=Math.PI;fl.position.set(plat.position.x+1.5,plat.position.y+1.9,-D/2-bev-.23);inner.add(fl);
  var li=new T.Mesh(new T.CircleGeometry(.32,24),lensM);li.rotation.y=Math.PI;li.position.set(plat.position.x+1.5,plat.position.y-1.9,-D/2-bev-.23);inner.add(li);
  /* the mark on the back */
  /* side buttons */
  var btnM=frameMat;[[-1,7.4,2.2],[-1,4.6,2.2],[-1,9.6,.9],[1,6,3.6]].forEach(function(b){var m=new T.Mesh(new T.BoxGeometry(.3,b[2],.7),btnM);m.position.set(b[0]*(Wd/2+.08),b[1],0);inner.add(m)});

  /* pop-out cards: readouts that lift off the screen */
  function cardTex(w,h){var c=document.createElement("canvas");c.width=w;c.height=h;var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return {c:c,t:t}}
  var cards=[
    {x:-8.6,y:5.6,z:4.2,w:9,h:3.4,draw:function(x,r){lbl(x,"KEY AT SUBJECT",r.key?fmt(r.key)+" lx":"off",state.key)}},
    {x:8.8,y:-1.6,z:5.6,w:8.6,h:3.4,draw:function(x,r){lbl(x,"LOAD · CIRCUIT A",r.amps.toFixed(1)+" A",r.amps>0)}},
    {x:-7.8,y:-8.4,z:3.2,w:9.4,h:3.4,draw:function(x,r){lbl(x,"KEY TO FILL",r.ratio,state.key&&state.fill)}},
    {x:7.6,y:9.2,z:2.6,w:8,h:3.4,draw:function(x,r){lbl(x,"1  ARRI M18",state.key?"3.0 m · 85%":"off",state.key)}}
  ];
  function lbl(x,a,b,on){var W=x.canvas.width,H=x.canvas.height;x.clearRect(0,0,W,H);x.fillStyle="rgba(21,21,20,.94)";rr(x,2,2,W-4,H-4,22);x.fill();x.strokeStyle="rgba(237,237,234,.2)";x.lineWidth=2;x.stroke();
    x.fillStyle=on?"#FFC21A":"#3a3a37";x.beginPath();x.arc(40,H/2,10,0,7);x.fill();
    x.fillStyle="rgba(237,237,234,.52)";x.font="500 26px 'IBM Plex Mono',ui-monospace,monospace";x.fillText(a,68,H*.4);
    x.fillStyle="#EDEDEA";x.font="500 46px 'IBM Plex Mono',ui-monospace,monospace";x.fillText(b,68,H*.4+56)}
  cards.forEach(function(c){
    var ct=cardTex(Math.round(c.w*60),Math.round(c.h*60));c.cv=ct.c;c.tex=ct.t;
    c.mesh=new T.Mesh(new T.PlaneGeometry(c.w,c.h),new T.MeshBasicMaterial({map:ct.t,transparent:true,toneMapped:false,depthWrite:false,opacity:0}));
    c.mesh.position.set(c.x*.3,c.y*.3,D/2);inner.add(c.mesh);
    var lg=new T.BufferGeometry().setFromPoints([new T.Vector3(c.x*.35,c.y*.35,D/2+bev+.02),new T.Vector3(c.x,c.y,c.z)]);
    c.line=new T.Line(lg,new T.LineBasicMaterial({color:0xEDEDEA,transparent:true,opacity:0}));inner.add(c.line);
  });
  function redrawCards(){var r=readout();cards.forEach(function(c){c.draw(c.cv.getContext("2d"),r);c.tex.needsUpdate=true})}
  redrawCards();
  hooks.push(function(){makeEnv();redrawCards()});

  /* size */
  function size(){var r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;
    /* fit the phone to 78% of the height, and the phone plus its cards to the width */
    var tn=Math.tan(cam.fov*Math.PI/360),zh=(Hd/.78)/(2*tn),zw=(30/.96)/(2*tn*cam.aspect);
    cam.position.z=Math.max(zh,zw);cam.updateProjectionMatrix()}
  size();addEventListener("resize",size);

  /* drag to turn, with a little momentum */
  var yaw=-.38,pitch=0,vy=0,drag=null;
  cv.addEventListener("pointerdown",function(e){drag={x:e.clientX,y:e.clientY,yaw:yaw,pitch:pitch,t:performance.now()};cv.setPointerCapture(e.pointerId);stage.classList.add("held")});
  cv.addEventListener("pointermove",function(e){if(!drag)return;var nx=drag.yaw+(e.clientX-drag.x)*.012;vy=(nx-yaw)*.6;yaw=nx;pitch=clamp(drag.pitch+(e.clientY-drag.y)*.006,-.5,.5)});
  function up(){drag=null;stage.classList.remove("held")}
  cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
  cv.addEventListener("keydown",function(e){if(e.key==="ArrowLeft"){vy-=.08;e.preventDefault()}if(e.key==="ArrowRight"){vy+=.08;e.preventDefault()}});

  var visible=true;
  if("IntersectionObserver" in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(visible)loop()},{rootMargin:"100px"}).observe(stage);
  var t0=performance.now(),looping=false,frame=0;
  stage.classList.add("ready");
  function progress(){var r=stage.getBoundingClientRect();return RM?1:clamp((innerHeight-r.top)/(innerHeight*.85),0,1)}
  function loop(){if(looping)return;looping=true;requestAnimationFrame(step)}
  function step(now){
    if(!visible){looping=false;return}
    var t=(now-t0)/1000,p=ease(progress());
    /* the landing: from below, turned away, to face you */
    var land=1-p;
    if(!drag){yaw+=vy;vy*=.94;if(Math.abs(vy)<.0005)yaw+=((-.38+Math.sin(t*.35)*.22)-yaw)*.012}
    phone.position.set(0,-30*land*land+Math.sin(t*.9)*.25*p,0);
    phone.rotation.set(.55*land+pitch+.08*p,yaw-2.8*land,-.35*land+Math.sin(t*.6)*.02);
    phone.scale.setScalar(.7+.3*p);
    /* cards lift off once it lands */
    var lift=clamp((p-.82)/.18,0,1);
    cards.forEach(function(c,i){var k=ease(clamp(lift*1.4-i*.12,0,1));
      c.mesh.position.set(c.x*(.3+.7*k),c.y*(.3+.7*k)+Math.sin(t*1.1+i)*.12*k,D/2+.1+(c.z-.1)*k);
      c.mesh.material.opacity=k;c.line.material.opacity=.35*k});
    /* lights fade to their switches */
    ["key","fill","back"].forEach(function(k){cur[k]+=((state[k]?LV[k]:0)-cur[k])*.12});
    key.intensity=cur.key;fill.intensity=cur.fill;back.intensity=cur.back;
    ["key","fill","back"].forEach(function(k){beams[k].material.opacity=beams[k].userData.op*(cur[k]/LV[k])*p});
    if(frame++%3===0){drawScreen(sc,t);tex.needsUpdate=true}
    renderer.render(scene,cam);
    requestAnimationFrame(step);
  }
  drawScreen(sc,0);tex.needsUpdate=true;
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){drawScreen(sc,0);tex.needsUpdate=true;redrawCards()});
  loop();
}
})();
