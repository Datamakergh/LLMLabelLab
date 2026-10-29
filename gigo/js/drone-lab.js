/* GIGO – "drone2": the drone census run on the Project Lab grazing and wildlife pictures (see drone-pics.js).
 * Same simulation and view as the drone scene, with more species (cattle, goats, buffalo, rhino).
 * Used by Project Lab; the standalone drone scene is unchanged. */
window.GIGO = window.GIGO || {};
(function (G) {
  'use strict';
  if (!G.SCENARIOS || !G.SCENARIOS.drone || !G.DR_PICS) return;
  var base = G.SCENARIOS.drone, PICS = G.DR_PICS;
  PICS.forEach(function (p) { if (typeof Image !== 'undefined') { var im = p._im = new Image(); im.src = p.img; } });
  var classes = [
    { id: 'Elephant', color: '#64748b', key: '1' }, { id: 'Zebra', color: '#0ea5e9', key: '2' },
    { id: 'Giraffe', color: '#ca8a04', key: '3' }, { id: 'Wildebeest', color: '#7c3aed', key: '4' },
    { id: 'Cattle', color: '#16a34a', key: '5' }, { id: 'Goat', color: '#a16207', key: '6' },
    { id: 'Buffalo', color: '#0f766e', key: '7' }, { id: 'Rhino', color: '#db2777', key: '8' },
    { id: 'Lion', color: '#ea580c', key: '9' }, { id: 'Person', color: '#dc2626', key: '0' },
    { id: 'Scarecrow', color: '#b45309', key: '-' }
  ];
  var s2 = {};
  for (var k in base) s2[k] = base[k];
  s2.id = 'drone2'; s2.classes = classes; s2.groundTruth = PICS[0].gt; s2.pic = 0;
  s2.species = ['Elephant', 'Zebra', 'Giraffe', 'Wildebeest', 'Cattle', 'Goat', 'Buffalo', 'Rhino', 'Lion'];
  s2.task = 'Box every animal and person, then run the drone survey.';
  s2.drawScene = function (ctx) {
    var im = PICS[s2.pic]._im;
    if (im && im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, G.SCENE.width, G.SCENE.height);
    else { ctx.fillStyle = '#7fae55'; ctx.fillRect(0, 0, G.SCENE.width, G.SCENE.height); }
  };
  G.SCENARIOS.drone2 = s2;
  G.dr2Use = function (i) { s2.pic = i; s2.groundTruth = PICS[i].gt; if (G.SCENARIO === s2) G.GROUND_TRUTH = s2.groundTruth; return PICS[i]; };
})(window.GIGO);
