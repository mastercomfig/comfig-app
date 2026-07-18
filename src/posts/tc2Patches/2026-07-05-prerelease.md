---
date: 2026-07-05
---

* Fixed sensitivity FOV scaling on zoom (e.g. for the Sniper Rifle)
  * Mouse sensitivity is now 1:1 consistently upon zoom in
  * zoom_sensitivity_ratio 1 will correspond to true 1:1 mouse input, rather than being projected incorrectly. Also, this fix is superior to various community setting fixes which aim to provide a 1:1 mouse sensitivity at center, so please revert back to the default if this was your intention.
  * The old behavior can be used with zoom_sensitivity_scaling 0
* Fixed keybindings menu not detecting inputs correctly
* Pulled in the latest changes from the TF2 SDK:
  * Stat Trak with count now displays on dropped weapons
  * More fixes to do with cloaking causing the CTF flag effects to disappear
* Fixed servers not on your game version showing in the new server browser
* Fixed series intermission being extremely long if SourceTV was enabled
* Fixed a server crash related to weapon punch subtick
* Removed devonly from some Demoknight charge cvars, per request
