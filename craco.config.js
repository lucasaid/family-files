  module.exports = {
    webpack: {
      configure: (config) => {
        config.ignoreWarnings = [/Failed to parse source map/];
        return config;
      },
    },
  };