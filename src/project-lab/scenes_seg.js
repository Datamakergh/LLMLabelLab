// ===== 6. Skin lesion segmentation (pixel classes) =====
var SK_COLS=32,SK_ROWS=20,SK_CELL=20;
function genSkin(i,test){
  var r=RNG(4400+i*59+(test?700:0)),art='';
  var tone=pick(r,['#f1c9a5','#d9a074','#b97a4b','#8d5524','#e8b98f']),dark=tone==='#8d5524'||tone==='#b97a4b';
  var hairCol=pick(r,['#1c1210','#3b2417','#5a3a22','#111827']),bg=pick(r,['#dbeafe','#fde68a','#d1fae5','#e9d5ff','#fecaca']);
  var cx=320+rr(r,-12,12),cy=210+rr(r,-6,6),frx=100+rr(r,-6,8),fry=134+rr(r,-6,8);
  var les=[],PLAN=[[5],[6],[7],[8],[9],[6,8],[6,7],[8,5]],plan=PLAN[(test?6:0)+i%6];
  var zones=[[-60,16,8,10],[60,16,8,10],[-64,46,3,4],[64,46,3,4],[0,-6,6,6],[-30,100,6,4]];
  var zs=shuffle(r,zones),zi=0;
  plan.forEach(function(d){var n=d===7?1:(d===9?1+(r()<.4?1:0):1+(r()<.5?1:0));
    for(var k=0;k<n&&zi<zs.length;k++){var z=zs[zi++];var big=d===7?rr(r,30,38):d===9?rr(r,15,20):rr(r,26,36);
      les.push({d:d,x:cx+z[0]+rr(r,-z[2],z[2]),y:cy+z[1]+rr(r,-z[3],z[3]),rx:big,ry:d===7?big*.8:d===9?big*.85:rr(r,18,26),a:rr(r,-.6,.6)})}});
  les=les.filter(function(l){return Math.pow((l.x-cx)/frx,2)+Math.pow((l.y-cy)/fry,2)<.8});
  if(!les.length)les.push({d:plan[0],x:cx-64,y:cy+30,rx:24,ry:16,a:.2});
  function inE(x,y,e){var c=Math.cos(e.a||0),s=Math.sin(e.a||0),dx=x-e.x,dy=y-e.y,u=dx*c+dy*s,v=-dx*s+dy*c;return (u*u)/(e.rx*e.rx)+(v*v)/(e.ry*e.ry)<=1}
  var eyes=[-1,1].map(function(s){return{x:cx+s*40,y:cy-28,rx:18,ry:10,a:0}}),brows=[-1,1].map(function(s){return{x:cx+s*42,y:cy-56,rx:27,ry:6,a:s*-.12}}),mouth={x:cx,y:cy+66,rx:32,ry:10,a:0};
  var face={x:cx,y:cy,rx:frx,ry:fry,a:0},ears=[-1,1].map(function(s){return{x:cx+s*frx,y:cy+8,rx:15,ry:30,a:0}}),hairBack={x:cx,y:cy-26,rx:frx+26,ry:fry+30,a:0};
  function hairline(x){return cy-.6*fry+10*Math.sin(x*.05)}
  function classAt(x,y){
    if(eyes.some(function(e){return inE(x,y,e)})||brows.some(function(e){return inE(x,y,e)})||inE(x,y,mouth))return 0;
    var inFace=inE(x,y,face);
    var ls=null;if(inFace)for(var li2=0;li2<les.length;li2++)if(inE(x,y,les[li2])){ls=les[li2];break}
    if(ls)return ls.d;
    if(inFace&&y<hairline(x))return 1;
    if(inFace)return 3;
    if(ears.some(function(e){return inE(x,y,e)})||(Math.abs(x-cx)<46&&y>cy+fry*.72&&y<cy+fry+60))return 4;
    if(inE(x,y,hairBack))return 1;
    return 2;
  }
  var g=[];for(var rw=0;rw<SK_ROWS;rw++)for(var cc=0;cc<SK_COLS;cc++)g.push(classAt(cc*SK_CELL+SK_CELL/2,rw*SK_CELL+SK_CELL/2));
  // art
  art+=T('defs',{},T('clipPath',{id:'fc@U'},T('ellipse',{cx:f1(cx),cy:f1(cy),rx:f1(frx),ry:f1(fry)})));
  art+=rect(0,0,640,400,bg)+rect(0,355,640,45,pick(r,['#334155','#475569','#1e3a8a']));
  art+=ell(hairBack.x,hairBack.y,hairBack.rx,hairBack.ry,hairCol);
  art+=rect(cx-46,cy+fry*.62,92,fry*.4+60,tone,{opacity:1})+rect(cx-46,cy+fry*.62,92,fry*.4+60,'#000',{opacity:.12});
  ears.forEach(function(e){art+=ell(e.x,e.y,e.rx,e.ry,tone)+ell(e.x,e.y,e.rx*.55,e.ry*.6,'#000',{opacity:.1})});
  art+=ell(cx,cy,frx,fry,tone,{stroke:'#000','stroke-opacity':.15,'stroke-width':1.5});
  if(r()<.7)art+=ell(cx+(r()<.5?-1:1)*rr(r,60,80),cy+rr(r,10,70),30,22,'#000',{opacity:.1,'clip-path':'url(#fc@U)'});
  for(var fk=0;fk<26;fk++)art+=circ(cx+rr(r,-80,80),cy+rr(r,-10,60),rr(r,1,1.8),dark?'#3f2a1a':'#a05a2c',{opacity:.55});
  les.forEach(function(l){var rot='rotate('+f1(l.a*180/Math.PI)+' '+f1(l.x)+' '+f1(l.y)+')',d=l.d;
    function inside(){var aa=r()*6.28,dd=Math.sqrt(r())*.85,ca=Math.cos(l.a),sa=Math.sin(l.a),u=Math.cos(aa)*l.rx*dd,v=Math.sin(aa)*l.ry*dd;return[l.x+u*ca-v*sa,l.y+u*sa+v*ca]}
    if(d===5){art+=ell(l.x,l.y,l.rx,l.ry,'#e0525a',{opacity:.5,transform:rot,stroke:'#b91c1c','stroke-width':1.2,'stroke-opacity':.4});
      for(var q=0;q<14;q++){var p=inside(),p2=inside();art+=lin(p[0],p[1],p[0]+rr(r,-6,6),p[1]+rr(r,-5,5),'#9f1239',1,{opacity:.55})}
      for(var q2=0;q2<10;q2++){var p3=inside();art+=circ(p3[0],p3[1],rr(r,.8,1.6),'#fff1f2',{opacity:.8})}}
    else if(d===6){art+=ell(l.x,l.y,l.rx,l.ry,'#c2410c',{opacity:.62,transform:rot,stroke:'#7c2d12','stroke-width':1.8,'stroke-opacity':.8});
      for(var q3=0;q3<26;q3++){var p4=inside();art+=ell(p4[0],p4[1],rr(r,2,4.2),rr(r,1,2),'#f1f5f9',{opacity:.9,transform:'rotate('+f1(r()*180)+' '+f1(p4[0])+' '+f1(p4[1])+')'})}}
    else if(d===7){art+=ell(l.x,l.y,l.rx,l.ry,'#e11d48',{opacity:.16,transform:rot});
      for(var q4=0;q4<11;q4++){var p5=inside(),rad=rr(r,2.2,4);art+=circ(p5[0],p5[1],rad,'#b91c1c',{opacity:.75,stroke:'#7f1d1d','stroke-width':.8});if(r()<.5)art+=circ(p5[0]-.4,p5[1]-.4,rad*.35,'#fef2f2')}}
    else if(d===8){art+=ell(l.x,l.y,l.rx,l.ry,'#fffaf3',{opacity:.92,transform:rot,stroke:'#fffaf3','stroke-width':2.5,'stroke-opacity':.5});
      art+=ell(l.x+3,l.y-2,l.rx*.4,l.ry*.35,tone,{opacity:.35,transform:rot})}
    else{art+=ell(l.x,l.y,l.rx*1.25,l.ry*1.2,'#7c2d12',{opacity:.22,transform:rot});
      art+=T('polygon',{points:pts2s(blob(l.x,l.y,l.rx,r,11,.22)),fill:'#2b1608',opacity:.95,stroke:'#0f0a05','stroke-width':1});
      for(var q5=0;q5<6;q5++){var p6=inside();art+=circ(p6[0]*.5+l.x*.5,p6[1]*.5+l.y*.5,rr(r,1.5,3),pick(r,['#7c2d12','#9a3412','#1c1917']),{opacity:.85})}}
  });
  var hl=[];for(var x=cx-frx;x<=cx+frx;x+=8)hl.push([x,hairline(x)]);
  art+=T('g',{'clip-path':'url(#fc@U)'},poly([[cx-frx-4,cy-fry-10]].concat(hl).concat([[cx+frx+4,cy-fry-10]]),hairCol));
  eyes.forEach(function(e){art+=ell(e.x,e.y,e.rx,e.ry,'#fff',{stroke:'#1f2937','stroke-width':1.2})+circ(e.x,e.y,6,'#3b2417')+circ(e.x,e.y,2.6,'#000')});
  brows.forEach(function(e){art+=ell(e.x,e.y,e.rx,e.ry,hairCol,{transform:'rotate('+f1(e.a*180/Math.PI)+' '+f1(e.x)+' '+f1(e.y)+')'})});
  art+=ell(mouth.x,mouth.y,mouth.rx,mouth.ry,'#9f1239')+ell(mouth.x,mouth.y-2,mouth.rx*.8,mouth.ry*.3,'#fda4af',{opacity:.8})+path('M'+f1(cx-6)+','+f1(cy+20)+' Q'+f1(cx)+','+f1(cy+28)+' '+f1(cx+6)+','+f1(cy+20),'none',{stroke:'#000','stroke-opacity':.25,'stroke-width':2});
  return {art:art,grid:g};
}
var SK_CLASSES=[
  {id:0,name:'Eyes, brows, mouth',color:'#2563eb',help:'Eyes, eyebrows and the mouth.'},
  {id:1,name:'Hair',color:'#7c2d12',help:'Hair, including the fringe on the forehead.'},
  {id:2,name:'Background',color:'#64748b',help:'Everything that is not the person: wall, clothes, shelf.'},
  {id:3,name:'Normal skin',color:'#f59e0b',help:'Healthy skin on the face, including freckles and shadows.'},
  {id:4,name:'Other skin',color:'#16a34a',help:'Ears and neck.'},
  {id:5,name:'Eczema',color:'#ec4899',help:'Red, dry, rough and flaky patch with an uneven edge, often with scratch marks.'},
  {id:6,name:'Psoriasis',color:'#dc2626',help:'Thick, sharply edged red plaque covered with silvery-white scales.'},
  {id:7,name:'Acne',color:'#a21caf',help:'A cluster of many small red bumps and pimples. Paint the whole cluster area.'},
  {id:8,name:'Vitiligo',color:'#06b6d4',help:'Smooth patch that is paler than the skin around it, with no redness.'},
  {id:9,name:'Dark irregular mole',color:'#111827',help:'Small, very dark spot with an uneven edge. A warning sign that needs a specialist.'}];
var SK_DIS=[5,6,7,8,9];
PROJECTS.push({
  id:'skin',name:'Skin lesion mapping',icon:'🩺',type:'seg',tag:'Semantic segmentation',
  blurb:'Paint every cell of a face photo, naming each skin disease patch: eczema, psoriasis, acne, vitiligo and a dark mole. Simulation only.',
  client:'A dermatology-support app needs every pixel of a face photo given a class so the model can say which skin condition is present and how much skin it covers. This is a training exercise, not medical advice.',
  source:'https://datamaker.io/ko/blog/articles/review/skin-lesion-region-semantic-segmentation',
  classes:SK_CLASSES.map(function(c){return{id:String(c.id),name:c.name,color:c.color,help:c.help}}),
  guide:['Every cell gets a class. There must be no empty cells.','Start with the big areas (background, hair, skin), then work on the patch edges.','Name each patch by how it looks: eczema is red and flaky, psoriasis is thick with silvery scales, acne is a cluster of small bumps, vitiligo is pale, the dark mole is small and almost black.','Freckles, shadows and ordinary moles are Normal skin, not disease.','Ears and neck are Other skin. The fringe on the forehead is Hair.','Use the Pre-label helper for the big areas, then fix the patches yourself.'],
  traps:['A shadow on a cheek looks like a patch.','Freckles are small dark dots, not a mole.','Eczema and psoriasis are both red: look for silvery scales.','Vitiligo is pale, so it can look like a bright reflection.'],
  gigo:'If a psoriasis plaque is painted as eczema, the app suggests the wrong care. If a dark mole is painted as normal skin, a warning sign is never reported.',
  nTrain:6,nTest:2,gen:genSkin,
  tips:{'0':'Eyes, brows and mouth are small. Use brush size 1.','1':'Paint the fringe on the forehead as hair.','2':'Background includes clothes, walls and shelves.','3':'Healthy skin includes freckles and shadows. Do not paint them as disease.','4':'Ears and neck are Other skin.','5':'Eczema is red, dry and flaky with no thick silvery scale.','6':'Psoriasis has a sharp edge and silvery-white scales. Do not call it eczema.','7':'Paint the whole cluster of bumps as Acne, not each pimple alone.','8':'Vitiligo is paler than the skin around it. Do not confuse it with a reflection.','9':'The dark mole is small. Trace it tightly and never paint it as normal skin.'},
  reportTitle:'What the app would report'
});
