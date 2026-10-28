// ===== evaluation, simulated learning and prediction for every annotation type =====
var LOOSE=.6;
function gtList(sc,decoy){return sc.gt.filter(function(g){return !!g.decoy===!!decoy})}
// ---- shape adapters
var AD={
 box:{thr:.25,sim:function(a,g){return iouBox(a,g)},loc:function(s){return cl((s-.3)/.5,0,1)}},
 poly:{thr:.25,sim:function(a,g){if(!g._m)g._m=maskOf(g.pts,640,400,160,100);if(!a._m)a._m=maskOf(a.pts,640,400,160,100);return iouMask(a._m,g._m)},loc:function(s){return cl((s-.3)/.5,0,1)}},
 line:{thr:.25,sim:function(a,g){return a.pts.length<2?0:1-lineDist(a.pts,g.pts)/40},loc:function(s){return cl((s-.25)/.6,0,1)}}
};
function shapeStat(){return {n:0,found:0,missed:0,locSum:0,wrongTo:{},wrongInto:0,fp:0,dec:0,decTot:0,lab:0,score:0,present:false}}
function evalShapes(sc,anns,P,type){
  var ad=AD[type],gts=gtList(sc,false),dec=gtList(sc,true),pairs=[],i,j;
  var by={};P.classes.forEach(function(c){by[c.id]=shapeStat()});
  gts.forEach(function(g){by[g.c].n++;by[g.c].present=true});dec.forEach(function(d){by[d.c].decTot++});
  anns.forEach(function(a,ai){if(by[a.c])by[a.c].lab++;
    gts.forEach(function(g,gi){var s=ad.sim(a,g);if(s>=ad.thr)pairs.push({ai:ai,gi:gi,s:s,d:false})});
    dec.forEach(function(g,gi){var s=ad.sim(a,g);if(s>=ad.thr)pairs.push({ai:ai,gi:gi,s:s,d:true})})});
  pairs.sort(function(a,b){return b.s-a.s});
  var usedA={},usedG={},usedD={},kind=[],notes=[],gm={};
  pairs.forEach(function(p){if(usedA[p.ai])return;if(p.d){if(usedD[p.gi])return;usedD[p.gi]=1;usedA[p.ai]=1;kind[p.ai]={k:'decoy',g:dec[p.gi],s:p.s};return}
    if(usedG[p.gi])return;usedG[p.gi]=1;usedA[p.ai]=1;gm[p.gi]=p.ai;kind[p.ai]={k:'',g:gts[p.gi],s:p.s}});
  var extras=0;
  anns.forEach(function(a,ai){var m=kind[ai];
    if(!m){kind[ai]={k:'extra',g:null,s:0};by[a.c]&&by[a.c].fp++;extras++;return}
    if(m.k==='decoy'){by[m.g.c].dec++;extras++;by[a.c]&&(by[a.c].lab=by[a.c].lab);return}
    var g=m.g;
    if(g.c!==a.c){m.k='wrong';by[g.c].wrongTo[a.c]=(by[g.c].wrongTo[a.c]||0)+1;by[a.c]&&by[a.c].wrongInto++;return}
    by[g.c].found++;by[g.c].locSum+=ad.loc(m.s);m.k=m.s<LOOSE?'loose':'ok'});
  var missed=[];gts.forEach(function(g,gi){if(gm[gi]==null||kind[gm[gi]].k==='wrong'){by[g.c].missed++;missed.push(g)}});
  var scores=[];
  P.classes.forEach(function(c){var b=by[c.id];if(!b.n)return;
    var rec=b.found/b.n,loc=b.found?b.locSum/b.found:0,wrongIn=b.wrongInto,labelled=b.lab,prec=labelled?b.found/labelled:0;
    b.rec=rec;b.loc=loc;b.prec=prec;b.score=rec*(.5+.5*loc)*(.4+.6*prec);scores.push(b.score)});
  var score=scores.length?scores.reduce(function(a,b){return a+b},0)/scores.length:0;
  score*=1-Math.min(.5,.08*extras);
  // notes
  kind.forEach(function(m,ai){var a=anns[ai],cn=function(id){var c=P.classes.filter(function(x){return x.id===id})[0];return c?c.name.toLowerCase():id};
    if(m.k==='loose')notes.push({k:'loose',t:'A '+cn(a.c)+' box was loose ('+Math.round(m.s*100)+'% overlap with the real one).'});
    else if(m.k==='wrong')notes.push({k:'wrong',t:'A '+cn(m.g.c)+' was labelled as '+cn(a.c)+'.',c:m.g.c});
    else if(m.k==='decoy')notes.push({k:'decoy',t:'Labelled as '+cn(a.c)+' but it is not one: '+m.g.why+'.',c:m.g.c});
    else if(m.k==='extra')notes.push({k:'extra',t:'An extra '+cn(a.c)+' label with nothing there.',c:a.c})});
  var mc={};missed.forEach(function(g){mc[g.c]=(mc[g.c]||0)+1});for(var c in mc){var nm=P.classes.filter(function(x){return x.id===c})[0].name.toLowerCase();notes.push({k:'miss',t:'Missed '+mc[c]+' '+nm+(mc[c]>1?' labels':' label')+'.',c:c})}
  return {score:score,byClass:by,kind:kind,missed:missed,notes:notes,extras:extras,found:gts.length-missed.length,total:gts.length,touched:anns.length>0};
}
function learnShapes(evals,P){
  var M={cls:{},decoyAny:0},ns=evals.length;
  P.classes.forEach(function(c){var t=shapeStat(),sc=[],cnt=0,fpS=0;
    evals.forEach(function(e){var b=e.byClass[c.id];if(b.n){t.n+=b.n;t.found+=b.found;t.locSum+=b.locSum;t.missed+=b.missed;t.wrongInto+=b.wrongInto;cnt++;sc.push(e.touched?b.score:0);for(var k in b.wrongTo)t.wrongTo[k]=(t.wrongTo[k]||0)+b.wrongTo[k]}
      t.fp+=b.fp;t.dec+=b.dec;t.decTot+=b.decTot;t.lab+=b.lab});
    var q=sc.length?sc.reduce(function(a,b){return a+b},0)/sc.length:0,wr=0;for(var k in t.wrongTo)wr+=t.wrongTo[k];
    var conf={};for(var k2 in t.wrongTo)conf[k2]=t.n?t.wrongTo[k2]/t.n:0;
    var flaws=wr+t.dec+t.fp;
    M.cls[c.id]={q:q,recall:t.n?t.found/t.n:0,locq:t.found?t.locSum/t.found:.4,prec:t.lab?t.found/t.lab:0,conf:conf,decRate:t.decTot?t.dec/t.decTot:0,fpPer:ns?t.fp/ns:0,flaws:flaws,n:t.n};
    M.cls[c.id].s=q>=.75?'good':q>=.4?'weak':(flaws>0?'bad':'none')});
  return M;
}
function predictShapes(sc,M,r,type,P){
  var out=[],gts=gtList(sc,false),dec=gtList(sc,true);
  function jit(a,cm,g){var s=.03+.34*(1-(cm.locq==null?.4:cm.locq));
    if(type==='box'){var dx=(r()-.5)*2*s*g.w,dy=(r()-.5)*2*s*g.h,sw=1+(r()-.5)*2*s*1.3,sh=1+(r()-.5)*2*s*1.3,w=g.w*sw,h=g.h*sh;return {x:cl(g.x+dx+(g.w-w)/2,0,640-8),y:cl(g.y+dy+(g.h-h)/2,0,400-8),w:Math.max(8,w),h:Math.max(8,h)}}
    var bb=bbox(g.pts),sz=Math.max(bb.w,bb.h),cx=bb.x+bb.w/2,cy=bb.y+bb.h/2,sc2=1+(r()-.5)*s*1.2,ox=(r()-.5)*s*sz*.6,oy=(r()-.5)*s*sz*.6;
    if(type==='poly')return {pts:g.pts.map(function(p){return[cx+(p[0]-cx)*sc2+ox+(r()-.5)*s*sz*.45,cy+(p[1]-cy)*sc2+oy+(r()-.5)*s*sz*.45]})};
    var cut=r()<s*1.1?Math.floor(r()*g.pts.length*.4):0,off=(r()-.5)*2*s*70;
    return {pts:g.pts.slice(cut).map(function(p,k){return[p[0]+off*(.4+k/g.pts.length)+(r()-.5)*s*14,p[1]+(r()-.5)*s*10]})}
  }
  function pushShape(c,g,cm){var j=jit(null,cm,g),o=X({c:c},j);out.push(o)}
  gts.forEach(function(g){var cm=M.cls[g.c]||{recall:0,locq:.3,conf:{}};if(r()>cl(.06+.92*cm.recall,0,.98))return;
    var cls=g.c,u=r(),cf=cm.conf||{};for(var c2 in cf){if(u<cf[c2]){cls=c2;break}u-=cf[c2]}
    pushShape(cls,g,cm)});
  dec.forEach(function(d){var cm=M.cls[d.c]||{decRate:0,locq:.4};if(r()<cm.decRate*.9+.02){var cm2=X({},cm);pushShape(d.c,d,cm2)}});
  P.classes.forEach(function(c){var cm=M.cls[c.id];if(!cm)return;if(r()<Math.min(.7,cm.fpPer)){
    if(type==='box')out.push({c:c.id,x:rr(r,40,560),y:rr(r,60,320),w:rr(r,30,60),h:rr(r,30,60)});
    else if(type==='poly'){var cx=rr(r,120,520),cy=rr(r,100,300);out.push({c:c.id,pts:blob(cx,cy,rr(r,15,28),r,12,.25)})}
    else{var x0=rr(r,120,520);out.push({c:c.id,pts:[[x0,380],[x0+rr(r,-40,40),300],[x0+rr(r,-60,60),230]]})}}});
  return out;
}
// ---- semantic segmentation
function evalSeg(sc,ann,P){
  var g=sc.grid,a=ann||new Int8Array(g.length).fill(-1),by={},ids=P.classes.map(function(c){return+c.id}),un=0,conf={};
  ids.forEach(function(id){by[id]={i:0,u:0,n:0,score:0}});
  for(var k=0;k<g.length;k++){var gc=g[k],ac=a[k];by[gc].n++;if(ac<0)un++;
    if(ac===gc){by[gc].i++;by[gc].u++}else{by[gc].u++;if(ac>=0)by[ac].u++;if(ac>=0){conf[gc]=conf[gc]||{};conf[gc][ac]=(conf[gc][ac]||0)+1}}}
  var sc2=[];ids.forEach(function(id){var b=by[id];if(!b.n)return;b.score=b.u?b.i/b.u:0;sc2.push(b.score)});
  var notes=[];if(un)notes.push({k:'miss',t:un+' of '+g.length+' cells have no class yet.'});
  SK_DIS.forEach(function(d){var l=by[d];if(l&&l.n&&l.score<.6&&un<g.length)notes.push({k:'loose',t:P.classes[d].name+' overlap is '+Math.round(l.score*100)+'%. Trace the patch edge more closely.',c:String(d)})});
  ids.forEach(function(id){if(conf[id]){var best=Object.keys(conf[id]).sort(function(x,y){return conf[id][y]-conf[id][x]})[0];var cnt=conf[id][best];if(cnt>=8)notes.push({k:'wrong',t:cnt+' '+P.classes[id].name.toLowerCase()+' cells were painted as '+P.classes[best].name.toLowerCase()+'.',c:String(id)})}});
  var painted=1-un/g.length;
  return {score:sc2.length?sc2.reduce(function(a,b){return a+b},0)/sc2.length:0,byClass:by,notes:notes,painted:painted,conf:conf,touched:painted>0};
}
function learnSeg(evals,P){
  var M={cls:{}},ids=P.classes.map(function(c){return+c.id});
  ids.forEach(function(id){var sc=[],cf={},tot=0,un=0;
    evals.forEach(function(e){var b=e.byClass[id];if(b.n){sc.push(e.touched?b.score:0);tot+=b.n;if(e.conf[id])for(var k in e.conf[id])cf[k]=(cf[k]||0)+e.conf[id][k]}});
    var q=sc.length?sc.reduce(function(a,b){return a+b},0)/sc.length:0,conf={},wr=0;for(var k2 in cf){conf[k2]=tot?cf[k2]/tot:0;wr+=cf[k2]}
    M.cls[id]={q:q,conf:conf,flaws:wr>12?wr:0,s:q>=.75?'good':q>=.4?'weak':(wr>12?'bad':'none')}});
  return M;
}
function predictSeg(sc,M,r,P){
  var g=sc.grid,C=SK_COLS,R=SK_ROWS,o=new Int8Array(g.length);
  for(var k=0;k<g.length;k++){var gc=g[k],cm=M.cls[gc]||{q:0,conf:{}},x=k%C,y=(k/C)|0,v=gc;
    var nb=[x>0?g[k-1]:gc,x<C-1?g[k+1]:gc,y>0?g[k-C]:gc,y<R-1?g[k+C]:gc].filter(function(z){return z!==gc});
    if(nb.length&&r()<(1-cm.q)*.8)v=nb[Math.floor(r()*nb.length)];
    else if(cm.q<.15&&nb.length&&r()<.6)v=nb[0];
    else{var u=r(),cf=cm.conf;for(var c2 in cf){if(u<cf[c2]*2){v=+c2;break}u-=cf[c2]*2}}
    if(cm.q<.05&&r()<.5)v=gc>=5?3:gc;
    o[k]=v}
  return o;
}
// ---- keypoints
function evalPose(sc,ann,P){
  var T=sc.T,pts=(ann&&ann.pts)||[],js=[],swaps=0,placed=0,errs=[];
  for(var j=0;j<14;j++){var p=pts[j],g=sc.pts[j];if(!p){js.push(0);errs.push(null);continue}placed++;
    var e=dist(p,g)/T,em=dist(p,sc.pts[JM[j]])/T,sw=e>.15&&em<e&&em<.25,s=1-cl(e/.6,0,1);if(sw){s*=.3;swaps++}errs.push(e);js.push(s)}
  var by={0:{score:0,n:0,sw:0,e:0,en:0},1:{score:0,n:0,sw:0,e:0,en:0},2:{score:0,n:0,sw:0,e:0,en:0}};
  for(var j2=0;j2<14;j2++){var b=by[JG[j2]];b.n++;b.score+=js[j2];if(errs[j2]!=null){b.e+=errs[j2];b.en++}
    if(errs[j2]!=null&&pts[j2]&&errs[j2]>.15&&dist(pts[j2],sc.pts[JM[j2]])/T<errs[j2]&&dist(pts[j2],sc.pts[JM[j2]])/T<.25)b.sw++}
  for(var k in by){by[k].score=by[k].n?by[k].score/by[k].n:0}
  var notes=[];if(placed<14)notes.push({k:'miss',t:(14-placed)+' of 14 points are not placed yet.'});
  for(var k2 in by){if(by[k2].sw)notes.push({k:'wrong',t:'Left and right swapped on '+by[k2].sw+' '+P.classes[k2].name.toLowerCase()+' point'+(by[k2].sw>1?'s':'')+'.',c:String(k2)})}
  var worst=-1,we=0;errs.forEach(function(e,j3){if(e!=null&&e>we){we=e;worst=j3}});
  if(worst>-1&&we>.25)notes.push({k:'loose',t:JN[worst]+' is '+f1(we)+' torso lengths away from the joint.',c:String(JG[worst])});
  return {score:js.reduce(function(a,b){return a+b},0)/14,byClass:by,notes:notes,placed:placed,swaps:swaps,errs:errs,touched:placed>0,worst:worst,worstErr:we};
}
function learnPose(evals,P){
  var M={cls:{},swap:0},sw=0,pl=0;
  [0,1,2].forEach(function(g){var sc=[],e=0,en=0,s=0,n=0;evals.forEach(function(ev){var b=ev.byClass[g];sc.push(ev.touched?b.score:0);e+=b.e;en+=b.en;s+=b.sw;n+=b.en});
    var q=sc.reduce(function(a,b){return a+b},0)/sc.length;M.cls[g]={q:q,err:en?e/en:.8,swap:n?s/n:0,flaws:s,s:q>=.75?'good':q>=.4?'weak':(s>0?'bad':'none')}});
  return M;
}
function predictPose(sc,M,r){
  var out=[];
  for(var j=0;j<14;j++){var g=JG[j],cm=M.cls[g]||{q:0,swap:0,err:.8},sig=(.02+.4*(1-cm.q))*sc.T,src=sc.pts[j];
    if(r()<cm.swap*1.1)src=sc.pts[JM[j]];
    var a=r()*6.28,d=Math.abs((r()+r()+r()-1.5))*sig*1.3;out.push([src[0]+Math.cos(a)*d,src[1]+Math.sin(a)*d])}
  return {pts:out};
}
// ---- text labels
function pscore(a,b){return a===b?1:0}
function evalText(sc,ann,P){
  var gt=sc.gt,sel=(ann&&ann.kw)||[],set={};sel.forEach(function(k){set[k]=1});
  var tp=0;gt.kw.forEach(function(k){if(set[k])tp++});var fpk=sel.filter(function(k){return gt.kw.indexOf(k)<0&&isWord(sc.tokens[k])}).length;
  var kw;if(!gt.kw.length)kw=sel.length?Math.max(0,1-.35*sel.length):1;else{var p=sel.length?tp/sel.length:0,rcl=tp/gt.kw.length;kw=p+rcl?2*p*rcl/(p+rcl):0}
  var sOk=ann&&ann.sent===gt.sent,order=['low','med','high'],cd=ann&&ann.churn?Math.abs(order.indexOf(ann.churn)-order.indexOf(gt.churn)):9,ch=cd===0?1:cd===1?.4:0;
  var touched=!!(ann&&(ann.sent||ann.churn||sel.length));
  var score=touched?.4*kw+.35*(sOk?1:0)+.25*ch:0,notes=[];
  if(touched){if(!sOk)notes.push({k:'wrong',t:'Sentiment is '+(ann.sent?SENT.filter(function(s){return s.id===ann.sent})[0].name:'not chosen')+', it should be '+SENT.filter(function(s){return s.id===gt.sent})[0].name+'.',c:gt.sent});
    if(!ann.churn)notes.push({k:'miss',t:'Churn risk is not chosen.',c:gt.sent});else if(cd)notes.push({k:'wrong',t:'Churn risk should be '+CHURN.filter(function(s){return s.id===gt.churn})[0].name+'.',c:gt.sent});
    var miss=gt.kw.length-tp;if(miss>0)notes.push({k:'miss',t:'Missed '+miss+' keyword'+(miss>1?'s':'')+'.'+(sc.trap?' '+sc.trap:''),c:gt.sent});
    if(fpk>0)notes.push({k:'extra',t:fpk+' ticked word'+(fpk>1?'s are':' is')+' not a keyword.',c:gt.sent})}
  var by={};SENT.forEach(function(s){by[s.id]={score:s.id===gt.sent?score:0,n:s.id===gt.sent?1:0}});
  return {score:score,byClass:by,notes:notes,touched:touched,kw:kw,sOk:sOk,ch:ch};
}
function phrasesOf(sc,kw){var s=kw.slice().sort(function(a,b){return a-b}),o=[],cur=[];s.forEach(function(k){if(cur.length&&k===cur[cur.length-1]+1)cur.push(k);else{if(cur.length)o.push(cur);cur=[k]}});if(cur.length)o.push(cur);return o.map(function(g){return{idx:g,key:g.map(function(k){return sc.tokens[k].toLowerCase()}).join(' ')}})}
function learnText(evals,P,scenes,anns){
  var lex={};
  scenes.forEach(function(sc,i){var a=anns[i];if(!a||!a.sent)return;phrasesOf(sc,a.kw||[]).forEach(function(p){var e=lex[p.key]=lex[p.key]||{s:{},c:{}};e.s[a.sent]=(e.s[a.sent]||0)+1;if(a.churn)e.c[a.churn]=(e.c[a.churn]||0)+1})});
  var M={lex:lex,cls:{}};SENT.forEach(function(s){var sc=[],fl=0;evals.forEach(function(e,i){if(scenes[i].gt.sent===s.id){sc.push(e.touched?e.score:0);if(e.notes.some(function(n){return n.k==='wrong'}))fl++}});
    var q=sc.length?sc.reduce(function(a,b){return a+b},0)/sc.length:0;M.cls[s.id]={q:q,flaws:fl,s:q>=.75?'good':q>=.4?'weak':(fl>0?'bad':'none')}});
  return M;
}
function predictText(sc,M){
  var toks=sc.tokens.map(function(t){return t.toLowerCase()}),used={},hits=[],ss={},cc={};
  for(var n=3;n>=1;n--){for(var i=0;i+n<=toks.length;i++){var key=toks.slice(i,i+n).join(' '),e=M.lex[key];if(!e)continue;var free=true;for(var k=0;k<n;k++)if(used[i+k])free=false;if(!free)continue;
    for(var k2=0;k2<n;k2++)used[i+k2]=1;var idx=[];for(var k3=0;k3<n;k3++)idx.push(i+k3);hits.push({key:key,idx:idx});
    for(var s in e.s)ss[s]=(ss[s]||0)+e.s[s];for(var c in e.c)cc[c]=(cc[c]||0)+e.c[c]}}
  function top(o,dflt){var b=dflt,m=0;for(var k in o)if(o[k]>m){m=o[k];b=k}return b}
  var kw=[];hits.forEach(function(h){kw=kw.concat(h.idx)});
  return {kw:kw,sent:top(ss,'neu'),churn:top(cc,'low'),hits:hits,known:hits.length>0};
}
