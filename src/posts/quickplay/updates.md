## October 5, 2024

* Fixed display issue with text which appeared due to an unknown cause

## July 9, 2024

* Added game mode selection as an advanced option, to allow for queuing for multiple game modes
* Now enforcing [Milestone 1](/quickplay/host_faq#m1) server requirements
* Added options for class restrictions and objectives
* Added more popular community maps and fixed some community map release versions not being allowed (some servers are using older/different versions of the same map)
* Player count now shows how many players are available with your filters, rather than players available globally for that gamemode
* Fixed an issue with some arena variants of maps not being eligible for quickplay

## July 2, 2024

* Added update log

## June 30, 2024

* You can now see your estimated ping by hovering on the signal bars. This will let people be informed about the exact value being estimated, so they can give better feedback and understand what's being computed by the system. Hopefully this will help us become more precise and better reflect actual in-game ping. Please note that you should be using `net_graph 1` to compare your ping, rather than the scoreboard. The scoreboard fakes ping somewhat, giving a "score" correlated to how well you connect to the server overall.
* Increased the duration of the delay before connecting to a server

## June 29, 2024

* Reduced trending bonus very slightly, as it was producing bad results in some rare cases when there were more populated/better ping servers available
* Added new popular community VSH maps to improve population, and added ctf_snowfort_2023

## June 28, 2024

* Fixed size scaling on various monitors
* Unfiltered some servers in the server list which are not eligible for the PLAY NOW button, but can be shown in the server list:
  * Added full servers to the bottom of the server list
  * Added almost full servers (23/24), which are normally filtered out, to around the middle of the server list
* Added Steam-style text filtering to vulgar language in the server name
* Minor bug fixes

## June 27, 2024

* Added show servers button to show a list of servers instead of picking for you.
  * This helps users validate against the quickplay algorithm to make sure it's really selecting the best server for them, and it also helps users select their favorite map or game mode out of ones which are available on servers.
* Added back Misc and Arena game modes
* Added a delay before connecting to a server. If you close out of the connection dialog by blocking or closing, it will not connect you to that server.
* Minor bug fixes

## June 26, 2024

* Removed game mode selection temporarily.
  * There was a very strong indication that people were not finding a satisfactory server simply because of strict game mode selection. Anything except random and payload was getting people bouncing off servers at a very high rate. Not enough people are playing in order to make game mode selection viable. Map bans can be used to avoid popular maps for game modes you don't wish to play, and work is ongoing to improve user choice.
* Reworked map bans. You can now select up to 6 maps you wish to be filtered out entirely ahead of time.
  * As for map selection, we recommend voting for the maps you really want to play once you're on a community server.
* Resolved the aforementioned slight advantage a 32 player server has to fight over the last few slots from 21 to 23. Now, all servers are on equal footing for this range, for competing to fill up to a full 24 player match. Afterwards, if the server still has player slots available, it will still be scored higher than an empty server, ramping down as the server fills up.

## June 25, 2024

* When trying to fill up a server to an ideal number of players, use 24 max players as a population basis, instead of using the servers max players. This means every server will be targeted to be populated with the same ideal number of players, instead of a larger amount of players for bigger servers.
* When seeing if a server needs to be filled up completely, use its actual max player cap instead of a 32 player cap. This mostly affects huge penalties large player servers were getting vs. normal player servers when the player selected "Don't care" for player counts.
* Increased the player trending bonus to compete with servers which have already reached the ideal number of players. This way, instead of preferring to fill up a server beyond the ideal count, it will prefer to spill over players earlier to emptier servers. This improves cases where there's a popular server with ~20 players taking a few players from servers which can be seeded instead.

## June 24, 2024

* Normalized the ping values for lower pings, so that if your ping is good enough to a server, that server gets the maximum score for ping. This isn't a huge difference vs. your ping preference, but it helps a few edge cases with abnormally low pings causing some servers to get an edge for almost no reason.
* Adjusted rejoin penalty to fix some cases of infinite looping with retries.
* Adjusted the trending boost to give a high base boost to servers which have only gotten 1 player, and give a higher consistent boost to anything that's gotten a reasonable amount of players but still needs more help getting to an ideal player count. This rewards servers for gaining any players, but then rewards them even more for sustaining momentum.

## June 23, 2024

* Servers with low player counts will get a trending momentum bonus over 1 hour for having their player count increase. This allows a server to fill up quickly if it starts to get players.
* Empty servers now have a consistent shuffled score for 1 hour. This fixes an issue where the same empty server wasn't consistently being directed to while players connected to it.
* Player counts are now visible as soon as you visit the site, rather than after queuing.
* Fixed an issue where newer, unknown IP infrastructure could cause the quickplay server querier to be unable to update the server list.

## June 22, 2024

* The server querier updates much faster. This fixes most cases of players joining an already full server, or map information being out of date.
  * It also has a side effect, where the quickplay algorithm is now more responsive to filling empty servers since it can more quickly direct people to a server which is filling up.

## June 21, 2024

* Added emails to give feedback through
* quickplay.tf is now available as a link to the quickplay site

## June 20, 2024

* We are now giving a bonus to servers who are following the server requirement milestones early.
* Added support for HUDs to link to specific parts of the page
* The following server behavior will be rewarded:
  * Using "Team Fortress" as the game name.
  * Not faking ping through an anycast network. We have identified all anycast networks on TF2 abusing this and flagged them.
  * Not using invalid characters in the server name to increase its sorting order.
  * Logging in with a good standing game server account.
* Made ping scoring much more accurate, to reward servers with excellent routing.
* Fixed a bug where 64+ player servers that had a lot of players already were impossible to be matched into
* Fixed a bug with servers not updating information when Steam was down
* Some updates in preparation for upgrading how the server querier scans for servers
* Added playnow.tf as a link to the quickplay site

## June 19, 2024

* Added a party size option to find a server with enough slots for your party
* Added a significant amount of community maps, targeting SA, AS and AUS, to improve server population of vanilla servers. This is an area of active investigation and experimentation. Metric used was mostly based on player playtime and server availability.
* Fixed a bug where recently joined servers would go into a loop of joining the best one after all options were exhausted. This was because all of the options would be considered "recent" so it would not be able to cycle through the options anymore.
* Fixed a bug where certain Frankfurt servers were being detected as being in Jordan. This made people not be able to match into otherwise suitable servers in EU.
* Fixed a bug where empty servers were not having their scores shuffled. This caused some issues when suggesting the best empty server for users

## June 18, 2024

* Added support for arena maps
* Added support for beta maps
* Added a preference option for RTD. This is off by default. This allows players to expand the server search pool.
* When finding a server, new information is provided about the map and player count. Please note that this could be inaccurate by the time you connect to the server.
* Added support for banning any map on the server connection dialog
* Added advanced options for adjusting ping scoring
* When a server is found with 0 players, there is a warning given to you that you should stay on the server for a minute to wait for other quickplay users to match into the server.
* Added a choice selection of holiday maps without gimmicks: ctf_doublecross_snowy, ctf_frosty, ctf_snowfall_final, ctf_turbine_winter, cp_frostwatch, pl_frostcliff, pl_coal_event, pl_rumford_event, pl_wutville_event, koth_maple_ridge_event, koth_snowtower, pd_snowville_event, pd_galleria
* Excluded some game modes from the Any game mode / Random search type: Arena, Robot Destruction, Passtime, Mannpower, VS Saxton Hale, Zombie Infection or Medieval Mode
* Fixed a bug which caused populated 64-100 player servers to not be matched into
* Fixed a bug which caused 24 player servers with SourceTV enabled to not be matched into
* Fixed a bug where too many bots would cause the server to be detected as too full for quickplay
* Fixed a bug with the UI glitching out when no servers were found
* Fixed a bug where empty servers could be boosted in very, very rare cases above servers with players due to random shuffling
* Empty servers are penalized slightly more to reduce their frequency, even if ping is good compared to other options
* Fixed a bug where the server list would not update in some rare cases
* Added a player count display feature
* Improved load times in some cases

## June 17, 2024

* Added advanced options for server capacity, random crits, and respawn time preferences
* Added an informational panel which tells you which server you're connecting to, and gives you options to block or favorite it
* Added game mode selection
* Added a Server Host FAQ and reworded the main FAQ to be easier for a general audience. Made clarfications about how quickplay rules work.
* Updated quickplay page to scale better to a variety of small displays (height and width combinations)

## June 16, 2024

* Launched Quickplay.
* Adjusted the quickplay algorithm to prefer fuller servers more than emptier servers.
* Adjusted the quickplay algorithm to prefer a good amount of players slightly more than low ping.
* Servers with players will make their ping score more important. This means you're more likely to get a game close to you of the servers which have players. This avoids you getting a healthily populated server but with high ping, but avoids empty servers getting preferential treatment just because their ping to you is good.
* Improved debug logging in the browser console, to avoid a bug where it gets cleared for some users, and also added a log of recent connected servers and their reconnect penalties.
* Made the preference for fuller servers less aggressive, as it was being a bit negative for heathily creating community server matches.