const { AsyncLocalStorage } = require('async_hooks');

const context = new AsyncLocalStorage();

const getContext = () => context.getStore();

const runWithContext = (data, callback) => {
  return context.run(data, callback);
};

module.exports = {
  context,
  getContext,
  runWithContext,
};
