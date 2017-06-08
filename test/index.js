const it = require('tape');
const pollingStream = require('..');
const { Readable } = require('stream');

it('should be able to poll from a stream', (t) => {
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

it('should handle errors', (t) => {
  t.plan(16);

  let s = pollingStream(fn, { start: 0, batch: 10 }, { interval: 500 });
  let j = 0;
  function fn(state) {
    let i = 0;
    let rs = Readable({
      objectMode: true,
      read: () => {
        if (state.start === 12) {
          return rs.emit('error', new Error('there was an error'));
        }
        rs.push(state.start++);
        if (++i >= state.batch) rs.push(null)
      }
    });
    return rs;
  }

  let i = 0;
  let segments = 0;
  s.on('error', (err) => {
    t.ok(err);
    t.equal(err.message, 'there was an error');
  });
  s.on('sync', () => {
    segments++;
  })
  s.on('data', (data) => {
    t.equal(i, data);
    if (i === 11) {
      t.equal(segments, 1);
      t.equal(i, 11);
    } else if (i > 11) {
      t.fail('Too much data ' + i);
    }
    i++;
  });
  s.on('end', () => {
    t.fail('stream should not end');
  });
});
