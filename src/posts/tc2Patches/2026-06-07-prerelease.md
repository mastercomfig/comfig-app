---
date: 2026-06-07
---

* Added radial menu for voice menu (Z, X, C by default)
  * Can use number keys as before to select an option, or drag the mouse to select an option
  * Can use `tf_radial_voicemenu_concise 1` to split up the voice menu options into groups of 4 (rather than needing to reach all the way for 9)
  * The radial menu is fully customizable, allowing for various communication bubbles, message text templates and the classic voice commands.
  * Customization and additional options are not implemented at this time, and we are only using the classic voice commands
  * Radial menu options can be conditional, for example PASS Time specific options or Medic specific options

* Reworked Demoknight turn control
  * Camera is now fully responsive to input, but horizontal turning is limited to a cone centered around the charge direction
  * Charge direction will now smoothly track your current viewing direction, according to turn rate
  * This fixes issues with frame rate dependence, some exploits, and other usability issues
  * The Tide Turner now has true full turn control

* Match timer on maps without a round timer will now disappear when the timer hits 0
* Updated overheal color in outlines for BLU team to be more visible
* Fixed series intermission not displaying properly when the match timer reaches 0
* Fixed round counter being enabled not updating the HUD properly
* Added Blake Sextus as a bot name
