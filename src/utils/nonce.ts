export function getNonce() {
  const cspNonce =
    document.querySelector<HTMLMetaElement>("meta[property=csp-nonce]")
      ?.nonce ?? "";

  return cspNonce;
}
