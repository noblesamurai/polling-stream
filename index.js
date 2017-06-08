const once = require('once');
const { Readable, Transform } = require('stream');
module.exports = function (fn, state = {}, interval = 1000) {
  var finished = false;

  const rs = Readable({
    objectMode: true,
    read: once(poll)
  });

  function poll() {
    const batchStream = fn(state);
    batchStream.once('terminate', () => {
      finished = true;
    });
    batchStream.pipe(Transform({
      objectMode: true,
      transform: (chunk, enc, cb) => {
        if (!finished) {
          rs.push(chunk);
        }
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
