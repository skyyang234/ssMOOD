const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  devServer: {
    port: 8787,
    proxy: {
      '/php': {
        target: 'http://172.16.165.245',
        changeOrigin: true,
        // Keep the dev proxy from timing out before the backend AI pipeline finishes.
        timeout: 180000,
        proxyTimeout: 180000,
      },
    },
  },
});
