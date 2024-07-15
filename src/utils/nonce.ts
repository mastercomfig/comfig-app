export function getNonce() {
  if (typeof document === "undefined") {
    return "";
  }
  const cspNonce =
    document.querySelector<HTMLMetaElement>("meta[property=csp-nonce]")
      ?.nonce ?? "";

  return cspNonce;
}
