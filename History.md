
3.2.0 / 2015-03-16
==================

  * added testing instructions to the README (#33, @gterrono)
  * fixed typo in readme (#28, @thebyrd)
  * package: bump `engine.io` and `mydb-client`
  * package: bump `redis`
  * package: bump "mongo-minify" to v0.1.1 (#32, @gterrono)
  * package: specify versions

3.1.1 / 2013-08-30
==================

  * package: bump `engine.io` and `mydb-client`

3.1.0 / 2013-08-30
==================

  * package: bump engine.io
  * package: bump mydb-client

3.0.6 / 2013-08-20
==================

  * package: add clone component dep
  * subscription: add cloning step
  * test: turn it into failing test by multiplexing subscriptions with different minifications
  * package: bump deps

3.0.5 / 2013-08-15
==================

  * subscription: refactor to potentially make it more efficient

3.0.4 / 2013-08-15
==================

  * client: temporarily switching to pseudorandom

3.0.3 / 2013-08-14
==================

  * index: log subscribe times

3.0.2 / 2013-06-15
==================

  * package: bump `enigne.io` to `0.6.2`

3.0.1 / 2013-06-14
==================

  * subscription: use `nextTick` instead of `setTimeout`
  * package: bump redis to fix all the issues

3.0.0 / 2013-06-14
==================

  * switch to RESTful subscriptions, ditch redis

2.1.0 / 2013-04-15
==================

  * package: bump engine.io

2.0.8 / 2013-04-02
==================

  * package: bumped `mydb-client` to `3.0.2`
  * test: added failing test

2.0.7 / 2013-03-08
==================

  * test: add mydb-client document root-level events test
  * test: fix race test

2.0.6 / 2013-02-21
==================

  * test: preloading
  * package: bumped `mydb-client`

2.0.5 / 2013-02-20
==================

  * index: fix redis connections

2.0.4 / 2013-02-20
==================

  * index: fix connection

2.0.3 / 2013-02-20
==================

  * package: bump `mydb-client`
  * index: improve instrumentation
  * *: improve instrumentation

2.0.2 / 2013-02-20
==================

  * package: bump `mydb-client`

2.0.1 / 2013-02-20
==================

  * package: bumped `mydb-client`

2.0.0 / 2013-02-19
==================

  * index: remove listeners limit on redis client for subscriptions handling
  * subscription: debug when redis actually subscribes/unsubscribes
  * index: remove bad instrumentation
  * client: discard subscriptions
  * client: several subscription fixes
  * subscription: more instrumentation
  * subscription: default fields selection to `{}`
  * subscription: remove `emitOps`
  * subscription: improve instrumentation
  * subscription: fixed instrumentation
  * subscription: style
  * index: style
  * index: added book keeping for redis subscriptions
  * client: instrument
  * subscription: improve cleanup
  * subscription: reuse subscriptions instead of one tcp connection per subscription
  * subscription: style
  * subscription: added op buffering
  * package: removed `monk` dep and added `uid2`
  * index: added new subscription handling methods
  * index: added client onclose handler
  * index: added client tracking and subscription claiming
  * index: keep track of pending subscriptions
  * index: added subscription timeout
  * index: style
  * client: removed legacy `onPayload` method
  * client: renamed subscription event handlers
  * client: added method to capture a new subscription
  * client: added method `sid` to obtain or create a socket id
  * client: expose `id`
  * client: style

1.3.3 / 2013-02-08
==================

  * package: bumped `mydb-client` to `1.3.3`
  * package: bumped `engine.io` to `0.4.3`

1.3.2 / 2013-02-08
==================

  * package: bumped `mydb-client` to `1.3.2`
  * package: bumped `engine.io` to `0.4.2`

1.3.1 / 2013-02-08
==================

  * package: bumped `mydb-client` to `1.3.1`

1.3.0 / 2013-02-08
==================

  * package: bumped `mydb-client` to `1.3.0`
  * package: bump `engine.io`

1.2.2 / 2012-11-30
==================

  * package: bumped `mydb-client` to fix subscription re-using
  * test: added test for two loads in a row

1.2.1 / 2012-11-30
==================

  * package: bumped `mydb-client` for unsubscription improvements

1.2.0 / 2012-11-28
==================

  * package: bumped `mydb-client` with `destroy` and `load` fixes
  * test: added test for ignoring load callbacks and ready events
  * test: make sure `destroy` wipes keys
  * test: added `destroy` test in `unloaded` state

1.1.19 / 2012-11-28
===================

  * package: bumped `mydb-client` for error handling fix for browser

1.1.18 / 2012-11-28
===================

  * package: bumped `mydb-client` for error handling support
  * test: added error handling test

1.1.17 / 2012-11-26
===================

  * package: bumped `mydb-client` for tests
  * test: fixed test

1.1.16 / 2012-11-26
===================

  * test: added test for doc cleanup on `destroy`
  * test: added test for `$pull` events

1.1.15 / 2012-11-06
===================

  * subscription: fixed error handling

1.1.14 / 2012-10-25
===================

  * subscription: fix potential `payload`/`op` events ordering issue
  * package: bumped `mydb-client`

1.1.13 / 2012-10-25
===================

  * package: bumped `mydb-client`

1.1.12 / 2012-10-24
===================

  * subscription: switch to one redis client per subscription

1.1.11 / 2012-10-24
==================

  * client: don't destroy everything upon error
  * subscription: unsubscribe from redis upon error

1.1.10 / 2012-10-23
===================

  * package: bump deps

1.1.9 / 2012-10-23
==================

  * package: bumped `engine.io`
  * package: bumped `mydb-client`

1.1.8 / 2012-10-19
==================

  * package: bump `mydb-client`

1.1.7 / 2012-10-19
==================

  * package: bumped `mydb-client`
  * test: added `$rename` tests

1.1.6 / 2012-10-18
==================

  * package: bumped `mydb-client`
  * test: improved multiple docs with same subscription tests
  * subscription: fix instrumentation

1.1.5 / 2012-10-17
==================

  * package: bump `mydb-client`

1.1.4 / 2012-10-17
==================

  * package: bumped `mydb-client`

1.1.3 / 2012-10-16
==================

  * client: fix error debugging

1.1.2 / 2012-10-16
==================

  * client: debug error

1.1.1 / 2012-10-16
==================

  * subscription: added error handling for unknown ids

1.1.0 / 2012-10-15
==================

  * package: bumped `mydb-client`

1.0.11 / 2012-10-15
===================

  * test: added test for docs loaded after payload

1.0.10 / 2012-10-15
===================

  * package: bumped `mydb-client`

1.0.9 / 2012-10-15
==================

  * subscription: avoid warning of max listeners

1.0.8 / 2012-10-15
==================

  * package: bumped `mydb-client`

1.0.7 / 2012-10-14
==================

  * package: bumped `engine.io`

1.0.6 / 2012-10-14
==================

  * package: bumped `engine.io`

1.0.5 / 2012-10-14
==================

  * package: bumped `mydb-client`

1.0.4 / 2012-10-11
==================

  * client: remove `open` event (`Client` initialize upon `open`)

1.0.3 / 2012-10-11
==================

  * client: emit `open` event

1.0.2 / 2012-10-11
==================

  * client: emit `close` event

1.0.1 / 2012-10-10
==================

  * index: fix uri parsing for redis

1.0.0 / 2012-10-09
==================

  * Upgraded to new protocol

0.6.9 / 2012-09-25
==================

  * connection: prevent more than one subscription for operations per socket

0.6.8 / 2012-09-25
==================

  * Bumped client.

0.6.7 / 2012-09-21
==================

  * test: added `Document#each`

0.6.6 / 2012-09-19
==================

  * Bumped client.

0.6.5 / 2012-09-19
==================

  * Bumped client.

0.6.4 / 2012-09-19
==================

  * Bumped client.

0.6.3 / 2012-09-18
==================

  * manager: fixed instanceof

0.6.0 / 2012-09-17
==================

  * package: added mydb-driver dependency
  * manager: simplified code - leverage mydb-driver (BC)
  * connection: updated subscription semantics

0.5.5 / 2012-09-07
==================

  * Bumped client.

0.5.4 / 2012-09-07
==================

  * Bumped client.

0.5.3 / 2012-08-31
==================

  * Bumped client.

0.5.2 / 2012-08-31
==================

  * Bumped client.

0.5.1 / 2012-08-28
==================

  * Bumped client.

0.5.0 / 2012-08-23
==================

  * test: added `Document#upon` tests
  * Bumped client.

0.4.12 / 2012-08-15
===================

  * Bumped client.

0.4.11 / 2012-08-15
===================

  * Bumped client.

0.4.10 / 2012-08-14
===================

  * Bumped client.

0.4.9 / 2012-08-14
==================

  * connection: avoid inevitable leak warnings

0.4.8 / 2012-08-02
==================

  * database: fix join/leave logic for multiple clients

0.4.7 / 2012-07-26
==================

  * manager: introduced Database with join/leave events

0.4.6 / 2012-07-22
==================

  * manager: avoid instanceof problems across modules

0.4.5 / 2012-07-22
==================

  * manager: fixed ignoring options when not using `new`

0.4.4 / 2012-07-17
==================

  * mydb: case-insensitive ftl

0.4.3 / 2012-06-27
==================

  * Bumped client.

0.4.2 / 2012-06-27
==================

  * Removed console.log from tests.
  * Bumped client.

0.4.1 / 2012-06-27
==================

  * Bumped client.

0.4.0 / 2012-06-25
==================

  * Bumped client.

0.3.0 / 2012-06-25
==================

  * Bumped client and added test for Document#load.

0.2.0 / 2012-06-21
==================

  * Bumped client and refactored tests.

0.1.1 / 2012-06-06
==================

  * Removed unneeded require.

0.1.0 / 2012-06-06
==================

  * Initial release.
