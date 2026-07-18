---
date: 2026-07-15
---

* Fixed gap being players in the scoreboard list being too large, causing them not to fit as expected
* Fixed weapons clipping through the doors during the series intermission
* Reverted change that showed carrier team color for the flag
* Fixed misprediction errors for random crits for continuous fire weapons
  * These caused various sound crackling issues and incorrect firing sounds
* Adjusted Flame Thrower heat scaling to require more sustained aim to regain damage
* Fixed projectiles blocking line of sight checks
  * Most notably, this fixes issues where a projectile could block airblast reflects
  * Example 1: not being able to push a stack of Stickybombs with airblast
  * Example 2: not being able to deflect an enemy projectile due to a friendly Medic syringe in the way
* Fixed the team that won the series not being used for MVP at the end of a match
* Fixed weapons being invisible on players that were spectating you
* Fixed the spectator HUD not resetting after respawn when dead during a series intermission
* Added support for custom votes for community servers