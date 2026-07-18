---
date: 2026-07-11
---

* Reworked how max health modifications are calculated (e.g. Gloves of Running Urgently, Dalokohs Bar)
  * Reductions in max health preserve health percentage. For example, if you are at 50% health (150 HP / 300 max HP), reducing max health will retain the same health percentage of 50% (50 HP / 100 max HP). This also includes when max health is restored from a reduction (for example coming from 50 HP / 100 max HP back up to 150 HP / 300 max HP).
  * Increases in max health preserve flat health difference. For example, if you are at 299 HP / 300 HP, and a buff increases your max health to 350, your HP will be 349.

* Updated the Dalokohs Bar / Fishcake:
  * Restored overhealing from before the October 23, 2017 exploit workaround
  * Now applies healing according to current max health + 50, rather than based upon a fixed max health value
  * Due to changes in max health modifications, overhealing will always reach max HP + 50 rather than max HP + 25 on the first use, which required a second use to gain the full effect

* Made the crosshair gap 4 by default, to allow for crosshairs to display correctly by default

* Fixed bots dropping their items in some cases

* Fixed ragdolls and cosmetic gibs originating from an incorrect location in some cases, like when the entity source was not visible to the client

* Fixed bullet tracers originating from an incorrect location in some cases, like when the entity source was not visible to the client

* Updated the Scottish Resistance:
  * Fixed the new Scottish Resistance targeting preferring bombs closer to you, even when aiming directly at a further bomb
  * Increased the thickness of the Scottish Resistance targeting crosshair
  * The Scottish Resistance targeting crosshair now displays when bombs are in the target radius
  * Fixed Scottish Resistance bombs improperly highlighting for the outer radius when they are not armed yet
  * Adjusted the Scottish Resistance targeting for greater precision

* Fixed items improperly caching on the client due to an optimization made early on in the pre-release, causing desync with the actual equipped items on the server in some cases
* Fixed an issue where game FPS would be reduced when exiting a server connection screen or closing a kick/disconnect message
* Added tc2_intel.bat as a workaround for Intel cards to launch without the launcher

* Improved the performance and responsiveness of the new main menu UI, especially on 4K resolutions / HiDPI
* Fixed an issue where the mouse would be misaligned on the new main menu UI
