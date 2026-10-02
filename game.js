const canvas=document.getElementById("gameCanvas");
const ctx=canvas.getContext("2d");
const menu=document.getElementById("menu"), game=document.getElementById("game"), over=document.getElementById("over");
const scoreEl=document.getElementById("score"), menuHigh=document.getElementById("menuHigh"), finalScore=document.getElementById("finalScore"), overHigh=document.getElementById("overHigh");
const pauseOverlay=document.getElementById("pauseOverlay");
let W=0,H=0,dpr=1,raf=0,last=0,score=0,high=Number(localStorage.getItem("basitRunHigh")||0);
let running=false,paused=false,muted=false,speed=330,spawnTimer=0,coinTimer=0,distance=0;
let obstacles=[],coins=[],clouds=[],particles=[];
const player={x:0,y:0,w:44,h:58,vy:0,onGround:true,run:0};

menuHigh.textContent=high; overHigh.textContent=high;

function resize(){
  dpr=Math.min(devicePixelRatio||1,2); W=innerWidth; H=innerHeight;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+"px";canvas.style.height=H+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
  player.x=Math.max(48,W*.18);
  if(!running||player.onGround) player.y=ground()-player.h;
}
addEventListener("resize",resize); resize();

function ground(){return H-Math.max(72,H*.13)}
function show(s){[menu,game,over].forEach(x=>x.classList.add("hidden"));s.classList.remove("hidden")}
function beep(freq,duration,type="sine"){
  if(muted)return;
  try{
    const A=new (AudioContext||webkitAudioContext)(),o=A.createOscillator(),g=A.createGain();
    o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.06,A.currentTime);g.gain.exponentialRampToValueAtTime(.001,A.currentTime+duration);
    o.connect(g);g.connect(A.destination);o.start();o.stop(A.currentTime+duration);
  }catch(e){}
}
function start(){
  score=0;speed=330;distance=0;spawnTimer=.6;coinTimer=.8;obstacles=[];coins=[];particles=[];running=true;paused=false;
  player.x=Math.max(48,W*.18);player.y=ground()-player.h;player.vy=0;player.onGround=true;
  scoreEl.textContent="0";pauseOverlay.classList.add("hidden");show(game);last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function end(){
  running=false;paused=false; beep(130,.35,"sawtooth");
  const n=Math.floor(score); if(n>high){high=n;localStorage.setItem("basitRunHigh",high)}
  finalScore.textContent=n;overHigh.textContent=high;menuHigh.textContent=high;show(over);
}
function jump(){
  if(!running||paused)return;
  if(player.onGround){player.vy=-700;player.onGround=false;beep(520,.09,"square");}
}
function togglePause(){
  if(!running)return;paused=!paused;pauseOverlay.classList.toggle("hidden",!paused);
  if(!paused){last=performance.now();raf=requestAnimationFrame(loop)}
}
canvas.addEventListener("pointerdown",jump);
document.addEventListener("keydown",e=>{if(e.code==="Space"||e.code==="ArrowUp"){e.preventDefault();jump()} if(e.code==="Escape")togglePause()});
document.getElementById("playBtn").onclick=start;
document.getElementById("againBtn").onclick=start;
document.getElementById("menuBtn").onclick=()=>show(menu);
document.getElementById("pauseMenuBtn").onclick=()=>{running=false;pauseOverlay.classList.add("hidden");show(menu)};
document.getElementById("resumeBtn").onclick=togglePause;
document.getElementById("pauseBtn").onclick=togglePause;
document.getElementById("muteBtn").onclick=()=>{muted=!muted;document.getElementById("muteBtn").textContent=muted?"🔇":"🔊"};

function loop(t){
 if(!running||paused)return;
 let dt=Math.min((t-last)/1000,.033);last=t;
 update(dt);draw();raf=requestAnimationFrame(loop);
}
function update(dt){
 distance+=speed*dt; speed=Math.min(620,330+distance*.018);
 score+=dt*4;
 player.run+=dt*10;
 player.vy+=1750*dt;player.y+=player.vy*dt;
 const g=ground();
 if(player.y+player.h>=g){player.y=g-player.h;player.vy=0;player.onGround=true}
 spawnTimer-=dt;coinTimer-=dt;
 if(spawnTimer<=0){
   const h=34+Math.random()*32,w=25+Math.random()*25;
   obstacles.push({x:W+30,y:g-h,w,h});
   spawnTimer=Math.max(.65,1.35-distance/25000)+Math.random()*.65;
 }
 if(coinTimer<=0){
   coins.push({x:W+25,y:g-80-Math.random()*95,r:11});
   coinTimer=.65+Math.random()*.9;
 }
 obstacles.forEach(o=>o.x-=speed*dt);
 coins.forEach(c=>c.x-=speed*dt);
 obstacles=obstacles.filter(o=>o.x>-80);coins=coins.filter(c=>c.x>-40);
 for(const o of obstacles)if(hit(player,o)){end();return}
 for(let i=coins.length-1;i>=0;i--)if(circleRect(coins[i],player)){coins.splice(i,1);score+=10;beep(900,.08,"triangle");burst(coins[i]?.x||player.x+20,player.y+20)}
 scoreEl.textContent=Math.floor(score);
}
function hit(a,b){return a.x+8<b.x+b.w-4&&a.x+a.w-8>b.x+4&&a.y+8<b.y+b.h&&a.y+a.h-5>b.y}
function circleRect(c,r){const x=Math.max(r.x,Math.min(c.x,r.x+r.w)),y=Math.max(r.y,Math.min(c.y,r.y+r.h));return (c.x-x)**2+(c.y-y)**2<c.r**2}
function burst(x,y){for(let i=0;i<7;i++)particles.push({x,y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,life:.4})}

function draw(){
 ctx.clearRect(0,0,W,H);
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#72d8ff");sky.addColorStop(1,"#c8f5ff");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 drawBackground();
 drawGround();
 coins.forEach(drawCoin);obstacles.forEach(drawObstacle);drawPlayer();
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/.4);ctx.fillStyle="#ffd83d";ctx.fillRect(p.x,p.y,4,4);p.x+=p.vx/60;p.y+=p.vy/60;p.vy+=5;p.life-=.016});ctx.globalAlpha=1;
 particles=particles.filter(p=>p.life>0);
}
function drawBackground(){
 const shift=(distance*.15)%220;
 ctx.fillStyle="#8acb82";for(let x=-220-shift;x<W+220;x+=220){ctx.beginPath();ctx.arc(x+110,ground()-35,110,Math.PI,0);ctx.fill()}
 ctx.fillStyle="#67b875";for(let x=-160-(distance*.28%160);x<W+160;x+=160){ctx.beginPath();ctx.arc(x+80,ground()-8,80,Math.PI,0);ctx.fill()}
 ctx.fillStyle="#fff9";for(let i=0;i<5;i++){let x=(i*190-distance*.08)% (W+220);if(x<0)x+=W+220;ctx.beginPath();ctx.arc(x,80+i%2*45,25,0,Math.PI*2);ctx.arc(x+25,75+i%2*45,32,0,Math.PI*2);ctx.arc(x+55,85+i%2*45,23,0,Math.PI*2);ctx.fill()}
}
function drawGround(){
 const g=ground();ctx.fillStyle="#53b94f";ctx.fillRect(0,g,W,H-g);ctx.fillStyle="#315f3a";ctx.fillRect(0,g,W,7);
 ctx.fillStyle="#78d45e";const off=-(distance%40);for(let x=off;x<W;x+=40){ctx.fillRect(x,g+22,20,7)}
}
function drawPlayer(){
 const x=player.x,y=player.y, bob=player.onGround?Math.sin(player.run)*2:0;
 ctx.save();ctx.translate(x,y+bob);
 ctx.fillStyle="#182344";ctx.fillRect(11,27,24,27);
 ctx.fillStyle="#f2a66d";ctx.beginPath();ctx.arc(23,17,15,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#222";ctx.beginPath();ctx.arc(18,15,2.2,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#10172e";ctx.fillRect(9,3,28,7);ctx.fillRect(13,0,20,5);
 ctx.fillStyle="#ffd83d";ctx.fillRect(13,31,20,17);
 ctx.strokeStyle="#f2a66d";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(12,32);ctx.lineTo(2,43+Math.sin(player.run)*3);ctx.moveTo(34,32);ctx.lineTo(44,41-Math.sin(player.run)*3);ctx.stroke();
 ctx.strokeStyle="#182344";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(18,52);ctx.lineTo(13,59);ctx.moveTo(29,52);ctx.lineTo(35,59);ctx.stroke();ctx.restore();
}
function drawObstacle(o){
 ctx.fillStyle="#e94f5f";ctx.fillRect(o.x,o.y,o.w,o.h);
 ctx.fillStyle="#ff7a75";ctx.fillRect(o.x+5,o.y+5,o.w-10,7);
 ctx.fillStyle="#b52e4b";ctx.fillRect(o.x+o.w*.35,o.y+10,6,o.h-10);
}
function drawCoin(c){
 ctx.fillStyle="#d69a13";ctx.beginPath();ctx.arc(c.x,c.y,c.r+2,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#ffd83d";ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#fff3a1";ctx.font="bold 12px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("$",c.x,c.y+1);
}
