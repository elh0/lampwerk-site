/* Lampwerk: the strike, the cursor lamp, the heads ticker, and the gaffer sheet printer. */
(function(){
"use strict";
var RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
var FINE=matchMedia("(pointer: fine)").matches;
function $(s){return document.querySelector(s)}
function clamp(v,a,b){return v<a?a:v>b?b:v}

/* ---------- strike: the lamps come up like an HMI, once a visit ---------- */
var strike=$("#strike"),seen=false;
try{seen=sessionStorage.getItem("lw-struck")==="1";sessionStorage.setItem("lw-struck","1")}catch(e){}
if(strike){
  if(RM||seen){strike.remove()}
  else{
    var sl=strike.querySelector(".sl");
    var lines=["M18 · igniting","M18 · warming · 41%","M18 · 1,800 W · up to speed"],i=0;
    var iv=setInterval(function(){i++;if(i<lines.length&&sl)sl.textContent=lines[i];else clearInterval(iv)},360);
    strike.classList.add("go");
    strike.addEventListener("animationend",function(e){if(e.target===strike)strike.remove()});
    setTimeout(function(){if(strike.parentNode)strike.remove()},2600);
  }
}

/* ---------- the cursor is a lamp ---------- */
var torch=$("#torch");
if(torch&&FINE&&!RM){
  var tx=innerWidth/2,ty=innerHeight/2,cx=tx,cy=ty,on=false;
  addEventListener("pointermove",function(e){tx=e.clientX;ty=e.clientY;if(!on){on=true;torch.classList.add("on");cx=tx;cy=ty;run()}},{passive:true});
  document.addEventListener("pointerleave",function(){torch.classList.remove("on")});
  document.addEventListener("pointerenter",function(){torch.classList.add("on")});
  var running=false;
  function run(){if(running)return;running=true;requestAnimationFrame(f)}
  function f(){cx+=(tx-cx)*.18;cy+=(ty-cy)*.18;torch.style.transform="translate3d("+(cx-300)+"px,"+(cy-300)+"px,0)";if(Math.abs(tx-cx)+Math.abs(ty-cy)>.5)requestAnimationFrame(f);else running=false}
  addEventListener("pointermove",run,{passive:true});
}else if(torch)torch.remove();

/* ---------- heads ticker: a chase down the rig ---------- */
var tk=$("#ticker");
if(tk){
  var track=tk.querySelector(".tk-track");
  track.innerHTML+=track.innerHTML;
  if(!RM){var dots=tk.querySelectorAll(".tk-track i"),n=0;setInterval(function(){dots.forEach(function(d,j){d.classList.toggle("lit",(j+n)%6===0||(j+n)%6===1)});n=(n+5)%6},420)}
}

/* ---------- the gaffer sheet: print, stamp, tilt, formats, send ---------- */
var pr=$("#printer"),paper=$("#paper");
if(!pr||!paper)return;
var feed=pr.querySelector(".feed"),slot=pr.querySelector(".slot-st"),bar=pr.querySelector(".slot-bar i"),stamp=$("#stamp"),txt=$("#sh-text");
var printing=false,printed=false;
function setSlot(s){if(slot)slot.textContent=s}
function print(after){
  if(printing)return;printing=true;
  pr.classList.remove("done");stamp.classList.remove("slam");
  if(RM){feed.style.transform="none";bar.style.width="100%";finish();return}
  var steps=9,k=0;setSlot("Printing · A4 · 1 of 1");
  feed.style.transition="none";feed.style.transform="translateY(-101%)";feed.offsetHeight;
  function step(){
    k++;var p=k/steps;
    feed.style.transition="transform .2s cubic-bezier(.3,.8,.3,1)";
    feed.style.transform="translateY("+(-101+101*p)+"%)";
    bar.style.width=(p*100)+"%";
    pr.classList.add("jolt");setTimeout(function(){pr.classList.remove("jolt")},90);
    if(k<steps)setTimeout(step,240);else setTimeout(finish,320);
  }
  setTimeout(step,200);
  function finish(){printing=false;printed=true;pr.classList.add("done");setSlot("Printed · ready to send");checkPower();setTimeout(function(){stamp.classList.add("slam")},RM?0:120);if(after)after()}
}
/* stamp says whether every circuit is under 16 A */
function checkPower(){
  var over=false;Array.prototype.forEach.call(document.querySelectorAll("#sh-power .pc span:last-child"),function(s){var a=parseFloat(s.textContent);if(a>16)over=true});
  stamp.textContent=over?"Over 16 A · re-patch":"Power checked · all under 16 A";stamp.classList.toggle("bad",over);
}
if(window.MutationObserver){var pw=$("#sh-power");if(pw)new MutationObserver(function(){if(printed)checkPower()}).observe(pw,{childList:true,subtree:true})}
if("IntersectionObserver" in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();print()}},{threshold:.35});io.observe(pr)}else print();

/* tilt it toward the cursor, with a sheen where the light hits */
var sheen=pr.querySelector(".sheen");
if(FINE&&!RM){
  pr.addEventListener("pointermove",function(e){var r=pr.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    pr.style.setProperty("--rx",(-y*7).toFixed(2)+"deg");pr.style.setProperty("--ry",(x*9).toFixed(2)+"deg");
    sheen.style.background="linear-gradient("+(110+x*40)+"deg, rgba(0,0,0,0) "+(30+y*20)+"%, rgba(0,0,0,.06) "+(50+y*20)+"%, rgba(0,0,0,0) "+(70+y*20)+"%)"});
  pr.addEventListener("pointerleave",function(){pr.style.setProperty("--rx","0deg");pr.style.setProperty("--ry","0deg");sheen.style.background="none"});
}

/* formats: the sheet, the plan as an image, or the text list */
var fmtBtns=Array.prototype.slice.call(document.querySelectorAll("#sh-fmt button"));
function buildText(){
  var rows=Array.prototype.map.call(document.querySelectorAll("#sh-gear tr"),function(tr){var c=tr.children;return {n:c[0].textContent,h:c[1].textContent,m:c[2].textContent,lx:c[3].textContent,a:c[4].textContent,off:tr.classList.contains("off")}});
  var head=$("#sh-shot").textContent.replace("SETUP ","").toLowerCase();
  var lines=["<b>Int. kitchen, night · scene 12 · "+head+"</b>"].concat(rows.map(function(r){return r.n+" "+r.h+(r.m?" · "+r.m:"")+" · "+(r.off?"off":r.lx)+" · "+r.a+" A"}));
  var pw=Array.prototype.map.call(document.querySelectorAll("#sh-power .pc"),function(p){return "Circuit "+p.children[0].textContent+": "+p.children[2].textContent}).join(", ");
  lines.push(pw);
  txt.querySelector(".bub").innerHTML=lines.join("<br>")+'<span class="tm2">'+new Date().toTimeString().slice(0,5)+' <s>✓✓</s></span>';
}
fmtBtns.forEach(function(b){b.addEventListener("click",function(){
  fmtBtns.forEach(function(o){o.setAttribute("aria-pressed",o===b)});
  var f=b.dataset.f;pr.dataset.f=f;if(f==="text"){buildText();var late=txt.querySelector(".late");late.style.animation="none";late.offsetHeight;late.style.animation=""}
  setSlot(f==="pdf"?"A4 PDF · 1 page":f==="image"?"Plan · PNG · 2400 × 1600":"Text · one line per head");
})});

/* send: the sheet flies off, a receipt comes back, and it prints again */
var send=$("#sh-send"),toast=$("#sh-toast");
if(send)send.addEventListener("click",function(){
  if(printing)return;
  var f=pr.dataset.f||"pdf";
  pr.classList.add("sent");send.disabled=true;
  setTimeout(function(){
    toast.textContent=(f==="pdf"?"Gaffer sheet.pdf":f==="image"?"Plan.png":"Text list")+" · sent to the gaffer, the best boy and the genny op";
    toast.classList.add("show");
    pr.classList.remove("sent");
    if(f==="pdf")print(function(){send.disabled=false});else{send.disabled=false}
    setTimeout(function(){toast.classList.remove("show")},3200);
  },RM?0:700);
});
})();
