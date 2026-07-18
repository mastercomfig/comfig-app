---
date: 2026-07-13
---

* Updated backstab hit detection
  * Fixed an issue where facestab prevention was not working properly
  * Fixed an issue where over/under stabs were not working properly
  * Fixed an issue where lag compensation could fail at extremely close distances

* Updated the Flamethrower
  * Updated the heat density/accuracy mechanic to take into consideration stale/lingering flames properly. Clusters of flames do different damage compared to smaller single flame puffs, according to the cumulative age/heat of the whole group rather than the newest flame, while still appropriately rewarding tracking even at long range.
  * Fixed flames colliding with enemies twice every tick
  * Fixed an exploit that allowed users to maintain full accuracy by puffing short bursts of the Flamethrower
  * Fixed alignment with tickrate that was causing inconsistent application of damage
  * Fixed movement stutter while shooting the Flamethrower
  * Fixed ammo counter being slightly desynced
  * Minor optimizations

* Added a taunt-kill to the Ullapool Caber

* Fixed mini-crit and crit effects not being applied properly in certain cases

* Fixed some MVP stats being set to 0 rather than the correct value

* Fixed an issue where the Demoman Shield viewmodel would not render correctly

* Reverted change to chaining parameters for Scottish Resistance targeting that made it too precise

* Actually fixed tracers getting misaligned in some cases
