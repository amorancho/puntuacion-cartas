import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const projectUrl = new URL("https://usuario.github.io/nombre-repo/");

test("los recursos públicos de index.html son relativos al subdirectorio de Pages", () => {
  const html = readFileSync(join(projectRoot, "index.html"), "utf8");
  const publicUrls = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
    .map(([, value]) => value)
    .filter((value) => !value.startsWith("#"));

  assert.ok(publicUrls.length > 0);
  for (const value of publicUrls) {
    assert.equal(value.startsWith("/"), false, `${value} no debe ser una ruta absoluta`);
    assert.ok(new URL(value, projectUrl).pathname.startsWith("/nombre-repo/"));
  }
});

test("start_url, scope e iconos del manifest permanecen dentro del proyecto", () => {
  const manifest = JSON.parse(readFileSync(join(projectRoot, "manifest.webmanifest"), "utf8"));
  const publicUrls = [manifest.id, manifest.start_url, manifest.scope, ...manifest.icons.map(({ src }) => src)];

  for (const value of publicUrls) {
    assert.equal(value.startsWith("/"), false, `${value} no debe ser una ruta absoluta`);
    assert.ok(new URL(value, projectUrl).pathname.startsWith("/nombre-repo/"));
  }
  assert.equal(new URL(manifest.start_url, projectUrl).pathname, "/nombre-repo/");
  assert.equal(new URL(manifest.scope, projectUrl).pathname, "/nombre-repo/");
});

test("el App Shell usa rutas relativas existentes dentro del scope", () => {
  const source = readFileSync(join(projectRoot, "service-worker.js"), "utf8");
  const serializedShell = source.match(/const APP_SHELL = (\[[\s\S]*?\]);/)?.[1];
  assert.ok(serializedShell, "No se encontró APP_SHELL");
  const appShell = JSON.parse(serializedShell);

  for (const value of appShell) {
    assert.equal(value.startsWith("/"), false, `${value} no debe ser una ruta absoluta`);
    assert.ok(new URL(value, projectUrl).pathname.startsWith("/nombre-repo/"));
    assert.equal(existsSync(join(projectRoot, value)), true, `No existe ${value}`);
  }
  assert.match(source, /self\.registration\.scope/);
});

test("el registro del Service Worker parte de document.baseURI", () => {
  const source = readFileSync(join(projectRoot, "src", "js", "app.js"), "utf8");
  assert.match(source, /new URL\("\.\/", document\.baseURI\)/);
  assert.match(source, /register\(serviceWorkerUrl, \{ scope: appBaseUrl\.pathname \}\)/);
});

