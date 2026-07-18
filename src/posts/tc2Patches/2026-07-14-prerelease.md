---
date: 2026-07-14
---

* Added prevention mechanisms for matches going on for too long beyond their timer, instead of playing out series that may result in yet another tiebreaker being played later, or that would not change the outcome of the match (one team is very ahead)
  * Prevention kicks in around 5 minutes remaining, and becomes more aggressive at around 2 minutes
  * This mechanism is based upon approximated series time, approximated possible series score that can be earned in the next series, etc

* Slightly tuned Flamethrower heat ramp to be more rewarding for stabilizing tracking

* Dropped weapons now glow reliably when visible, rather than flashing on/off due to subtle obstructions

* Fixed players not being respawned when a new series falls back to waiting for players
