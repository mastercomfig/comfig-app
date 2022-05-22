import { defineConfig } from 'astro/config';

import preact from "@astrojs/preact";
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  integrations: [preact(), partytown()]
});