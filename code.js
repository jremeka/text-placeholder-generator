figma.showUI(__html__, { width: 420, height: 680 });

const POSTHOG_PROJECT_TOKEN = "phc_ur6gKBkRH2sxbedTFDS3jKgFYUXhDSrSfzpM9jYxdztx";
const POSTHOG_HOST = "https://eu.i.posthog.com";
const POSTHOG_PLUGIN_NAME = "text_placeholder";
const PLUGIN_VERSION = "1.0.0";
const ANALYTICS_ID_KEY = "text-placeholder-anonymous-id";
const ANALYTICS_EVENTS = new Set([
  "plugin_opened",
  "category_group_viewed",
  "placeholder_fill_completed",
  "undo_used",
  "operation_failed",
]);
const ANALYTICS_PROPERTIES = new Set([
  "group",
  "category",
  "layer_count",
  "success_count",
  "failure_count",
  "feature",
]);

async function analyticsDistinctId() {
  let id = await figma.clientStorage.getAsync(ANALYTICS_ID_KEY);
  if (!id) {
    id = `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await figma.clientStorage.setAsync(ANALYTICS_ID_KEY, id);
  }
  return id;
}

async function captureAnalytics(eventName, properties = {}) {
  if (!ANALYTICS_EVENTS.has(eventName)) return;
  const safeProperties = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (ANALYTICS_PROPERTIES.has(key) && ["string", "number", "boolean"].includes(typeof value)) {
      safeProperties[key] = value;
    }
  });
  try {
    const distinctId = await analyticsDistinctId();
    await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_PROJECT_TOKEN,
        distinct_id: distinctId,
        event: eventName,
        properties: {
          ...safeProperties,
          plugin_name: POSTHOG_PLUGIN_NAME,
          plugin_version: PLUGIN_VERSION,
          $process_person_profile: false,
        },
      }),
    });
  } catch (_) {
    // Analytics must never interrupt the plugin.
  }
}

void captureAnalytics("plugin_opened");

let nodeCache = new Map();

function scanTextLayers(node, results) {
  nodeCache.set(node.id, node);

  if (node.type === "TEXT") {
    results.push({
      layerId: node.id,
      layerName: node.name,
      originalText: node.characters
    });
    return;
  }

  if ("children" in node) {
    node.children.forEach((child) => scanTextLayers(child, results));
  }
}

function getSelectionTextLayers() {
  nodeCache = new Map();
  const results = [];
  figma.currentPage.selection.forEach((node) => scanTextLayers(node, results));
  return results;
}

function postSelectionUpdate() {
  figma.ui.postMessage({ type: "selection-updated", layers: getSelectionTextLayers() });
}

figma.on("selectionchange", postSelectionUpdate);
postSelectionUpdate();

async function writeOne(item) {
  const node = nodeCache.get(item.layerId);
  if (!node) {
    return { ...item, success: false, error: "Layer not found, try reselecting" };
  }

  try {
    if (node.fontName && typeof node.fontName !== "symbol") {
      await figma.loadFontAsync(node.fontName);
    } else {
      const rangeFont = node.getRangeFontName(0, 1);
      await figma.loadFontAsync(rangeFont);
    }

    node.characters = item.value;
    return { ...item, success: true };
  } catch (e) {
    return { ...item, success: false, error: String(e) };
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "analytics") {
    void captureAnalytics(msg.eventName, msg.properties);
    return;
  }

  if (msg.type === "write") {
    const writeResults = [];
    for (const item of msg.items) {
      const result = await writeOne(item);
      writeResults.push(result);
    }
    figma.ui.postMessage({ type: "write-complete", results: writeResults, purpose: msg.purpose || "apply" });
  }

  if (msg.type === "resize") {
    figma.ui.resize(msg.width, msg.height);
  }

  if (msg.type === "inspect") {
    const node = nodeCache.get(msg.layerId);
    if (node) {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  }
};
