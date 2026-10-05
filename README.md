# Text Placeholder Generator

A Figma plugin that scans selected text layers, detects what kind of
content each one should hold from the layer name or existing text, and
generates realistic placeholder data — grouped by domain (Fintech,
Commerce, Content, Social, People, Generic), previewed before writing,
and fully undoable.

## Status
In active development.

## Anonymous analytics

The plugin sends a small allowlist of anonymous product events to the shared PostHog project. Every event includes `plugin_name: text_placeholder`. It does not send file names, layer names, existing text, generated text, document IDs, or Figma user information.
