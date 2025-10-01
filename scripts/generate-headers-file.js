import fs from "node:fs";
import { resolve } from "node:path";

const rootDir = new URL("..", import.meta.url).pathname;
const nonce = fs.readFileSync(resolve(rootDir, "generated", "nonce.txt"), {
  encoding: "utf-8",
});

const sriHashesModule = resolve(rootDir, "generated", "sriHashes.mjs");
const sriHashesScript = resolve(rootDir, "generated", "sriHashes.js");
fs.copyFileSync(sriHashesModule, sriHashesScript);
const sriHashes = await import("../generated/sriHashes.js");
const headersFilePath = resolve(rootDir, "public", "_headers");
let headersFile = fs.readFileSync(headersFilePath, {
  encoding: "utf-8",
});
const scriptSrcHashes = `'${sriHashes.inlineScriptHashes.join("' '")}'`;
headersFile = headersFile.replace("{{SCRIPT_SRC_HASHES}}", scriptSrcHashes);
// Not ideal, but protects against non-targeted attacks. We don't really have options for non-dynamic content.
const srcNonce = `'nonce-${nonce}'`;
headersFile = headersFile.replaceAll("{{SRC_NONCE}}", srcNonce);
const styleSrcElementHashes = `'${sriHashes.inlineStyleHashes.join("' '")}'`;
headersFile = headersFile.replace(
  "{{STYLE_SRC_ELEM_HASHES}}",
  styleSrcElementHashes,
);
const headersFileWritePath = resolve(rootDir, "dist", "_headers");
fs.writeFileSync(headersFileWritePath, headersFile);
