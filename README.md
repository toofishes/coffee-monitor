Coffee Monitor
==============

A purely for fun and learning project to allow folks to know from across the
office when a new pot of coffee is brewing and will soon be ready.

Technology
----------

* [Node.JS](http://nodejs.org/)
* [Socket.IO](http://socket.io/)
* [Redis](http://redis.io/)

Data Persistence
----------------

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

Use of Socket.IO
----------------

We use Socket.IO for real-time updates to the recent brews list. The following
events are utilized:

### Emitted by server

#### updateBrew

This is broadcast to all currently connected clients. It contains a rendered
version of a brew that was just created in the system, or one that was updated.

#### deleteBrew

This is broadcast to all currently connected clients. It contains just the ID
of the brew that was deleted.

#### recentBrews

The server responds with a rendered version of the most recent brews we know
about. This is the same as the contents of the '#brews' div.

This event is sent automatically when a client connects to make sure they have
the most recent list of brews.

### Emitted by client

#### recentBrews

Emit this event when you wish to get a list of recent brews sent your way.

TODO List
---------

* Track currently connected clients (by IP?)
* Tweet brewed pots? (https://github.com/ttezel/twit)
* Send emails to people that want them
* Jabber IMs?

Credits
-------

Silly coffee image was from:
http://openclipart.org/detail/1690/coffee-mug-by-hairymnstr-1690
