const it = require('tape');
const pollingStream = require('..');
const { Readable, Writable } = require('stream');

function updateState (start) {
  return start + 1;
}

it('should be able to poll from a stream', (t) => {
  t.plan(16);

  let s = pollingStream(fn, 0, updateState, { interval: 2000 });
  function fn (start) {
    let i = start;
    let sent = 0;
    let rs = Readable({
      objectMode: true,
      read: () => {
        if (i === 14) {
          rs.push(null);
          rs.emit('terminate');
          return;
        }
        if (sent === 10) rs.push(null);
        else rs.push(i);
        i++;
        sent++;
      }
    });
    return rs;
  }

  let i = 0;
  let segments = 0;
  s.on('sync', () => {
    segments++;
  });
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

  let s = pollingStream(fn, 0, updateState, { interval: 500 });
  function fn (start) {
    let i = start;
    let rs = Readable({
      objectMode: true,
      read: () => {
        if (i === 12) {
          return rs.emit('error', new Error('there was an error'));
        }
        rs.push(i);
        if (i >= 10) rs.push(null);
        i++;
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
  });
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

it('should apply backpressure', (t) => {
  t.plan(1);

  let s = pollingStream(fn, {}, updateState, { interval: 500, highWaterMark: 1 });
  function fn () {
    let rs = Readable({
      objectMode: true,
      highWaterMark: 1,
      read: () => rs.push(next())
    });
    return rs;
  }

  let i = 0;
  function next () {
    return i < 10 ? i++ : null;
  }

  let ws = new Writable({ objectMode: true, highWaterMark: 1, write (c) {} });
  s.pipe(ws);

  // back pressure should be ~4, one for each step (rs, s and ws + an extra
  // that is currently blocked in the ws:write call.
  setTimeout(() => {
    t.equal(i, 4);
    t.end();
  }, 0);
});
