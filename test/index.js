const it = require('tape');
const pollingStream = require('..');
const { Readable } = require('stream');

it('should be able to poll from a stream', function(t) {
  t.plan(16);

  let s = pollingStream(fn, { start: 0, batch: 10 }, { interval: 2000 });
  let j = 0;
  function fn(state) {
    let i = 0;
    let rs = Readable({
      objectMode: true,
      read: () => {
        if (state.start === 14) {
          rs.push(null);
          rs.emit('terminate');
          return;
        }
        rs.push(state.start++);
        if (++i >= state.batch) rs.push(null)
      }
    });
    return rs;
  }

  let i = 0;
  let segments = 0;
  s.on('sync', () => {
    segments++;
  })
  s.on('data', (data) => {
    t.equal(i++, data);
  });
  s.on('end', () => {
    t.equal(segments, 1);
    t.equal(i, 14);
    t.end();
  });
});
