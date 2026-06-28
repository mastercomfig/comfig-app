---
date: 2026-05-28
---

* Potentially fixed Linux crash with outlines
* Fixed not being able to kick players on the MOTD screen with match assigned teams
* Adjusted team shuffle algorithm:
  * Player score discrepancy will now adjust based on Team Series Score, in order to better detect situations where a team runs away with the lead in terms of game state/objectives
  * Bot difficulty will now adjust a skill curve to further compensate for team balance in situations where shuffling human players is not sufficient. This prioritizes making the losing team's bots stronger, and then falls back to making the dominant team's bots weaker.
* Damage now always rounds up, for both buildings and players. This ensures consistency, proper calculation of damage after resistances, and fixes some bugs with on-death effects.
* Fixed buildings reporting 0 health when they were initializing construction
* Fixed buildings under construction not receiving lethal damage if the damage was just enough to reduce their health to 0
* Added in the latest TF2 fixes
* Random crits now reset back to on after each match (as was done previously). This better ensures we don't linger past user preferences when a new match starts.
* Fixed cases of the launcher not working
* Upgraded dedicated server deployment system to facilitate matchmaking in future updates
* Removed cp_frostwatch from bot compatible rotation
* Updated C++ compiler and minor code cleanup
