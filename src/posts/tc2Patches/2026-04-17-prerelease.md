* Reworked outline rendering to fix various issues and improve performance
    * Loosely based upon work from PazerOP (thank you!)
    * Fixed all outlines disappearing when a player was ubered or had another forced material override
    * Fixed outline color not correctly inputting into HDR / tonemapping
    * Added support for outlines for only parts of an object visible, or only behind a surface
    * This new system supports more advanced outlines that will be added in the future
* Changed the display rules of some outlines based upon this new system:
  * Spawn/spectator outlines no longer draw an outline when visible
  * Flags no longer draw an outline when visible
  * Sticky Bombs (except for the Scottish Resistance) no longer draw an outline when visible
  * MvM Money no longer draws an outline when visible
  * Payload no longer draws an outline when visible
  * MvM Tank no longer draws an outline when visible
* Fixed headshot tracer showing on disguised spies
* Fixed some subtick desync issues
  * Added subtick support for viewpunch
  * Fixed subtick prediction getting desynced after a prediction error
  * Fixed continuous fire not updating attack frame correctly
  * Added subtick to Scottish Resistance sticky bomb selection
* Fixed Sentry Gun ammo not refilling properly when close to full and shielded
* Fixed stat panel on freezecam not hiding during screenshot
* Fixed bullet tracers not alternating between barrels on Level 2 and 3 Sentry Guns (thanks ficool2!)
* Fixed BLU team being immune to Sentry Gun knockback on non-MvM maps with upgrades like Freaky Fair
* Fixed votes having a slightly random duration (thanks horiuchii!)
* Fixed kick target info on vote HUD panel not working properly (thanks horiuchii!)
* Optimized the load of cosmetics, weapons and other items on players
  * Loosely based on changes from sigsegv and rafradek
* Fixed an issue with some All Class items not being accessed properly
* Optimized how players are accessed and found in various systems
  * Loosely inspired by changes from sigsegv and rafradek
* Limited another type of pain/hurt sound to play every 0.1 rather than spam the sound system too frequently
* Optimized smoke stack effect on the server
  * Based on changes from sigsegv and rafradek
