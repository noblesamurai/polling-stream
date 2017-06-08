# polling-stream

Emit a perpetual readable stream by providing a function that returns the next segment of the readable stream.

[![build status](https://secure.travis-ci.org/eugeneware/polling-stream.png)](http://travis-ci.org/eugeneware/polling-stream)

This module is a good if you want an perpetual read stream where you need to poll for changes to each new 'segment' of the stream. An example would be polling a database for changes at the end of a table.

## Installation

This module is installed via npm:

``` bash
$ npm install polling-stream
```

## Example Usage

``` js
let pollingStream = require('polling-stream');
let s = pollingStream(getNextStreamSegment, { start: 0, batch: 10 }, 2000);
function getNextStreamSegment(state) {
    let i = 0;
    let rs = Readable({
      objectMode: true,
      read: () => {
        // do a maximum of 14 elements
        if (state.start === 14) {
          rs.push(null);
          rs.emit('terminate');
          return;
        }
        rs.push(state.start++);

        // just do 10 elements at a time
        if (++i >= state.batch) rs.push(null)
      }
    });
    return rs;
}
s.on('data', console.log);
// Will print the numbers from 0 to 13
```

## API

### `pollingStream(getNextStreamSegmentFn, [streamState], [opts])`

Returns a new polling stream.

* `getNextStreamSegmentFn(streamState)` - a function that returns the next segment of data in the perpetual stream. It takes the `streamState` (which must be an `object`), and then returns a `ReadableStream` for the next segment of the stream. The function can mutate the `streamState` to keep track of where it is up to, and thus the next time it's called, it can resume where it left off.
* `streamState` - a javascript object which can be used to store the state of where the stream is up to. eg. `{ lastKey: 1234 }`
* `opts` - this will be passed to the constructor of the perpetual `ReadableStream`. It defaults to having `{ objectMode: true }`, so set this to false if you're dealing with binary streams. There is also a field called `interval` which is the poll frequency. When the stream that gets returned from `getNextStreamSegmentFn` finishes, this delay (in milliseconds) will elapse, before the function gets called again. It defaults to 1000 milliseconds (1 second).

### `event('terminate')`

If you want to actually terminate the perpetual stream you first have to end the stream (eg. `stream.push(null)`, and then `stream.emit('terminate')`.

### `event('sync')`

The perpetual stream emits a `sync` event when the stream segment has closed. You can hook into this to do things like regular logging, stats reporting, etc.
