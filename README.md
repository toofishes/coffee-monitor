Data Persistence
================

Data is persisted exclusively in Redis. Some of the objects and well-known keys
are as follows:

* Coffee maker set
  - name: 'makers'
  - type: set
* Coffee makers
  - name: 'maker:%id%'
  - type: hash
  - attributes: id, name, model, brewTime (seconds)
* Coffee pot set
  - name: 'pots'
  - type: set
* Coffee pots
  - name: 'pot:%id%'
  - type: hash
  - attributes: id, name, color
* Brews set
  - name: 'brews'
  - type: sorted set by time of brew
  - format: '%brewId%|%makerId%|%potId%'
  - Note: we also add sets for each pot and maker, with names
    'maker:%id%:brews', 'pot:%id%:brews', etc.
* Brews
  - name: 'brew:%id%'
  - type: hash
  - attributes: id, createdAt, creationIp, makerId, potId
* Other one-off config values:
  - 'nextMakerId', integer
  - 'nextPotId', integer
  - 'nextBrewId', integer

TODO List
=========

* Track currently connected clients (by IP?)
* Live updates via Socket.IO
* Read-only view page
  - Large 'big-board' version
  - Normal desktop computer version
  - Mobile-friendly version
* Simple "press when brewing" screen
* Configurable:
  - coffee maker inventory and info- name, model, time to brew, size?, etc.
  - carafe inventory- size?, color marker, etc.

Credits
=======

Silly coffee image was from:
http://openclipart.org/detail/1690/coffee-mug-by-hairymnstr-1690
