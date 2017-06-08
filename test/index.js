const it = require('tape');
const pollingStream = require('..');
const { Readable } = require('stream');

it('should be able to poll from a stream', function(t) {
  let s = pollingStream(fn, { start: 0, batch: 10 });
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
        console.log('pushing', j++);
        rs.push(state.start++);
        if (++i >= state.batch) rs.push(null)
      }
    });
    return rs;
  }

  let i = 0;
  s.on('data', (data) => {
    console.log('got', data);
    t.equal(i++, data);
  });
  s.on('end', () => {
    t.equal(i, 14);
    t.end();
  });
});
