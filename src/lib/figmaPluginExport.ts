import JSZip from "jszip";

type PluginVariant = "dev" | "community";

async function loadPluginTextFiles() {
  const [manifestMod, codeMod, uiMod, readmeMod] = await Promise.all([
    import("../../figma-plugin/manifest.json?raw"),
    import("../../figma-plugin/code.js?raw"),
    import("../../figma-plugin/ui.html?raw"),
    import("../../figma-plugin/README.md?raw"),
  ]);

  return {
    manifestRaw: manifestMod.default as string,
    codeJsRaw: codeMod.default as string,
    uiHtmlRaw: uiMod.default as string,
    readmeRaw: readmeMod.default as string,
  };
}

async function loadPluginIcons() {
  try {
    const [icon16Mod, icon128Mod] = await Promise.all([
      import("../../figma-plugin/icon-16.png"),
      import("../../figma-plugin/icon-128.png"),
    ]);

    const [icon16Response, icon128Response] = await Promise.all([
      fetch(icon16Mod.default),
      fetch(icon128Mod.default),
    ]);

    if (!icon16Response.ok || !icon128Response.ok) return null;

    const [icon16Blob, icon128Blob] = await Promise.all([
      icon16Response.blob(),
      icon128Response.blob(),
    ]);

    return { icon16Blob, icon128Blob };
  } catch {
    // Icons are optional for dev testing.
    return null;
  }
}

function buildManifest(manifestRaw: string, variant: PluginVariant) {
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;

  if (variant === "dev") {
    // Avoid collisions with the published Community plugin.
    delete (manifest as any).id;
    manifest.name = "UX Probe - Research & Audit (Dev)";

    if (Array.isArray((manifest as any).menu)) {
      (manifest as any).menu = (manifest as any).menu.map((item: any) => ({
        ...item,
        name: "Open UX Probe (Dev)",
      }));
    }
  }

  return JSON.stringify(manifest, null, 2);
}

/**
 * Downloads a ZIP containing the Figma plugin.
 *
 * Default is `dev` so Figma installs it as a separate development plugin
 * (and won't reuse the Community plugin code by ID).
 */
export async function downloadFigmaPlugin(variant: PluginVariant = "dev") {
  const zip = new JSZip();

  const [{ manifestRaw, codeJsRaw, uiHtmlRaw, readmeRaw }, icons] =
    await Promise.all([loadPluginTextFiles(), loadPluginIcons()]);

  zip.file("manifest.json", buildManifest(manifestRaw, variant));
  zip.file("code.js", codeJsRaw);
  zip.file("ui.html", uiHtmlRaw);
  zip.file("README.md", readmeRaw);

  if (icons) {
    zip.file("icon-16.png", icons.icon16Blob);
    zip.file("icon-128.png", icons.icon128Blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);

  const link = document.createElement("a");
  link.href = url;
  link.download =
    variant === "dev" ? "ux-probe-figma-plugin-dev.zip" : "ux-probe-figma-plugin.zip";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
