// ===== 5. Lane detection (polylines) =====
function genLane(i,test){
  var r=RNG(6200+i*43+(test?600:0)),art='',gt=[];
  var vy=rr(r,128,156),vx=rr(r,290,350),bl=rr(r,0,70),br=rr(r,570,640),bend=rr(r,-70,70);
  function LX(a,t){var xb=bl+(br-bl)*a;return vx+(xb-vx)*t+bend*2*t*(1-t)}
  function LY(t){return vy+(400-vy)*t}
  art+=T('defs',{},T('linearGradient',{id:'sk@U',x1:0,y1:0,x2:0,y2:1},'<stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/>')+T('linearGradient',{id:'rd@U',x1:0,y1:0,x2:0,y2:1},'<stop offset="0" stop-color="#6b7280"/><stop offset="1" stop-color="#374151"/>'));
  art+=rect(0,0,640,vy+2,'url(#sk@U)')+rect(0,vy,640,400-vy,'#6a8f3a');
  art+=path('M0,'+vy+' Q120,'+(vy-34)+' 240,'+vy+' T480,'+vy+' T640,'+(vy-8)+' L640,'+vy+' Z','#4b7a56',{opacity:.7});
  for(var tr=0;tr<9;tr++){var tx=rr(r,0,640),ty=vy+rr(r,0,8);art+=circ(tx,ty-8,rr(r,8,15),'#2f5d34')}
  var road=[],rl=[];for(var t=0;t<=16;t++){var tt=t/16;road.push([LX(-.14,tt),LY(tt)]);rl.push([LX(1.14,tt),LY(tt)])}
  art+=poly(road.concat(rl.reverse()),'url(#rd@U)');
  function strip(a,t0,t1,w0,color,op){var A=[],B=[],n=8;for(var k=0;k<=n;k++){var t=t0+(t1-t0)*k/n,w=.8+w0*t;A.push([LX(a,t)-w/2,LY(t)]);B.push([LX(a,t)+w/2,LY(t)])}return poly(A.concat(B.reverse()),color,{opacity:op==null?1:op})}
  function dashed(a,w0,color,faded){var s='',N=18;for(var j=0;j<N;j+=2){var t0=Math.pow(j/N,1.6),t1=Math.pow((j+1)/N,1.6);if(t0<.06)continue;var op=(faded&&t0>.3&&t0<.6)?.25:1;s+=strip(a,t0,t1,w0,color,op)}return s}
  function solid(a,w0,color,faded){return faded?strip(a,.06,.32,w0,color)+strip(a,.32,.62,w0,color,.25)+strip(a,.62,1,w0,color):strip(a,.06,1,w0,color)}
  var kind=i%3,faded=(i%2===1);
  art+=solid(.03,9,'#f8fafc',faded)+solid(.97,9,'#f8fafc',false);
  var pts=function(a){var o=[];for(var k=0;k<=8;k++){var t=.12+.88*k/8;o.push([LX(a,t),LY(t)])}return o};
  gt.push({c:'solid',pts:pts(.03)});gt.push({c:'solid',pts:pts(.97)});
  if(kind===0){art+=dashed(.5,8,'#f8fafc');gt.push({c:'dashed',pts:pts(.5)})}
  else if(kind===1){art+=solid(.488,5,'#facc15')+solid(.512,5,'#facc15');gt.push({c:'yellow',pts:pts(.5)})}
  else{art+=dashed(1/3,7,'#f8fafc')+dashed(2/3,7,'#f8fafc');gt.push({c:'dashed',pts:pts(1/3)});gt.push({c:'dashed',pts:pts(2/3)})}
  // decoys: tree shadow along the road and a tyre mark
  if(i%3!==1||test){var sh=[],sh2=[];for(var q=0;q<=10;q++){var t=.32+.68*q/10;sh.push([LX(.12,t)+Math.sin(q*1.7)*2,LY(t)]);sh2.push([LX(.26,t)+Math.cos(q*1.3)*2,LY(t)])}
    art+=poly(sh.concat(sh2.reverse()),'#000',{opacity:.28});var dp=[];for(var q2=0;q2<=6;q2++){var t2=.4+.6*q2/6;dp.push([LX(.12,t2),LY(t2)])}gt.push({c:'solid',decoy:true,why:'The edge of a tree shadow is not a lane line',pts:dp})}
  if(i%3===2||test){var tm=[];for(var q3=0;q3<=8;q3++){var t3=.35+.65*q3/8;tm.push([LX(.72,t3)+Math.sin(q3)*6*t3,LY(t3)])}art+=pline(tm,'#111827',3.5,{opacity:.35});gt.push({c:'dashed',decoy:true,why:'A tyre mark is not a painted line',pts:tm})}
  // a car dashboard hint at the bottom
  art+=path('M250,400 L270,372 L370,372 L390,400 Z','#111827',{opacity:.85});
  return {art:art,gt:gt,vx:vx};
}
PROJECTS.push({
  id:'lane',name:'Car lane detection',icon:'🛣️',type:'line',tag:'Polyline',
  blurb:'Trace painted lane lines so a driver-assist system can keep a car in its lane.',
  client:'A car maker wants a camera to find lane lines on Kenyan roads. The system steers back towards the lane centre, based on the lines it learned from your traces.',
  source:'',
  classes:[
    {id:'solid',name:'Solid white line',color:'#2563eb',help:'Unbroken white line, usually the road edge.'},
    {id:'dashed',name:'Dashed white line',color:'#16a34a',help:'Broken white line between lanes.'},
    {id:'yellow',name:'Yellow centre line',color:'#d97706',help:'Solid yellow line (double line counts as one).'}],
  guide:['Click along the middle of the paint, from the bottom of the picture up to where it fades near the horizon.','Use enough points to follow curves. Finish with Enter or a double click.','A double yellow line is one line.','Trace faded paint too if you can follow where it goes.','A tree shadow or a tyre mark is not a lane line.'],
  traps:['A tree shadow along the road has a clear edge.','Paint has faded in some places.','A tyre mark looks like a dashed line.'],
  gigo:'If you trace shadows as lane lines, the car may steer towards a shadow instead of the road.',
  nTrain:6,nTest:2,gen:genLane,
  tips:{solid:'Trace the road edge paint, not shadows.',dashed:'Follow the dashes as one long line.',yellow:'A double yellow line is traced once.'},
  reportTitle:'What the lane assist would do'
});
