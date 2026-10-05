# Text Placeholder Generator analytics

Last updated 2 October 2026. Shared setup, privacy rules and the scoping rule for all plugins are in `../ANALYTICS.md`. Read that first.

- PostHog dashboard [Text Placeholder overview](https://eu.posthog.com/project/232362/dashboard/992492) (ID 992492)
- `plugin_name` value `text_placeholder`
- Scope filter `properties.plugin_name = 'text_placeholder'`
- Core value moment is a completed fill (`placeholder_fill_completed`)

## How events are sent

The UI never talks to PostHog directly. `ui.html` filters the event and its properties against allowlists and posts an `analytics` message to `code.js`. `code.js` filters again, reads or creates an anonymous ID in `figma.clientStorage` under the key `text-placeholder-anonymous-id`, and sends the request with `fetch`. `plugin_opened` is sent from `code.js` on launch, so it does not depend on the UI loading.

Every event includes `plugin_name`, `plugin_version` (currently `1.0.0`) and `$process_person_profile = false`.

Status on 2 October 2026. Live `plugin_opened` and `placeholder_fill_completed` events arrived from the plugin runtime with a persisted `anon-` ID.

## Events

| Event | Sent from | When | Properties |
| --- | --- | --- | --- |
| `plugin_opened` | `code.js` | Plugin launches | none |
| `category_group_viewed` | `ui.html` | A category tab chip is clicked | `group` |
| `placeholder_fill_completed` | `ui.html` | A fill write finishes | `category`, `layer_count`, `success_count`, `failure_count` |
| `undo_used` | `ui.html` | An undo write finishes | `layer_count`, `success_count`, `failure_count` |
| `operation_failed` | `ui.html` | A fill had one or more failed layers | `feature` (`fill`), `failure_count` |

Allowed property keys are `group`, `category`, `layer_count`, `success_count`, `failure_count`, `feature`. Anything else is dropped in both the UI and `code.js`.

## Dashboard tiles

| Tile | Short ID | What it answers |
| --- | --- | --- |
| TP · Monthly active installs | PJ3pvcR5 | How many installs used the plugin in the last 30 days, compared with the 30 days before |
| TP · Weekly active installs | g0fWlwzkgItO | Weekly installs that opened the plugin |
| TP · Activation and repeat use funnel | EwC4c0KLwLZC | Open, first fill, second fill within 14 days |
| TP · Installs that filled text | 5433K7i9AZat | Daily installs reaching the core value moment |
| TP · Total fills | 9iSKW5hz7H6l | Daily fill volume |
| TP · Text layers filled | 36O2xU21XDX5 | Sum of `success_count`, the plugin's output |
| TP · Fill success rate | nU73zqtV | `success_count` over `layer_count`. Drops point to fonts or locked layers |
| TP · Average layers per fill | poONie30 | Typical selection size |
| TP · Undo rate | 5WB3r2Pt | Undos over fills, a dissatisfaction signal |
| TP · Most used categories | 1QqydJioW5b0 | Which content types get used |
| TP · Category groups browsed | kU2dhtMJ | Which tab groups people open |
| TP · Weekly retention after first fill | 2CZDuxLF | Share of installs that come back in later weeks |
| TP · Stickiness (days used per week) | ZJQaZCdT | How many days a week installs fill text |
| TP · Plugin version adoption | qBaWUM6G | Weekly installs by `plugin_version` |
| TP · Failed operations | OcKEJQoQvGo0 | `operation_failed` count |
| TP · Installs by country | 1HHJzZb4 | World map of installs |

## Changes made to the original dashboard

The dashboard was created earlier on 2 October from a generic template. Four of its tiles counted every event in the project, so they mixed in Value Linter and Design Starter Kit traffic. These were removed.

- Daily active users (all events)
- New vs returning users (all events, and based on `$is_identified`, which is meaningless here because persons are not processed)
- Top events (all events)
- DAU day over day change (all events)

"Text layers successfully filled" used `icontains` on `plugin_name`. It now uses an exact match. The activation funnel gained a third step (second fill). All existing tiles were renamed with the `TP ·` prefix and tagged `text-placeholder`.

## Current data (2 October 2026)

One install, two fills (`accountNumber` and `currencyAmount`), no failures, no undos. `category_group_viewed`, `undo_used` and `operation_failed` have not fired yet, so their tiles show no data until they do.

## Ideas for more insight

- Add a `source` property (`builtin` or `custom`) to `placeholder_fill_completed` if custom lists are introduced.
- Add `first_run` on `plugin_opened` when the anonymous ID is first created.
- Consider a `preview_shown` event if the UI adds a preview step, so you can measure preview to apply conversion.
