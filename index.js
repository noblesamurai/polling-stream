const { PassThrough } = require('stream');

class PollingStream extends PassThrough {
  constructor (create, initState, updateState, opts = {}) {
    super(Object.assign({}, opts, { objectMode: true }));
    this.create = create;
    this.updateState = updateState;
    this.state = initState;
    this.finished = false;
    this.interval = opts.interval || 1000;
    this.poll();
  }
  write (rec, enc, cb) {
    this.state = this.updateState(rec, this.state);
    return super.write(rec, enc, cb);
  }
  poll () {
    if (this.finished) return;
    const inputStream = this.create(this.state);
    // Errors in the underlying stream(s) are passed on.
    inputStream.once('error', (err) => {
      this.finished = true;
      // emit error on the next tick to allow any pending data to be processed
      // first.
      process.nextTick(this.emit.bind(this), 'error', err);
    });
    // Termination of the underlying stream closes the destination stream.
    // This is a custom event you can emit.
    inputStream.once('terminate', () => {
      this.finished = true;
      // end on next tick
      process.nextTick(this.end.bind(this));
    });
    // If the underlying stream ends, then we are going to unpipe without
    // passing on the end event and wait before polling again.
    // This makes it appear downstream as if the stream has not ended but just
    // has no data for the present.
    inputStream.once('end', () => {
      inputStream.unpipe(this);
      if (!this.finished) this.emit('sync');
      setTimeout(() => this.poll(), this.interval);
    });
    // Connect inputStream to this, but do not automatically pass end event
    // through.
    inputStream.pipe(this, { end: false });
  }
}

module.exports = function (...args) {
  return new PollingStream(...args);
};
