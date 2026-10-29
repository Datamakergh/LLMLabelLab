import re
css=open('base.css').read()+open('proj.css').read()
logo=open('logo.txt').read().strip()
body=open('body.html').read().replace('@@LOGO@@',logo)
def rd(f):
    return open(('../../gigo/js/'+f[5:]) if f.startswith('GIGO/') else f).read()
js=''.join(rd(f)+'\n' for f in ['GIGO/config.js','GIGO/simulator.js','GIGO/scene.js','GIGO/warehouse.js','GIGO/warehouse-pics.js','GIGO/drone.js','GIGO/drone-pics.js','GIGO/drone-lab.js','GIGO/crop.js','GIGO/evaluator.js','GIGO/sim-3d.js','GIGO/view-kit.js','GIGO/ppe-sim.js','GIGO/ppe-view.js','GIGO/drone-sim.js','GIGO/drone-view.js','GIGO/crop-sim.js','GIGO/crop-view.js','GIGO/sim-view.js','core.js','scenes_box.js','scenes_poly.js','scenes_line.js','scenes_drive.js','scenes_gigo.js','scenes_seg.js','scenes_pose.js','scenes_text.js','types.js','reports.js','player.js','app.js'])
js=js
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project Lab · Datamaker</title><style>'+css+'</style></head><body>'+body+'<script>'+js+'</script></body></html>'
open('../../projects.html','w').write(html);print(len(html))
