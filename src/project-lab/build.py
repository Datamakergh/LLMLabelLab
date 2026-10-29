import re
css=open('base.css').read()+open('proj.css').read()
logo=open('logo.txt').read().strip()
body=open('body.html').read().replace('@@LOGO@@',logo)
js=''.join(open(f).read()+'\n' for f in ['core.js','scenes_box.js','scenes_poly.js','scenes_line.js','scenes_seg.js','scenes_pose.js','scenes_text.js','types.js','reports.js','player.js','app.js'])
js=js
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project Lab · Datamaker</title><style>'+css+'</style></head><body>'+body+'<script>'+js+'</script></body></html>'
open('../../projects.html','w').write(html);print(len(html))
