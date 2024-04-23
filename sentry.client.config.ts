import * as Sentry from "@sentry/browser";
import {
  captureConsoleIntegration,
  extraErrorDataIntegration,
} from "@sentry/integrations";

Sentry.init({
  dsn: "https://42c25ee2fb084eb5a832ee92d97057d5@o182209.ingest.us.sentry.io/6265934",
  integrations: [captureConsoleIntegration(), extraErrorDataIntegration()],
});
