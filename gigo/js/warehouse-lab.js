/* GIGO – "warehouse2": the safety gate on the twelve Project Lab safety-equipment pictures (see warehouse2-pics.js).
 * Same gate and view as the warehouse scene, with all thirteen classes. Besides the gear itself there are
 * "no helmet / no vest / no boots / no gloves" classes: they are the evidence the gate needs to explain a stop.
 * A missing item labelled as the gear itself makes the gate wave an unsafe worker through.
 * Used by Project Lab; the standalone warehouse scene is unchanged. */
window.GIGO = window.GIGO || {};
(function (G) {
  'use strict';
  if (!G.SCENARIOS || !G.SCENARIOS.warehouse || !G.WH2_PICS) return;
  var base = G.SCENARIOS.warehouse, PICS = G.WH2_PICS;
  PICS.forEach(function (p) { if (typeof Image !== 'undefined') { var im = p._im = new Image(); im.src = p.img; } });
  var C = [['Person', '#2563eb'], ['Safety helmet', '#d97706'], ['Helmet with ear protector', '#b45309'], ['Head = no helmet', '#ef4444'],
    ['Safety vest', '#16a34a'], ['Harness', '#7c3aed'], ['Chest = no vest', '#f43f5e'], ['Safety boots', '#0d9488'], ['Shoe = no boots', '#e11d48'],
    ['Gloves', '#ca8a04'], ['Hand = no gloves', '#be123c'], ['Bib overall', '#0ea5e9'], ['Goggles', '#0891b2']];
  var KEYS = '1234567890qwe';
  var s2 = {};
  for (var k in base) s2[k] = base[k];
  s2.id = 'warehouse2'; s2.pic = 0; s2.groundTruth = PICS[0].gt;
  s2.classes = C.map(function (c, i) { return { id: c[0], color: c[1], key: KEYS.charAt(i) }; });
  s2.items = [
    { key: 'hat', noun: 'helmet', cls: ['Safety helmet', 'Helmet with ear protector'], disp: 'Helmet' },
    { key: 'vest', noun: 'hi-vis vest', cls: ['Safety vest', 'Harness'], disp: 'Safety vest' },
    { key: 'boots', noun: 'safety boots', cls: ['Safety boots'], disp: 'Safety boots' },
    { key: 'gloves', noun: 'gloves', cls: ['Gloves'], disp: 'Gloves' },
    { key: 'goggles', noun: 'safety goggles', cls: ['Goggles'], disp: 'Goggles' },
    { key: 'overall', noun: 'bib overall', cls: ['Bib overall'], disp: 'Bib overall' }
  ];
  s2.stats = [['Safety incidents', 'incidents'], ['Near misses', 'nearMisses'], ['False alarms', 'falseAlarms'], ['Late checks', 'lateChecks'], ['Unchecked entries', 'unchecked'], ['Stops with no reason', 'unclear']];
  s2.minor = {
    not_checked: 'The worker was never seen, so this item was never checked.',
    unclear: 'There was no "no ..." label, so the gate stopped the worker without being able to say why.',
    fooled: 'The missing item was labelled as the gear itself, so the gate thought it was worn and waved the worker through.'
  };
  s2.advice = {
    critical: 'Box the workers first. If the AI cannot see a person, it cannot check their PPE.',
    wrongClass: 'Check each class: helmet or helmet with ear protector, vest or harness. A bare head is "no helmet", not a helmet.',
    allGood: 'Every worker and item found, and every missing item explained.'
  };
  s2.task = 'Box every worker, the gear they wear, and mark the gear they are missing, then run the gate.';
  s2.drawScene = function (ctx) {
    var im = PICS[s2.pic]._im;
    if (im && im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0, G.SCENE.width, G.SCENE.height);
    else { ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, 0, G.SCENE.width, G.SCENE.height); }
  };
  G.SCENARIOS.warehouse2 = s2;
  G.wh2Use = function (i) { s2.pic = i; s2.groundTruth = PICS[i].gt; if (G.SCENARIO === s2) G.GROUND_TRUTH = s2.groundTruth; return PICS[i]; };
})(window.GIGO);
