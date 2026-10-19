/* Lampwerk: the cable run behind the page, and the phone at the end. */
(function(){
"use strict";
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
var NS="http://www.w3.org/2000/svg";
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function ease(t){return 1-Math.pow(1-t,3)}

/* ---------- the cable run: a plot drawn behind the page as you scroll ---------- */
var bg=document.getElementById("bgplot"),mods=[],cables=[],cable=null,docH=0;
function buildPlot(){
  if(!bg)return;
  bg.innerHTML="";mods=[];cables=[];
  var W=document.documentElement.clientWidth;docH=document.documentElement.scrollHeight;
  bg.style.height=docH+"px";
  /* the plot only lives in the side margins, so it never runs behind text; phones and narrow screens get none */
  var marg=(W-1180)/2;if(marg<110)return;
  var svg=el("svg",{width:W,height:docH,viewBox:"0 0 "+W+" "+docH},bg);
  var xl=marg/2,xr=W-marg/2,top=60,bot=docH-24;
  /* faint crosses on a 1 m grid (120 px), margins only */
  var g=el("g",{"class":"bg-grid"},svg),step=120,d="";
  for(var y=step;y<docH;y+=step)for(var x=step/2;x<W;x+=step)if(x<marg-12||x>W-marg+12)d+="M"+(x-3)+" "+y+"h6M"+x+" "+(y-3)+"v6";
  el("path",{d:d},g);
  /* two straight runs, one down each margin */
  [xl,xr].forEach(function(x){cables.push(el("path",{d:"M"+x+" "+top+"V"+bot,"class":"bg-cable",pathLength:1000},svg))});
  cable=cables[0];
  /* a distro box at the top of each section, alternating sides, and a lamp halfway down each run */
  var gaps=[],secs=document.querySelectorAll(".sec,.foot"),sy=scrollY;
  Array.prototype.forEach.call(secs,function(s){gaps.push(s.getBoundingClientRect().top+sy+(s.classList.contains("foot")?-40:26))});
  gaps.forEach(function(gy,i){
    var side=i%2,x=side?xr:xl;
    mods.push({y:gy,kind:"box",x:x,label:(i%2?"16 A":"32 A")+" · "+String.fromCharCode(65+i)});
    var prev=i?gaps[i-1]:top;if(gy-prev>380)mods.push({y:(prev+gy)/2,kind:"lamp",x:side?xl:xr,dir:side?1:-1,n:i+1});
  });
  mods.forEach(function(m){
    var mg=el("g",{"class":"bg-mod"},svg);m.g=mg;
    if(m.kind==="box"){
      el("rect",{x:m.x-26,y:m.y-9,width:52,height:18,rx:3},mg);
      var t=el("text",{x:m.x,y:m.y+3.5,"text-anchor":"middle"},mg);t.textContent=m.label;
    }else{
      /* the beam points at the page but stops before the content edge */
      var x=m.x,y=m.y,dd=m.dir,len=Math.min(marg*.42,200);
      el("path",{"class":"bg-beam",d:"M"+x+" "+y+"L"+(x+dd*len)+" "+(y-len*.42)+"A"+len+" "+len+" 0 0 "+(dd>0?1:0)+" "+(x+dd*len)+" "+(y+len*.42)+"Z"},mg);
      el("path",{"class":"bg-edge",d:"M"+x+" "+y+"L"+(x+dd*len)+" "+(y-len*.42)+"M"+x+" "+y+"L"+(x+dd*len)+" "+(y+len*.42)},mg);
      el("rect",{x:x-9,y:y-7,width:18,height:14,rx:2,transform:"rotate("+(dd>0?0:180)+" "+x+" "+y+")"},mg);
      el("path",{d:"M"+(x+dd*9)+" "+(y-7)+"l"+(dd*6)+" -4M"+(x+dd*9)+" "+(y+7)+"l"+(dd*6)+" 4"},mg);
      var lt=el("text",{x:x,y:y+26,"text-anchor":"middle"},mg);lt.textContent=String(m.n);
    }
    m.at=clamp((m.y-top)/(bot-top),0,1);
  });
  tick();
}
var raf=0;
function tick(){
  raf=0;if(!cable)return;
  var p=RM?1:clamp((scrollY+innerHeight*.8)/docH,0,1);
  cables.forEach(function(c){c.style.strokeDashoffset=String(1000*(1-p))});
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

/* the app's screen, drawn into a canvas the 3D screen uses as its texture.
   Portrait is 390 x 844 points; landscape is the same canvas drawn turned, 844 x 390. */
var T0="#EDEDEA",TM="rgba(237,237,234,.52)",LN="rgba(237,237,234,.1)",GEL="#FFC21A",P1="#151514",P2="#262624";
var SANS="'IBM Plex Sans',system-ui,sans-serif",MONO="'IBM Plex Mono',ui-monospace,monospace";
var LAMPS=[{k:"key",fx:.2,fy:.24,n:"1",nm:"M18",long:"Arri M18 · key"},{k:"fill",fx:.83,fy:.71,n:"2",nm:"S60",long:"SkyPanel S60 · fill"},{k:"back",fx:.77,fy:.18,n:"3",nm:"Orbiter",long:"Orbiter · back"}];
function drawPlan(x,px,py,pw,ph,t){
  x.fillStyle=P1;rr(x,px,py,pw,ph,12);x.fill();
  x.strokeStyle=LN;x.lineWidth=1;
  for(var gx=px+35;gx<px+pw;gx+=35){x.beginPath();x.moveTo(gx,py);x.lineTo(gx,py+ph);x.stroke()}
  for(var gy=py+38;gy<py+ph;gy+=38){x.beginPath();x.moveTo(px,gy);x.lineTo(px+pw,gy);x.stroke()}
  x.strokeStyle="rgba(237,237,234,.45)";x.lineWidth=2;x.strokeRect(px+20,py+24,pw-40,ph-48);
  var sx=px+pw*.52,sy=py+ph*.5;
  var L=LAMPS.map(function(l){return {k:l.k,n:l.n,nm:l.nm,x:px+pw*l.fx,y:py+ph*l.fy}});
  L.forEach(function(l){
    var a=Math.atan2(sy-l.y,sx-l.x),r=Math.hypot(sx-l.x,sy-l.y)+40,spread=l.k==="fill"?.6:.32;
    if(state[l.k]){
      var pulse=.18+.04*Math.sin(t*2+l.x);
      var g=x.createRadialGradient(l.x,l.y,0,l.x,l.y,r);g.addColorStop(0,"rgba(255,194,26,"+(pulse+.12)+")");g.addColorStop(1,"rgba(255,194,26,0)");
      x.fillStyle=g;x.beginPath();x.moveTo(l.x,l.y);x.arc(l.x,l.y,r,a-spread,a+spread);x.closePath();x.fill();
    }
  });
  x.strokeStyle=T0;x.lineWidth=1.5;x.beginPath();x.arc(sx,sy,11,0,7);x.stroke();
  x.beginPath();x.moveTo(sx-6,sy-6);x.lineTo(sx+6,sy+6);x.moveTo(sx+6,sy-6);x.lineTo(sx-6,sy+6);x.stroke();
  var cx0=px+pw*.5,cy0=py+ph-44;
  x.fillStyle=P2;rr(x,cx0-16,cy0-10,32,20,4);x.fill();x.strokeStyle=TM;x.lineWidth=1;rr(x,cx0-16,cy0-10,32,20,4);x.stroke();
  x.beginPath();x.moveTo(cx0-8,cy0-10);x.lineTo(cx0-18,cy0-26);x.moveTo(cx0+8,cy0-10);x.lineTo(cx0+18,cy0-26);x.strokeStyle=LN;x.stroke();
  L.forEach(function(l){
    var on=state[l.k];
    x.save();x.translate(l.x,l.y);x.rotate(Math.atan2(sy-l.y,sx-l.x));
    x.fillStyle=on?GEL:P2;rr(x,-13,-10,26,20,4);x.fill();
    if(!on){x.strokeStyle=TM;x.lineWidth=1;rr(x,-13,-10,26,20,4);x.stroke()}
    x.restore();
    x.fillStyle=on?T0:TM;x.font="500 12px "+MONO;x.fillText(l.n+" "+l.nm,l.x-18,l.y+28);
  });
}
function setups(x,x0,y0,w,h,gap,fs){["Wide","Close","Reverse"].forEach(function(n,i){var bx=x0+i*(w+gap);x.fillStyle=i?P1:P2;rr(x,bx,y0,w,h,7);x.fill();x.fillStyle=i?TM:T0;x.font="400 "+fs+"px "+SANS;x.fillText(n,bx+10,y0+h/2+fs*.36)})}
function lampList(x,x0,y0,w,row,fs){LAMPS.forEach(function(l,i){var y=y0+i*row;x.fillStyle=state[l.k]?GEL:P2;x.beginPath();x.arc(x0+10,y+10,5,0,7);x.fill();x.fillStyle=state[l.k]?T0:TM;x.font="400 "+fs+"px "+SANS;x.fillText(l.n+"  "+l.long,x0+26,y+15);x.strokeStyle=LN;x.beginPath();x.moveTo(x0,y+row-6);x.lineTo(x0+w,y+row-6);x.stroke()})}
function drawScreen(c,t,land){
  var x=c.getContext("2d"),W=c.width,H=c.height,s=W/390;
  x.setTransform(1,0,0,1,0,0);
  x.fillStyle="#0E0E0D";x.fillRect(0,0,W,H);
  if(land){drawLand(x,W,H,s,t);return}
  x.scale(s,s);
  x.fillStyle=T0;x.font="600 15px "+SANS;x.fillText("9:41",34,34);
  x.fillStyle="#000";rr(x,140,14,110,32,16);x.fill();
  x.fillStyle=TM;x.font="400 12px "+MONO;x.fillText("SCENE 12 · DAY 3",20,86);
  x.fillStyle=T0;x.font="500 24px "+SANS;x.fillText("Int. kitchen, night",20,116);
  setups(x,20,132,78,30,6,13);
  drawPlan(x,20,180,350,380,t);
  var r=readout();
  x.fillStyle=P1;rr(x,20,576,170,92,12);x.fill();rr(x,200,576,170,92,12);x.fill();
  x.fillStyle=TM;x.font="400 12px "+SANS;x.fillText("Key at subject",34,600);x.fillText("Load",214,600);
  x.fillStyle=T0;x.font="500 30px "+MONO;x.fillText(fmt(r.key),34,640);x.fillText(r.amps.toFixed(1),214,640);
  var kw=x.measureText(fmt(r.key)).width;
  x.fillStyle=TM;x.font="400 13px "+MONO;x.fillText("lx",34+kw+6,640);
  x.fillText("A of 16",214,658);x.fillText("key to fill "+r.ratio,34,658);
  lampList(x,20,690,350,36,14);
  x.fillStyle="rgba(237,237,234,.3)";rr(x,140,830,110,5,3);x.fill();
}
/* landscape: the phone is turned with its top to the left, so the plan fills the width
   and setups, the lamp list, the inspector and Add lamp sit in a column on the right */
function drawLand(x,W,H,s,t){
  /* map so x grows right and y grows down as you look at the turned phone */
  x.setTransform(0,s,-s,0,W,0);
  x.fillStyle="#000";rr(x,14,140,32,110,16);x.fill();
  drawPlan(x,60,14,520,362,t);
  var cx=596,cw=228,r=readout();
  x.fillStyle=TM;x.font="400 10px "+MONO;x.fillText("SCENE 12 · DAY 3",cx,30);
  x.fillStyle=T0;x.font="500 16px "+SANS;x.fillText("Int. kitchen, night",cx,52);
  setups(x,cx,64,70,24,9,11);
  lampList(x,cx,104,cw,28,11);
  /* inspector for the selected lamp */
  x.fillStyle=P1;rr(x,cx,196,cw,118,10);x.fill();
  x.fillStyle=TM;x.font="400 10px "+MONO;x.fillText("1 · ARRI M18",cx+12,216);
  x.fillStyle=T0;x.font="400 11px "+SANS;x.fillText(state.key?"3.0 m · 85% · Medium Yellow":"Off",cx+12,236);
  x.fillStyle=TM;x.font="400 10px "+SANS;x.fillText("Key at subject",cx+12,258);x.fillText("Load",cx+124,258);
  x.fillStyle=T0;x.font="500 20px "+MONO;x.fillText(fmt(r.key),cx+12,284);x.fillText(r.amps.toFixed(1),cx+124,284);
  x.fillStyle=TM;x.font="400 10px "+MONO;x.fillText("lx · "+r.ratio,cx+12,302);x.fillText("A of 16",cx+124,302);
  x.fillStyle=GEL;rr(x,cx,326,cw,40,10);x.fill();
  x.fillStyle="#0E0E0D";x.font="500 13px "+SANS;x.fillText("+ Add lamp",cx+cw/2-36,351);
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
  var phone=new T.Group(),inner=new T.Group(),dev=new T.Group();phone.add(inner);inner.add(dev);scene.add(phone);
  var frameMat=new T.MeshPhysicalMaterial({color:0x8a8984,metalness:1,roughness:.26,clearcoat:.3});
  var body=new T.Mesh(new T.ExtrudeGeometry(rshape(T,Wd-bev*2,Hd-bev*2,R-bev),{depth:D,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:6,curveSegments:24}),frameMat);
  body.position.z=-D/2;dev.add(body);
  var glass=new T.MeshPhysicalMaterial({color:0x020202,metalness:0,roughness:.05,clearcoat:1,clearcoatRoughness:.02});
  var front=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),glass);front.position.z=D/2+bev+.03;dev.add(front);
  var sc=document.createElement("canvas");sc.width=780;sc.height=1688;
  var tex=new T.CanvasTexture(sc);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=8;
  var sw=Wd-1.1,sh=Hd-1.1,sg=new T.ShapeGeometry(rshape(T,sw,sh,R-.5),24);planeUV(sg,sw,sh);
  var screen=new T.Mesh(sg,new T.MeshBasicMaterial({map:tex,toneMapped:false}));screen.position.z=D/2+bev+.08;screen.renderOrder=1;dev.add(screen);
  var shine=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),new T.MeshPhysicalMaterial({color:0x000000,transparent:true,opacity:.18,roughness:.04,metalness:0,clearcoat:1,depthWrite:false}));shine.position.z=D/2+bev+.14;shine.renderOrder=2;dev.add(shine);
  var backMat=new T.MeshPhysicalMaterial({color:0x22221f,metalness:.2,roughness:.55,clearcoat:.4,clearcoatRoughness:.4});
  var bk=new T.Mesh(new T.ShapeGeometry(rshape(T,Wd-.15,Hd-.15,R-.1),24),backMat);bk.position.z=-D/2-bev-.03;bk.rotation.y=Math.PI;dev.add(bk);
  /* camera plateau and lenses */
  var plat=new T.Mesh(new T.ExtrudeGeometry(rshape(T,6.4,6.4,1.5),{depth:.16,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:3,curveSegments:16}),new T.MeshPhysicalMaterial({color:0x2b2a27,metalness:.3,roughness:.25,clearcoat:.8}));
  plat.rotation.y=Math.PI;plat.position.set(Wd/2-4.0,Hd/2-4.0,-D/2-bev);dev.add(plat);
  var ringM=new T.MeshPhysicalMaterial({color:0x4a4945,metalness:1,roughness:.25}),lensM=new T.MeshPhysicalMaterial({color:0x050608,metalness:.2,roughness:.02,clearcoat:1});
  [[-1.45,1.45],[-1.45,-1.45],[1.5,0]].forEach(function(o){
    var ring=new T.Mesh(new T.CylinderGeometry(1.25,1.25,.5,40),ringM);ring.rotation.x=Math.PI/2;
    ring.position.set(plat.position.x-o[0]*-1,plat.position.y+o[1],-D/2-bev-.38);dev.add(ring);
    var gl=new T.Mesh(new T.CircleGeometry(.95,40),lensM);gl.rotation.y=Math.PI;gl.position.set(ring.position.x,ring.position.y,-D/2-bev-.64);dev.add(gl);
  });
  var fl=new T.Mesh(new T.CircleGeometry(.35,24),new T.MeshStandardMaterial({color:0xd8d2c0,roughness:.6}));fl.rotation.y=Math.PI;fl.position.set(plat.position.x+1.5,plat.position.y+1.9,-D/2-bev-.23);dev.add(fl);
  var li=new T.Mesh(new T.CircleGeometry(.32,24),lensM);li.rotation.y=Math.PI;li.position.set(plat.position.x+1.5,plat.position.y-1.9,-D/2-bev-.23);dev.add(li);
  /* the mark on the back */
  /* side buttons */
  var btnM=frameMat;[[-1,7.4,2.2],[-1,4.6,2.2],[-1,9.6,.9],[1,6,3.6]].forEach(function(b){var m=new T.Mesh(new T.BoxGeometry(.3,b[2],.7),btnM);m.position.set(b[0]*(Wd/2+.08),b[1],0);dev.add(m)});

  /* pop-out cards: readouts that lift off the screen */
  function cardTex(w,h){var c=document.createElement("canvas");c.width=w;c.height=h;var t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return {c:c,t:t}}
  var cards=[
    {x:-8.6,y:5.6,z:4.2,lx:-9.5,ly:10.8,w:9,h:3.4,draw:function(x,r){lbl(x,"KEY AT SUBJECT",r.key?fmt(r.key)+" lx":"off",state.key)}},
    {x:8.8,y:-1.6,z:5.6,lx:10.4,ly:-10.6,w:8.6,h:3.4,draw:function(x,r){lbl(x,"LOAD · CIRCUIT A",r.amps.toFixed(1)+" A",r.amps>0)}},
    {x:-7.8,y:-8.4,z:3.2,lx:-8.2,ly:-10.8,w:9.4,h:3.4,draw:function(x,r){lbl(x,"KEY TO FILL",r.ratio,state.key&&state.fill)}},
    {x:7.6,y:9.2,z:2.6,lx:9.8,ly:10.6,w:8,h:3.4,draw:function(x,r){lbl(x,"1  ARRI M18",state.key?"3.0 m · 85%":"off",state.key)}}
  ];
  function lbl(x,a,b,on){var W=x.canvas.width,H=x.canvas.height;x.clearRect(0,0,W,H);x.fillStyle="rgba(21,21,20,.94)";rr(x,2,2,W-4,H-4,22);x.fill();x.strokeStyle="rgba(237,237,234,.2)";x.lineWidth=2;x.stroke();
    x.fillStyle=on?"#FFC21A":"#3a3a37";x.beginPath();x.arc(40,H/2,10,0,7);x.fill();
    x.fillStyle="rgba(237,237,234,.52)";x.font="500 26px 'IBM Plex Mono',ui-monospace,monospace";x.fillText(a,68,H*.4);
    x.fillStyle="#EDEDEA";x.font="500 46px 'IBM Plex Mono',ui-monospace,monospace";x.fillText(b,68,H*.4+56)}
  cards.forEach(function(c){
    var ct=cardTex(Math.round(c.w*60),Math.round(c.h*60));c.cv=ct.c;c.tex=ct.t;
    c.mesh=new T.Mesh(new T.PlaneGeometry(c.w,c.h),new T.MeshBasicMaterial({map:ct.t,transparent:true,toneMapped:false,depthWrite:false,opacity:0}));
    c.mesh.position.set(c.x*.3,c.y*.3,D/2);inner.add(c.mesh);
    var lg=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
    c.line=new T.Line(lg,new T.LineBasicMaterial({color:0xEDEDEA,transparent:true,opacity:0}));inner.add(c.line);
  });
  function redrawCards(){var r=readout();cards.forEach(function(c){c.draw(c.cv.getContext("2d"),r);c.tex.needsUpdate=true})}
  redrawCards();
  hooks.push(function(){makeEnv();redrawCards()});

  /* size */
  /* fit the phone and its cards inside the box, whichever way up it is */
  var zP=0,zL=0;
  function size(){var r=stage.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;
    var tn=Math.tan(cam.fov*Math.PI/360);
    /* portrait: phone 78% of the height, phone plus cards 90% of the width; turning adds depth, so leave room */
    zP=Math.max((Hd/.78)/(2*tn),(31/.9)/(2*tn*cam.aspect));
    /* landscape: phone plus the cards above and below */
    zL=Math.max(((Wd+11)/.9)/(2*tn),((Hd+6)/.9)/(2*tn*cam.aspect));
    cam.updateProjectionMatrix()}
  size();addEventListener("resize",size);
  if(window.ResizeObserver)new ResizeObserver(size).observe(stage);
  /* turn it on its side */
  var land=false,turnK=0,turnBtn=document.getElementById("ph-turn");
  if(turnBtn)turnBtn.addEventListener("click",function(){land=!land;turnBtn.setAttribute("aria-pressed",land);turnBtn.lastChild.textContent=land?"Portrait":"Landscape";loop()});

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
    var land0=1-p;
    turnK+=((land?1:0)-turnK)*(RM?1:.09);var tk=ease(turnK);
    if(!drag){yaw+=vy;vy*=.94;if(Math.abs(vy)<.0005)yaw+=((-.38+Math.sin(t*.35)*.22)-yaw)*.012}
    phone.position.set(0,-30*land0*land0+Math.sin(t*.9)*.25*p,0);
    phone.rotation.set(.55*land0+pitch+.08*p,(yaw-2.8*land0)*(1-.55*tk),-.35*land0+Math.sin(t*.6)*.02);
    dev.rotation.z=tk*Math.PI/2;
    cam.position.z=zP+(zL-zP)*tk;
    phone.scale.setScalar(.7+.3*p);
    /* cards lift off once it lands */
    var lift=clamp((p-.82)/.18,0,1);
    cards.forEach(function(c,i){var k=ease(clamp(lift*1.4-i*.12,0,1));
      var cx=c.x+(c.lx-c.x)*tk,cy=c.y+(c.ly-c.y)*tk;
      c.mesh.position.set(cx*(.3+.7*k),cy*(.3+.7*k)+Math.sin(t*1.1+i)*.12*k,D/2+.1+(c.z-.1)*k);
      /* the line runs from the screen to the card */
      var a=c.line.geometry.attributes.position,ax=cx*.35,ay=cy*.35;
      if(tk>.01){ax=clamp(cx*.6,-Hd/2+2,Hd/2-2)*tk+ax*(1-tk);ay=clamp(cy*.5,-Wd/2+1.5,Wd/2-1.5)*tk+ay*(1-tk)}
      a.setXYZ(0,ax,ay,D/2+bev+.02);a.setXYZ(1,c.mesh.position.x,c.mesh.position.y,c.mesh.position.z);a.needsUpdate=true;
      c.mesh.material.opacity=k;c.line.material.opacity=.35*k});
    /* lights fade to their switches */
    ["key","fill","back"].forEach(function(k){cur[k]+=((state[k]?LV[k]:0)-cur[k])*.12});
    key.intensity=cur.key;fill.intensity=cur.fill;back.intensity=cur.back;
    ["key","fill","back"].forEach(function(k){beams[k].material.opacity=beams[k].userData.op*(cur[k]/LV[k])*p});
    if(frame++%3===0){drawScreen(sc,t,turnK>.5);tex.needsUpdate=true}
    renderer.render(scene,cam);
    requestAnimationFrame(step);
  }
  drawScreen(sc,0);tex.needsUpdate=true;
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){drawScreen(sc,0);tex.needsUpdate=true;redrawCards()});
  loop();
}
})();
