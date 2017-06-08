const once = require('once');
const { Readable, Transform } = require('stream');
module.exports = function (fn, state = {}, opts) {
  let finished = false;

  let interval = opts.interval || 1000;
  let streamOpts = Object.assign(
    { objectMode: true, interval: undefined },
    opts,
    { read: once(poll) });

  const rs = Readable(streamOpts);

  function poll() {
    const batchStream = fn(state);
    batchStream.once('error', (err) => {
      rs.emit('error', err);
      finished = true;
    });
    batchStream.once('terminate', () => {
      finished = true;
    });
    batchStream.pipe(Transform({
      objectMode: true,
      transform: (chunk, enc, cb) => {
        rs.push(chunk);
        cb();
      },
      flush: () => {
        if (finished) {
          rs.push(null);
        }
        else {
          rs.emit('sync');
          setTimeout(poll, interval);
        }
      }
    }));
  }

  return rs;
};
