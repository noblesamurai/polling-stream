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
    // Errors in the underlying stream(s) are passed on.
    batchStream.once('error', (err) => {
      this.finished = true;
      // emit error on the next tick to allow any pending data to be processed
      // first.
      process.nextTick(this.emit.bind(this), 'error', err);
    });
    // Termination of the underlying stream closes the destination stream.
    // This is a custom event you can emit.
    batchStream.once('terminate', () => {
      this.finished = true;
      // end on next tick
      process.nextTick(this.end.bind(this));
    });
    // If the underlying stream ends, then we are going to unpipe without
    // passing on the end event and wait before polling again.
    // This makes it appear downstream as if the stream has not ended but just
    // has no data for the present.
    batchStream.once('end', () => {
      batchStream.unpipe(this);
      if (!this.finished) this.emit('sync');
      setTimeout(() => this.poll(), this.interval);
    });
    // Connect batchStream to this, but do not automatically pass end event
    // through.
    batchStream.pipe(this, { end: false });
  }
}

module.exports = function (fn, state = {}, opts) {
  return new BatchStream(fn, state, opts);
};
