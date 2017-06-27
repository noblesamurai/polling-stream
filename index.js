const { PassThrough } = require('stream');

class BatchStream extends PassThrough {
  constructor (fn, state = {}, opts) {
    super(Object.assign({}, opts, { objectMode: true }));
    this.fn = fn;
    this.state = state;
    this.finished = false;
    this.interval = opts.interval || 1000;
    this.poll();
  }
  poll () {
    if (this.finished) return;
    const batchStream = this.fn(this.state);
    batchStream.once('error', (err) => {
      this.finished = true;
      // emit error on the next tick to allow any pending data to be processed first.
      process.nextTick(this.emit.bind(this), 'error', err);
    });
    batchStream.once('terminate', () => {
      this.finished = true;
      // end on next tick
      process.nextTick(this.end.bind(this));
    });
    batchStream.once('end', () => {
      batchStream.unpipe(this);
      if (!this.finished) this.emit('sync');
      setTimeout(() => this.poll(), this.interval);
    });
    batchStream.pipe(this, { end: false });
  }
}

module.exports = function (fn, state = {}, opts) {
  return new BatchStream(fn, state, opts);
};
