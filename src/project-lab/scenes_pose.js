// ===== 7. Exercise keypoints =====
var JN=['Head','Neck','R shoulder','R elbow','R wrist','L shoulder','L elbow','L wrist','R hip','R knee','R ankle','L hip','L knee','L ankle'];
var JM=[0,1,5,6,7,2,3,4,11,12,13,8,9,10];   // mirror joint (left/right swap)
var JG=[0,0,1,1,1,1,1,1,2,2,2,2,2,2];       // group: head, arms, legs
var BONES=[[0,1],[1,2],[2,3],[3,4],[1,5],[5,6],[6,7],[1,8],[1,11],[8,9],[9,10],[11,12],[12,13],[2,5],[8,11]];
function ang3(a,b,c){var v1=[a[0]-b[0],a[1]-b[1]],v2=[c[0]-b[0],c[1]-b[1]],d=Math.atan2(v1[0]*v2[1]-v1[1]*v2[0],v1[0]*v2[0]+v1[1]*v2[1]);return Math.abs(d*180/Math.PI)}
var POSES={
 stand:{n:'Standing',v:'front',p:[[0,-1.45],[0,-1.05],[-.30,-1.0],[-.36,-.5],[-.34,-.02],[.30,-1.0],[.36,-.5],[.34,-.02],[-.17,0],[-.19,.92],[-.19,1.82],[.17,0],[.19,.92],[.19,1.82]],coach:function(p,T){return 'Stand tall. Ready position.'}},
 squat:{n:'Squat',v:'front',p:[[0,-1.3],[0,-.92],[-.3,-.88],[-.42,-.5],[-.2,-.25],[.3,-.88],[.42,-.5],[.2,-.25],[-.2,0],[-.5,.38],[-.34,1.1],[.2,0],[.5,.38],[.34,1.1]],coach:function(p,T){return ((p[9][1]-p[8][1])/T<.6)?'Good depth.':'Go lower: hips to knee height.'}},
 squat2:{n:'Squat',v:'front',p:[[0,-1.38],[0,-1.0],[-.3,-.95],[-.4,-.55],[-.2,-.3],[.3,-.95],[.4,-.55],[.2,-.3],[-.2,0],[-.42,.78],[-.3,1.5],[.2,0],[.42,.78],[.3,1.5]],coach:function(p,T){return ((p[9][1]-p[8][1])/T<.6)?'Good depth.':'Go lower: hips to knee height.'}},
 jack:{n:'Jumping jack',v:'front',p:[[0,-1.45],[0,-1.05],[-.3,-1.0],[-.7,-1.3],[-.95,-1.75],[.3,-1.0],[.7,-1.3],[.95,-1.75],[-.17,0],[-.5,.9],[-.78,1.8],[.17,0],[.5,.9],[.78,1.8]],coach:function(p,T){return ((p[5][1]-p[7][1])/T>.5)?'Arms high enough.':'Raise your arms above your shoulders.'}},
 reach:{n:'Overhead reach',v:'front',p:[[0,-1.45],[0,-1.05],[-.3,-1.0],[-.3,-1.55],[-.2,-2.1],[.3,-1.0],[.3,-1.55],[.2,-2.1],[-.17,0],[-.19,.92],[-.19,1.82],[.17,0],[.19,.92],[.19,1.82]],coach:function(p,T){return (p[4][1]<p[0][1]&&p[7][1]<p[0][1])?'Full reach.':'Reach higher: wrists above your head.'}},
 lunge:{n:'Lunge',v:'side',p:[[.1,-1.45],[.05,-1.05],[0,-1.0],[.05,-.55],[.2,-.2],[.05,-1.0],[.12,-.55],[.28,-.22],[-.02,0],[.6,.5],[.6,1.3],[.02,0],[-.45,.75],[-1.0,1.35]],coach:function(p,T){var a=ang3(p[8],p[9],p[10]);return (a>70&&a<115)?'Good lunge.':'Bend the front knee to about 90 degrees.'}},
 push:{n:'Push-up (up)',v:'side',p:[[-1.85,-.15],[-1.55,-.1],[-1.45,-.05],[-1.45,.35],[-1.45,.7],[-1.5,-.08],[-1.5,.33],[-1.5,.7],[-.1,.1],[.7,.3],[1.5,.5],[-.05,.1],[.75,.3],[1.55,.5]],coach:function(p,T){return ang3(p[2],p[3],p[4])<125?'Good depth.':'Lower your chest: bend the elbows.'}},
 push2:{n:'Push-up (down)',v:'side',p:[[-1.8,.25],[-1.5,.3],[-1.4,.35],[-1.1,.4],[-1.45,.72],[-1.45,.33],[-1.1,.38],[-1.5,.72],[-.1,.35],[.7,.5],[1.5,.62],[-.05,.35],[.75,.5],[1.55,.62]],coach:function(p,T){return ang3(p[2],p[3],p[4])<125?'Good depth.':'Lower your chest: bend the elbows.'}},
 bend:{n:'Side bend',v:'front',p:[[.45,-1.33],[.18,-1.02],[-.14,-1.0],[-.4,-1.32],[-.2,-1.8],[.46,-.95],[.52,-.55],[.46,-.1],[-.17,0],[-.19,.92],[-.19,1.82],[.17,0],[.19,.92],[.19,1.82]],coach:function(p,T){return (Math.abs(p[1][0]-(p[8][0]+p[11][0])/2)/T>.12)?'Good side bend.':'Lean further to the side.'}}
};
var POSE_TRAIN=['squat','jack','lunge','push','reach','bend'],POSE_TEST=['squat2','push2'];
function genPose(i,test){
  var r=RNG(3300+i*67+(test?650:0)),key=(test?POSE_TEST:POSE_TRAIN)[i%(test?2:6)],P=POSES[key],art='';
  var jit=P.p.map(function(q){return[q[0]+rr(r,-.025,.025),q[1]+rr(r,-.025,.025)]});
  var xs=jit.map(function(q){return q[0]}),ys=jit.map(function(q){return q[1]});
  var minx=Math.min.apply(0,xs),maxx=Math.max.apply(0,xs),miny=Math.min.apply(0,ys),maxy=Math.max.apply(0,ys);
  var T=Math.min(330/(maxy-miny+.5),540/(maxx-minx+.5),115);
  var ox=320-(minx+maxx)/2*T+rr(r,-18,18),oy=206-(miny+maxy)/2*T;
  var pts=jit.map(function(q){return[ox+q[0]*T,oy+q[1]*T]});
  var skin=pick(r,['#c68642','#e0ac69','#8d5524','#5b3a1f']),shirt=pick(r,['#2563eb','#0f766e','#7c3aed','#475569']),side=P.v==='side';
  art+=rect(0,0,640,400,'#e2e8f0')+rect(0,300,640,100,'#cbd5e1')+rect(0,296,640,6,'#94a3b8');
  art+=rect(40,60,110,150,'#bfdbfe',{rx:4})+lin(95,60,95,210,'#f8fafc',4)+lin(40,135,150,135,'#f8fafc',4);
  art+=rect(470,90,110,18,'#94a3b8')+rect(486,108,6,190,'#94a3b8')+rect(558,108,6,190,'#94a3b8');
  art+=ell(320,(side?oy+Math.max(0,maxy)*T+14:oy+maxy*T+10),(side?(maxx-minx)*T*.65:150),12,'#0f766e',{opacity:.5});
  function limb(a,b,w,c){return lin(pts[a][0],pts[a][1],pts[b][0],pts[b][1],c,w*T)}
  var far=side?[2,3,4,8,9,10]:[],legW=.22,armW=.15,jointCol=skin;
  function draw(set,dark){var s='';
    var col=function(c){return dark?'#000':c},op=dark?{opacity:.0}:{};
    return s}
  // far side first for side views
  var order=side?[[2,3],[3,4],[8,9],[9,10]]:[];
  order.forEach(function(b){art+=limb(b[0],b[1],b[0]>7?legW:armW,b[0]>7?'#1e293b':skin)+lin(pts[b[0]][0],pts[b[0]][1],pts[b[1]][0],pts[b[1]][1],'#000',(b[0]>7?legW:armW)*T,{opacity:.25})});
  // torso
  var sh=[pts[2],pts[5]],hp=[pts[8],pts[11]],tw=side?.28*T:0;
  art+=poly([[sh[0][0]-tw,sh[0][1]-.05*T],[sh[1][0]+tw,sh[1][1]-.05*T],[hp[1][0]+tw*.7,hp[1][1]+.08*T],[hp[0][0]-tw*.7,hp[0][1]+.08*T]],shirt,{'stroke-linejoin':'round',stroke:shirt,'stroke-width':.18*T});
  // legs (shorts + skin) and arms
  [[8,9],[9,10],[11,12],[12,13]].forEach(function(b,k){if(side&&b[0]<9)return;art+=limb(b[0],b[1],legW,k%2?skin:'#1e293b')});
  [[1,2],[2,3],[3,4],[1,5],[5,6],[6,7]].forEach(function(b,k){if(side&&k<3)return;art+=limb(b[0],b[1],armW,k%3===0?shirt:skin)});
  art+=lin(pts[1][0],pts[1][1],pts[0][0],pts[0][1],skin,.14*T);
  art+=circ(pts[0][0],pts[0][1],.26*T,skin)+circ(pts[0][0]+(side?-.06*T:0),pts[0][1]-.06*T,.27*T,'#1c1210',{opacity:.85,'clip-path':'none'}) ;
  art+=circ(pts[0][0],pts[0][1]+.03*T,.25*T,skin);
  art+=circ(pts[0][0]-.08*T,pts[0][1]+.02*T,.025*T,'#111827')+circ(pts[0][0]+.08*T,pts[0][1]+.02*T,.025*T,'#111827');
  // cues: red band on the subject's LEFT wrist, white shoes
  art+=circ(pts[7][0],pts[7][1],.1*T,skin)+circ(pts[4][0],pts[4][1],.1*T,skin);
  art+=lin(pts[7][0]-.07*T,pts[7][1]-.02*T,pts[7][0]+.07*T,pts[7][1]-.02*T,'#dc2626',.1*T);
  art+=ell(pts[10][0],pts[10][1]+.05*T,.14*T,.07*T,'#f8fafc',{stroke:'#475569','stroke-width':1})+ell(pts[13][0],pts[13][1]+.05*T,.14*T,.07*T,'#f8fafc',{stroke:'#475569','stroke-width':1});
  return {art:art,pts:pts,T:T,pose:P.n,view:P.v,coach:function(p){return P.coach(p,T)}};
}
PROJECTS.push({
  id:'pose',name:'Exercise coaching keypoints',icon:'🏋️',type:'pose',tag:'Keypoints',
  blurb:'Place 14 body keypoints on exercise photos so an AI coach can judge your form.',
  client:'A fitness app wants an AI coach that watches an exercise on camera and says whether the form is right. Keypoints are how the model learns where the joints are.',
  source:'https://datamaker.io/ko/blog/articles/review/ai-workout-coaching',
  classes:[
    {id:'0',name:'Head and neck',color:'#2563eb',help:'Head centre and neck base.'},
    {id:'1',name:'Arms',color:'#16a34a',help:'Shoulders, elbows and wrists.'},
    {id:'2',name:'Legs',color:'#d97706',help:'Hips, knees and ankles.'}],
  guide:['Click each joint in order. The next joint is shown on the screen.','Right and left mean the exercise-doer’s right and left, not yours. The red wristband is on their left wrist.','Place the point at the centre of the joint, not on the limb edge.','If a joint is hidden by the body, place it where you think it is.','Use Undo to re-place a point.'],
  traps:['Right and left are swapped when the person faces you.','In side views the far arm and leg are partly hidden.','The wrist is the narrow part, not the hand.'],
  gigo:'If left and right are swapped, the coach tells you to fix the wrong leg. If points drift, the knee angle is wrong and it gives bad advice.',
  nTrain:6,nTest:2,gen:genPose,
  tips:{'0':'Place the head point at the face centre and the neck at the base.','1':'Right means the doer’s right. The red wristband is on the left wrist.','2':'Place the knee and ankle at the joint centres, not on the shoe.'},
  reportTitle:'What the AI coach would say'
});
