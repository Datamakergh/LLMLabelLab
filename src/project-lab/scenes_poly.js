// ===== 4. Coffee leaf disease (polygons) =====
function genCoffee(i,test){
  var r=RNG(5100+i*71+(test?800:0)),art='',gt=[];
  art+=T('defs',{},T('linearGradient',{id:'cf@U',x1:0,y1:0,x2:1,y2:1},'<stop offset="0" stop-color="#14532d"/><stop offset="1" stop-color="#166534"/>')+T('radialGradient',{id:'cb@U'},'<stop offset="0" stop-color="#365314"/><stop offset="1" stop-color="#0f1f06"/>'));
  art+=rect(0,0,640,400,'url(#cb@U)');
  for(var b=0;b<7;b++)art+=circ(rr(r,0,640),rr(r,0,400),rr(r,30,70),'#3f6212',{opacity:.25});
  var cx=320,cy=202,L=500,Wd=240,ang=rr(r,-10,10)*Math.PI/180,ca=Math.cos(ang),sa=Math.sin(ang);
  function Wd2(u,v){return [cx+u*ca-v*sa,cy+u*sa+v*ca]}
  var top=[],bot=[];
  for(var t=0;t<=20;t++){var tt=t/20,u=-L/2+L*tt,w=Wd/2*Math.sin(Math.PI*Math.pow(tt,.8));top.push(Wd2(u,-w));bot.push(Wd2(u,w))}
  var outline=top.concat(bot.reverse());
  art+=poly(outline,'url(#cf@U)',{stroke:'#052e16','stroke-width':3});
  var m0=Wd2(-L/2,0),m1=Wd2(L/2,0);art+=lin(m0[0],m0[1],m1[0],m1[1],'#86efac',5,{opacity:.75});
  for(var v=1;v<8;v++){var uu=-L/2+L*v/9,ww=Wd/2*Math.sin(Math.PI*Math.pow(v/9,.8));var a1=Wd2(uu,0),b1=Wd2(uu+60,-ww*.9),b2=Wd2(uu+60,ww*.9);art+=lin(a1[0],a1[1],b1[0],b1[1],'#86efac',2,{opacity:.55})+lin(a1[0],a1[1],b2[0],b2[1],'#86efac',2,{opacity:.55})}
  art+=ell(cx-80,cy-60,120,14,'#fff',{opacity:.07,transform:'rotate(-18 '+(cx-80)+' '+(cy-60)+')'});
  var placed=[];
  function place(rad){for(var t=0;t<80;t++){var u=rr(r,-L/2+90,L/2-70),tt=(u+L/2)/L,w=Wd/2*Math.sin(Math.PI*Math.pow(tt,.8)),v=rr(r,-w*.62,w*.62),p=Wd2(u,v);
    if(placed.every(function(q){return Math.hypot(q[0]-p[0],q[1]-p[1])>q[2]+rad+10})){placed.push([p[0],p[1],rad]);return p}}return null}
  function rust(){var rad=rr(r,20,30),p=place(rad*1.2);if(!p)return;var pts=blob(p[0],p[1],rad,r,16,.28);
    art+=poly(pts,'#f59e0b',{opacity:.92,stroke:'#b45309','stroke-width':1.5});for(var q=0;q<26;q++){var a=r()*6.28,d=Math.sqrt(r())*rad*.85;art+=circ(p[0]+Math.cos(a)*d,p[1]+Math.sin(a)*d,1.8,'#fde68a')}
    gt.push({c:'rust',pts:pts})}
  function cerc(){var rad=rr(r,13,20),p=place(rad*1.6);if(!p)return;var halo=blob(p[0],p[1],rad*1.55,r,16,.2),core=blob(p[0],p[1],rad,r,14,.2);
    art+=poly(halo,'#d9c64a',{opacity:.6})+poly(core,'#7c3f1a')+poly(blob(p[0],p[1],rad*.5,r,10,.15),'#4a2208',{opacity:.9});gt.push({c:'cerc',pts:halo})}
  function miner(){var p=place(50);if(!p)return;var a=rr(r,0,6.28),pts=[[p[0],p[1]]];for(var q=0;q<14;q++){a+=rr(r,-.55,.55);var l=pts[pts.length-1];pts.push([l[0]+Math.cos(a)*9,l[1]+Math.sin(a)*9])}
    art+=pline(pts,'#d6b98c',9)+pline(pts,'#b08d57',2.4);var left=[],right=[];pts.forEach(function(q2,k){var n=pts[Math.min(k+1,pts.length-1)],pr=pts[Math.max(k-1,0)],dx=n[0]-pr[0],dy=n[1]-pr[1],ln=Math.hypot(dx,dy)||1,nx=-dy/ln*5.8,ny=dx/ln*5.8;left.push([q2[0]+nx,q2[1]+ny]);right.push([q2[0]-nx,q2[1]-ny])});
    gt.push({c:'miner',pts:left.concat(right.reverse())})}
  rust();if(i%2===0)rust();cerc();if(i%3!==1)cerc();miner();
  // decoys
  var gp=place(30);if(gp){art+=ell(gp[0],gp[1],34,8,'#fff',{opacity:.4,transform:'rotate(-25 '+f1(gp[0])+' '+f1(gp[1])+')'});gt.push({c:'rust',decoy:true,why:'Light glare is not rust',pts:ellPts(gp[0],gp[1],34,8,-25*Math.PI/180,16)})}
  var dp=place(18);if(dp){art+=ell(dp[0],dp[1],13,10,'#e0f2fe',{opacity:.4,stroke:'#f0f9ff','stroke-width':1.5})+ell(dp[0]-4,dp[1]-3,4,3,'#fff',{opacity:.95});gt.push({c:'cerc',decoy:true,why:'A water drop is not a leaf spot',pts:ellPts(dp[0],dp[1],13,10,0,14)})}
  return {art:art,gt:gt,leafArea:polyArea(outline)};
}
PROJECTS.push({
  id:'coffee',name:'Coffee leaf disease',icon:'☕',type:'poly',tag:'Polygon',
  blurb:'Outline rust, leaf spots and leaf miner trails so a farm app can estimate how bad the infection is.',
  client:'A coffee cooperative gives farmers an app that scores leaf damage from a photo. The score is calculated from the area of the polygons your labels teach it.',
  source:'',
  classes:[
    {id:'rust',name:'Leaf rust',color:'#ea580c',help:'Orange powdery patches.'},
    {id:'cerc',name:'Cercospora spot',color:'#92400e',help:'Brown spot with a yellow halo. Outline the halo too.'},
    {id:'miner',name:'Leaf miner trail',color:'#7c3aed',help:'A winding pale tunnel made by larvae.'}],
  guide:['Click around the edge of the lesion. Close the shape by clicking the first point or pressing Enter.','Follow the edge closely. Place more points on curves.','Outline the yellow halo as part of a Cercospora spot.','Trace the whole length of a leaf miner trail as one thin shape.','Glare and water drops are not lesions.'],
  traps:['Light glare looks like a pale patch.','Water drops sit on top of the leaf.','Miner trails are thin and winding.'],
  gigo:'If your outlines are too loose, the app overestimates the damage and tells farmers to spray when they do not need to.',
  nTrain:6,nTest:2,gen:genCoffee,
  tips:{rust:'Follow the orange edge closely with more points.',cerc:'Include the yellow halo and skip water drops.',miner:'Trace the full trail as one thin shape.'},
  reportTitle:'Infection severity the app would report'
});
