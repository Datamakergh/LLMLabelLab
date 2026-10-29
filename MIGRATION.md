# GIGO migration into LLMLabelLab

Source: https://github.com/Datamakergh/GIGO (read only, not modified). Target: this repository.
Status: migrated, integrated and tested (see Tests). Nothing here loads from the GIGO repo or its GitHub Pages site at runtime.

## Inspection summary
- **GIGO**: multi-page static site, vanilla JS, no build, no dependencies, relative paths, `window.GIGO` namespace, `node tests/run.js` for logic tests. Five scenes: road, warehouse PPE, drone census, maize scout, LLM answers.
- **LLMLabelLab**: `index.html` (LLM Lab, Supabase class mode), `projects.html` (Project Lab, one generated file), `supabase/*.sql`. Deployed on Vercel from the repo root. No package.json, no tests before this migration.
- **Conflicts found**: both repos have `index.html` and `projects.html`, so GIGO lives in `gigo/` and nothing is overwritten. GIGO's `css/` and `js/` names would also clash at the root. Both use their own global namespaces (`window.GIGO` vs the Project Lab and LLM Lab globals), so no code conflicts.
- **Licence**: neither repository contains a LICENSE file. Both belong to the same owner (Datamakergh), so no third-party licence conditions apply. Attribution is kept in `gigo/` (page footers, `PRODUCT.md`) and here. Add a LICENSE to both repositories if you want to publish under defined terms.
- **Secrets**: none in GIGO. Supabase keys in LLMLabelLab were not touched.

## What was migrated
| GIGO | Now | How |
|---|---|---|
| `index.html`, `projects.html`, `learn.html`, `play.html` | `gigo/…` | Copied as is. Paths are relative, so they work from the subfolder. |
| `js/*`, `css/*`, `assets/*` | `gigo/js`, `gigo/css`, `gigo/assets` | Copied as is. Annotation, scoring, feedback, all five simulations and the 2D/3D road view are kept. |
| `tests/run.js` | `gigo/tests/run.js` | Copied, passes unchanged. |
| `js/nav.js` | `gigo/js/nav.js` | **Adapted**: added "LLM Label Lab" and "Project Lab" links back to the root apps. |
| `PRODUCT.md` | `gigo/PRODUCT.md` | Copied (design context). |
| `config.js`, `simulator.js`, `scene.js`, `evaluator.js`, `sim-view.js` | `src/project-lab/gigo/` | **Reused** inside Project Lab: the Self-driving project draws the GIGO road scene and plays the GIGO driving simulator. |
| `docs/memory`, `CLAUDE.md`, `.nojekyll`, `README.md` | not copied | GIGO's own tooling notes and Pages marker. Not needed in this repo. |

## What changed in LLMLabelLab
- `index.html` and `projects.html` nav: link to `gigo/projects.html`.
- `projects.html` (Project Lab): video-style playback for all projects, Self-driving rebuilt on the GIGO road scene and simulator. Its source is now in `src/project-lab/` and `python3 build.py` there regenerates `projects.html`.
- New: `tests/migration.js`, `MIGRATION.md`.

## Tests
- `node gigo/tests/run.js` (GIGO logic, all five scenes): passes.
- `node tests/migration.js`: referenced files exist, no runtime reference to the GIGO repo, Project Lab rebuilds identically, cross links present: passes.
- Browser check (Playwright): every GIGO page and scene, LLM Lab, Project Lab and the Self-driving project load with no script errors or failed requests; a box drawn on the road scene and a run of the simulation work.

## Not done yet
The seven-project, four-stage learning progression (trainer demo, guided practice, self-paced, competitive challenge) and its persistence and security work are separate from this migration and are not implemented here.

## Warehouse pictures (added after the migration)
The warehouse scene now has 6 pictures with a picture switcher: picture 1 is the original GIGO drawing, pictures 2 to 6 are worker photos from the Project Lab safety-equipment project, converted by a one-off script into `gigo/js/warehouse-pics.js` (images as data URLs plus boxes scaled to 800 x 500). Hard hats, goggles, vests and boots map to the five warehouse classes. Goggles are optional on these photos (`worker.req`), so only hats, vests and boots are required, and `ppe-sim.js` honours that. `scene.js` caches the scene per picture. `gigo/tests/run.js` checks every picture (perfect copy scores 100, accurate labels pass the gate, no labels let an unsafe worker in).

## GIGO scenes inside Project Lab

The warehouse, drone, maize and road GIGO scenes are also Project Lab projects (`#/g_warehouse`, `#/g_drone`, `#/g_crop`, `#/g_road`; the old `#/g/<id>` links redirect). They follow the same flow as the other projects: brief, label several scenes, run training, watch your scenes and new scenes play back, read the results and fix your labels. The scene art, answer key and playback come from the GIGO modules in `gigo/js`, built by `src/project-lab/scenes_gigo.js`. The LLM answer check still opens the GIGO page.
