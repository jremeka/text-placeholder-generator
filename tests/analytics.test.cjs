const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(root, 'ui.html'), 'utf8');
const code = fs.readFileSync(path.join(root, 'code.js'), 'utf8');
const start = ui.indexOf('// ---------- Anonymous PostHog analytics ----------');
const end = ui.indexOf('// ---------- Manual resize handle ----------');
const analyticsSource = ui.slice(start, end);

test('the UI routes only allowlisted analytics properties to the main plugin runtime', () => {
  const messages = [];
  const context = {
    parent: { postMessage: message => messages.push(message.pluginMessage) },
    Object,
    Set,
  };
  vm.createContext(context);
  vm.runInContext(`${analyticsSource}\ntrackAnalytics('placeholder_fill_completed', { category: 'name', layer_count: 2, file_name: 'Private file' });`, context);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'analytics');
  assert.equal(messages[0].eventName, 'placeholder_fill_completed');
  assert.equal(messages[0].properties.category, 'name');
  assert.equal(messages[0].properties.layer_count, 2);
  assert.equal(messages[0].properties.file_name, undefined);
});

test('opening the plugin sends a source-tagged event from the main Figma runtime', async () => {
  const calls = [];
  const storage = new Map();
  const figma = {
    showUI() {},
    clientStorage: {
      async getAsync(key) { return storage.get(key); },
      async setAsync(key, value) { storage.set(key, value); },
    },
    currentPage: { selection: [] },
    ui: { postMessage() {}, onmessage: null, resize() {} },
    on() {},
    viewport: { scrollAndZoomIntoView() {} },
    async loadFontAsync() {},
  };
  const context = {
    figma,
    __html__: '<html></html>',
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200 }; },
    Date,
    Math,
    Object,
    Set,
    String,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://eu.i.posthog.com/i/v0/e/');
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.event, 'plugin_opened');
  assert.match(payload.distinct_id, /^anon-/);
  assert.equal(payload.properties.plugin_name, 'text_placeholder');
  assert.equal(payload.properties.$process_person_profile, false);

  await figma.ui.onmessage({ type: 'analytics', eventName: 'category_group_viewed', properties: { group: 'fintech', file_name: 'Private file' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.length, 2);
  const routed = JSON.parse(calls[1].options.body);
  assert.equal(routed.event, 'category_group_viewed');
  assert.equal(routed.properties.group, 'fintech');
  assert.equal(routed.properties.file_name, undefined);
});
