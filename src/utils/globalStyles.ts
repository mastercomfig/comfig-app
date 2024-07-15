const globalStyleSheetCache = {};

export function getGlobalStyleSheets() {
  const page = window.location.toString();
  if (globalStyleSheetCache[page]) {
    return globalStyleSheetCache[page];
  }
  const globalSheets = Array.from(document.styleSheets).map((x) => {
    const sheet = new CSSStyleSheet();
    const css = Array.from(x.cssRules)
      .map((rule) => rule.cssText)
      .join(" ");
    sheet.replaceSync(css);
    return sheet;
  });

  globalStyleSheetCache[page] = globalSheets;

  return globalSheets;
}

export function addGlobalStylesToShadowRoot(shadowRoot: ShadowRoot) {
  shadowRoot.adoptedStyleSheets.push(...getGlobalStyleSheets());
}
