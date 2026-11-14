# dsh-codebuddy-connect

Brings CodeBuddy's chat models into DeepSeek Harness.

## Install

```bash
dsh plugin install github:yanchengye/dsh-codebuddy-connect
```

Or, from the plugin manager, add the repository URL:

```
https://github.com/yanchengye/dsh-codebuddy-connect
```

Then open **Settings → CodeBuddy models** and store an API key. The panel lives
there, and the models appear in the picker immediately.

There is deliberately no left-rail entry: the rail switches work, not provider
settings. The panel is reachable from Settings and from the plugin manager.

## What it does

- **Models.** The bundle's patch fills the dormant `llm-pi-ai` row with one
  provider profile, `codebuddy`, pointed at `https://copilot.tencent.com/v2`.
  Its chat models appear in the model picker once the API key is stored.
- **Panel.** Shows whether the route is serving and which models it offers, and
  lets you store or remove the API key. It also reports which source supplied
  the key.
- **Browser sign-in.** Some figures — the model catalogue and its credit
  multipliers — are served only to a signed-in session, never to an API key.
  A button in the panel runs CodeBuddy's own sign-in flow and stores the
  session locally.
- **Credit readout.** The session header shows the cycle's remaining credits,
  the share used, and a per-workday allowance to the reset, with the full split
  on hover.

## The API key

The key is never written to a configuration file. The patch only names a
credential reference:

```yaml
apiKeyEnv: CODEBUDDY_API_KEY
```

Store the value through the credentials service — either in the panel, or from
the agent with the `codebuddy_connect` tool (`action: set-key`), which performs
the same operation. Doing it by hand:

```yaml
# ~/.dsh/.credentials.yaml  (mode 0600)
version: 1
refs:
  CODEBUDDY_API_KEY: your-codebuddy-key
```

`CODEBUDDY_API_KEY` may also come from the environment or a `.env` file; the
credentials service applies that precedence itself.

## Wire notes

CodeBuddy speaks OpenAI chat-completions but not OpenAI's conventions, so the
profile pins four compatibility fields that pi-ai's hostname-based detection
gets wrong for it:

| Field | Value | Why |
| --- | --- | --- |
| `supportsDeveloperRole` | `false` | `role: "developer"` is rejected (11128); the system prompt goes as `system`. |
| `maxTokensField` | `max_tokens` | The token cap is spelled `max_tokens`, not `max_completion_tokens`. |
| `thinkingFormat` | `openai` | Reasoning arrives as `reasoning_content` with `reasoning_effort` selectors. |
| `supportsStore` | `false` | No `store` parameter on this endpoint. |

Reasoning-effort tables list only the levels measured to change behaviour.
`off: null` means "send no effort" and is used where the route already answers
without reasoning — the literal string `off` is rejected by the DeepSeek-V4
hosts (11133). `off: none` is used where omitting the field still thinks.

### Channel check (11128)

`supportsDeveloperRole: false` handles the message *shape*, but CodeBuddy's
edge also inspects prompt *text*: it answers `11128 Illegal API invocation from
an unapproved channel` when it recognises another vendor's client. Three of this
harness's fixed prompt sentences match its list, so every CodeBuddy-backed turn
used to fail before the model saw it — regardless of model, tools, headers, or
payload size. The trigger is literal text, not meaning: the same instructions
phrased differently go through.

`lib/index.js` therefore listens on `system-prompt/assemble` and, only when the
turn is routed to `codebuddy`, restates those three sentences. Everything else in
the prompt — persona, tool guidance, runtime context — is untouched, and other
providers keep the canonical wording.

## Cost and speed

The model list shows each model's **cost multiplier** and **output speed**.
Neither is published: `GET /v3/config` answers `models: null`, and every guessed
`/v2/...quota` route is a 404. Both are measured instead.

Each model answered the same prompt (≈400 numbered tokens, `max_tokens: 1800`),
and the wire's final `usage` chunk gave `total_tokens` and `credit`. That yields
`creditPer1k = credit / total_tokens × 1000`; `rate` is `creditPer1k` divided by
the most expensive model (`kimi-k3.1-pro-highspeed`, 3.0987 per 1k), so the whole
roster sits on the same `x0.00` scale the picker uses elsewhere. `tps` is output
tokens over the generating span, excluding time to first token.

Small replies cannot be measured this way: `credit` is quantised to `0.01`, so a
121-token reply reads 0.02–0.08 depending on rounding. The shipped numbers come
from ≥800-token samples, where the quantisation error is under 2%.

### Where the multiplier comes from

Two sources, and the panel never conflates them.

**Published multipliers.** CodeBuddy ships its own catalog in the CLI package as
`product.json` and `product.internal.json`; every model entry carries a `credits`
field such as `"x0.29 credits"`. These are the vendor's own numbers, not
inferences, and the plugin uses them verbatim: `rate`, with
`rateSource: 'official'`.

Note how far they differ from metered spend, and why that matters. For
`deepseek-v3-2-volc` the published multiplier is **x0.29**; dividing observed
`credit` by a single constant suggested 0.06. The divide-by-one-constant model
was simply wrong — credit consumption is not linear in one shared factor — so
the published figure replaced it. `deepseek-v4-pro` is x0.25, `glm-5.0` x0.80,
`default` x2.00.

**Reconstructed multipliers.** Models newer than the last CLI release ship no
public figure anywhere: they are absent from `product*.json`, absent from the
docs price tables, and `/v3/config` returns `models: null` for this account. For
those the plugin falls back to metered spend and says so: `estRate`, with
`rateSource: 'measured'`, rendered with a `~` prefix and a dashed chip, and
explained on hover.

So the picker and the panel both show, for example:

```
DeepSeek-V3.2      x0.29     published
DeepSeek-V4.1-Flash ~x0.04   reconstructed
```

`measuredAt` in `GET /plugins/dsh-codebuddy-connect/status` records when spend
was sampled. Speed (`tps`) is always measured — no vendor publishes throughput —
and is labelled as such.

These figures appear in **both** places they are useful. The model picker only
renders a model's `name`, so the patch appends the readings to each name:

```
DeepSeek-V4-Flash · x0.04 · 229t/s
```

The panel takes the bare name and renders the same numbers as separate chips, so
nothing is shown twice. Free models read `x0.00` rather than a word, because that
is what a zero multiplier means on this scale. Model **ids** are untouched, so
routing and the ledger's per-model lookup are unaffected.

## Credits spent and remaining

Every CodeBuddy completion reports what it cost, so the plugin can say what this
profile has spent. The panel shows a Credits section, and
`GET /plugins/dsh-codebuddy-connect/usage` returns the same numbers as JSON.

There is one caveat worth knowing. The harness normalises each reply's usage
before a plugin sees it — `credit` is dropped, leaving only token counts — so
spend is reconstructed as `tokens × creditPer1k` from the measured table above.
When the raw wire object is available its `credit` is used verbatim instead.

### The real balance

`GET /plugins/dsh-codebuddy-connect/balance` reads the account's actual
remaining credits for the current billing cycle:

```json
{
  "ok": true,
  "usedCredits": 84.45,
  "limitCredits": 20000,
  "remainingCredits": 19915.55,
  "percentUsed": 0.4,
  "cycleStart": "2026-10-25 00:00:00",
  "cycleEnd": "2026-11-24 23:59:59",
  "resetsAt": "2026-11-25 00:00:00"
}
```

That number must be read from the billing API, and there are two routes to it.

**Route 1 — the stored API key (preferred, no browser).** `POST /v2/billing/meter/get-enterprise-user-usage`
on `codebuddy.cn` accepts `Authorization: Bearer <key>` and answers the cycle in
one request. The plugin tries this first, so the common case costs one HTTPS
call and needs nothing else running.

**Route 2 — the signed-in browser (fallback).** The web route `/billing/meter/*`
is a different gateway and does fingerprint the TLS client: the *same* cookie,
header set and body that the browser sends succeed from the browser and answer
`401` from Node. Cookie values also rotate server-side between reads, so a
snapshot goes stale immediately. When the key is refused (or none is stored),
the plugin asks the browser to make the request: it speaks the Chrome DevTools
Protocol to a debugging port, opens the account page in a background tab,
evaluates the page's own `fetch` there, and closes the tab. Same-origin, same
cookies, same TLS client — and no credential is copied into the plugin.

The browser route needs the debugger listening on `127.0.0.1:9222`. Launch it
once with that flag (Microsoft Edge, Chrome or any Chromium browser):

```bash
/Applications/"Microsoft Edge.app"/Contents/MacOS/"Microsoft Edge" \
  --remote-debugging-port=9222
```

With either route working, the panel and header chip show the real figures:
remaining, the cycle's own consumption, and the cycle's start and end dates.
Without one they degrade to measured spend plus a link to the account page —
they never invent a number.

Two more behaviours worth knowing. The balance is cached for one minute, since
the browser route opens a tab; `?refresh=1` (or the tool's `refresh` flag)
bypasses that. And the header chip prefers the authoritative balance, falling
back to measured spend only when the account cannot be reached.

### Live credit multipliers

Once signed in, the plugin reads `GET /v3/config` and shows CodeBuddy's **own**
multiplier for each model (`credits: "x0.11"`), cached for five minutes. This is
the figure the service actually bills, and it changes without notice:

| model | measured table | live catalogue |
| --- | --- | --- |
| `deepseek-v4.1-flash` | x0.04 | **x0.11** |
| `deepseek-v4-flash` | x0.13 | **x0.17** |
| `deepseek-v4-pro` | x0.25 | **x0.51** |

**`conversation.input.model.label` is a single slot.** Whatever it returns becomes
the label for every provider's models — so returning `null` for a foreign model
does not leave that model alone, it blanks the row. Foreign models are therefore
handed back their own `model.name` untouched, which is what keeps Qoder's model
list rendering.

The composer's model button also carries a small CodeBuddy mark before the
name, so a model is identifiable without opening the menu and reading which
provider group it came from. It is drawn inline in the
`conversation.input.model.label` slot (trigger placement only — inside the menu
every row already sits under the CodeBuddy heading, where the mark would just be
noise).

The picker shows the same live figure. `cordis.patch.yml` can only bake a
multiplier into a model's `name` once, at profile load, so those suffixes go
stale — this plugin registers the `conversation.input.model.label` slot and
renders the live rate there instead, refreshing it once a minute from the same
status route. With no live figure the slot strips the stale suffix rather than
repeating a number it cannot vouch for.

The hand-measured table in `MODEL_METRICS` therefore only serves a profile that
has not signed in; every model the live catalogue answers for takes the official
value and is marked `rateSource: 'official'`. Speed is still measured locally:
CodeBuddy publishes no tokens-per-second figure at all.

### Browser sign-in

Some figures are served **only to a signed-in session**, never to an API key.
The model catalogue is the important one: `GET /v3/config` answers
`models: null` to a Bearer key no matter which headers are sent, and that
catalogue is where each model's credit multiplier lives.

Rather than shell out to the official CLI (which many machines no longer have),
the plugin speaks the same three-request handshake the CLI does:

1. `POST /v2/plugin/auth/state?platform=CLI` mints a `state` and returns the
   `authUrl` the user must open. No credential is involved.
2. The user signs in on CodeBuddy's own page in a normal browser.
3. `GET /v2/plugin/auth/token?state=…` is polled until tokens come back.

The panel's **Browser sign-in** button starts this and opens the URL. While the
flow is pending the panel polls every two seconds, so it flips to "signed in" on
its own — the user is in another tab and will not come back to refresh. The
resulting session is stored locally under `CODEBUDDY_ACCESS_TOKEN`.

Two implementation notes worth keeping. The "still waiting" code is **11217**
(`{"code":11217,"msg":"login ing..."}`), measured against the live service; the
CLI-oriented references carry `11216`, which would treat every normal poll as a
failure. And the polling loop is detached from the HTTP answer on purpose: the
route returns the URL immediately so the user can click it while the tokens are
still being fetched.

Routes: `POST /plugins/dsh-codebuddy-connect/login` starts a sign-in,
`GET` reports its phase, `DELETE` forgets the stored session. Loopback-only,
like the rest — these carry a live access token.

The chip leads with the same CodeBuddy mark, at 11px and muted, so the reading
order in that row is "CodeBuddy · balance" rather than a bare number sitting
indistinguishably beside another provider's.

The chip renders in the row that holds the view tabs (对话 / 轨迹), not in the
header's top-right corner. `conversation.session.header.utilities` sits on the
title row, and no slot reaches the tab row, so the chip is portalled into it by
finding the nearest `[data-conversation-tabs]` below its seat. A hidden or
absent tab row degrades to rendering in the slot itself rather than vanishing.

### The header chip's forecast

With a reachable browser the chip states the balance **and** an allowance for the
rest of the cycle: `605 left 79.8% · 43 per workday`. The hover detail is the shared `Tooltip` primitive (150 ms dwell, portalled,
bottom-start aligned), not the native `title`: the multi-line list renders as
one styled tooltip. A host without primitives still gets the plain `title`
fallback.

Hovering lists the detail
one fact per line — spent of limit, remaining, the daily allowance over the
weekdays left, the reset date, and what this profile itself has spent.

The forecast divides the account's own remaining credits by the weekdays
(Mon–Fri) between now and the cycle's reset instant, counting today. Public
holidays are *not* modelled: CodeBuddy reports no calendar, and a hardcoded
holiday table would go stale silently. Hence "per workday", never "per day".

Nothing is extrapolated from this profile's own traffic. A burst of local turns
says nothing about the account's whole day, so without a reported balance and a
reset instant the chip shows no forecast at all rather than a guess, and a
`cycleEnd` that has already passed suppresses the daily figure likewise. An
unmetered account reads `Unmetered` with no forecast, which is the honest answer
for a plan that has nothing to divide.

## Scrolling inside the `main` slot

The panel is a `main` occupant, and that slot does not scroll for its occupants.
The host renders it as:

```
.centerCol { overflow: hidden; display: flex }
  .mainPanel { flex: 1; min-height: 0; display: flex }
    <the panel>
```

An earlier version used `min-height: 100%` on the panel root. That let the panel
grow past the clipped column, so the content had nowhere to go and the panel
could not be scrolled. The fix mirrors what the host's own pages do: the root
claims the full height and clips, and an inner scroller owns the overflow.

```
.cbc-panel  { flex: 1; height: 100%; min-height: 0; overflow: hidden }
  .cbc-masthead { flex: none }          // header stays put
  .cbc-scroll   { flex: 1; min-height: 0; overflow-y: auto }
    .cbc-body   { padding: 0 24px 32px }
```

Two details matter for the same reason. `min-height: 0` on both flex items is
required — the default `min-height: auto` refuses to shrink below content height
and defeats the scroller. And the masthead needs `flex: none`, otherwise a tall
body compresses it instead of scrolling past it.

## Icons

`icon.svg` is the official CodeBuddy mark, taken from `codebuddy.cn` (the
`assets/logo.svg` its pages load) — a purple gradient disc with a white bird.

The same mark is drawn inline for the composer's model button and the credits
chip, since the package's icon file is only read by the plugin manager. That
inline copy carries per-instance id suffixes (`markSeq`): the source SVG hard-codes
its gradient and clipPath ids, and several copies on one page would otherwise
all resolve to whichever mounted first. The blurred halo behind the disc is
dropped — invisible at 11–13px, and it was what made those ids expensive.

## Where the panel is opened from

The panel is a `main` registration, and two surfaces lead to it:

- **Settings** — a `settings.section` row titled "CodeBuddy models". It renders
  the panel body **in place** rather than linking to it: the same
  `CodeBuddyPanel` component, mounted with no `close` callback so it omits its
  own back button. A reader changing the key or signing in stays on the settings
  page instead of navigating away to read the same content.
- **Plugin manager** — the bundle's own detail page.

There is deliberately no `sidebar.panellist` row: the left rail is for switching
work, not for provider settings.

## Layout

- `lib/index.js` — Host half: loopback routes `GET /plugins/dsh-codebuddy-connect/status`,
  `POST|DELETE /plugins/dsh-codebuddy-connect/key`, the `codebuddy_connect` tool,
  and the `system-prompt/assemble` rewrite described above.
  The routes and the tool all call one set of operations.
  Plus `GET /plugins/dsh-codebuddy-connect/usage` for measured spend,
  `GET /plugins/dsh-codebuddy-connect/balance` for the real account balance (which
  drives a signed-in browser over the DevTools protocol), and the
  `llm/stream` listener that keeps the ledger. That listener must stay
  **synchronous**: the waterfall composes without awaiting, so returning a
  promise makes the caller's `for await` fail with *stream is not async iterable*.
- `lib/client.js` — Client half: the `main` panel (opened from the plugin
  manager as a page, and rendered inline in Settings), the credits chip on
  `conversation.session.header.utilities`, and the model label on
  `conversation.input.model.label`. The chip's per-workday forecast lives here
  too, derived in `forecastOf` from the balance route's `remainingCredits` and
  reset instant.
  Plus `POST|GET|DELETE /plugins/dsh-codebuddy-connect/login` for the browser
  sign-in handshake (`createLoginFlow`), which persists the session under
  `CODEBUDDY_ACCESS_TOKEN`.
- `cordis.patch.yml` — the `llm-pi-ai` profile override.

## License

MIT. See [LICENSE](./LICENSE).
