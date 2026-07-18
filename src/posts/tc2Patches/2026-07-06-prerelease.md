---
date: 2026-07-06
---

* Scottish Resistance targeting updated:
  * Now has an outer radius that will only detonate bombs within the radius, allowing for "trimming" bombs
  * Inner radius clustering now takes into consideration chaining, allowing for bombs that extend outwards in a wider pattern than a tight cluster around one bomb
  * Chaining will get weaker as it collects more bombs
  * Bombs that are not armed will no longer be the basis for a bomb cluster
  * Adjusted cluster radius to distinguish different bomb clusters better
  * Added detonation crosshair visualization
  * Close distance bombs will no longer detonate if you are not in the air (to make the stickyjumping check less surprising)
* Wrangler fixes:
  * Fixed Wrangler laser showing when the Sentry could not fire, which sometimes caused a frozen in place/misplaced laser
  * Fixed Wrangler shield not applying consistently during construction/upgrading
  * Fixed being able to shoot rockets while a Level 3 Sentry is still upgrading
  * Fixed picking up buildings rather than shooting rockets while looking at a building when the Wrangler is out
  * Fixed some inconsistencies between laser pointer and shield
* Hauled buildings will no longer destruct when changing loadouts/respawning
* Fixed Territorial Control 2.0 node system not gating base points and territory properly
