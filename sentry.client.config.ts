import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://42c25ee2fb084eb5a832ee92d97057d5@o182209.ingest.us.sentry.io/6265934",
  integrations: [
    Sentry.replayIntegration({
      networkDetailAllowUrls: [
        window.location.origin,
        "localhost",
        "https://api.comfig.app/",
        "https://worker.comfig.app/",
      ],
    }),
    Sentry.browserTracingIntegration({
      enableInp: true,
    }),
    Sentry.browserProfilingIntegration(),
    Sentry.captureConsoleIntegration({
      levels: ["warn", "error", "assert"],
    }),
    Sentry.extraErrorDataIntegration(),
    Sentry.httpClientIntegration(),
    Sentry.reportingObserverIntegration(),
    Sentry.contextLinesIntegration(),
    Sentry.sessionTimingIntegration(),
  ],
  tracesSampleRate: 0.1,
  tracePropagationTargets: [
    "localhost",
    /https:\/\/api.comfig.app/,
    /https:\/\/worker.comfig.app/,
  ],
  profilesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
