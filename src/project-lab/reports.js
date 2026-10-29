// ===== what the finished system would do, for each project =====
function cName(P,id){var c=P.classes.filter(function(x){return x.id===String(id)})[0];return c?c.name:id}
function bestPerson(pp,w){var b=null,bs=0;pp.forEach(function(p){var s=iouBox(p,w.box);if(s>bs){bs=s;b=p}});return bs>=.3?b:null}
function inside(b,p,y0,y1){var cx=b.x+b.w/2,cy=b.y+b.h/2;return cx>=p.x-4&&cx<=p.x+p.w+4&&cy>=p.y+p.h*y0&&cy<=p.y+p.h*y1}
function li(ok,t,tag){return '<li class="'+(ok?'ok':'no')+'"><span>'+t+'</span>'+(tag?'<em>'+tag+'</em>':'')+'</li>'}
var REP={};
REP.ppe=function(sc,pred,P){
  var pp=pred.filter(function(a){return a.c==='person'}),rows='',bad=0;
  var POS={head:['helmet','helmet_ear'],chest:['vest','harness'],feet:['boots'],hand:['gloves']},NEG={head:'nohelmet',chest:'novest',feet:'noboots',hand:'nogloves'};
  function zone(b,p,y0,y1){var cx=b.x+b.w/2,cy=b.y+b.h/2;return cx>=p.x-8&&cx<=p.x+p.w+8&&cy>=p.y+p.h*y0&&cy<=p.y+p.h*y1}
  sc.workers.forEach(function(w,k){var p=bestPerson(pp,w);
    var truth=[];if(w.helm==='none')truth.push('helmet');if(w.chest==='none')truth.push('vest');if(w.feet==='noboots')truth.push('boots');if(w.nh>0&&!w.gloves)truth.push('gloves');
    if(!p){rows+=li(false,'Worker '+(k+1)+': not seen by the camera','Missed worker');bad++;return}
    var Z={head:[0,.3],chest:[.12,.65],feet:[.8,1.05],hand:[.4,.85]},miss=[];
    ['head','chest','feet','hand'].forEach(function(z){if(z==='feet'&&!w.feet)return;if(z==='hand'&&!w.nh)return;
      var pos=pred.filter(function(a){return POS[z].indexOf(a.c)>-1&&zone(a,p,Z[z][0],Z[z][1])}).length,neg=pred.filter(function(a){return a.c===NEG[z]&&zone(a,p,Z[z][0],Z[z][1])}).length;
      if(neg>0||pos===0)miss.push(z==='head'?'helmet':z==='chest'?'vest':z==='feet'?'boots':'gloves')});
    var same=miss.join()===truth.join();if(!same)bad++;
    var msg=miss.length?'🚨 Worker '+(k+1)+': missing '+miss.join(', '):'✔ Worker '+(k+1)+': fully protected';
    rows+=li(same,msg,same?'Correct':(miss.length&&!truth.length?'False alarm':'Really '+(truth.length?'missing '+truth.join(', '):'protected')))});
  var ghost=pp.filter(function(p){return !sc.workers.some(function(w){return iouBox(p,w.box)>=.3})}).length;if(ghost){bad++;rows+=li(false,'The camera also sees '+ghost+' person'+(ghost>1?'s':'')+' who is not there','False alarm')}
  return {html:rows,bad:bad};
};
REP.graze=function(sc,pred,P){
  var H=['cattle','goat','giraffe','zebra','rhino','buffalo','elephant','wildebeest'],rows='',bad=0,cnt={};
  P.classes.forEach(function(c){cnt[c.id]=pred.filter(function(a){return a.c===c.id}).length});
  H.forEach(function(id){var t=sc.animals[id],c=cnt[id];if(!t&&!c)return;var ok=c===t;if(!ok)bad++;
    rows+=li(ok,cName(P,id)+': model counts '+c+', the register says '+t,ok?'Match':(c<t?'Short by '+(t-c):'Over by '+(c-t)))});
  var tot=H.reduce(function(a,id){return a+cnt[id]},0),tt=H.reduce(function(a,id){return a+sc.animals[id]},0);
  rows+=li(tot===tt,tot<tt?'🚨 Herd alert: '+(tt-tot)+' animal'+(tt-tot>1?'s':'')+' unaccounted for. A ranger is sent out.':tot>tt?'⚠ Count is higher than the register. Check for a rock or a bush.':'✔ Herd complete. No herd alert.',tot===tt?'Correct':'Wrong call');
  var pp=cnt.predator,pt=sc.animals.predator,pok=(pp>0)===(pt>0);if(!pok)bad++;
  rows+=li(pok,pp>0?'🚨 Predator alert sent: '+pp+' sighted. Rangers and herders are warned.':'✔ No predator sighted. No alert.',pok?'Correct':(pt>0?'Missed predator: the herd is at risk':'False alarm: rangers sent for nothing'));
  var ip=cnt.intruder,it=sc.animals.intruder,iok=(ip>0)===(it>0);if(!iok)bad++;
  rows+=li(iok,ip>0?'🚨 Intruder alert sent: '+ip+' person'+(ip>1?'s':'')+' in the field.':'✔ No intruder. No alert.',iok?'Correct':(it>0?'Missed intruder: no one is warned':'False alarm: rangers sent for nothing'));
  return {html:rows,bad:bad};
};
REP.crop=function(sc,pred,P){
  var adv={leafspot:'Leaf spot: remove infected leaves and spray copper fungicide.',rust:'Rust: apply a rust-control fungicide on a 10-day cycle.',pest:'Pests: spray insecticidal soap and check neighbouring plants.'},cnt={},tcnt={},rows='',bad=0;
  P.classes.forEach(function(c){cnt[c.id]=pred.filter(function(a){return a.c===c.id}).length;tcnt[c.id]=sc.gt.filter(function(g){return !g.decoy&&g.c===c.id}).length});
  P.classes.forEach(function(c){var a=cnt[c.id],t=tcnt[c.id],same=(a>0)===(t>0);
    if(a>0||t>0){rows+=li(same,(a>0?'💊 '+adv[c.id]:'No '+c.name.toLowerCase()+' found.')+' (model '+a+' · really '+t+')',same?(a===t?'Correct':'Right advice, wrong count'):(a>0?'Unneeded spray':'Disease missed'));if(!same)bad++}});
  if(!rows)rows=li(true,'Healthy leaf. No treatment.','');
  return {html:rows,bad:bad};
};
REP.coffee=function(sc,pred,P){
  function sev(list){var a=0;list.forEach(function(p){a+=polyArea(p.pts)});return Math.min(100,a/sc.leafArea*100)}
  function band(v){return v<5?['Monitor only','low']:v<20?['Spray copper fungicide','mid']:['Urgent: remove leaves and call the extension officer','high']}
  var s=sev(pred),t=sev(gtList(sc,false)),bs=band(s),bt=band(t),same=bs[1]===bt[1];
  return {html:li(same,'Infection severity: model says '+f1(s)+'% of the leaf. Action: '+bs[0]+'.',same?'Correct':'Should be: '+bt[0])+li(true,'Real severity is '+f1(t)+'% of the leaf.',''),bad:same?0:1};
};
REP.lane=function(sc,pred,P){
  function act(lines){
    if(lines.length<2)return {t:'No lane found. Lane assist switches off.',k:'off'};
    var xs=lines.map(function(l){var b=l.pts.slice().sort(function(a,c){return c[1]-a[1]})[0];return b[0]+(400-b[1])*0}).sort(function(a,b){return a-b});
    var ctr=(xs[0]+xs[xs.length-1])/2,off=ctr-320;return off>28?{t:'Steer right to centre the car.',k:'r'}:off<-28?{t:'Steer left to centre the car.',k:'l'}:{t:'Car is centred. Keep going.',k:'c'}}
  var a=act(pred),b=act(gtList(sc,false)),same=a.k===b.k;
  return {html:li(same,'Lane assist: found '+pred.length+' line'+(pred.length===1?'':'s')+'. '+a.t,same?'Correct':'Should be: '+b.t)+li(true,'There are really '+gtList(sc,false).length+' painted lines.',''),bad:same?0:1};
};
REP.skin=function(sc,pred,P){
  var ADV={5:'Moisturise, avoid triggers and see a pharmacist.',6:'Book a dermatology appointment for plaque treatment.',7:'Skincare routine advice and acne treatment options.',8:'Dermatology review. Protect the pale patches from sun.',9:'URGENT: refer to a specialist to check the mole.'};
  function areas(g){var a={},tot=0;for(var k=0;k<g.length;k++){var v=g[k];if(v>=3&&v!==2){if(v>=5)a[v]=(a[v]||0)+1;if(v<=4||v>=5)tot++}}return {a:a,tot:tot}}
  function top(x){var b=null,bn=0;for(var d in x.a)if(x.a[d]>bn){bn=x.a[d];b=+d}return b}
  var p=areas(pred),t=areas(sc.grid),dp=top(p),dt=top(t);
  function name(d){return d==null?'no disease found':P.classes[d].name}
  var same=dp===dt,rows='';
  Object.keys(t.a).forEach(function(d){var pc=(p.a[d]||0)/p.tot*100,tc=t.a[d]/t.tot*100,ok=Math.abs(pc-tc)<3+tc*.35;
    rows+=li(ok,P.classes[d].name+' covers '+f1(pc||0)+'% of the visible skin. '+(p.a[d]?ADV[d]:'The app did not find it.'),ok?'Correct':'Real area is '+f1(tc)+'%')});
  Object.keys(p.a).forEach(function(d){if(!t.a[d])rows+=li(false,'The app also reports '+P.classes[d].name+' ('+f1(p.a[d]/p.tot*100)+'%). It is not there.','False alarm')});
  if(!rows)rows=li(same,'The app reports no skin disease.',same?'Correct':'');
  var bad=0;Object.keys(t.a).forEach(function(d){if(!p.a[d]||Math.abs(p.a[d]/p.tot-t.a[d]/t.tot)*100>=3+t.a[d]/t.tot*100*.35)bad=1});Object.keys(p.a).forEach(function(d){if(!t.a[d])bad=1});
  rows+=li(true,'Main finding: '+name(dp)+(same?'':'. Should be '+name(dt))+'. Simulation only, not medical advice.','');
  return {html:rows,bad:bad||(same?0:1)};
};
REP.pose=function(sc,pred,P){
  var a=sc.coach(pred.pts),b=sc.coach(sc.pts),same=a===b;
  return {html:li(same,'🎙 Coach says: “'+a+'”',same?'Correct':'Should say: “'+b+'”')+li(true,'Exercise: '+sc.pose+'.',''),bad:same?0:1};
};
REP.churn=function(sc,pred,P){
  var gt=sc.gt,sOk=pred.sent===gt.sent,cOk=pred.churn===gt.churn,sn=function(id){return SENT.filter(function(s){return s.id===id})[0].name},cn=function(id){return CHURN.filter(function(s){return s.id===id})[0].name};
  var call=pred.churn==='high'?'📞 Call within 24 hours.':pred.churn==='med'?'📋 Add to the weekly check-in list.':'✔ No action.';
  var html=li(sOk&&cOk,'Model: '+sn(pred.sent)+', churn '+cn(pred.churn)+'. '+call,sOk&&cOk?'Correct':'Should be: '+sn(gt.sent)+', churn '+cn(gt.churn));
  if(!pred.known)html+=li(false,'The model saw no words it knows, so it guessed Neutral and Low.','');
  return {html:html,bad:(sOk&&cOk)?0:1};
};
REP.drive=function(sc,pred,P){
  var d=driveRun(sc,pred,P),S=window.GIGO.SCENARIO,rows='',bad=0,s=d.s,ord=s.actors.slice().sort(function(a,b){return window.GIGO.Sim.refX(a)-window.GIGO.Sim.refX(b)});
  function row(ok,t,tag,id){return li(ok,t,tag).replace('<li ','<li data-id="'+id+'" ')}
  ord.forEach(function(a){var r=s.results[a.id],sh=a.short,Sh=sh.charAt(0).toUpperCase()+sh.slice(1),det=d.det[a.id]||{};
    if(a.critical){
      if(r==='safe'){rows+=row(true,Sh+' detected in time. The car handled it safely.','Safe',a.id)}
      else{bad++;var cr=S.critical[r==='violation'?'violation':r==='late_brake'?'late_brake':r]||'';
        var why=det.wrong?'It was labelled as the wrong thing. ':det.mode==='missed'?'It had no box. ':det.mode==='late'?'Its box was loose. ':'';
        rows+=row(false,Sh+': '+why+cr.replace('{short}',sh),r==='collision'?'Collision':r==='near_miss'?'Near miss':r==='violation'?'Red light run':r==='late_brake'?'Late braking':'Not reached',a.id)}
    }else{
      if(r==='missed_warning'){bad++;rows+=row(false,a.warn,'Missed',a.id)}
      else if(r==='not_reached'&&a.mode==='missed'){bad++;rows+=row(false,Sh+' had no box. The drive ended before the car reached it.','Missed',a.id)}
      else rows+=row(true,Sh+(a.mode==='late'?' noticed, with a loose box.':' tracked.'),'Safe',a.id)}
  });
  if(d.ev.counts.spurious+d.ev.counts.duplicate){bad++;rows+=row(false,(d.ev.counts.spurious+d.ev.counts.duplicate)+' extra box'+(d.ev.counts.spurious+d.ev.counts.duplicate>1?'es':'')+' on nothing. The car can brake for things that are not there.','False alarm','x')}
  var oc=S.outcomes[s.outcome];rows+=li(s.outcome==='safe',oc.label+'. '+oc.text,({safe:'Safe',warnings:'Warnings',near_miss:'Near miss',collision:'Collision'})[s.outcome]).replace('<li ','<li data-id="end" ');
  return {html:rows,bad:bad};
};


// generic report for the GIGO scene projects (warehouse, drone, crop); road reuses REP.drive
var GOKRES={safe:1,stopped:1,cleared:1,alert:1,counted:1,ok:1};
function gTag(r){return ({incident:'Incident',unchecked:'Unchecked',near_miss:'Near miss',late_check:'Late check',false_alarm:'False alarm',stopped:'Stopped',cleared:'Cleared',missed_warning:'Missed',not_checked:'Not checked',alert_missed:'Alert missed',late_alert:'Late alert',alert:'Alert sent',counted:'Counted',mixup:'Mix-up',uncertain:'Unsure',ok:'Treated',outbreak:'Outbreak',late_treat:'Late treatment',late:'Late',wasted:'Wasted spray',wrong_tx:'Wrong treatment'})[r]||r}
function gigoReport(sc,pred,P){
  var d=driveRun(sc,pred,P),G=window.GIGO,S=d.SC,s=d.s,rows='',bad=0;
  function row(ok,t,tag,id){return li(ok,t,tag).replace('<li ','<li data-id="'+id+'" ')}
  var gz=sc.gz.slice().sort(function(a,b){return (d.pass[a.id]==null?1e9:d.pass[a.id])-(d.pass[b.id]==null?1e9:d.pass[b.id])});
  gz.forEach(function(g){var r=s.results[g.id];if(r==null)return;var sh=g.short,Sh=sh.charAt(0).toUpperCase()+sh.slice(1),det=d.det[g.id]||{};
    if(GOKRES[r]){if(g.id.indexOf('_')>0&&!g.critical)return;rows+=row(true,Sh+(det.mode==='late'?': handled, with a loose box.':': handled correctly.'),gTag(r),g.id);return}
    var txt=r==='missed_warning'?g.warn:(g.critical?S.critical:S.minor)[r];
    if(r==='not_checked')return;
    bad++;var why=det.wrong?'It was labelled as the wrong thing. ':det.mode==='missed'?'It had no box. ':det.mode==='late'?'Its box was loose. ':'';
    rows+=row(false,Sh+': '+why+String(txt||'').replace(/\{short\}/g,sh).replace(/\{alert\}/g,g.alert||'alert'),gTag(r),g.id)});
  var ex=d.ev.counts.spurious+d.ev.counts.duplicate;
  if(ex){bad++;rows+=row(false,ex+' extra box'+(ex>1?'es':'')+' on nothing. The model can act on things that are not there.','False alarm','x')}
  var oc=S.outcomes[s.outcome];rows+=li(s.outcome==='safe',oc.label+'. '+oc.text,({safe:'Safe',warnings:'Warnings',near_miss:'Near miss',collision:'Failure'})[s.outcome]).replace('<li ','<li data-id="end" ');
  return {html:rows,bad:bad};
}
REP.g_warehouse=REP.g_drone=REP.g_crop=gigoReport;REP.g_road=REP.drive;
