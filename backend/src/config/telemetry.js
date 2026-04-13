// Must be the very first require in the application
// Application Insights auto-collects HTTP requests, dependencies, exceptions
const appInsights = require('applicationinsights');

function initTelemetry() {
  const key = process.env.APPINSIGHTS_KEY;
  if (!key || key === 'your-instrumentation-key-here') {
    console.warn('[telemetry] APPINSIGHTS_KEY not set — telemetry disabled');
    return null;
  }

  appInsights
    .setup(key)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .start();

  console.log('[telemetry] Application Insights initialized');
  return appInsights.defaultClient;
}

module.exports = { initTelemetry, appInsights };
