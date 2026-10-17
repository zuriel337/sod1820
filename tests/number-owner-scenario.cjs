const { installStorageEgressGuard } = require('./playwright-storage-egress-guard.cjs');

const CLOSED_FLAGS = [
  'lock_world', 'lock_heichal', 'lock_raziel_site', 'lock_life_journey', 'lock_books', 'lock_number',
].map((key) => ({ key, enabled: true, mode: 'all', message: `${key} בבנייה` }));
// Original explicit positive scenario. These flags never reach a product DB.
const OPEN_FLAGS = CLOSED_FLAGS.map((flag) => ['lock_world', 'lock_number'].includes(flag.key) ? { ...flag, enabled: false, message: '' } : flag);

async function installNumberOwnerScenario(context) {
  // Idempotent with ci-isolated-test: install before any app/init-script loads.
  await installStorageEgressGuard(context);
  await context.route('**/rest/v1/site_flags*', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([...OPEN_FLAGS, { key: 'lock_els', enabled: false, mode: 'all', message: '' }]),
  }));
}

module.exports = { installNumberOwnerScenario };
