// ===== 9. Self-driving car (GIGO road scene + GIGO driving simulator) =====
// The scene you label and the video you watch are built from the same object list, so they always match.
var DGC={car:'Car',pedestrian:'Pedestrian',bicycle:'Bicycle',trafficlight:'Traffic Light',trafficsign:'Traffic Sign'};
var DGI={'Car':'car','Pedestrian':'pedestrian','Bicycle':'bicycle','Traffic Light':'trafficlight','Traffic Sign':'trafficsign'};
function driveObjects(i,test){
  var G=window.GIGO,base=JSON.parse(JSON.stringify(G.SCENARIOS.road.groundTruth));
  if(!test&&i===0)return base;
  var r=RNG(7001+i*131+(test?977:0)),keep=base.filter(function(g){return g.id==='ped_cross'}),rest=shuffle(r,base.filter(function(g){return g.id!=='ped_cross'}));
  var n=6+Math.floor(r()*4);keep=keep.concat(rest.slice(0,n));
  var carCols=['#c0392b','#2563eb','#7f8c8d','#2c3e50','#d97706','#0f766e','#7c3aed','#111827'],shirts=['#e67e22','#8e44ad','#e74c3c','#0ea5e9','#16a34a','#db2777'],pants=['#2c3e50','#34495e','#2980b9','#1e293b'],hairs=['#3b2a20','#222','#7a4a21','#c9a227'];
  keep.forEach(function(g){var b=g.box;
    b.x=Math.round(cl(b.x+rr(r,-14,14),6,794-b.w));b.y=Math.round(cl(b.y+rr(r,-5,5),g.art.kind==='light'?98:b.y-8,b.y+8));
    if(g.art.kind==='car')g.art.color=pick(r,carCols);
    if(g.art.kind==='ped'){g.art.shirt=pick(r,shirts);g.art.pants=pick(r,pants);g.art.hair=pick(r,hairs)}
    if(g.art.kind==='bike'){g.art.shirt=pick(r,shirts);g.art.color=pick(r,['#10b981','#f59e0b','#3b82f6','#ef4444'])}
    if(g.art.kind==='sign'&&r()<.4)g.art.sign=g.art.sign==='speed'?'school':'speed'});
  var order=['car_ahead','ped_cross','cyclist','traffic_light','speed_sign','school_sign','ped_right','ped_left','parked_car','oncoming'];
  keep.sort(function(a,b){return order.indexOf(a.id)-order.indexOf(b.id)});
  return keep;
}
function genDrive(i,test){
  var G=window.GIGO,list=driveObjects(i,test);G.GROUND_TRUTH=list;
  var cv=document.createElement('canvas');cv.width=800;cv.height=500;G.drawScene(cv.getContext('2d'));
  var url=cv.toDataURL('image/jpeg',.86);
  var art='<image href="'+url+'" x="0" y="0" width="640" height="400" preserveAspectRatio="none"/>';
  var gt=list.map(function(g){return {c:DGI[g.cls],gid:g.id,x:f1(g.box.x*.8),y:f1(g.box.y*.8),w:f1(g.box.w*.8),h:f1(g.box.h*.8)}});
  return {art:art,gt:gt,gz:list,counts:{}};
}
PROJECTS.push({
  id:'drive',name:'Self-driving car',icon:'🚗',type:'box',tag:'Bounding box',
  blurb:'Label the cars, people, cyclists, lights and signs on a city street, then watch the car drive that exact street.',
  client:'An autonomous-driving team trains a camera model for a city street. The car brakes only for what it has learned to see, and it learns only from the boxes you draw.',
  source:'gigo/play.html?scene=road',
  classes:[
    {id:'car',name:'Car',color:'#3b82f6',help:'A car on the road, parked or driving. Box the whole car from roof to wheels.'},
    {id:'pedestrian',name:'Pedestrian',color:'#f59e0b',help:'A person on foot: on the crosswalk, on the pavement, or a child near the kerb. Box the whole person.'},
    {id:'bicycle',name:'Bicycle',color:'#10b981',help:'A bicycle with its rider. Box both together.'},
    {id:'trafficlight',name:'Traffic light',color:'#ef4444',help:'The light housing on the pole. Box the housing.'},
    {id:'trafficsign',name:'Traffic sign',color:'#a855f7',help:'A road sign: speed limit or school zone. Box the sign plate.'}],
  guide:['Box every car, person, cyclist, traffic light and sign.','Box each object tight, from edge to edge.','One box per object. Two cars get two boxes.','Box a cyclist together with the bicycle.','Pick the right class. People, cyclists and signs are easy to mix up.'],
  traps:['A child near the kerb is small but still a pedestrian.','A parked car still needs a box.','A cyclist is a bicycle, not a pedestrian.','A speed-limit sign and a school-zone sign are both traffic signs.'],
  gigo:'If you skip a pedestrian or a cyclist, the car does not brake. If you skip the traffic light, the car runs the red. A loose box makes the car notice late and brake hard.',
  nTrain:6,nTest:3,gen:genDrive,
  tips:{car:'Box every car, parked ones too.',pedestrian:'Never skip a person, even a small child.',bicycle:'Include the rider in the box.',trafficlight:'Box only the light housing.',trafficsign:'Box the sign plate, not the pole.'},
  reportTitle:'What the car did on this street'
});
