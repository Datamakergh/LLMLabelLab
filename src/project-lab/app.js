// ===== app: landing, project view, drawing tools, simulator, results =====
var P=null,ST=null,SCN={},RUSH=[2,4],KC={ok:'#16a34a',loose:'#d97706',wrong:'#dc2626',extra:'#dc2626',decoy:'#dc2626'};
var STAGES=['Annotate','Evaluate','Simulate','Observe','Correct','Improve'];
var CC={};
function sceneOf(i){var k=P.id+':'+i;if(!SCN[k])SCN[k]=i<P.nTrain?P.gen(i,false):P.gen(i-P.nTrain,true);return SCN[k]}
function emptyAnn(){return P.type==='seg'?new Int8Array(SK_COLS*SK_ROWS).fill(-1):P.type==='pose'?{pts:[]}:P.type==='text'?{kw:[],sent:'',churn:''}:[]}
function clone(a){return P.type==='seg'?new Int8Array(a):JSON.parse(JSON.stringify(a,function(k,v){return k==='_m'?undefined:v}))}
function sSave(){if(!P)return;try{sessionStorage.setItem('llp2_'+P.id,JSON.stringify({ann:ST.ann.map(function(a){return P.type==='seg'?Array.from(a):JSON.parse(JSON.stringify(a,function(k,v){return k==='_m'?undefined:v}))}),runs:ST.runs,idx:ST.idx}))}catch(e){}}
function sLoad(){try{var v=JSON.parse(sessionStorage.getItem('llp2_'+P.id)||'null');if(v&&v.ann&&v.ann.length===P.nTrain){ST.ann=v.ann.map(function(a){return P.type==='seg'?Int8Array.from(a):a});ST.runs=v.runs||[];ST.idx=v.idx||0}}catch(e){}}
function toast(m){var t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(function(){t.hidden=true},3000)}
// ---------- landing
var GSC=[{id:'llm',icon:'💬',tag:'Text labelling · GIGO scene',name:'LLM answer check',blurb:'Pick the right answer to each question. The chatbot learns whatever you pick.'}];
function renderList(){
  var best={};try{best=JSON.parse(localStorage.getItem('llp_best')||'{}')}catch(e){}
  var llm='<a class="pcard" href="index.html#lab"><span class="pc-ic" aria-hidden="true">🧠</span><span class="pc-tag">LLM response labelling</span><h3>LLM Label Lab</h3><p>Rate and label AI answers for accuracy, tone and safety, with the full practice hub, points and leaderboard.</p><span class="pc-foot"><span>Class and practice mode</span><span class="pc-go">Open →</span></span></a>';
  $('grid').innerHTML=llm+PROJECTS.filter(function(p){return !p.hidden}).map(function(p){var b=best[p.id];
    return '<a class="pcard" href="#/'+p.id+'"><span class="pc-ic" aria-hidden="true">'+p.icon+'</span><span class="pc-tag">'+p.tag+'</span><h3>'+p.name+'</h3><p>'+p.blurb+'</p><span class="pc-foot">'+(b!=null?'<b>Best '+b+'%</b> on new scenes':'Not started')+'<span class="pc-go">Start →</span></span></a>'}).join('')+GSC.map(function(g){return '<a class="pcard" href="#/g/'+g.id+'"><span class="pc-ic" aria-hidden="true">'+g.icon+'</span><span class="pc-tag">'+g.tag+'</span><h3>'+g.name+'</h3><p>'+g.blurb+'</p><span class="pc-foot"><span>Label, run, see the outcome</span><span class="pc-go">Start →</span></span></a>'}).join('');
}
function route(){
  var gr=location.hash.match(/^#\/g\/(road|warehouse|drone|crop)$/);if(gr){location.replace('#/g_'+gr[1]);return}
  var gm=location.hash.match(/^#\/g\/(\w+)/),gs=gm&&GSC.filter(function(x){return x.id===gm[1]})[0];
  if(gs){P=null;cancelAnimationFrame(PL.raf);PL.on=false;$('listView').hidden=true;$('projView').hidden=false;document.body.classList.remove('inproj');$('projView').innerHTML='<div class="gframe"><a class="gback" href="#/">← All projects</a><iframe title="'+gs.name+'" src="gigo/play.html?scene='+gs.id+'&embed=1" loading="eager"></iframe></div>';window.scrollTo(0,0);return}
  var m=location.hash.match(/^#\/(\w+)/),p=m&&PROJECTS.filter(function(x){return x.id===m[1]&&!x.hidden})[0];if(m&&(m[1]==='graze'||m[1]==='ppe'||m[1]==='drive'||m[1]==='crop')){location.replace(m[1]==='ppe'?'#/g_warehouse':m[1]==='drive'?'#/g_road':m[1]==='crop'?'#/g_crop':'#/g_drone');return}
  if(!p){$('listView').hidden=false;$('projView').hidden=true;document.body.classList.remove('inproj');P=null;renderList();window.scrollTo(0,0);return}
  openProject(p);
}
window.addEventListener('hashchange',route);
// ---------- open a project
function openProject(p){
  P=p;ST={idx:0,tool:'draw',cls:p.classes[0].id,ann:[],undo:[],sel:-1,draft:null,showKey:false,runs:[],model:null,trained:false,sim:{set:'train',i:0,truth:false},rushed:false,anim:false,stage:0,pred:{},speed:1,brush:2,raf:0,artIdx:-1,drag:null,hoverP:null};
  for(var i=0;i<p.nTrain;i++)ST.ann.push(emptyAnn());
  CC={};p.classes.forEach(function(c){CC[c.id]=c.color});
  sLoad();
  $('listView').hidden=true;$('projView').hidden=false;document.body.classList.add('inproj');
  $('projView').innerHTML=projHtml();
  wireProject();
  renderBrief();renderFlow();renderLabel();renderSim();renderResults();
  DECK=$('deck');setTimeout(function(){goTo(0,true)},0);
  document.title=p.name+' · Project Lab';
}
function projHtml(){
  var text=P.type==='text';
  return '<div class="deck" id="deck" tabindex="-1" aria-label="Slides: swipe sideways">'+
  '<section class="slide" id="s0" aria-label="Brief"><div class="brief" id="brief"></div></section>'+
  '<section class="slide" id="s1" aria-label="Label and simulate"><header class="topbar"><div class="brand"><h1>'+esc(P.name)+' <span>'+esc(P.tag)+'</span></h1><p>Label the data, train the model, see what your labels taught it.</p></div><ol id="stepper" class="stepper" aria-label="Learning cycle"></ol><button id="reset" class="ghost" type="button">Start over</button></header>'+
  '<div class="panels">'+
   '<section class="panel" aria-labelledby="h-l"><div class="panel-head"><h2 id="h-l"><span class="num">1</span> Label the data</h2><div class="progress" aria-live="polite"><div class="progress-top"><span>'+(text?'Messages':'Scenes')+' labelled</span><b id="cnt"></b></div><div class="bar"><div id="bar"></div></div></div></div>'+
   '<div class="cls-bar" id="chips" role="group" aria-label="'+(text?'Message':'Scene')+'"></div>'+
   '<div id="tools" class="tools"></div>'+
   '<div id="canvas" class="canvasbox"></div>'+
   '<div class="scoreline" id="scoreline" aria-live="polite"></div>'+
   '<details><summary>Labelling guideline</summary><ol id="guide"></ol></details>'+
   '<div class="toolbar" id="tb"></div>'+
   '<label class="opt" for="rushed"><input type="checkbox" id="rushed"><span>Rushed labeller test: '+(text?'messages 3 and 5':'scenes 3 and 5')+' get careless labels</span></label>'+
   '</section>'+
   '<section class="panel" aria-labelledby="h-s"><div class="panel-head"><h2 id="h-s"><span class="num">2</span> Simulator</h2><span class="badge">Simulated, not real AI</span></div>'+
   '<ul class="legend"><li style="--c:#16a34a"><i></i>Correct</li><li style="--c:#d97706"><i></i>Loose</li><li style="--c:#dc2626"><i></i>Wrong or extra</li><li style="--c:#64748b"><i class="dash"></i>Missed</li></ul>'+
   '<div class="simtabs" id="simtabs" role="tablist"></div><div class="cls-bar" id="schips" role="group" aria-label="Scene"></div>'+
   '<div id="simview" class="canvasbox sim"></div><div class="scoreline" id="simmeta"></div>'+
   '<div class="plctl" id="plctl" hidden></div><div class="report"><h3 id="repTitle"></h3><ul id="report" class="repl"></ul></div>'+
   '<div><span class="note" id="stepno">Training idle</span><div class="bar"><div id="tbar"></div></div></div><ul class="log" id="log"></ul>'+
   '<div class="toolbar"><span class="spacer"></span><button class="ghost" id="speed" type="button">Speed 1×</button><button class="ghost" data-go="2" type="button">See results →</button><button class="ghost" id="fix" type="button" disabled>← Fix my labels</button></div>'+
   '</section></div></section>'+
  '<section class="slide" id="s2" aria-label="Results"><section class="results"><div class="card"><h3>Label quality</h3><div id="r-q"></div></div><div class="card"><h3>What the model learned</h3><div id="r-l"></div></div><div class="card"><h3>What went wrong</h3><div id="r-w"></div></div><div class="card"><h3>How to improve</h3><div id="r-i"></div></div><div class="card wide"><h3>Before and after</h3><div id="r-b" class="tw"></div></div></section>'+
  '<div class="endcta"><h2>Ready to improve it?</h2><p>Go back, fix your labels, and train again.</p><a class="btn primary" href="#lab" data-go="1">Back to the lab</a></div><footer class="site-foot"><p>Project Lab, a Datamaker simulator for the International Trade Centre-Kenya programme. Educational, not a real AI model.</p></footer></section></div>'+
  '<button class="pg prev" id="pgPrev" aria-label="Previous slide" hidden>‹</button><button class="pg next" id="pgNext" aria-label="Next slide">›</button><div class="dots-nav" id="dotsNav" role="tablist" aria-label="Slides"></div>';
}
var INTRO={
ppe:{does:'A construction-site camera checks every worker for protective equipment and raises an alert when something is missing.',task:'Draw boxes around each person, then around the head, chest, feet and each hand. Name what you see, including what is missing: Head = no helmet, Chest = no vest, Shoe = no boots, Hand = no gloves.',out:'The model learns to tell protected workers from unprotected ones. Wrong labels mean missed or false alerts.'},
graze:{does:'Field cameras at a ranch and wildlife conservancy count the animals, warn when a predator shows up and warn when a stranger walks in.',task:'Draw a box around every animal and choose its species. Box each lion, leopard or hyena as Predator and each person as Intruder. Skip rocks, bushes and the scarecrow.',out:'The model learns the herd count and the alerts. A skipped predator means no warning, and a boxed rock means a false count.'},
crop:{does:'A farm app looks at a leaf photo and tells the farmer what is wrong and what to spray.',task:'Draw a box around each leaf spot, rust patch and pest, and choose the right class. Skip dew drops and soil specks.',out:'The model learns to diagnose the leaf. Mixing up classes means the wrong spray advice.'},
coffee:{does:'An app measures how much of a coffee leaf is infected and suggests treatment.',task:'Click points around the edge of each rust patch, Cercospora spot and leaf miner trail to make a polygon. Close it with Enter or by clicking the first point.',out:'The model learns the exact shape and size of the damage. Loose outlines mean the wrong severity.'},
lane:{does:'A driver-assist system finds the painted lane lines on the road to keep the car in its lane.',task:'Click points along each painted line from the near end to the far end, and finish with Enter or a double-click. Pick the right line type. Skip shadows and tyre marks.',out:'The model learns where the lines are. Bad lines mean wrong lane warnings.'},
skin:{does:'A dermatology-support app finds skin patches on a face photo and names the condition.',task:'Paint every cell of the picture with a class: eyes, hair, background, skin, and the condition (eczema, psoriasis, acne, vitiligo or dark mole). Start with the big areas, then trace the patches.',out:'The model learns which pixels are which condition. A missed dark mole is the most dangerous mistake.'},
pose:{does:'An exercise-coaching app watches a person move and gives spoken advice on their form.',task:'Click the 14 body joints in order, from the head down to the feet. Drag a point to fix it. Watch for left and right: the red band is on the person’s left wrist.',out:'The model learns body positions, so the coach can judge the exercise. Swapped joints give wrong advice.'},
drive:{does:'A self-driving car uses its front camera to see cars, people, cyclists, traffic lights and signs, then decides when to brake, slow down or go.',task:'Draw a tight box around every car, pedestrian, bicycle, traffic light and traffic sign on the street, and choose the class. Then watch the car drive that same street.',out:'The car brakes only for what it learned to see. A missed pedestrian means a collision, a missed traffic light means a red light run, and a loose box makes it brake late.'},
churn:{does:'A coffee cooperative reads farmer messages to spot unhappy customers who might leave.',task:'For each message, tick the words that carry the feeling, choose Positive, Neutral or Negative, and choose the churn risk: Low, Medium or High. Treat a phrase like “not late” as one group.',out:'The model learns to flag customers at risk. Wrong labels mean missed warnings or wasted follow-ups.'}};
INTRO.g_road=INTRO.drive;
INTRO.g_warehouse={does:'A distribution centre uses a door camera to check that each worker wears a hard hat, vest and boots before they walk in.',task:'Draw a tight box around every worker and around each piece of safety gear they really wear, and choose the class. Then watch the safety gate check the workers.',out:'The gate checks only what it learned to see. A missed worker walks in unchecked, a missed vest raises a false alarm, and a loose box makes the check late.'};
INTRO.g_drone={does:'Rangers fly a drone over the savanna to count wildlife and spot predators and poachers.',task:'Draw a tight box around every animal and person and choose the right species. Then watch the drone fly the survey and count.',out:'The drone counts only what it learned to see. A missed lion or poacher means no alert, and a wrong species skews the count.'};
INTRO.g_crop={does:'A smallholder farm uses a scout app to diagnose maize leaves and choose a treatment.',task:'Draw a tight box around every leaf and choose its disease. Then watch the 21-day field test.',out:'A missed fast-spreading disease spreads through the field. A wrong label gets the wrong spray, and the plant is lost.'};
function introHtml(){var i=INTRO[P.id];if(!i)return '';var n=P.type==='text'?'messages':'scenes';
  return '<div class="howto"><div><b>What the system does</b><p>'+esc(i.does)+'</p></div><div><b>Your task</b><p>'+esc(i.task)+'</p></div><div><b>Why it matters</b><p>'+esc(i.out)+'</p></div></div><ol class="steps3"><li>Label the '+P.nTrain+' training '+n+' on the next slide.</li><li>Press <b>Run training</b> and watch the simulated model learn from your labels.</li><li>Check the results on new '+n+', fix your labels, and train again to improve.</li></ol>'}
function renderBrief(){
  $('brief').innerHTML='<div class="band-in"><a class="back" href="#/">← All projects</a><div class="br-head"><span class="pc-ic big" aria-hidden="true">'+P.icon+'</span><div><span class="pc-tag">'+P.tag+'</span><h2>'+esc(P.name)+'</h2></div></div>'+
  '<p class="lead dark">'+esc(P.client)+'</p>'+introHtml()+
  '<div class="br-grid"><div class="hbox"><h3>What you will label</h3><ul class="clslist">'+P.classes.map(function(c){return '<li><i style="background:'+c.color+'"></i><div><b>'+esc(c.name)+'</b><span>'+esc(c.help)+'</span></div></li>'}).join('')+'</ul></div>'+
  '<div class="hbox"><h3>Guideline</h3><ol class="glist">'+P.guide.map(function(g){return '<li>'+esc(g)+'</li>'}).join('')+'</ol></div>'+
  '<div class="hbox"><h3>Watch out for</h3><ul class="glist">'+P.traps.map(function(g){return '<li>'+esc(g)+'</li>'}).join('')+'</ul><p class="gigo"><b>Garbage in, garbage out.</b> '+esc(P.gigo)+'</p></div></div>'+
  '<div class="hero-ctas"><a class="btn primary" href="#lab" data-go="1">Start labelling</a>'+(P.source?'<a class="ghost" href="'+P.source+'" target="_blank" rel="noopener">Inspired by a Datamaker case study ↗</a>':'')+'</div></div>';
}
function renderFlow(){$('stepper').innerHTML=STAGES.map(function(n,i){return '<li class="'+(i===ST.stage?'active':i<ST.stage?'done':'')+'">'+n+'</li>'}).join('')}
// ---------- evaluation
function evalScene(sc,ann){switch(P.type){case 'seg':return evalSeg(sc,ann,P);case 'pose':return evalPose(sc,ann,P);case 'text':return evalText(sc,ann,P);default:return evalShapes(sc,ann,P,P.type)}}
function rushAnn(i){
  var k='r'+i;ST.rushC=ST.rushC||{};if(ST.rushC[k])return ST.rushC[k];var sc=sceneOf(i),r=RNG(555+i*31),out;
  if(P.type==='text'){out={kw:shuffle(r,sc.tokens.map(function(t,j){return isWord(t)?j:-1}).filter(function(j){return j>-1})).slice(0,2),sent:pick(r,['pos','neu','neg']),churn:pick(r,['low','med','high'])}}
  else if(P.type==='seg'){var g=Array.from(sc.grid);out=new Int8Array(g.length);for(var q=0;q<g.length;q++)out[q]=r()<.28?Math.floor(r()*10):g[q];for(var z=0;z<g.length;z++)if(g[z]>=5&&r()<.85)out[z]=3}
  else if(P.type==='pose'){out=predictPose(sc,{cls:{0:{q:.1,swap:.5},1:{q:.1,swap:.6},2:{q:.1,swap:.6}}},r)}
  else{var cls={};P.classes.forEach(function(c){var cf={};P.classes.forEach(function(o){if(o.id!==c.id)cf[o.id]=.25/(P.classes.length-1)*2});cls[c.id]={recall:.4,locq:.05,conf:cf,decRate:.9,fpPer:.8,q:.1}});out=predictShapes(sc,{cls:cls},r,P.type,P)}
  ST.rushC[k]=out;return out}
function effAnn(i){return ST.rushed&&RUSH.indexOf(i)>-1?rushAnn(i):ST.ann[i]}
function evalAll(){
  var evs=[],scs=[],anns=[];
  for(var i=0;i<P.nTrain;i++){var sc=sceneOf(i),a=effAnn(i);scs.push(sc);anns.push(a);evs.push(evalScene(sc,a))}
  var M=P.type==='seg'?learnSeg(evs,P):P.type==='pose'?learnPose(evs,P):P.type==='text'?learnText(evs,P,scs,anns):learnShapes(evs,P);
  var q=evs.reduce(function(a,e){return a+e.score},0)/evs.length,t=0;evs.forEach(function(e){if(e.touched)t++});
  return {evs:evs,M:M,q:q,touched:t};
}
function predictScene(j){
  var sc=sceneOf(P.nTrain+j),r=RNG(900+j*17+ST.runs.length*131+3),M=ST.model;
  if(P.type==='seg')return predictSeg(sc,M,r,P);if(P.type==='pose')return predictPose(sc,M,r);if(P.type==='text')return predictText(sc,M);
  return predictShapes(sc,M,r,P.type,P);
}
function statusOf(M,id){var m=M.cls[id];return m?m.s:'none'}
var STN={good:'Learned',weak:'Partly learned',none:'Not learned',bad:'Misread'};
// ---------- overlay drawing
function tag(x,y,text,col){var w=Math.max(18,text.length*6.2+8);return '<g class="tg"><rect x="'+f1(x)+'" y="'+f1(y-14)+'" width="'+f1(w)+'" height="14" rx="3" fill="'+col+'"/><text x="'+f1(x+4)+'" y="'+f1(y-3.5)+'" fill="#fff" font-size="10" font-weight="700">'+esc(text)+'</text></g>'}
function shortName(id){var c=P.classes.filter(function(x){return x.id===id})[0];return c?c.name:id}
function shapeSvg(a,col,o){
  o=o||{};var st='stroke="'+col+'" stroke-width="'+(o.w||2.5)+'"'+(o.dash?' stroke-dasharray="6 4"':'')+' fill="'+(o.nofill?'none':col)+'" fill-opacity="'+(o.fo==null?.13:o.fo)+'"';
  if(P.type==='box')return '<rect x="'+f1(a.x)+'" y="'+f1(a.y)+'" width="'+f1(a.w)+'" height="'+f1(a.h)+'" '+st+'/>'+(o.label?tag(a.x,a.y,o.label,col):'');
  if(P.type==='poly')return '<polygon points="'+pts2s(a.pts)+'" '+st+' stroke-linejoin="round"/>'+(o.label?tag(a.pts[0][0],a.pts[0][1],o.label,col):'');
  return '<polyline points="'+pts2s(a.pts)+'" fill="none" stroke="'+col+'" stroke-width="'+(o.w||4)+'"'+(o.dash?' stroke-dasharray="7 5"':'')+' stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>'+(a.pts.length?circ(a.pts[0][0],a.pts[0][1],4,col):'')+(o.label?tag(a.pts[0][0],a.pts[0][1],o.label,col):'');
}
function keySvg(sc){
  var s='';
  if(P.type==='seg'){var g=sc.grid;for(var c=0;c<SK_CLASSES.length;c++){var d='';for(var k=0;k<g.length;k++)if(g[k]===c){var x=(k%SK_COLS)*SK_CELL,y=((k/SK_COLS)|0)*SK_CELL;d+='M'+x+' '+y+'h'+SK_CELL+'v'+SK_CELL+'h-'+SK_CELL+'z'}s+='<path d="'+d+'" fill="'+SK_CLASSES[c].color+'" fill-opacity=".5"/>'}return s}
  if(P.type==='pose')return poseSvg({pts:sc.pts},sc,{key:true});
  sc.gt.forEach(function(g){s+=g.decoy?shapeSvg(g,'#dc2626',{dash:1,nofill:1,w:2,label:'✗ '+(g.why||'not one').slice(0,26)}):shapeSvg(g,CC[g.c],{dash:1,nofill:1,w:2.2,label:shortName(g.c)})});
  return s;
}
function poseSvg(ann,sc,o){
  o=o||{};var pts=ann.pts||[],s='',col=o.key?'#16a34a':null,GC=['#2563eb','#16a34a','#d97706'];
  BONES.forEach(function(b){var p=pts[b[0]],q=pts[b[1]];if(p&&q)s+='<line x1="'+f1(p[0])+'" y1="'+f1(p[1])+'" x2="'+f1(q[0])+'" y2="'+f1(q[1])+'" stroke="'+(col||o.bone||'#64748b')+'" stroke-width="3" stroke-linecap="round"'+(o.key?' stroke-dasharray="6 4"':'')+' opacity=".9"/>'});
  pts.forEach(function(p,j){if(!p)return;var c=col||(o.err?(o.err[j]<.15?'#16a34a':o.err[j]<.35?'#d97706':'#dc2626'):GC[JG[j]]);
    s+='<circle cx="'+f1(p[0])+'" cy="'+f1(p[1])+'" r="'+(o.key?5:7)+'" fill="'+c+'" stroke="#fff" stroke-width="2"/>'+(o.num?'<text x="'+f1(p[0]+9)+'" y="'+f1(p[1]-7)+'" font-size="10" font-weight="700" fill="#0f172a" stroke="#fff" stroke-width="3" paint-order="stroke">'+(o.key?JN[j]:(j+1))+'</text>':'')});
  return s;
}
function segSvg(grid,o){
  o=o||{};var s='';for(var c=0;c<SK_CLASSES.length;c++){var d='';for(var k=0;k<grid.length;k++)if(grid[k]===c){var x=(k%SK_COLS)*SK_CELL,y=((k/SK_COLS)|0)*SK_CELL;d+='M'+x+' '+y+'h'+SK_CELL+'v'+SK_CELL+'h-'+SK_CELL+'z'}if(d)s+='<path d="'+d+'" fill="'+SK_CLASSES[c].color+'" fill-opacity="'+(o.op||.5)+'"/>'}
  if(o.truth){var d2='';for(var k2=0;k2<grid.length;k2++)if(grid[k2]!==o.truth[k2]&&grid[k2]>=0){var x2=(k2%SK_COLS)*SK_CELL,y2=((k2/SK_COLS)|0)*SK_CELL;d2+='M'+x2+' '+y2+'h'+SK_CELL+'v'+SK_CELL+'h-'+SK_CELL+'z'}if(d2)s+='<path d="'+d2+'" fill="#dc2626" fill-opacity=".28" stroke="#dc2626" stroke-width="1" stroke-opacity=".7"/>'}
  if(o.unl){var d3='';for(var k3=0;k3<grid.length;k3++)if(grid[k3]<0){var x3=(k3%SK_COLS)*SK_CELL,y3=((k3/SK_COLS)|0)*SK_CELL;d3+='M'+x3+' '+y3+'h'+SK_CELL+'v'+SK_CELL+'h-'+SK_CELL+'z'}s+='<path d="'+d3+'" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>'}
  return s;
}
function editOverlay(sc,ann){
  var s='';
  if(ST.showKey)s+=keySvg(sc);
  if(P.type==='seg'){if(!ST.showKey)s+=segSvg(ann,{unl:1,op:.55});return s}
  if(P.type==='pose'){return s+poseSvg(ann,sc,{num:1})}
  var res=evalScene(sc,ann);
  ann.forEach(function(a,k){var col=CC[a.c],sel=k===ST.sel,kd=ST.showKey&&res.kind[k]?res.kind[k].k:'';
    s+=shapeSvg(a,ST.showKey?(kd==='ok'?'#16a34a':kd==='loose'?'#d97706':'#dc2626'):col,{label:shortName(a.c),w:sel?3.6:2.6});
    if(sel){if(P.type==='box')[[a.x,a.y],[a.x+a.w,a.y],[a.x,a.y+a.h],[a.x+a.w,a.y+a.h]].forEach(function(p){s+=circ(p[0],p[1],6,'#fff',{stroke:col,'stroke-width':2.4})});else a.pts.forEach(function(p){s+=circ(p[0],p[1],4.5,'#fff',{stroke:col,'stroke-width':2})})}});
  var d=ST.draft;if(d){var col2=CC[d.c];
    if(P.type==='box'&&d.w!=null)s+='<rect x="'+f1(d.x)+'" y="'+f1(d.y)+'" width="'+f1(d.w)+'" height="'+f1(d.h)+'" fill="'+col2+'" fill-opacity=".1" stroke="'+col2+'" stroke-width="2.4" stroke-dasharray="5 4"/>';
    else if(d.pts){var pp=d.pts.concat(ST.hoverP?[ST.hoverP]:[]);s+='<polyline points="'+pts2s(pp)+'" fill="'+(P.type==='poly'?col2:'none')+'" fill-opacity=".1" stroke="'+col2+'" stroke-width="3" stroke-dasharray="5 4" stroke-linejoin="round"/>';d.pts.forEach(function(p,k){s+=circ(p[0],p[1],k===0&&P.type==='poly'?6:4,k===0?'#fff':col2,{stroke:col2,'stroke-width':2})})}}
  return s;
}
function simOverlay(sc,ann,res,truth){
  var s='';
  if(truth&&P.type!=='seg'&&P.type!=='pose')sc.gt.forEach(function(g){s+=shapeSvg(g,g.decoy?'#dc2626':'#475569',{dash:1,nofill:1,w:1.6})});
  if(P.type==='seg'){return segSvg(ann,{truth:sc.grid,op:.5})+(truth?'':'')}
  if(P.type==='pose'){var s2='';if(truth)s2+=poseSvg({pts:sc.pts},sc,{key:true});return s2+poseSvg(ann,sc,{err:res.errs.map(function(e){return e==null?1:e})})}
  res.missed.forEach(function(g){s+=shapeSvg(g,'#64748b',{dash:1,nofill:1,w:2.2,label:'✗ missed'})});
  ann.forEach(function(a,k){var kd=res.kind[k].k||'ok';s+=shapeSvg(a,KC[kd],{label:shortName(a.c),dash:(kd==='extra'||kd==='decoy'),w:3})});
  return s;
}
// ---------- label panel
function svgOf(sc,id,u,vbH){return '<svg id="'+id+'" class="cv" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Training scene"><g class="art">'+sc.art.replace(/@U/g,u)+'</g><g class="ov"></g></svg>'}
function renderLabel(){
  var sc=sceneOf(ST.idx),ann=ST.ann[ST.idx],text=P.type==='text';
  // chips
  $('chips').innerHTML=Array.apply(null,Array(P.nTrain)).map(function(_,i){var a=ST.ann[i],touched=isTouched(a),c='cls';if(touched){c+=' d';if(ST.showKey){c=evalScene(sceneOf(i),a).score>=.75?'cls ok':'cls no'}}if(i===ST.idx)c+=' on';return '<button class="'+c+'" data-i="'+i+'" aria-label="'+(text?'Message ':'Scene ')+(i+1)+'"><i></i>'+(i+1)+'</button>'}).join('');
  Array.prototype.forEach.call($('chips').children,function(b){b.onclick=function(){setIdx(+b.dataset.i)}});
  var n=0;ST.ann.forEach(function(a){if(isTouched(a))n++});$('cnt').textContent=n+' / '+P.nTrain;$('bar').style.width=(n/P.nTrain*100)+'%';
  $('guide').innerHTML=P.guide.map(function(g){return '<li>'+esc(g)+'</li>'}).join('');
  renderTools();
  if(text){renderTextLabel();renderToolbar();return}
  var cv=$('canvas');
  if(ST.artIdx!==ST.idx||!cv.firstChild){cv.innerHTML=svgOf(sc,'cv','L');ST.artIdx=ST.idx;wireCanvas()}
  cv.querySelector('.ov').innerHTML=editOverlay(sc,ann);
  scoreLine();renderToolbar();
}
function isTouched(a){if(P.type==='seg'){for(var i=0;i<a.length;i++)if(a[i]>=0)return true;return false}if(P.type==='pose')return a.pts.some(function(p){return !!p});if(P.type==='text')return !!(a.sent||a.churn||a.kw.length);return a.length>0}
function setIdx(i){ST.idx=i;ST.sel=-1;ST.draft=null;ST.undo=[];renderLabel();sSave()}
function renderTools(){
  var h='',T=P.type;
  if(T==='pose'){var a=ST.ann[ST.idx],nx=a.pts.filter(function(p){return !!p}).length;h='<div class="nextjoint" id="nextj">'+(nx<14?'Next joint: <b>'+JN[a.pts.findIndex(function(p){return !p})<0?nx:a.pts.findIndex(function(p){return !p})]+'</b> ('+(nx+1)+' of 14)':'All 14 points placed. Drag a point to adjust it.')+'</div>'}
  else if(T==='text'){h=''}
  else{
    h='<div class="palette" role="group" aria-label="Class">'+P.classes.map(function(c,k){return '<button type="button" class="pal'+(ST.cls===c.id&&ST.tool!=='erase'?' on':'')+'" data-c="'+c.id+'" style="--c:'+c.color+'" title="'+esc(c.help)+'"><i></i>'+esc(c.name)+'<kbd>'+(k+1)+'</kbd></button>'}).join('')+'</div>';
    if(T==='seg')h+='<div class="segtools"><button type="button" class="ghost'+(ST.tool==='erase'?' on':'')+'" id="eraser" aria-pressed="'+(ST.tool==='erase')+'">Eraser</button><label class="brushlbl">Brush <input type="range" id="brush" min="1" max="3" value="'+ST.brush+'" aria-label="Brush size"></label><button type="button" class="ghost" id="fillrest" title="Give every empty cell the selected class">Fill empty cells</button><button type="button" class="ghost" id="prelabel" title="A helper model paints the big areas. You fix the lesion.">Pre-label with helper</button></div>';
    else h+='<div class="hintline">'+(T==='box'?'Drag on the picture to draw a box. Click a box to select it.':T==='poly'?'Click points around the edge. Click the first point or press Enter to close.':'Click points along the line. Press Enter or double-click to finish.')+'</div>';
  }
  $('tools').innerHTML=h;
  Array.prototype.forEach.call($('tools').querySelectorAll('.pal'),function(b){b.onclick=function(){setCls(b.dataset.c)}});
  var er=$('eraser');if(er)er.onclick=function(){ST.tool=ST.tool==='erase'?'draw':'erase';renderTools()};
  var br=$('brush');if(br)br.oninput=function(){ST.brush=+br.value};
  var fr=$('fillrest');if(fr)fr.onclick=function(){pushUndo();var a=ST.ann[ST.idx],id=+ST.cls;for(var i=0;i<a.length;i++)if(a[i]<0)a[i]=id;afterEdit()};
  var pl=$('prelabel');if(pl)pl.onclick=prelabel;
}
function setCls(id){ST.cls=id;ST.tool='draw';if(ST.sel>-1&&(P.type==='box'||P.type==='poly'||P.type==='line')){pushUndo();ST.ann[ST.idx][ST.sel].c=id;afterEdit()}else renderTools()}
function renderToolbar(){
  var T=P.type,h='';
  if(T==='text'){h='<button class="ghost" id="prev">← Previous</button><button class="ghost" id="next">Next →</button><button class="ghost" id="clearOne">Clear message</button><span class="spacer"></span><button class="ghost" id="keyBtn" aria-pressed="'+ST.showKey+'">'+(ST.showKey?'Hide answer key ▾':'Show answer key ▸')+'</button><button class="primary" id="run">Run training</button>'}
  else h='<button class="ghost" id="prev">← Previous</button><button class="ghost" id="next">Next →</button><button class="ghost" id="undo">Undo</button>'+(T==='box'||T==='poly'||T==='line'?'<button class="ghost" id="del">Delete selected</button>':'')+'<button class="ghost" id="clearOne">Clear scene</button><span class="spacer"></span><button class="ghost" id="keyBtn" aria-pressed="'+ST.showKey+'">'+(ST.showKey?'Hide answer key ▾':'Show answer key ▸')+'</button><button class="primary" id="run">Run training</button>';
  $('tb').innerHTML=h;
  $('prev').onclick=function(){if(ST.idx>0)setIdx(ST.idx-1)};$('next').onclick=function(){if(ST.idx<P.nTrain-1)setIdx(ST.idx+1)};
  $('prev').disabled=ST.idx===0;$('next').disabled=ST.idx===P.nTrain-1;
  var u=$('undo');if(u)u.onclick=undo;var d=$('del');if(d)d.onclick=delSel;
  $('clearOne').onclick=function(){pushUndo();ST.ann[ST.idx]=emptyAnn();ST.sel=-1;afterEdit()};
  $('keyBtn').onclick=function(){ST.showKey=!ST.showKey;renderLabel()};
  $('run').onclick=train;$('run').disabled=ST.anim;
}
function pushUndo(){ST.undo.push(clone(ST.ann[ST.idx]));if(ST.undo.length>40)ST.undo.shift()}
function undo(){if(!ST.undo.length)return;ST.ann[ST.idx]=ST.undo.pop();ST.sel=-1;ST.draft=null;afterEdit()}
function delSel(){if(ST.sel<0)return;pushUndo();ST.ann[ST.idx].splice(ST.sel,1);ST.sel=-1;afterEdit()}
function afterEdit(){sSave();renderLabel();renderSim()}
function scoreLine(){
  var sc=sceneOf(ST.idx),a=ST.ann[ST.idx],el=$('scoreline');
  if(!isTouched(a)){el.innerHTML='<span class="em">'+(P.type==='seg'?'Paint cells to build your mask.':P.type==='pose'?'Click the joints to place them.':'Nothing labelled yet in this scene.')+'</span>';return}
  var r=evalScene(sc,a),b=r.score>=.75?'ok':r.score>=.4?'warn':'bad',t='';
  if(P.type==='seg')t=' · painted '+Math.round(r.painted*100)+'% of cells';
  else if(P.type==='pose')t=' · '+r.placed+' of 14 points'+(r.swaps?' · '+r.swaps+' swapped':'');
  else t=' · found '+r.found+' of '+r.total+(r.extras?' · extras '+r.extras:'')+(r.kind.filter(function(m){return m.k==='loose'}).length?' · loose '+r.kind.filter(function(m){return m.k==='loose'}).length:'')+(r.kind.filter(function(m){return m.k==='wrong'}).length?' · wrong class '+r.kind.filter(function(m){return m.k==='wrong'}).length:'');
  el.innerHTML='<b class="sc '+b+'">Scene score '+Math.round(r.score*100)+'%</b>'+t;
}
// ---------- input: shapes, seg, pose
function svgPt(e){var s=$('cv'),m=s.getScreenCTM();if(!m)return[0,0];var p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;var q=p.matrixTransform(m.inverse());return[cl(q.x,0,640),cl(q.y,0,400)]}
function inPoly(p,pts){var c=false;for(var i=0,j=pts.length-1;i<pts.length;j=i++){var a=pts[i],b=pts[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function hitShape(p){var a=ST.ann[ST.idx];for(var k=a.length-1;k>=0;k--){var s=a[k];
  if(P.type==='box'&&p[0]>=s.x&&p[0]<=s.x+s.w&&p[1]>=s.y&&p[1]<=s.y+s.h)return k;
  if(P.type==='poly'&&inPoly(p,s.pts))return k;
  if(P.type==='line'&&distToLine(p,s.pts)<9)return k}return -1}
function paintAt(p){
  var a=ST.ann[ST.idx],id=ST.tool==='erase'?-1:+ST.cls,cx=Math.floor(p[0]/SK_CELL),cy=Math.floor(p[1]/SK_CELL),b=ST.brush,r=b===1?0:b===2?.8:1.6;
  for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++){if(Math.hypot(dx,dy)>r+.01)continue;var x=cx+dx,y=cy+dy;if(x<0||y<0||x>=SK_COLS||y>=SK_ROWS)continue;a[y*SK_COLS+x]=id}
}
function prelabel(){
  pushUndo();var sc=sceneOf(ST.idx),a=ST.ann[ST.idx],r=RNG(31+ST.idx*7),g=sc.grid,C=SK_COLS,R=SK_ROWS;
  for(var k=0;k<g.length;k++){var x=k%C,y=(k/C)|0,gc=g[k],v=gc>=5?3:gc,nb=[x>0?g[k-1]:gc,x<C-1?g[k+1]:gc,y>0?g[k-C]:gc,y<R-1?g[k+C]:gc].filter(function(z){return z!==gc});
    if(nb.length&&r()<.3){v=nb[Math.floor(r()*nb.length)];if(v>=5)v=3};a[k]=v}
  toast('The helper painted the big areas. Now name and trace the disease patches.');afterEdit();
}
function wireCanvas(){
  var cv=$('cv'),T=P.type;
  cv.style.touchAction='none';
  function ov(){cv.querySelector('.ov').innerHTML=editOverlay(sceneOf(ST.idx),ST.ann[ST.idx])}
  function finishShape(){var d=ST.draft;if(!d||!d.pts)return;var min=P.type==='poly'?3:2;if(d.pts.length>=min){pushUndo();ST.ann[ST.idx].push({c:d.c,pts:d.pts.slice()});ST.sel=ST.ann[ST.idx].length-1}ST.draft=null;afterEdit()}
  window.finishShape=finishShape;
  cv.addEventListener('pointerdown',function(e){
    if(e.button!==0)return;var p=svgPt(e);cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);
    if(T==='seg'){pushUndo();ST.drag={seg:1};paintAt(p);ov();scoreLine();return}
    if(T==='pose'){var a=ST.ann[ST.idx];var sc=sceneOf(ST.idx);
      for(var j=0;j<14;j++)if(a.pts[j]&&dist(a.pts[j],p)<16){pushUndo();ST.drag={pose:j};return}
      var nx=a.pts.findIndex(function(q){return !q});if(nx<0&&a.pts.length>=14)return;if(nx<0)nx=a.pts.length;pushUndo();a.pts[nx]=p;afterEdit();return}
    if(T==='box'){
      var s=ST.sel>-1?ST.ann[ST.idx][ST.sel]:null;
      if(s){var cs=[[s.x,s.y,'tl'],[s.x+s.w,s.y,'tr'],[s.x,s.y+s.h,'bl'],[s.x+s.w,s.y+s.h,'br']];for(var k=0;k<4;k++)if(dist(cs[k],p)<12){pushUndo();ST.drag={resize:cs[k][2]};return}}
      ST.drag={x0:p[0],y0:p[1],moved:false};ST.draft={c:ST.cls,x:p[0],y:p[1],w:0,h:0};return}
    if(!e.shiftKey&&!ST.draft){var hit=hitShape(p);if(hit>-1){ST.sel=hit;afterEdit();return}}
    ST.sel=-1;
    if(!ST.draft)ST.draft={c:ST.cls,pts:[]};
    var d=ST.draft;
    if(T==='poly'&&d.pts.length>=3&&dist(p,d.pts[0])<12){finishShape();return}
    d.pts.push(p);ov();
  });
  cv.addEventListener('pointermove',function(e){
    var p=svgPt(e),dr=ST.drag;
    if(dr&&dr.seg){paintAt(p);ov();return}
    if(dr&&dr.pose!=null){ST.ann[ST.idx].pts[dr.pose]=p;ov();return}
    if(dr&&dr.resize){var s=ST.ann[ST.idx][ST.sel],r=dr.resize,x1=s.x+s.w,y1=s.y+s.h;if(r[1]==='l'){s.x=Math.min(p[0],x1-6);s.w=x1-s.x}else s.w=Math.max(6,p[0]-s.x);if(r[0]==='t'){s.y=Math.min(p[1],y1-6);s.h=y1-s.y}else s.h=Math.max(6,p[1]-s.y);ov();return}
    if(dr&&dr.x0!=null&&ST.draft){var d=ST.draft;d.x=Math.min(dr.x0,p[0]);d.y=Math.min(dr.y0,p[1]);d.w=Math.abs(p[0]-dr.x0);d.h=Math.abs(p[1]-dr.y0);if(d.w>3||d.h>3)dr.moved=true;ov();return}
    if(ST.draft&&ST.draft.pts){ST.hoverP=p;ov()}
  });
  function up(e){var dr=ST.drag;ST.drag=null;if(!dr)return;
    if(dr.seg){afterEdit();return}
    if(dr.pose!=null||dr.resize){afterEdit();return}
    if(dr.x0!=null){var d=ST.draft;ST.draft=null;
      if(d&&d.w>8&&d.h>8){pushUndo();ST.ann[ST.idx].push({c:d.c,x:d.x,y:d.y,w:d.w,h:d.h});ST.sel=ST.ann[ST.idx].length-1}
      else if(!dr.moved){var hit=hitShape(svgPt(e));ST.sel=hit}
      afterEdit()}}
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('dblclick',function(e){if(ST.draft&&ST.draft.pts){if(ST.draft.pts.length>1)ST.draft.pts.pop();finishShape()}});
}
document.addEventListener('keydown',function(e){
  if(!P||!ST||$('projView').hidden)return;if(e.target.closest&&e.target.closest('input,textarea,select'))return;
  var k=e.key;
  if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='z'){e.preventDefault();undo();return}
  if(cur!==1){if(k==='ArrowLeft')goTo(cur-1);else if(k==='ArrowRight')goTo(cur+1);return}
  if(k==='Enter'&&ST.draft&&ST.draft.pts&&window.finishShape){e.preventDefault();window.finishShape();return}
  if(k==='Escape'&&ST.draft){ST.draft=null;ST.sel=-1;renderLabel();return}
  if((k==='Delete'||k==='Backspace')&&P.type!=='text'){e.preventDefault();if(P.type==='pose')undo();else delSel();return}
  if(/^[1-9]$/.test(k)&&P.type!=='pose'&&P.type!=='text'){var c=P.classes[+k-1];if(c)setCls(c.id)}
});
// ---------- text labelling
function renderTextLabel(){
  var sc=sceneOf(ST.idx),a=ST.ann[ST.idx],key=ST.showKey,gtset={};sc.gt.kw.forEach(function(k){gtset[k]=1});
  var tok=sc.tokens.map(function(t,i){if(!isWord(t))return '<span class="pun">'+esc(t)+'</span>';var on=a.kw.indexOf(i)>-1,c='tok'+(on?' on':'')+(key&&gtset[i]?' kg':'')+(key&&on&&!gtset[i]?' kx':'');return '<button type="button" class="'+c+'" data-k="'+i+'" aria-pressed="'+on+'">'+esc(t)+'</button>'}).join(' ');
  function radios(list,val,name,gt){return list.map(function(s){return '<button type="button" class="rd'+(val===s.id?' on':'')+(key&&gt===s.id?' kg':'')+'" data-n="'+name+'" data-v="'+s.id+'" style="--c:'+s.color+'" aria-pressed="'+(val===s.id)+'"><i></i>'+s.name+'</button>'}).join('')}
  $('canvas').innerHTML='<div class="msgcard"><div class="msg-who">Message '+(ST.idx+1)+' of '+P.nTrain+' · '+esc(sc.who)+'</div><p class="msg-t">'+tok+'</p>'+(key&&sc.trap?'<p class="msg-trap">Tip: '+esc(sc.trap)+'</p>':'')+
   '<div class="msg-q"><b>1. Tick the words that carry the feeling</b><span class="note">Tick a phrase like “not late” as one group.</span></div>'+
   '<div class="msg-q"><b>2. Overall sentiment</b><div class="rds">'+radios(SENT,a.sent,'sent',sc.gt.sent)+'</div></div>'+
   '<div class="msg-q"><b>3. Churn risk</b><div class="rds">'+radios(CHURN,a.churn,'churn',sc.gt.churn)+'</div></div></div>';
  Array.prototype.forEach.call($('canvas').querySelectorAll('.tok'),function(b){b.onclick=function(){pushUndo();var k=+b.dataset.k,j=a.kw.indexOf(k);if(j>-1)a.kw.splice(j,1);else a.kw.push(k);afterEdit()}});
  Array.prototype.forEach.call($('canvas').querySelectorAll('.rd'),function(b){b.onclick=function(){pushUndo();a[b.dataset.n]=a[b.dataset.n]===b.dataset.v?'':b.dataset.v;afterEdit()}});
  var el=$('scoreline');if(!isTouched(a)){el.innerHTML='<span class="em">Nothing labelled yet in this message.</span>';return}
  var r=evalText(sc,a,P),b2=r.score>=.75?'ok':r.score>=.4?'warn':'bad';el.innerHTML='<b class="sc '+b2+'">Message score '+Math.round(r.score*100)+'%</b> · keywords '+Math.round(r.kw*100)+'% · sentiment '+(r.sOk?'✓':'✗')+' · churn '+(r.ch===1?'✓':r.ch?'close':'✗');
}
// ---------- simulator
function renderSim(o){
  o=o||{};
  var text=P.type==='text',tabs=$('simtabs');
  tabs.innerHTML=['train','test'].map(function(s){return '<button type="button" role="tab" class="'+(ST.sim.set===s?'on':'')+'" data-s="'+s+'" aria-selected="'+(ST.sim.set===s)+'">'+(s==='train'?'Your '+(text?'messages':'scenes'):'New '+(text?'messages':'scenes'))+'</button>'}).join('');
  Array.prototype.forEach.call(tabs.children,function(b){b.onclick=function(){ST.sim.set=b.dataset.s;ST.sim.i=0;renderSim()}});
  var n=ST.sim.set==='train'?P.nTrain:P.nTest;
  $('schips').innerHTML=Array.apply(null,Array(n)).map(function(_,i){return '<button class="cls'+(i===ST.sim.i?' on':'')+'" data-i="'+i+'"><i></i>'+(ST.sim.set==='train'?(i+1):String.fromCharCode(65+i))+'</button>'}).join('')+'<button class="ghost tr" id="truthBtn" aria-pressed="'+ST.sim.truth+'">'+(ST.sim.truth?'Hide truth':'Show truth')+'</button>';
  Array.prototype.forEach.call($('schips').querySelectorAll('.cls'),function(b){b.onclick=function(){ST.sim.i=+b.dataset.i;renderSim()}});
  $('truthBtn').onclick=function(){ST.sim.truth=!ST.sim.truth;renderSim({keep:1})};
  $('repTitle').textContent=P.reportTitle;
  var box=$('simview');
  if(!ST.trained){
    var idx=ST.sim.set==='train'?ST.sim.i:P.nTrain+ST.sim.i,sc0=sceneOf(idx);
    if(text){box.innerHTML='<div class="msgcard idle"><div class="msg-who">'+esc(sc0.who)+'</div><p class="msg-t">'+esc(sc0.text)+'</p><p class="note">The model has not been trained yet. Label some messages and press Run training.</p></div>'}
    else box.innerHTML=svgOf(sc0,'sv','R')+'<div class="idle-veil">Not trained yet. Label some scenes, then press Run training.</div>';
    PL.on=false;cancelAnimationFrame(PL.raf);clearTimeout(PL.doneTimer);if($('plctl')){$('plctl').hidden=true;$('plctl').innerHTML=''}
    $('simmeta').innerHTML='';$('report').innerHTML='<li class="idle">The simulated model has not learned anything yet.</li>';return}
  var j=ST.sim.i,isTrain=ST.sim.set==='train',sc=sceneOf(isTrain?j:P.nTrain+j),ann=isTrain?effAnn(j):ST.pred[j];
  var res=evalScene(sc,ann),rep=REP[P.id](sc,P.type==='seg'?ann:P.type==='text'?ann:ann,P);
  plStart({sc:sc,ann:ann,res:res,rep:rep,mode:o.keep&&PL.sc===sc?'keep':'play'});
  var b=res.score>=.75?'ok':res.score>=.4?'warn':'bad';
  $('simmeta').innerHTML='<b class="sc '+b+'">'+(isTrain?'Model copies your labels':'Model on a new '+(text?'message':'scene'))+': '+Math.round(res.score*100)+'%</b>'+(isTrain?' · it repeats what you taught it, mistakes included':' · it has never seen this one');
}
// ---------- training
function logLine(t,c){var l=$('log'),li=document.createElement('li');li.textContent=t;if(c)li.className=c;l.appendChild(li);l.scrollTop=l.scrollHeight}
function train(){
  var E=evalAll();if(E.touched===0){toast('Label at least one '+(P.type==='text'?'message':'scene')+' first.');return}
  ST.anim=true;ST.stage=1;renderFlow();$('run').disabled=true;$('fix').disabled=true;ST.trained=false;
  $('log').innerHTML='';logLine('Run '+(ST.runs.length+1)+': '+E.touched+' of '+P.nTrain+' '+(P.type==='text'?'messages':'scenes')+' labelled'+(ST.rushed?', rushed test on':''));logLine('Checking labels against the guideline');
  var t0=null,dur=4200/ST.speed,last=-1;cancelAnimationFrame(ST.raf);
  function frame(ts){if(!t0)t0=ts;var u=Math.min(1,(ts-t0)/dur);$('tbar').style.width=(u*100)+'%';$('stepno').textContent='Training: step '+Math.round(u*200)+' / 200';
    var st=Math.round(u*5)*40;if(st!==last){last=st;logLine('Step '+st+': learning from your labels, quality so far '+Math.round(E.q*(1-Math.exp(-4.5*st/200))*100)+'%')}
    if(u>.15&&ST.stage<2){ST.stage=2;renderFlow()}
    if(u<1)ST.raf=requestAnimationFrame(frame);else finishTrain(E)}
  ST.raf=requestAnimationFrame(frame);
}
function finishTrain(E){
  ST.anim=false;ST.model=E.M;ST.trained=true;ST.pred={};ST.stage=3;renderFlow();$('run').disabled=false;$('fix').disabled=false;
  var scs=0,bad=0;for(var j=0;j<P.nTest;j++){ST.pred[j]=predictScene(j);var sc=sceneOf(P.nTrain+j),res=evalScene(sc,ST.pred[j]);scs+=res.score;bad+=REP[P.id](sc,ST.pred[j],P).bad?1:0}
  var run={q:E.q,s:scs/P.nTest,bad:bad,rushed:ST.rushed,touched:E.touched};ST.runs.push(run);
  try{var b=JSON.parse(localStorage.getItem('llp_best')||'{}'),v=Math.round(run.s*100);if(b[P.id]==null||v>b[P.id])b[P.id]=v;localStorage.setItem('llp_best',JSON.stringify(b))}catch(e){}
  if(P.scn){ST.sim.set='train';ST.sim.i=Math.min(ST.idx||0,P.nTrain-1)}else{ST.sim.set='test';ST.sim.i=0}
  $('tbar').style.width='100%';$('stepno').textContent='Training complete';
  logLine('Done. Model score on new '+(P.type==='text'?'messages':'scenes')+' '+Math.round(run.s*100)+'%','ok');
  sSave();renderSim();renderResults();
  if(ST.runs.length>1&&run.s>ST.runs[0].s){ST.stage=5;renderFlow()}
}
// ---------- results
function band(v){return v>=.75?['Strong','#16a34a']:v>=.45?['Fair','#d97706']:['Weak','#dc2626']}
function renderResults(){
  if(!$('r-q'))return;var E=evalAll(),b=band(E.q),M=E.M;
  var last=ST.runs[ST.runs.length-1];
  $('r-q').innerHTML='<div class="score-top"><span class="big">'+Math.round(E.q*100)+'%</span><span class="band" style="background:'+b[1]+'">'+b[0]+'</span></div><ul class="metrics"><li>'+(P.type==='text'?'Messages':'Scenes')+' worked on<b>'+E.touched+' / '+P.nTrain+'</b></li><li>Model score on new '+(P.type==='text'?'messages':'scenes')+'<b>'+(last?Math.round(last.s*100)+'%':'run training')+'</b></li><li>System mistakes on new '+(P.type==='text'?'messages':'scenes')+'<b>'+(last?last.bad+' of '+P.nTest:'–')+'</b></li></ul>';
  $('r-l').innerHTML='<ul class="detect">'+P.classes.map(function(c){var m=M.cls[c.id]||{q:0,s:'none'};return '<li class="det-row"><span><b>'+esc(c.name)+'</b> <span class="cs">'+Math.round(m.q*100)+'% avg</span></span><span class="chip wide '+m.s+'">'+STN[m.s]+'</span></li>'}).join('')+'</ul>';
  var notes=[];E.evs.forEach(function(e,i){e.notes.forEach(function(n){notes.push({i:i,n:n})})});
  var order={decoy:0,wrong:1,extra:2,miss:3,loose:4};notes.sort(function(a,c){return order[a.n.k]-order[c.n.k]});
  var un=P.nTrain-E.touched,h='';
  notes.slice(0,8).forEach(function(x){h+='<li class="'+(x.n.k==='decoy'||x.n.k==='wrong'?'crit':'')+'"><strong>'+(P.type==='text'?'Message ':'Scene ')+(x.i+1)+'</strong>'+esc(x.n.t)+'</li>'});
  if(notes.length>8)h+='<li><strong>And more</strong>'+(notes.length-8)+' more issues. Turn on the answer key in the lab to see them.</li>';
  if(un)h+='<li><strong>Gaps</strong>'+un+' '+(P.type==='text'?'message':'scene')+(un>1?'s have':' has')+' nothing labelled, so the model learns nothing there.</li>';
  $('r-w').innerHTML=h?'<ul class="why">'+h+'</ul>':'<ul class="why"><li class="allgood"><strong>Nothing wrong so far</strong>Every label matches the guideline.</li></ul>';
  var tips=[];P.classes.forEach(function(c){var m=M.cls[c.id];if(!m||m.s==='good')return;tips.push('<li><b>'+esc(c.name)+':</b> '+esc(P.tips[c.id]||'Review this class against the guideline.')+'</li>')});
  if(ST.rushed)tips.push('<li><b>Quality checks:</b> rushed labels hurt the model. In production a second reviewer checks a sample of every batch.</li>');
  if(!tips.length)tips.push('<li>Every class is learned. Turn on the rushed labeller test to see how fast quality falls.</li>');
  $('r-i').innerHTML='<ol class="fix">'+tips.join('')+'</ol>';
  if(!ST.runs.length){$('r-b').innerHTML='<p class="empty">Run training, fix your labels, then run again to compare.</p>';return}
  var f=ST.runs[0];function cell(v,b0,i){var d=Math.round((v-b0)*100);return '<td'+(i?' class="'+(d>0?'better':d<0?'worse':'')+'"':'')+'>'+Math.round(v*100)+'%'+(i&&d?' ('+(d>0?'+':'')+d+')':'')+'</td>'}
  $('r-b').innerHTML='<table class="compare"><thead><tr><th></th><th>Label quality</th><th>Score on new</th><th>System mistakes</th><th>Mode</th></tr></thead><tbody>'+ST.runs.map(function(r,i){return '<tr><th>Run '+(i+1)+'</th>'+cell(r.q,f.q,i)+cell(r.s,f.s,i)+'<td>'+r.bad+' of '+P.nTest+'</td><td>'+(r.rushed?'Rushed test':'Normal')+'</td></tr>'}).join('')+'</tbody></table>'+(ST.runs.length>1?'<p class="sum">'+(ST.runs[ST.runs.length-1].s>f.s?'Better labels gave a better model.':ST.runs[ST.runs.length-1].s<f.s?'The new labels made the model worse.':'No change in model score.')+'</p>':'');
}
// ---------- wiring and navigation
var DECK=null,cur=0;
function goTo(i,instant){i=Math.max(0,Math.min(2,i));DECK=$('deck');if(!DECK)return;DECK.scrollTo({left:i*DECK.clientWidth,behavior:instant?'auto':'smooth'});setCur(i)}
function setCur(i){cur=i;var d=$('dotsNav');if(!d)return;Array.prototype.forEach.call(d.children,function(b,k){b.setAttribute('aria-selected',k===i)});$('pgPrev').hidden=i===0;$('pgNext').hidden=i===2}
function wireProject(){
  var d=$('dotsNav');d.innerHTML=['Brief','Label and simulate','Results'].map(function(n,i){return '<button type="button" role="tab" aria-label="'+n+'" data-go="'+i+'"></button>'}).join('');
  $('deck').addEventListener('scroll',function(){var i=Math.round($('deck').scrollLeft/$('deck').clientWidth);if(i!==cur)setCur(i)},{passive:true});
  $('pgPrev').onclick=function(){goTo(cur-1)};$('pgNext').onclick=function(){goTo(cur+1)};
  $('rushed').onchange=function(){ST.rushed=$('rushed').checked;renderLabel();renderSim();renderResults()};
  $('speed').onclick=function(){ST.speed=ST.speed===1?2:ST.speed===2?.5:1;$('speed').textContent='Speed '+(ST.speed===.5?'0.5':ST.speed)+'×'};
  $('fix').onclick=function(){ST.stage=4;renderFlow();$('fix').disabled=true;goTo(1)};
  $('reset').onclick=function(){cancelAnimationFrame(ST.raf);ST.anim=false;ST.stage=0;ST.runs=[];ST.trained=false;ST.model=null;ST.ann=ST.ann.map(function(){return emptyAnn()});ST.rushC=null;ST.sel=-1;ST.draft=null;ST.undo=[];$('log').innerHTML='';$('tbar').style.width='0';$('stepno').textContent='Training idle';sSave();renderFlow();renderLabel();renderSim();renderResults()};
}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-go]');if(a&&$('projView')&&!$('projView').hidden){e.preventDefault();goTo(+a.dataset.go)}});
renderList();route();
