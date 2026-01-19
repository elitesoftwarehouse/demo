module.exports = new Proxy(
  function () {},
  {
    get: function (_target, prop) {
      if (prop === 'default') return {};
      // Return noop functions/components
      return function () {};
    },
  }
);
