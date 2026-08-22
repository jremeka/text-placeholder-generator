figma.showUI(__html__, { width: 420, height: 680 });

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