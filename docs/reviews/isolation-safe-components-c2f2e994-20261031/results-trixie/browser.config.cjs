module.exports = {
  testDir: '/source/tests',
  workers: 1,
  retries: 0,
  outputDir: '/evidence/browser-artifacts',
  reporter: [['line'], ['json', {outputFile: '/evidence/browser-result.json'}]],
  use: {
    headless: true,
    launchOptions: {
      executablePath: '/usr/lib/chromium/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'],
    },
  },
};
