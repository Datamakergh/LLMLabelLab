// ===== Video-style simulator playback (used by every Project Lab simulator) =====
// After training, the simulator plays like a camera feed: a scan sweeps the scene, detections lock on one by one,
// alerts pop up, counters tick, and the consequences appear in the system log while it runs.
var PL={on:false,raf:0,last:0,t:0,dur:1,speed:1,paused:false,done:false,auto:true,items:[],i:0,rows:[],ri:0,cnt:{},hud:null,beam:null,S:6,cam:true,box:null,ov:null,art:null,key:'',doneTimer:0,build:null,reset:null,onFrame:null};
var PL_ALERT={
 graze:{predator:'Predator alert sent to rangers',intruder:'Intruder alert sent'},
 ppe:{nohelmet:'No-helmet alert raised',novest:'No-vest alert raised',noboots:'No-boots alert raised',nogloves:'No-gloves alert raised'},
 crop:{leafspot:'Spray plan: copper fungicide',rust:'Spray plan: rust control',pest:'Spray plan: insecticidal soap'},
 coffee:{rust:'Treatment plan: rust',cerc:'Treatment plan: Cercospora',miner:'Treatment plan: leaf miner'},
 drive:{pedestrian:'Car brakes for pedestrian',animal:'Car brakes for animal',crosswalk:'Car slows for crosswalk',speedramp:'Car slows for speed ramp',trafficlight:'Car reads the traffic light',trafficsign:'Car reads the sign',bicycle:'Car gives way to cyclist',motorbike:'Car gives way to motorbike'}};
var PL_KIND={ok:'Detected',loose:'Weak box',wrong:'Misread',extra:'False alarm',decoy:'False alarm',missed:'Missed'};
function plFmt(t){t=Math.max(0,Math.round(t));return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2)}
function plClamp(v,a,b){return Math.max(a,Math.min(b,v))}
function plAlert(c){return PL_ALERT[P.id]&&PL_ALERT[P.id][c]}
// ---------- timelines
function plToast(it){
  var n=it.cls!=null?shortName(it.cls):'',al=it.cls!=null?plAlert(it.cls):null;
  if(it.kind==='ok')return (al||PL.seen[it.cls])?{k:'ok',t:al||('Detected: '+n)}:(PL.seen[it.cls]=1,{k:'ok',t:'Detected: '+n});
  if(it.kind==='loose')return {k:'warn',t:'Weak box: '+n+(al?' (alert late)':'')};
  if(it.kind==='wrong')return {k:'bad',t:'Misread: '+n};
  if(it.kind==='extra'||it.kind==='decoy')return {k:'bad',t:'False alarm: '+n};
  if(it.kind==='missed')return {k:'bad',t:'No detection: '+n+(al?'. No alert sent.':'')};
  return null;
}
function plShapeItems(sc,ann,res,S){
  var items=[],isLine=P.type!=='box'&&P.type!=='poly';
  function when(b){return isLine?0.5+S*(1-plClamp((b.y+b.h)/400,0,1))*0.9:0.5+S*plClamp((b.x+b.w/2)/640,0,1)}
  function bb(a){return P.type==='box'?{x:a.x,y:a.y,w:a.w,h:a.h}:bbox(a.pts)}
  ann.forEach(function(a,k){var kd=res.kind[k]&&res.kind[k].k||'ok',b=bb(a);
    items.push({t:when(b),svg:'<g class="plit'+(isLine?' draw':'')+'">'+shapeSvg(a,KC[kd],{label:shortName(a.c),dash:(kd==='extra'||kd==='decoy'),w:3})+'</g>',kind:kd,cls:a.c})});
  res.missed.forEach(function(g){var b=bb(g);
    items.push({t:when(b)+0.15,svg:'<g class="plit">'+shapeSvg(g,'#64748b',{dash:1,nofill:1,w:2.2,label:'✗ missed'})+'</g>',kind:'missed',cls:g.c})});
  items.sort(function(a,b){return a.t-b.t});
  return items;
}
function plBuildShapes(sc,ann,res){
  var S=Math.max(5,Math.min(9,4+ann.length*0.12));PL.S=S;PL.dir=(P.type==='box'||P.type==='poly')?'x':'y';
  PL.items=plShapeItems(sc,ann,res,S);PL.endScan=0.5+S;
  PL.hud=function(){var c=PL.cnt;return '<span class="k ok">'+(c.ok||0)+' detected</span><span class="k warn">'+(c.loose||0)+' weak</span><span class="k bad">'+((c.missed||0))+' missed</span><span class="k bad2">'+((c.extra||0)+(c.decoy||0)+(c.wrong||0))+' false / misread</span>'};
}
function plBuildSeg(sc,ann,res){
  var S=6;PL.S=S;PL.dir='x';PL.endScan=0.5+S;PL.items=[];
  var tD=0,cD=0,mD=0,fD=0;for(var k=0;k<sc.grid.length;k++){var tr=SK_DIS.indexOf(sc.grid[k])>-1,pr=SK_DIS.indexOf(ann[k])>-1;if(tr){tD++;if(ann[k]===sc.grid[k])cD++;else mD++}else if(pr)fD++}
  PL.items.push({t:0.5+S*0.25,toast:{k:'ok',t:'Skin, hair and background mapped'}});
  PL.items.push({t:0.5+S*0.62,toast:{k:cD>=tD*.75?'ok':'warn',t:'Lesion cells found: '+cD+' of '+tD}});
  if(mD)PL.items.push({t:0.5+S*0.78,toast:{k:'bad',t:'Missed '+mD+' lesion cell'+(mD>1?'s':'')+'. Condition under-reported.'}});
  if(fD)PL.items.push({t:0.5+S*0.9,toast:{k:'bad',t:fD+' healthy cell'+(fD>1?'s':'')+' flagged as disease'}});
  PL.segHtml='<g clip-path="url(#plclip)">'+segSvg(ann,{truth:sc.grid,op:.5})+'</g>';
  PL.hud=function(){var u=plClamp((PL.t-0.5)/S,0,1);return '<span class="k ok">scanned '+Math.round(u*100)+'%</span><span class="k warn">lesion cells found '+Math.round(cD*plClamp((PL.t-0.5)/S,0,1))+' / '+tD+'</span>'};
}
function plBuildPose(sc,ann,res){
  var items=[],pts=ann.pts||[],errs=res.errs||[],S=0.5+14*0.38;PL.S=S;PL.dir='';PL.endScan=S+0.4;
  var tj={};
  for(var j=0;j<14;j++){tj[j]=0.5+j*0.38;var p=pts[j];if(!p){items.push({t:tj[j],toast:{k:'bad',t:'Joint not tracked: '+JN[j]},cntK:'missed'});continue}
    var e=errs[j],col=e==null?'#dc2626':e<.15?'#16a34a':e<.35?'#d97706':'#dc2626';
    items.push({t:tj[j],svg:'<g class="plit"><circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="7" fill="'+col+'" stroke="#fff" stroke-width="2"/></g>',cntK:e!=null&&e<.15?'ok':e!=null&&e<.35?'loose':'bad',toast:(e!=null&&e>=.35)?{k:'bad',t:'Joint off target: '+JN[j]}:null})}
  BONES.forEach(function(b){var p=pts[b[0]],q=pts[b[1]];if(p&&q)items.push({t:Math.max(tj[b[0]],tj[b[1]])+0.05,svg:'<g class="plit"><line x1="'+f1(p[0])+'" y1="'+f1(p[1])+'" x2="'+f1(q[0])+'" y2="'+f1(q[1])+'" stroke="#64748b" stroke-width="3" stroke-linecap="round"/></g>'})});
  items.sort(function(a,b){return a.t-b.t});PL.items=items;
  PL.hud=function(){var c=PL.cnt;return '<span class="k ok">'+(c.ok||0)+' joints on target</span><span class="k warn">'+(c.loose||0)+' close</span><span class="k bad">'+(c.bad||0)+' off / missing</span>'};
}
function plBuildText(sc,ann,res){
  var n=sc.tokens.length,items=[],t0=0.5,dt=0.2;PL.S=n*dt;PL.dir='';PL.endScan=t0+n*dt+0.2;
  sc.tokens.forEach(function(t,k){var hit=ann.kw.indexOf(k)>-1,gtk=sc.gt.kw.indexOf(k)>-1;
    items.push({t:t0+k*dt,cntK:'words',fn:function(){var el=PL.box.querySelector('[data-k="'+k+'"]');if(el)el.className='st rd '+(hit?(gtk?'ok':'no'):'')+(ST.sim.truth&&gtk&&!hit?' miss':'')}})});
  var t1=t0+n*dt+0.5,okS=ann.sent===sc.gt.sent,okC=ann.churn===sc.gt.churn,sn=SENT.filter(function(s){return s.id===ann.sent})[0].name,cn=CHURN.filter(function(s){return s.id===ann.churn})[0].name;
  items.push({t:t1,fn:function(){var e=PL.box.querySelector('.chs');if(e)e.style.opacity=1},toast:{k:okS?'ok':'bad',t:'Sentiment read: '+sn+(okS?'':' (wrong)')}});
  items.push({t:t1+0.7,fn:function(){var e=PL.box.querySelector('.chc');if(e)e.style.opacity=1},toast:{k:okC?'ok':'bad',t:'Churn risk flagged: '+cn+(okC?'':' (wrong)')}});
  PL.items=items;
  PL.hud=function(){var u=Math.min(n,Math.max(0,Math.floor((PL.t-t0)/dt)+1));return '<span class="k ok">words read '+u+' / '+n+'</span>'};
}
function plTextMarkup(sc,ann){
  var toks=sc.tokens.map(function(t,k){return '<span class="st" data-k="'+k+'">'+esc(t)+'</span>'}).join(' ');
  return '<div class="msgcard"><div class="msg-who">'+esc(sc.who)+'</div><p class="msg-t">'+toks+'</p><div class="chips2"><span class="chip wide chs '+(ann.sent===sc.gt.sent?'good':'bad')+'" style="opacity:0">'+SENT.filter(function(s){return s.id===ann.sent})[0].name+'</span><span class="chip wide chc '+(ann.churn===sc.gt.churn?'good':'bad')+'" style="opacity:0">Churn: '+CHURN.filter(function(s){return s.id===ann.churn})[0].name+'</span></div>'+(ST.sim.truth?'<p class="note">Truth: '+SENT.filter(function(s){return s.id===sc.gt.sent})[0].name+', churn '+CHURN.filter(function(s){return s.id===sc.gt.churn})[0].name+'</p>':'')+'</div>';
}
// ---------- player
function plStart(o){
  PL.lane=false;
  if(P.scn)return plStartDrive(o);
  if(P.id==='lane')return plStartLane(o);
  PL.drive=false;if(PL.drvInit){PL.drvInit=0;PL.speed=1}
  // o: {sc,ann,res,rep,mode:'play'|'static'|'keep'}
  var box=$('simview');PL.box=box;PL.sc=o.sc;PL.ann=o.ann;PL.res=o.res;
  cancelAnimationFrame(PL.raf);clearTimeout(PL.doneTimer);
  var text=P.type==='text',keepT=o.mode==='keep'?PL.t:0;
  PL.seen={};
  if(text)plBuildText(o.sc,o.ann,o.res);else if(P.type==='seg')plBuildSeg(o.sc,o.ann,o.res);else if(P.type==='pose')plBuildPose(o.sc,o.ann,o.res);else plBuildShapes(o.sc,o.ann,o.res);
  // system-log rows, revealed as the clip plays
  var tmp=document.createElement('ul');tmp.innerHTML=o.rep.html;PL.rows=[].slice.call(tmp.children);
  var r0=Math.max(0.6,PL.endScan*0.55),gap=Math.max(0.4,Math.min(0.8,(PL.endScan+1.2-r0)/Math.max(1,PL.rows.length)));
  PL.rowT=PL.rows.map(function(_,k){return r0+k*gap});
  PL.dur=Math.max(PL.endScan+1.6,r0+PL.rows.length*gap+0.8);
  PL.cam=!text;PL.on=true;PL.paused=false;PL.done=false;
  PL.reset=function(){
    var h;
    if(text){h=plTextMarkup(o.sc,o.ann)}
    else{h=svgOf(o.sc,'sv','R')}
    h+='<div class="plhud"><span class="rec"><i></i>REC</span><span class="cam">'+(P.type==='text'?'FEED':'CAM 01')+'</span><span class="clk" id="plclk">0:00</span></div><div class="plcnt" id="plcnt"></div><div class="pltoasts" id="pltoasts"></div><div class="plban" id="plban" hidden></div>';
    box.innerHTML=h;PL.art=box.querySelector('.art');PL.ov=box.querySelector('.ov');PL.i=0;PL.ri=0;PL.cnt={};PL.seen={};$('report').innerHTML='';
    if(PL.ov){
      var base='';
      if(ST.sim.truth&&P.type!=='seg'&&P.type!=='pose')o.sc.gt.forEach(function(g){base+=shapeSvg(g,g.decoy?'#dc2626':'#475569',{dash:1,nofill:1,w:1.6})});
      if(ST.sim.truth&&P.type==='pose')base+=poseSvg({pts:o.sc.pts},o.sc,{key:true});
      if(P.type==='seg')base+='<clipPath id="plclip"><rect id="plclipr" x="0" y="0" width="0" height="400"/></clipPath>'+PL.segHtml;
      base+='<g id="plitems"></g>';
      if(PL.dir)base+='<defs><linearGradient id="plg" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#22d3ee" stop-opacity=".4"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient><linearGradient id="plgv" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#22d3ee" stop-opacity=".4"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs><g id="plbeam" opacity="0">'+(PL.dir==='x'?'<rect x="-70" y="0" width="70" height="400" fill="url(#plg)"/><rect x="-2" y="0" width="3" height="400" fill="#22d3ee"/>':'<rect x="0" y="0" width="640" height="70" fill="url(#plgv)" transform="translate(0,0)"/><rect x="0" y="0" width="640" height="3" fill="#22d3ee"/>')+'</g>';
      PL.ov.innerHTML=base;PL.items_g=PL.ov.querySelector('#plitems');PL.beam=PL.ov.querySelector('#plbeam');
    }
  };
  PL.last=performance.now();
  plSeek(o.mode==='static'?PL.dur:keepT);
  plCtl();
  if(o.mode==='static'){PL.on=false;return}
  if(PL.t<PL.dur){PL.raf=requestAnimationFrame(plFrame)}
}
function plSeek(t){PL.reset();PL.done=false;plAdvance(t,true)}
function plShowItem(it,inst){
  if(it.svg&&PL.items_g){PL.items_g.insertAdjacentHTML('beforeend',inst?it.svg.replace('class="plit','class="plit inst'):it.svg)}
  if(it.fn)it.fn();
  if(it.cntK)PL.cnt[it.cntK]=(PL.cnt[it.cntK]||0)+1;else if(it.kind)PL.cnt[it.kind]=(PL.cnt[it.kind]||0)+1;
  if(!inst){var tt=it.toast!==undefined?it.toast:(it.kind?plToast(it):null);if(tt)plToastAdd(tt)}
}
function plToastAdd(tt){var c=$('pltoasts');if(!c)return;var d=document.createElement('div');d.className='plt '+tt.k;d.textContent=tt.t;c.appendChild(d);while(c.children.length>3)c.removeChild(c.firstChild);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d)},3200)}
function plAdvance(t,inst){
  PL.t=plClamp(t,0,PL.dur);
  if(PL.drive)plDriveAdvance();else while(PL.i<PL.items.length&&PL.items[PL.i].t<=PL.t){plShowItem(PL.items[PL.i],inst||PL.dur-PL.t<0.001&&false);PL.i++}
  if(inst&&PL.i>0&&0){}
  while(PL.ri<PL.rows.length&&PL.rowT[PL.ri]<=PL.t){var li=PL.rows[PL.ri].cloneNode(true);if(!inst)li.className+=' rv';$('report').appendChild(li);PL.ri++}
  var u=plClamp((PL.t-0.5)/PL.S,0,1);
  if(!PL.drive&&PL.beam){if(PL.t<0.5||PL.t>PL.endScan-0.1)PL.beam.setAttribute('opacity','0');else{PL.beam.setAttribute('opacity','1');PL.beam.setAttribute('transform',PL.dir==='x'?'translate('+f1(640*u)+',0)':'translate(0,'+f1(400*(1-u)-(0))+')')}}
  if(P.type==='seg'){var cr=$('plclipr');if(cr)cr.setAttribute('width',f1(640*u))}
  if(PL.cam&&PL.art){var z=1+0.05*(PL.t/PL.dur),tx=-(PL.t/PL.dur)*8,st='scale('+z.toFixed(4)+') translate('+tx.toFixed(2)+'px,0)';PL.art.style.transform=st;PL.ov.style.transform=st}
  var ck=$('plclk');if(ck)ck.textContent=plFmt(PL.t);var cn=$('plcnt');if(cn&&PL.hud)cn.innerHTML=PL.hud();
  var f=$('pltlf');if(f)f.style.width=(PL.t/PL.dur*100)+'%';var tm=$('pltime');if(tm)tm.textContent=plFmt(PL.t)+' / '+plFmt(PL.dur);
  if(PL.t>=PL.dur&&!PL.done)plDone();
}
function plFrame(ts){
  PL.raf=0;if(!PL.on||!$('simview')||!$('pltoasts'))return;
  var dt=Math.min(.1,(ts-PL.last)/1000);PL.last=ts;
  if(!PL.paused&&!PL.done)plAdvance(PL.t+dt*PL.speed);
  if(!PL.done)PL.raf=requestAnimationFrame(plFrame);
}
function plDone(){
  PL.done=true;PL.on=false;var b=$('plban');
  if(b&&!PL.drive){var sc=evalScene(PL.sc,PL.ann).score;b.hidden=false;b.innerHTML='<b>Run complete</b><span>match '+Math.round(sc*100)+'%</span><button type="button" id="plre">↺ Replay</button>';var re=$('plre');if(re)re.onclick=function(){renderSim()}}
  plCtl();
  if(PL.auto&&ST.sim.set==='test'&&ST.sim.i+1<P.nTest){clearTimeout(PL.doneTimer);var k=ST.sim.i;PL.doneTimer=setTimeout(function(){if(PL.done&&ST.sim.set==='test'&&ST.sim.i===k&&$('simview')){ST.sim.i=k+1;renderSim()}},2200/PL.speed)}
}
function plCtl(){
  var c=$('plctl');if(!c)return;
  if(!ST.trained){c.innerHTML='';c.hidden=true;return}
  c.hidden=false;
  c.innerHTML='<button class="ghost" id="plplay" type="button" aria-label="Play or pause">'+(PL.done?'↺ Replay':PL.paused?'▶ Play':'❚❚ Pause')+'</button><button class="ghost" id="plspeed" type="button" title="Playback speed">'+PL.speed+'×</button><button class="ghost" id="plskip" type="button">Skip to result</button><label class="opt plauto"><input type="checkbox" id="plauto"'+(PL.auto?' checked':'')+'><span>Play next scene</span></label><div class="pltl" id="pltl" role="slider" aria-label="Playback position" tabindex="0"><i id="pltlf" style="width:'+(PL.t/PL.dur*100)+'%"></i></div><span class="pltime" id="pltime">'+plFmt(PL.t)+' / '+plFmt(PL.dur)+'</span>';
  $('plplay').onclick=function(){
    if(PL.done){renderSim();return}
    PL.paused=!PL.paused;PL.on=!PL.paused||true;if(!PL.paused){PL.last=performance.now();cancelAnimationFrame(PL.raf);PL.raf=requestAnimationFrame(plFrame)}plCtl()};
  $('plspeed').onclick=function(){PL.speed=PL.speed===.5?1:PL.speed===1?2:PL.speed===2?4:.5;$('plspeed').textContent=PL.speed+'×'};
  $('plskip').onclick=function(){cancelAnimationFrame(PL.raf);PL.on=true;plSeek(PL.dur);plCtl()};
  $('plauto').onchange=function(){PL.auto=this.checked;if(!PL.auto)clearTimeout(PL.doneTimer)};
  $('pltl').onclick=function(e){var r=this.getBoundingClientRect(),u=plClamp((e.clientX-r.left)/r.width,0,1);cancelAnimationFrame(PL.raf);plSeek(u*PL.dur);if(PL.t<PL.dur){PL.on=true;PL.paused=false;PL.last=performance.now();PL.raf=requestAnimationFrame(plFrame)}plCtl()};
}

// ===== Self-driving: the video is GIGO's driving simulator, built from the same objects as the labelled image =====
function gUse(scn,sc){var G=window.GIGO;G.useScenario(scn);if(sc&&sc.pic!=null){if(scn==='drone2'&&G.dr2Use)G.dr2Use(sc.pic);if(scn==='warehouse2'&&G.wh2Use)G.wh2Use(sc.pic)}if(sc)G.GROUND_TRUTH=sc.gz}
function driveDet(sc,pred,Pj){
  Pj=Pj||P;var G=window.GIGO;gUse(Pj.scn,sc);
  var boxes=pred.map(function(a,i){return {id:i,x:a.x*1.25,y:a.y*1.25,w:a.w*1.25,h:a.h*1.25,cls:Pj.cmap[a.c]}});
  var ev=(G.SCENARIO.evaluate||G.evaluate)(boxes,sc.gz);return {ev:ev,det:G.buildDetections(ev)};
}
function driveRun(sc,pred,Pj){
  Pj=Pj||P;var G=window.GIGO,d=driveDet(sc,pred,Pj),SC=G.SCENARIO,S=G[SC.sim],s=S.create(d.det),pass={},k=0,road=Pj.scn==='road';
  while(!s.done&&k++<60000){S.step(s,1/60);if(road){var f=S.front(s);s.actors.forEach(function(a){if(pass[a.id]==null&&f>=S.refX(a))pass[a.id]=s.t})}}
  if(!road){s.events.forEach(function(e){if(e.id&&pass[e.id]==null)pass[e.id]=e.t});sc.gz.forEach(function(g){if(pass[g.id]==null){var b=g.id.split('_')[0];if(pass[b]!=null)pass[g.id]=pass[b]}})}
  return {s:s,det:d.det,ev:d.ev,pass:pass,T:s.t,S:S,SC:SC,road:road,Pj:Pj};
}
function plStartDrive(o){
  var G=window.GIGO,box=$('simview'),d=driveRun(o.sc,o.ann,P);
  cancelAnimationFrame(PL.raf);clearTimeout(PL.doneTimer);
  PL.box=box;PL.sc=o.sc;PL.ann=o.ann;PL.res=o.res;PL.D=d;PL.drive=true;PL.cam=false;PL.items=[];PL.items_g=null;PL.beam=null;PL.endScan=0;PL.S=1;
  if(!PL.drvInit){PL.drvInit=1;PL.speed=.5}
  var keepT=o.mode==='keep'?PL.t:0;
  var tmp=document.createElement('ul');tmp.innerHTML=o.rep.html;var rows=[].slice.call(tmp.children).map(function(li){var id=li.getAttribute('data-id');var t=id==='end'?d.T+0.2:id==='x'?d.T*0.5:(d.pass[id]!=null?d.pass[id]:d.T*0.5);return {li:li,t:t}});
  rows.sort(function(a,b){return a.t-b.t});PL.rows=rows.map(function(r){return r.li});PL.rowT=rows.map(function(r){return r.t});
  PL.dur=d.T+2.4;PL.on=true;PL.paused=false;PL.done=false;
  PL.hud=function(){var c={good:0,late:0,missed:0};Object.keys(PL.shown||{}).forEach(function(k){c[PL.shown[k]]++});return '<span class="k ok">'+c.good+' detected</span><span class="k warn">'+c.late+' weak</span><span class="k bad">'+c.missed+' missed</span>'};
  PL.reset=function(){
    gUse(P.scn,o.sc);
    box.innerHTML='<div class="drv"><div class="drvimg"><canvas id="drvcv" class="cv drvcv" width="800" height="500" aria-label="Driving simulation"></canvas>'
      +'<div class="plcnt" id="plcnt" style="'+(P.scn==='drone2'||P.scn==='crop'?'top:8px;bottom:auto':'bottom:22px')+'"></div>'+(d.SC.has3d?'<button type="button" id="drv3d" class="btn sm" style="position:absolute;top:8px;right:8px;z-index:3">3D view</button>':'')+'</div></div><div class="pltoasts" id="pltoasts" hidden></div><div class="plban" id="plban" hidden></div>';
    PL.sim=d.S.create(d.det);PL.simT=0;PL.view=new G[d.SC.view]($('drvcv'));if(d.SC.has3d){PL.view.setMode(PL.m3||'2d');var b3=$('drv3d');if(b3){b3.textContent=PL.m3==='3d'?'2D view':'3D view';b3.onclick=function(){PL.m3=PL.m3==='3d'?'2d':'3d';PL.view.setMode(PL.m3);b3.textContent=PL.m3==='3d'?'2D view':'3D view';PL.view.draw(PL.sim,d.det)}}}PL.shown={};PL.i=0;PL.ri=0;PL.cnt={};$('report').innerHTML='';
  };
  PL.last=performance.now();
  plSeek(o.mode==='static'?PL.dur:keepT);plCtl();
  if(o.mode==='static'){PL.on=false;return}
  if(PL.t<PL.dur)PL.raf=requestAnimationFrame(plFrame);
}

// ===== Lane assist: a car drives down the road from the labelled picture, steered by the lines the model learned =====
function laneSim(sc,pred){
  var lp=sc.lp,cb=(lp.bl+lp.br)/2,d0=cb-320,half=(lp.br-lp.bl)*.3;
  var lines=pred.filter(function(l){return l.pts&&l.pts.length>1});
  var on=lines.length>=2,b=0;
  if(on){var xs=lines.map(function(l){return l.pts.slice().sort(function(a,c){return c[1]-a[1]})[0][0]}).sort(function(a,c){return a-c});b=(xs[0]+xs[xs.length-1])/2-cb}
  var T=8,dt=1/30,d=d0,tr=[],out=null,off=null,drift=(d0>=0?1:-1)*38;
  for(var k=0;k<=T/dt;k++){var t=k*dt,v=on?-2.4*(d+b):drift;d+=v*dt;tr.push({d:d,v:v});if(out==null&&Math.abs(d)>half)out=t;}
  return {lp:lp,d0:d0,tr:tr,dt:dt,T:T,on:on,b:b,half:half,out:out};
}
function plStartLane(o){
  var L=laneSim(o.sc,o.ann);cancelAnimationFrame(PL.raf);clearTimeout(PL.doneTimer);
  var box=$('simview');PL.box=box;PL.sc=o.sc;PL.ann=o.ann;PL.res=o.res;PL.L=L;PL.drive=true;PL.lane=true;PL.cam=false;PL.items=[];PL.items_g=null;PL.beam=null;PL.endScan=0;PL.S=1;
  if(!PL.drvInit){PL.drvInit=1;PL.speed=.5}
  var keepT=o.mode==='keep'?PL.t:0;
  var tmp=document.createElement('ul');tmp.innerHTML=o.rep.html;var rows=[].slice.call(tmp.children);
  PL.rows=rows;PL.rowT=rows.map(function(r,i){return Math.min(L.T,(L.out!=null?L.out:L.T*.55)+i*.4)});
  PL.dur=L.T+1.6;PL.on=true;PL.paused=false;PL.done=false;
  PL.hud=function(){var d=PL.laneD||0;return '<span class="k '+(L.on?'ok':'bad')+'">'+(L.on?'Lane assist ON':'Lane assist OFF')+'</span><span class="k '+(Math.abs(d)>L.half?'bad':Math.abs(d)>L.half*.5?'warn':'ok')+'">'+(Math.abs(d)>L.half?'Left the lane':'In lane')+'</span>'};
  PL.reset=function(){
    box.innerHTML='<div class="drv"><div class="drvimg"><svg id="lnsv" class="cv" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;background:#7dd3fc"><g id="lnrd"></g><g id="lnov"></g><g id="lncar"></g></svg>'
      +'<div class="plcnt" id="plcnt" style="bottom:22px"></div></div></div><div class="pltoasts" id="pltoasts" hidden></div><div class="plban" id="plban" hidden></div>';
    PL.i=0;PL.ri=0;PL.laneShown=0;PL.laneWarn=0;$('report').innerHTML='';
  };
  PL.last=performance.now();
  plSeek(o.mode==='static'?PL.dur:keepT);plCtl();
  if(o.mode==='static'){PL.on=false;return}
  if(PL.t<PL.dur)PL.raf=requestAnimationFrame(plFrame);
}
function plLaneAdvance(){
  var L=PL.L,lp=L.lp,t=Math.min(PL.t,L.T),k=Math.min(L.tr.length-1,Math.round(t/L.dt)),st=L.tr[k],d=st.d;PL.laneD=d;
  var sh=L.d0-d,ph=(t*2.6)%2,rot=Math.max(-7,Math.min(7,st.v*.12));
  $('lnrd').innerHTML=laneFrame(lp,sh,ph);
  var ov='';
  if(PL.t>.6){
    var al=Math.min(1,(PL.t-.6)/.5);
    function sf(pts){return pts.map(function(p){var ty=Math.max(0,Math.min(1,(p[1]-lp.vy)/(400-lp.vy)));return [p[0]-sh*ty,p[1]]})}
    PL.ann.forEach(function(a,i){var kd=PL.res.kind[i]&&PL.res.kind[i].k||'ok';ov+=pline(sf(a.pts),KC[kd]||KC.ok,5,{opacity:.9*al,'stroke-dasharray':(kd==='extra'||kd==='decoy')?'8 6':'none'})});
    PL.res.missed.forEach(function(g){ov+=pline(sf(g.pts),'#64748b',3,{opacity:.9*al,'stroke-dasharray':'6 6'})});
  }
  $('lnov').innerHTML=ov;$('lncar').innerHTML=laneCar(rot);
  if(PL.t>.8&&!PL.laneShown){PL.laneShown=1;plToastAdd(L.on?{k:'ok',t:'Lane lines found: '+PL.ann.length}:{k:'bad',t:'No lane found. Lane assist is off.'})}
  if(L.out!=null&&PL.t>=L.out&&!PL.laneWarn){PL.laneWarn=1;plToastAdd({k:'bad',t:'Lane departure! The car left its lane.'})}
}
function plDriveAdvance(){
  if(PL.lane)return plLaneAdvance();
  var G=window.GIGO,d=PL.D,s=PL.sim,S=d.S,target=Math.min(PL.t,d.T+.5),k=0;
  gUse(P.scn,PL.sc);
  while(PL.simT+1/60<=target&&k++<60000){S.step(s,1/60);PL.simT+=1/60}
  if(d.road){
    var f=S.front(s);
    s.actors.forEach(function(a){
      if(PL.shown[a.id]||(a.type==='oncoming'&&!a.spawned))return;
      var det=d.det[a.id]||{mode:'missed'},dist=S.refX(a)-f,lim=det.mode==='missed'?(a.critical?S.P.range.late:90):S.P.range.good;
      if(dist>lim||dist<-30)return;
      PL.shown[a.id]=det.wrong?'missed':det.mode;
    });
  }else{
    PL.sc.gz.forEach(function(g){if(PL.shown[g.id]||g.id.indexOf('_')>0)return;var t=d.pass[g.id];if(t==null||t>PL.simT)return;var det=d.det[g.id]||{mode:'missed'};PL.shown[g.id]=det.wrong?'missed':det.mode});
  }
  PL.view.draw(s,d.det);
}
