---
date: 2026-06-10
---

* Updated the modern Settings menu
  * Added "Condensed View" to Graphics Quality menu. Now you can easily preview graphics settings changes while in-game through a minimal translucent menu.
  * Added keybindings menu to the modern Settings menu
    * Improved naming of a few keybinds for Team Fortress 2 and modern expectations. For example, "Duck" is now called "Duck / Crouch".
    * Added category filtering and search to keybindings
    * Command associated with the bind is now shown for discovery and search purposes
    * Enhanced user flow for rebinding keys
    * Remove irrelevant / unused keybinding options
  * Added crosshair preview to the modern Settings menu. Supports previewing crosshair type, scale, color and gap
  * Added Outlines section in General to customize outlines settings
  * Added "custom wav" option in hitsounds/killsounds to reduce confusion
  * Added zoom sensitivity ratio to mouse settings
  * Finding settings through search now highlights and scrolls to the setting found for better navigation
  * Added descriptions/tooltips to all settings
  * Fixed a few settings bugs:
    * HTML MOTD setting removed as it is no longer available
    * Fixed Remember Previous Weapon between lives not working
    * Fixed maximum value on Medic Auto caller option being too high
    * Fixed unknown settings values being blank
    * Fixed select options box not showing properly if it was at the bottom with no room
    * Fixed misalignment on checkbox settings

* Added datagram support for Remote Console (rcon)
  * Allows server owners to control and manage their server easily when hosted on Steam Networking

* Added game coordinator support to the TF2 SDK, for clients, listen servers and dedicated servers. This will be used to enable various features in the future, starting with matchmaking.

* Switched to Team Comtress item servers, which improve loadout switch times by proxying the Valve item servers. No more rate limiting by Valve!

* Fixed number of bots not being 60% of lobby size for match emulation
