// ===== GIGO scenes as Project Lab projects =====
// Warehouse PPE gate, drone census, maize scout and road safety follow the same flow as the other projects
// (brief, label several scenes, run training, watch your scenes and new scenes play back, results, fix labels).
// The scene art, the answer key and the playback come from the GIGO modules, so the picture you label
// and the video you watch are always built from the same object list.
var GB={},GDRAW={};
(function(){var G=window.GIGO;['road','warehouse','drone','crop'].forEach(function(id){var s=G.SCENARIOS[id];GB[id]=JSON.parse(JSON.stringify(s.groundTruth));GDRAW[id]=s.drawScene||G.drawScene});driveBase=GB.road})();
function gDeep(o){return JSON.parse(JSON.stringify(o))}
function gSlug(c){return c.toLowerCase().replace(/[^a-z0-9]/g,'')}
function gClasses(scn,help){var G=window.GIGO;return G.SCENARIOS[scn].classes.map(function(c){return {id:gSlug(c.id),name:c.id,color:c.color,help:help[c.id]||''}})}
function gMap(scn){var m={};window.GIGO.SCENARIOS[scn].classes.forEach(function(c){m[gSlug(c.id)]=c.id});return m}
function gImage(cv){return '<image href="'+cv.toDataURL('image/jpeg',.86)+'" x="0" y="0" width="640" height="400" preserveAspectRatio="none"/>'}
function gBoxes(list){return list.map(function(g){return {c:gSlug(g.cls),gid:g.id,x:f1(g.box.x*.8),y:f1(g.box.y*.8),w:f1(g.box.w*.8),h:f1(g.box.h*.8)}})}
function gCanvasArt(scn,gz){var G=window.GIGO,S=G.SCENARIOS[scn],keep=S.groundTruth;S.groundTruth=gz;G.useScenario(scn);var cv=document.createElement('canvas');cv.width=800;cv.height=500;try{GDRAW[scn](cv.getContext('2d'))}finally{S.groundTruth=keep}return gImage(cv)}
// ---- scene variants
function roadObjects(i,test,salt){driveBase=GB.road;return driveObjects(i,test,salt)}
function droneObjects(i,test){
  var base=gDeep(GB.drone);if(!test&&i===0)return base;
  var r=RNG(8101+i*97+(test?913:0)),SZ={Elephant:[92,58],Zebra:[52,26],Giraffe:[84,40],Wildebeest:[50,26],Lion:[58,26]},SP=['Elephant','Zebra','Giraffe','Wildebeest','Zebra','Wildebeest','Giraffe'],list=[],cnt={};
  var lion=base.filter(function(g){return g.id==='lion'})[0],po=base.filter(function(g){return g.id==='poacher'})[0];
  lion.box.x=Math.round(lion.box.x+rr(r,-18,12));lion.box.y=Math.round(lion.box.y+rr(r,-10,10));po.box.x=Math.round(po.box.x+rr(r,-30,40));po.box.y=Math.round(po.box.y+rr(r,-16,8));
  var placed=[lion.box,po.box];
  function free(b){if(b.x<14||b.y<24||b.x+b.w>786||b.y+b.h>470)return false;if(b.x<270&&b.y+b.h>290&&b.y<470)return false;if(b.x+b.w>650&&b.y+b.h>380)return false;
    return placed.every(function(q){return b.x>q.x+q.w+14||b.x+b.w+14<q.x||b.y>q.y+q.h+12||b.y+b.h+12<q.y})}
  var n=8+Math.floor(r()*4);
  for(var k=0;k<n;k++){var sp=pick(r,SP),sz=SZ[sp];
    for(var t=0;t<80;t++){var b={x:Math.round(rr(r,20,740)),y:Math.round(rr(r,40,420)),w:sz[0],h:sz[1]};if(free(b)){placed.push(b);cnt[sp]=(cnt[sp]||0)+1;
      var nm=sp+' '+cnt[sp];list.push({id:sp.slice(0,2).toLowerCase()+cnt[sp],cls:sp,name:nm,short:nm.toLowerCase(),box:b,face:r()<.5?1:-1,warn:'Not counted, so the census is one '+sp.toLowerCase()+' short.'});break}}}
  return list.concat([lion,po]);
}
function cropObjects(i,test){
  var base=gDeep(GB.crop);if(!test&&i===0)return base;
  var r=RNG(9203+i*89+(test?811:0)),CRIT={'Fall Armyworm':1,'Lethal Necrosis':1},ALL=['Healthy','Fall Armyworm','Lethal Necrosis','Grey Leaf Spot','Maize Streak'];
  var pool=['Fall Armyworm','Lethal Necrosis','Healthy','Healthy'];while(pool.length<base.length)pool.push(pick(r,ALL));pool=shuffle(r,pool);
  base.forEach(function(g,k){var c=pool[k];g.cls=c;g.critical=!!CRIT[c];g.name=g.name.replace(/^.*? leaf \(/,c+' leaf (');g.short=c.toLowerCase()+' plant';
    if(g.critical)delete g.warn;else g.warn=c==='Healthy'?'The AI had no healthy example here, so it sprayed a healthy plant.':'Not treated, so this plant was lost.'});
  return base;
}
// ---- generic generator
function gGen(scn,objs){return function(i,test){
  var G=window.GIGO,gz,art;
  if(scn==='warehouse'){var pic=G.whPictures()[test?P.nTrain+i:i];gz=gDeep(pic.gt);art=pic.img?'<image href="'+pic.img+'" x="0" y="0" width="640" height="400" preserveAspectRatio="none"/>':gCanvasArt('warehouse',gz)}
  else if(scn==='drone2'){var di=test?P.nTrain+i:i,dp=G.DR_PICS[di];gz=gDeep(dp.gt);art='<image href="'+dp.img+'" x="0" y="0" width="640" height="400" preserveAspectRatio="none"/>';return {art:art,gt:gBoxes(gz),gz:gz,counts:{},pic:di}}
  else{gz=objs(i,test);art=gCanvasArt(scn,gz)}
  return {art:art,gt:gBoxes(gz),gz:gz,counts:{}}}}
var GFLOW={guide:['Box each object tight, from edge to edge.','One box per object.','Pick the right class for every box.','Box every object that matters, even small ones.'],pt:'GIGO scene'};
PROJECTS.push({
  id:'g_warehouse',scn:'warehouse',name:'Warehouse PPE gate',icon:'🦺',type:'box',tag:'Bounding box · GIGO scene',
  blurb:'Box workers and the safety gear they wear, then watch the safety gate stop anyone missing a hard hat, vest or boots.',
  client:'A distribution centre uses a camera at the door to check workers for hard hats, vests and boots. It learns only from the boxes you draw.',
  source:'https://datamaker.io/ko/blog/articles/review/safety-equipment',
  classes:gClasses('warehouse',{'Person':'The whole worker, from head to feet.','Hard Hat':'The hard hat on the head. A bare head gets no box.','Goggles':'Safety goggles over the eyes. Only box them when you see them.','Safety Vest':'The hi-vis vest on the chest.','Safety Boots':'Work boots on the feet. Box both feet together.'}),
  guide:['Box every worker first, then only the gear they really wear.','Draw each box tight, edge to edge.','Do not box gear that is missing. The gate flags the worker for it.','Goggles are optional: box them only when worn.'],
  traps:['A bare head gets no hard hat box.','Gear inside a person box still needs its own box.','Goggles are small. Look closely.'],
  gigo:'If you miss a worker, the gate never checks them. If you skip a vest or boots, the gate raises a false alarm on a worker who is fully dressed.',
  nTrain:6,nTest:3,gen:gGen('warehouse'),
  tips:{person:'Box every worker. A missed person walks in unchecked.',hardhat:'Box the hat only when it is on a head.',goggles:'Small and easy to miss.',safetyvest:'Box the vest on the chest.',safetyboots:'Both feet in one box.'},
  reportTitle:'What the safety gate did'});
PROJECTS.push({
  id:'g_drone',scn:'drone2',name:'Drone wildlife census',icon:'🦁',type:'box',tag:'Bounding box · GIGO scene',
  blurb:'Box and name every animal in the paddock, then watch the drone fly the survey, count the herd and send alerts for predators and poachers.',
  client:'Rangers fly a drone over grazing land to count livestock and wildlife and spot threats. It counts only what you label.',
  source:'https://datamaker.io/ko/blog/articles/review/drone-object-recognition-ai-model',
  classes:gClasses('drone2',{'Elephant':'A very large grey animal with ears and a trunk.','Zebra':'A striped, horse-like animal.','Giraffe':'A long-necked animal with patches. Box the whole body.','Wildebeest':'A dark, hump-shouldered animal with horns and a beard.','Cattle':'A black-and-white or brown cow.','Goat':'A small, tan, horned animal with a beard.','Buffalo':'A heavy dark animal with broad curved horns.','Rhino':'A grey animal with a horn on its snout.','Lion':'A tawny big cat. A lion near the herd is a threat.','Hyena':'A hunched, spotted or striped scavenger with a sloping back. A predator.','Leopard':'A spotted big cat. A predator.','Poacher':'An armed poacher on foot. Box the whole person.','Scarecrow':'A straw figure on a pole. It looks like a person but is not one.'}),
  guide:['Box every animal and person, tight.','Choose the right species: zebra and wildebeest, or cattle and buffalo, look alike at a glance.','Label the predators and the poacher first: they trigger alerts.','One box per animal.'],
  traps:['Cattle versus buffalo: buffalo are darker with wide horns.','Goats are small and can hide behind other animals.','The poacher is small. Do not miss them.','A scarecrow looks like a person but is a Scarecrow, not a poacher.'],
  gigo:'If you miss a predator or the poacher, no alert is sent. A wrong species skews the count.',
  nTrain:4,nTest:2,gen:gGen('drone2'),
  tips:{elephant:'Calves count too.',zebra:'Look for stripes.',giraffe:'Box the whole body.',wildebeest:'Not a zebra: no stripes.',cattle:'Cows and calves.',goat:'Small and tan.',buffalo:'Darker, with wide horns.',rhino:'Look for the horn.',lion:'A threat to the herd.',hyena:'Sloping back, spotted coat.',leopard:'Spotted big cat.',poacher:'A poacher triggers an alert.',scarecrow:'Looks like a person, but it is a scarecrow.'},
  reportTitle:'What the drone did'});
PROJECTS.push({
  id:'g_crop',scn:'crop',name:'Maize disease scout',icon:'🌽',type:'box',tag:'Bounding box · GIGO scene',
  blurb:'Box each maize leaf and name its disease, then watch a 21-day field test show which plants get the right treatment.',
  client:'A Kenyan smallholder farm uses a scout app to diagnose leaves and decide the treatment. It learns only from your labels.',
  source:'https://datamaker.io/ko/blog/articles/review/crop-pest-disease-recognition',
  classes:gClasses('crop',{'Healthy':'A clean green leaf with no marks.','Fall Armyworm':'Holes and ragged edges, sometimes with a caterpillar.','Lethal Necrosis':'Yellowing from the edges and dried, dead tissue.','Grey Leaf Spot':'Grey rectangular stripes along the leaf.','Maize Streak':'Thin pale yellow lines along the veins.'}),
  guide:['Box every leaf, tight.','Pick the disease from the symptom.','Start with Fall Armyworm and Lethal Necrosis: they spread fast.','One box per leaf.'],
  traps:['Holes mean armyworm, yellow edges mean necrosis.','Grey stripes are leaf spot, thin yellow lines are streak.','A healthy leaf still needs a box.'],
  gigo:'A missed fast-spreading disease spreads through the field. A wrong label gets the wrong spray, and the plant is lost.',
  nTrain:4,nTest:2,gen:gGen('crop',cropObjects),
  tips:{healthy:'Box healthy leaves too.',fallarmyworm:'Holes and a caterpillar.',lethalnecrosis:'Yellow edges, dry tissue.',greyleafspot:'Grey stripes.',maizestreak:'Thin yellow lines.'},
  reportTitle:'What the field test showed'});
PROJECTS.push({
  id:'g_road',scn:'road',name:'Self-driving car: road safety',icon:'🚦',type:'box',tag:'Bounding box · GIGO scene',
  blurb:'Box cars, people, cyclists, lights and signs on a city street, then watch the car drive it in 2D or 3D.',
  client:'An autonomous-driving team trains a camera model for a city street. The car brakes only for what it has learned to see.',
  source:'https://datamaker.io/ko/blog/articles/review/occluded-object-recognition',
  classes:gClasses('road',{'Car':'A car on the road, parked or driving. Box the whole car.','Pedestrian':'A person on foot: on the crosswalk, the pavement or near the kerb.','Bicycle':'A bicycle with its rider. Box both together.','Traffic Light':'The light housing on the pole.','Traffic Sign':'A road sign plate: speed limit or school zone.'}),
  guide:['Box every car, person, cyclist, traffic light and sign.','Box each object tight.','Box a cyclist together with the bicycle.','Pick the right class.'],
  traps:['A child near the kerb is small but still a pedestrian.','A parked car still needs a box.','A cyclist is a bicycle, not a pedestrian.'],
  gigo:'If you skip a pedestrian or a cyclist, the car does not brake. If you skip the traffic light, it runs the red. A loose box makes it brake late.',
  nTrain:4,nTest:2,gen:gGen('road',function(i,t){return roadObjects(i,t,31)}),
  tips:{car:'Box every car, parked ones too.',pedestrian:'Never skip a person.',bicycle:'Include the rider.',trafficlight:'Box the housing.',trafficsign:'Box the sign plate.'},
  reportTitle:'What the car did on this street'});
(function(){PROJECTS.forEach(function(p){if(p.scn)p.cmap=gMap(p.scn)});var d=PROJECTS.filter(function(p){return p.id==='drive'})[0];if(d){d.scn='road';d.cmap=DGC}})();
