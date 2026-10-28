// ---- helpers
function RNG(seed){var s=(seed>>>0)||1;return function(){s^=s<<13;s>>>=0;s^=s>>>17;s>>>=0;s^=s<<5;s>>>=0;return s/4294967296}}
function rr(r,a,b){return a+(b-a)*r()}
function pick(r,a){return a[Math.floor(r()*a.length)]}
function shuffle(r,a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function f1(n){return Math.round(n*10)/10}
function cl(v,a,b){return Math.max(a,Math.min(b,v))}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var $=function(i){return document.getElementById(i)};
// ---- svg builders
function T(tag,a,inner){var s='<'+tag;for(var k in a)s+=' '+k+'="'+a[k]+'"';return inner==null?s+'/>':s+'>'+inner+'</'+tag+'>'}
function X(o,e){return Object.assign(o,e||{})}
function ell(cx,cy,rx,ry,fill,e){return T('ellipse',X({cx:f1(cx),cy:f1(cy),rx:f1(rx),ry:f1(ry),fill:fill},e))}
function rect(x,y,w,h,fill,e){return T('rect',X({x:f1(x),y:f1(y),width:f1(w),height:f1(h),fill:fill},e))}
function pts2s(p){return p.map(function(q){return f1(q[0])+','+f1(q[1])}).join(' ')}
function poly(p,fill,e){return T('polygon',X({points:pts2s(p),fill:fill},e))}
function pline(p,stroke,w,e){return T('polyline',X({points:pts2s(p),fill:'none',stroke:stroke,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round'},e))}
function lin(x1,y1,x2,y2,stroke,w,e){return T('line',X({x1:f1(x1),y1:f1(y1),x2:f1(x2),y2:f1(y2),stroke:stroke,'stroke-width':w,'stroke-linecap':'round'},e))}
function circ(cx,cy,r,fill,e){return T('circle',X({cx:f1(cx),cy:f1(cy),r:f1(r),fill:fill},e))}
function path(d,fill,e){return T('path',X({d:d,fill:fill},e))}
function grp(inner,e){return T('g',e||{},inner)}
// ---- geometry
function bbox(p){var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;p.forEach(function(q){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1])});return{x:x0,y:y0,w:x1-x0,h:y1-y0}}
function ellPts(cx,cy,rx,ry,ang,n){var o=[],c=Math.cos(ang||0),s=Math.sin(ang||0);for(var i=0;i<(n||24);i++){var t=i/(n||24)*Math.PI*2,x=rx*Math.cos(t),y=ry*Math.sin(t);o.push([cx+x*c-y*s,cy+x*s+y*c])}return o}
function iouBox(a,b){var x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y),x1=Math.min(a.x+a.w,b.x+b.w),y1=Math.min(a.y+a.h,b.y+b.h),i=Math.max(0,x1-x0)*Math.max(0,y1-y0),u=a.w*a.h+b.w*b.h-i;return u>0?i/u:0}
var MC=null;
function maskOf(p,W,H,gw,gh){
  if(!MC){MC=document.createElement('canvas')}
  MC.width=gw;MC.height=gh;var c=MC.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,gw,gh);c.fillStyle='#000';c.beginPath();
  p.forEach(function(q,i){var x=q[0]/W*gw,y=q[1]/H*gh;if(i)c.lineTo(x,y);else c.moveTo(x,y)});c.closePath();c.fill();
  var d=c.getImageData(0,0,gw,gh).data,m=new Uint8Array(gw*gh);for(var i=0;i<m.length;i++)m[i]=d[i*4+3]>127?1:0;return m;
}
function iouMask(a,b){var i=0,u=0;for(var k=0;k<a.length;k++){var x=a[k],y=b[k];if(x&&y)i++;if(x||y)u++}return u?i/u:0}
function polyArea(p){var s=0;for(var i=0;i<p.length;i++){var a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])}
function segDist(p,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?cl(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l,0,1):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function distToLine(p,L){var m=1e9;for(var i=0;i<L.length-1;i++)m=Math.min(m,segDist(p,L[i],L[i+1]));return L.length===1?dist(p,L[0]):m}
function resample(L,n){
  if(L.length<2)return L.slice();var len=[0];for(var i=1;i<L.length;i++)len.push(len[i-1]+dist(L[i-1],L[i]));var tot=len[len.length-1],o=[],j=0;
  for(var k=0;k<n;k++){var d=tot*k/(n-1);while(j<L.length-2&&len[j+1]<d)j++;var seg=len[j+1]-len[j],t=seg?(d-len[j])/seg:0;o.push([L[j][0]+(L[j+1][0]-L[j][0])*t,L[j][1]+(L[j+1][1]-L[j][1])*t])}return o}
function lineDist(a,b){
  if(a.length<2||b.length<2)return 999;var A=resample(a,30),B=resample(b,30),s1=0,s2=0;
  A.forEach(function(p){s1+=distToLine(p,b)});B.forEach(function(p){s2+=distToLine(p,a)});return (s1+s2)/(A.length+B.length)}
function blob(cx,cy,r,r0,n,noise){var o=[];for(var i=0;i<n;i++){var t=i/n*Math.PI*2,k=1+(r0()-.5)*2*noise;o.push([cx+Math.cos(t)*r*k,cy+Math.sin(t)*r*k*0.9])}return o}
