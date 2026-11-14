/**
 * Client half of the CodeBuddy connection bundle.
 *
 * The panel is a `main` page keyed by SIDEBAR_PANEL_ID, opened from the plugin
 * manager rather than the left rail: this bundle adds no `sidebar.panellist`
 * row, because the rail is for switching work, not for provider settings. The
 * panel reads its state from the Host's loopback status route, so it never
 * guesses whether the route is live.
 */
window.__ModuleLoader__.load({
	id: 'dsh-codebuddy-connect',
	factory(require) {
		const React = require('react');
		// Portalling the chip into the tab row needs react-dom. It is resolved
		// lazily and defensively: a host without it simply keeps the chip in its
		// own slot rather than failing the whole panel.
		// The tooltip primitive, for the same reason: a chip that falls back to
		// the native `title` is still readable, so a host without primitives
		// degrades rather than breaks.
		let Tooltip = null;
		try {
			Tooltip = require('@deepseek-ai/dsh-client-ui-primitives').Tooltip;
		} catch {
			Tooltip = null;
		}
		let createPortal = null;
		try {
			createPortal = require('react-dom').createPortal;
		} catch {
			createPortal = null;
		}
		const h = React.createElement;

		const SIDEBAR_PANEL_ID = 'dsh-codebuddy-connect';
		const STATUS_PATH = '/plugins/dsh-codebuddy-connect/status';
		const KEY_PATH = '/plugins/dsh-codebuddy-connect/key';
		const USAGE_PATH = '/plugins/dsh-codebuddy-connect/usage';
		const BALANCE_PATH = '/plugins/dsh-codebuddy-connect/balance';
		const LOGIN_PATH = '/plugins/dsh-codebuddy-connect/login';
		const NAMESPACE = 'settings.codebuddy-connect';
		const MIN_KEY_LENGTH = 16;

		// #region copy
		const en = {
			title: 'CodeBuddy models',
			backToConversation: 'Back to chat',
			intro: 'CodeBuddy models are served through the shared provider bridge. Store your API key once and they appear in the model picker.',
			statusHeading: 'Connection',
			routeLabel: 'Provider route',
			keyLabel: 'API key',
			keyStored: 'Stored',
			keyStoredVia: 'Stored ({source})',
			keyMissing: 'Not stored',
			routeLive: 'Serving models',
			routeDormant: 'Not serving',
			settingsHeading: 'CodeBuddy models',
			settingsHint: 'Store the API key once; the browser sign-in, credit balance, and model multipliers are managed right here.',
			loginHeading: 'Browser sign-in',
			loginHint: 'Some figures — the model catalogue and its credit multipliers — are served only to a signed-in session, never to an API key. Signing in here opens CodeBuddy\'s own page; the session is stored locally under CODEBUDDY_ACCESS_TOKEN.',
			loginStart: 'Sign in with browser',
			loginStarting: 'Starting…',
			loginWaiting: 'Waiting for the browser…',
			loginDone: 'Signed in',
			loginOpen: 'Open the sign-in page',
			loginSignOut: 'Sign out',
			loginSignedInAt: 'Signed in {date}',
			loginNotSignedIn: 'Not signed in',
			keyFieldHeading: 'Set the API key',
			keyFieldHint: 'The key is written to the credentials service under CODEBUDDY_API_KEY. It is never stored in a configuration file.',
			keyFieldPlaceholder: 'Paste your CodeBuddy API key',
			save: 'Save key',
			saving: 'Saving…',
			clear: 'Remove key',
			clearing: 'Removing…',
			refresh: 'Refresh',
			refreshing: 'Refreshing…',
			modelsHeading: 'Models',
			modelsCount: '{count} models',
			modelsEmpty: 'No models yet — store a key to load the roster.',
			imageCapable: 'Images',
			rateLabel: 'Cost',
			rateFree: 'Free',
			usageHeading: 'Credits',
			usageRequests: 'Requests',
			usageSpent: 'Spent',
			usageTokens: 'Tokens in / out',
			usagePlan: 'Plan used',
			usageResets: 'Resets {date}',
			usageEmpty: 'No turns have run through this route yet, so there is nothing spent to report.',
			rateOfficialHint: 'Multiplier published by CodeBuddy',
			rateEstimatedHint: 'Multiplier not published; reconstructed from metered spend',
			usageBalance: 'Remaining',
			usageCycleUsed: 'Used this cycle',
			usageCycleRange: 'Cycle',
			usageBalanceLink: 'Read on codebuddy.cn',
			balanceUnavailable: 'Needs a signed-in browser',
			balanceUnlimited: 'Unmetered',
			usageNote: 'CodeBuddy reports spend per reply, so these figures come from this profile\'s own traffic. Measured {date}.',
			speedNote: 'Cost is measured spend per token, shown on the same x0.00 scale the picker uses; speed is output tokens per second.',
			chipTitle: 'CodeBuddy credits spent by this profile',
			chipBalanceTitle: 'CodeBuddy credits remaining in this billing cycle',
			chipRemaining: 'left',
			chipDaily: 'per workday',
			chipHintUsed: 'Used {used} of {limit} this cycle',
			chipHintLeft: 'Remaining {remaining} · {percent} of the cycle used',
			chipHintDaily: 'About {amount} a day over the {days} weekdays left',
			chipHintReset: 'Resets {date}',
			chipHintCycle: 'Cycle {start} → {end}',
			chipHintSpent: 'This profile has spent {spent} over {requests} turns',
			chipHintUnlimited: 'This cycle is unmetered, so there is no balance to forecast',
			loading: 'Reading connection…',
			requestFailed: 'Request failed',
			savedNotice: 'Key stored. The roster below is already live.',
			clearedNotice: 'Key removed.',
			keyTooShort: 'A CodeBuddy API key is at least {min} characters long.',
			errorHeading: 'Something went wrong'
		};
		const zh = {
			title: 'CodeBuddy 模型',
			backToConversation: '返回会话',
			intro: 'CodeBuddy 模型通过共用的模型接入层提供，保存一次 API Key 后即可在模型选择器中使用。',
			statusHeading: '连接状态',
			routeLabel: '接入标识',
			keyLabel: 'API Key',
			keyStored: '已保存',
			keyStoredVia: '已保存（{source}）',
			keyMissing: '未保存',
			routeLive: '已提供模型',
			routeDormant: '未提供模型',
			settingsHeading: 'CodeBuddy 模型',
			settingsHint: 'API Key 保存一次即可；浏览器登录、额度余额和模型倍率都在这里管理。',
			loginHeading: '浏览器登录',
			loginHint: '有些数据只对登录态开放、API Key 读不到 —— 模型目录及其积分倍率就是这样。点下面的按钮会打开 CodeBuddy 自己的登录页，登录态保存在本机的 CODEBUDDY_ACCESS_TOKEN 下。',
			loginStart: '浏览器登录',
			loginStarting: '正在启动…',
			loginWaiting: '等待浏览器完成登录…',
			loginDone: '已登录',
			loginOpen: '打开登录页',
			loginSignOut: '退出登录',
			loginSignedInAt: '登录于 {date}',
			loginNotSignedIn: '未登录',
			keyFieldHeading: '设置 API Key',
			keyFieldHint: 'Key 会写入凭据服务的 CODEBUDDY_API_KEY，不会保存在配置文件里。',
			keyFieldPlaceholder: '粘贴 CodeBuddy API Key',
			save: '保存 Key',
			saving: '正在保存…',
			clear: '删除 Key',
			clearing: '正在删除…',
			refresh: '刷新',
			refreshing: '正在刷新…',
			modelsHeading: '模型',
			modelsCount: '共 {count} 个模型',
			modelsEmpty: '暂无模型，保存 Key 后会载入模型列表。',
			imageCapable: '支持图像',
			rateLabel: '倍率',
			rateFree: '免费',
			usageHeading: '额度',
			usageRequests: '请求数',
			usageSpent: '已消耗',
			usageTokens: '输入 / 输出 token',
			usagePlan: '套餐已用',
			usageResets: '{date} 重置',
			usageEmpty: '这条路由还没有跑过对话，暂时没有可报告的消耗。',
			rateOfficialHint: 'CodeBuddy 官方公布的倍率',
			rateEstimatedHint: '官方未公布，按实测消耗推算',
			usageBalance: '剩余额度',
			usageCycleUsed: '本周期已用',
			usageCycleRange: '计费周期',
			usageBalanceLink: '到 codebuddy.cn 查看',
			balanceUnavailable: '需要已登录的浏览器',
			balanceUnlimited: '不计额度',
			usageNote: 'CodeBuddy 按次返回消耗，因此这里的数字来自本配置自身的真实流量。测量于 {date}。',
			speedNote: '倍率为实测每 token 消耗，与模型选择器同一 x0.00 口径；速度为每秒输出 token 数。',
			chipTitle: '本配置已消耗的 CodeBuddy 额度',
			chipBalanceTitle: '本计费周期内剩余的 CodeBuddy 额度',
			chipRemaining: '剩余',
			chipDaily: '日均',
			chipHintUsed: '本周期已用 {used} / {limit}',
			chipHintLeft: '剩余 {remaining} · 本周期已用 {percent}',
			chipHintDaily: '按剩余 {days} 个工作日算，日均约 {amount}',
			chipHintReset: '将于 {date} 重置',
			chipHintCycle: '计费周期 {start} → {end}',
			chipHintSpent: '本配置累计消耗 {spent}，共 {requests} 次请求',
			chipHintUnlimited: '本周期不计额度，无需预估',
			loading: '正在读取连接…',
			requestFailed: '请求失败',
			savedNotice: 'Key 已保存，下方模型列表已生效。',
			clearedNotice: 'Key 已删除。',
			keyTooShort: 'CodeBuddy API Key 至少需要 {min} 个字符。',
			errorHeading: '出错了'
		};
		// #endregion

		// #region styles
		/** One stylesheet for both the rail glyph and the panel; injected once per page. */
		const CSS = [
			// The `main` slot renders inside `.mainPanel{flex:1;min-height:0;
			// display:flex}` under `.centerCol{overflow:hidden}`, so nothing in the
			// host scrolls for us. `min-height:100%` made the panel grow past the
			// clipped ancestor and lose the overflow, which is why it could not
			// scroll. The panel therefore claims the full height and delegates the
			// scrollbar to an inner scroller — the same shape the host's own pages
			// use.
			'.cbc-panel{display:flex;flex-direction:column;flex:1;height:100%;min-height:0;overflow:hidden;box-sizing:border-box;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base)}',
			// Embedded in Settings the panel is a section body, not a page: it grows
			// with its content instead of claiming the full viewport height, and it
			// drops the page background so it sits on the settings card.
			'.cbc-settingsBody{display:flex;flex-direction:column;gap:12px}',
			'.cbc-settingsBody .cbc-panel{flex:0 0 auto;height:auto;overflow:visible;background:transparent;padding:0}',
			'.cbc-settingsBody .cbc-masthead{display:none}',
			'.cbc-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}',
			'.cbc-body{display:flex;flex-direction:column;gap:18px;padding:0 24px 32px;box-sizing:border-box}',
			'.cbc-masthead{flex:none;display:flex;align-items:center;gap:10px;min-height:28px}',
			'.cbc-back{display:inline-flex;align-items:center;gap:4px;padding:4px 8px 4px 4px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer}',
			'.cbc-back:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
			'.cbc-title{margin:0;font-size:15px;font-weight:600;line-height:1.3}',
			'.cbc-intro{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);max-width:60ch}',
			'.cbc-section{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}',
			'.cbc-sectionHead{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
			'.cbc-sectionTitle{margin:0;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
			'.cbc-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:13px;line-height:1.5}',
			'.cbc-rowLabel{color:var(--dsw-alias-label-secondary)}',
			'.cbc-value{display:inline-flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}',
			'.cbc-dot{width:7px;height:7px;border-radius:50%;flex:none}',
			'.cbc-dot-ok{background:var(--dsw-alias-state-success-primary)}',
			'.cbc-dot-idle{background:var(--dsw-alias-state-idle-primary)}',
			'.cbc-dot-warn{background:var(--dsw-alias-state-warn-primary)}',
			'.cbc-dot-error{background:var(--dsw-alias-state-error-primary)}',
			'.cbc-hint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary)}',
			'.cbc-field{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
			'.cbc-input{flex:1 1 240px;min-width:0;padding:7px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.4}',
			'.cbc-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}',
			'.cbc-button{padding:7px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.2;cursor:pointer}',
			'.cbc-button:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary)}',
			'.cbc-button:disabled{opacity:.55;cursor:default}',
			'.cbc-button-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-weight:500}',
			'.cbc-button-quiet{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}',
			'.cbc-notice{margin:0;font-size:12px;line-height:1.5}',
			'.cbc-notice-ok{color:var(--dsw-alias-state-success-primary)}',
			'.cbc-notice-error{color:var(--dsw-alias-state-error-primary)}',
			'.cbc-models{display:flex;flex-direction:column;gap:0;margin:0;padding:0;list-style:none}',
			'.cbc-model{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--dsw-alias-border-l1);font-size:13px;line-height:1.4}',
			'.cbc-model:first-child{border-top:0}',
			'.cbc-modelName{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.cbc-modelMeta{display:inline-flex;align-items:center;gap:8px;flex:none;font-size:12px;color:var(--dsw-alias-label-secondary)}',
			'.cbc-badge{padding:1px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:99px;font-size:11px;line-height:1.6}',
			'.cbc-rate{padding:1px 6px;border-radius:99px;background:var(--dsw-alias-bg-l2);font-size:11px;line-height:1.6;font-variant-numeric:tabular-nums}',
			'.cbc-rate-est{border:1px dashed var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary)}',
			'.cbc-speed{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-variant-numeric:tabular-nums}',
			'.cbc-speed::before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.7}',
			'.cbc-speed-fast{color:var(--dsw-alias-state-success-primary,#16a34a)}',
			'.cbc-speed-steady{color:var(--dsw-alias-label-secondary)}',
			'.cbc-speed-slow{color:var(--dsw-alias-state-warn-primary,#f59e0b)}',
			'.cbc-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary,#999);white-space:nowrap;font-variant-numeric:tabular-nums}',
			'.cbc-chip strong{color:var(--dsw-alias-label-secondary,#61666b);font-weight:600}',
			'.cbc-chipPercent{font-size:11px;opacity:.8}',
			'.cbc-chipDaily{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-tertiary,#999);font-variant-numeric:tabular-nums}',
			'.cbc-chipSep{opacity:.5}',
			// The live multiplier in the picker: same weight as the name, secondary
			// colour, tabular figures so it does not jitter when 0.11 becomes 0.13.
			'.cbc-rate-live{color:var(--dsw-alias-label-tertiary,#999);font-variant-numeric:tabular-nums}',
			// The seat keeps its place in the utilities slot even while the chip is
			// portalled elsewhere, so the tab row can be re-found from geometry.
			'.cbc-seat{display:inline-flex;align-items:center;min-width:0}',
			// In the tab row the chip sits flush with the row's baseline.
			'.cbc-chip{flex:none}',
			// The trigger's CodeBuddy mark: a small filled glyph ahead of the name,
			// so a model is identifiable without reading which provider group it
			// came from. Inline and non-interactive — the selector owns the click.
			'.cbc-modelTrigger{display:inline-flex;align-items:center;gap:5px;min-width:0}',
			// The mark carries its own brand colours, so it takes no `color`; it only
			// must not shrink inside a flex row.
			'.cbc-brand{flex:none;display:inline-block;vertical-align:middle}',
			'.cbc-brandName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			// Inside the chip the mark takes the chip's own tone rather than the
			// brand blue: the chip is a muted readout, and a saturated glyph there
			// would pull the eye away from the balance it sits beside.
			'.cbc-chip .cbc-brand{opacity:.75}',
			'.cbc-link{color:var(--dsw-alias-label-link,var(--dsw-alias-label-primary));text-decoration:underline;text-underline-offset:2px}',
			'.cbc-center{padding:24px 0;font-size:13px;color:var(--dsw-alias-label-secondary)}'
		].join('');
		function installStyles() {
			const cssId = 'dsh-codebuddy-connect/client.css';
			if (document.querySelector('style[data-plugin-css="' + cssId + '"]') !== null) return;
			const tag = document.createElement('style');
			tag.dataset.plugin = 'dsh-codebuddy-connect';
			tag.dataset.pluginCss = cssId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		// #endregion

		/**
		* The cost multiplier as the picker writes it: `x0.11`.
		*
		* A zero multiplier is a model this profile does not pay for, which is
		* worth naming rather than printing `x0.00`. A model the measurement never
		* reached has no multiplier at all, so the row shows nothing instead of a
		* made-up number.
		*/
		function rateLabel(t, value) {
			const rate = Number(value);
			if (!Number.isFinite(rate)) return '';
			return rate <= 0 ? t('rateFree') : 'x' + rate.toFixed(2);
		}

		/** `229 tok/s`; rounded, because the second decimal never helps a reader. */
		function speedLabel(tps) {
			const value = Number(tps);
			if (!Number.isFinite(value) || value <= 0) return '';
			return Math.round(value) + ' tok/s';
		}

		/**
		* Credits read as plain numbers: large allowances drop the decimals, and a
		* whole amount keeps none — `605`, not `605.00` — because a trailing `.00`
		* on a balance reads as precision the service never reported.
		*/
		function formatCredits(value) {
			if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
			if (value >= 1000) return String(Math.round(value));
			const rounded = Math.round(value * 100) / 100;
			return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
		}

		/**
		 * `2026-10-25` from an instant or a `YYYY-MM-DD HH:MM:SS` stamp; the raw
		 * string when it will not parse.
		 *
		 * Formatted in LOCAL time on purpose. The billing service answers cycle
		 * bounds in local wall-clock with no zone (`2026-10-25 00:00:00`), so
		 * parsing them locally and then rendering through `toISOString()` would
		 * shift the date by a day for any reader east or west of UTC.
		 */
		function shortDate(iso) {
			if (typeof iso !== 'string' || iso.length === 0) return '';
			const parsed = new Date(iso);
			if (Number.isNaN(parsed.getTime())) return iso;
			const pad = (value) => String(value).padStart(2, '0');
			return parsed.getFullYear() + '-' + pad(parsed.getMonth() + 1) + '-' + pad(parsed.getDate());
		}

		/**
		* Parse one instant field, preferring a number of milliseconds, then a
		* number of seconds, then an ISO string. `0`/`null`/`''` mean "not
		* reported" — never 1970, which would silently become a horizon.
		*/
		function toInstant(value) {
			if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
				// Cycle stamps arrive as seconds; a value this small cannot be ms.
				return value < 1e11 ? value * 1000 : value;
			}
			if (typeof value === 'string' && value.length > 0) {
				const parsed = new Date(value).getTime();
				return Number.isNaN(parsed) ? null : parsed;
			}
			return null;
		}

		/**
		* Weekdays (Mon–Fri) left between now and the reset instant, counting today.
		*
		* Public holidays are not modelled — CodeBuddy reports no calendar, and a
		* hardcoded table would go stale silently — so this is a rough divisor and
		* is labelled as weekdays wherever it surfaces. `0` means the span is empty
		* or the reset instant is unknown, which suppresses every daily figure
		* rather than dividing by nothing.
		*/
		function workdaysUntil(resetAt, now) {
			if (resetAt === null || !Number.isFinite(resetAt) || resetAt <= now) return 0;
			const start = new Date(now);
			const end = new Date(resetAt);
			start.setHours(0, 0, 0, 0);
			end.setHours(0, 0, 0, 0);
			let count = 0;
			for (const day = new Date(start); day.getTime() <= end.getTime(); day.setDate(day.getDate() + 1)) {
				const weekday = day.getDay();
				if (weekday !== 0 && weekday !== 6) count += 1;
			}
			return count;
		}

		/**
		* A per-day allowance: one decimal under 10 so a small budget stays a real
		* number (`0.8`) instead of collapsing to `1`; whole numbers drop the
		* decimal, so `10` never prints as `10.0`.
		*/
		function rateText(value) {
			if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
			const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
			return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: rounded % 1 === 0 ? 0 : 1 });
		}

		/**
		* The forecast behind the chip's second segment.
		*
		* Only the account's own cycle can produce one: without a reported
		* remaining balance and reset instant there is nothing to divide, so this
		* returns `null` and the chip keeps its plain balance form. Nothing here is
		* extrapolated from this profile's own traffic — a burst of local turns
		* says nothing about the account's whole day, and a made-up "runs out in 2
		* days" is worse than no forecast at all.
		*/
		function forecastOf(quota, now) {
			if (quota === null || typeof quota !== 'object' || quota.ok !== true) return null;
			if (quota.unlimited === true) return null;
			const remaining = quota.remainingCredits;
			if (typeof remaining !== 'number' || !Number.isFinite(remaining)) return null;
			const resetAt = toInstant(quota.resetsAt) ?? toInstant(quota.cycleEnd);
			const workdays = workdaysUntil(resetAt, now);
			if (workdays <= 0) return null;
			return { remaining, resetAt, workdays, perWorkday: remaining / workdays };
		}

		/**
		 * The CodeBuddy mark, drawn inline.
		 *
		 * It is rendered in two places — the composer's model button and the
		 * credits chip — so it lives here once. The inner strokes take the page
		 * background so the mark reads correctly on either theme, and the outer
		 * disc takes the caller's colour.
		 *
		 * @param {{size?: number, className?: string}} props - size in pixels.
		 */
		/**
		 * The CodeBuddy mark, the official one from codebuddy.cn.
		 *
		 * The source SVG is a 40px tile with a purple gradient disc and a white
		 * bird. Its gradient, filter and clip ids are all hard-coded, so mounting
		 * several copies on one page would collide — every id is therefore
		 * suffixed per instance. The blurred halo behind the disc is dropped: it
		 * is invisible at the 11-13px these marks are drawn at, and it was what
		 * made the ids expensive to carry.
		 *
		 * @param {{size?: number, className?: string}} props - size in pixels.
		 */
		let markSeq = 0;
		function CodeBuddyMark({ size = 13, className = 'cbc-brand' }) {
			const uid = 'cbrand' + (markSeq += 1);
			return h(
				'svg',
				{ className, viewBox: '0 0 40 40', width: size, height: size, 'aria-hidden': true, focusable: 'false' },
				h(
					'defs',
					null,
					h(
						'linearGradient',
						{ id: uid + 'bg', x1: 20, y1: 0, x2: 20, y2: 40, gradientUnits: 'userSpaceOnUse' },
						h('stop', { stopColor: '#6C4DFF' }),
						h('stop', { offset: 1, stopColor: '#583ED3' })
					),
					h(
						'linearGradient',
						{ id: uid + 'bird', x1: 14.639, y1: 10.7917, x2: 32.1712, y2: 41.1585, gradientUnits: 'userSpaceOnUse' },
						h('stop', { stopColor: '#fff', stopOpacity: 0.8 }),
						h('stop', { offset: 0.437689, stopColor: '#fff' })
					),
					h('clipPath', { id: uid + 'clip' }, h('rect', { width: 40, height: 40, rx: 20 }))
				),
				h(
					'g',
					{ clipPath: 'url(#' + uid + 'clip)' },
					h('rect', { width: 40, height: 40, rx: 20, fill: 'url(#' + uid + 'bg)' }),
					h('path', {
						d: 'M27.6897 3.3426C28.057 3.01322 28.0795 2.99983 28.3485 2.98366C28.7851 2.95177 29.1858 3.16107 29.8664 3.78072C31.4566 5.22574 33.6703 8.19724 35.047 10.7343L35.5796 11.7191L36.3309 12.0927C37.0562 12.4593 38.2459 13.2111 38.7428 13.614C38.9673 13.7997 38.9992 13.8032 39.2326 13.7124C40.2872 13.3017 41.7982 13.846 43.1307 15.1244C44.3302 16.274 45.479 18.2384 45.9191 19.8778C45.9833 20.1417 46.0683 20.709 46.0994 21.1314C46.1997 22.6144 45.7243 23.7986 44.8085 24.3349C44.6213 24.443 44.6085 24.4725 44.6137 24.939C44.6559 27.1604 44.0571 29.3777 42.8543 31.54C41.4965 33.9678 39.0794 36.4798 35.8073 38.846C34.0502 40.1247 29.8918 42.5469 28.0122 43.3973C23.5096 45.4244 19.8999 46.2022 16.7645 45.8181C14.8943 45.5915 12.7771 44.8611 11.5246 44.0137C11.1951 43.786 11.1428 43.7719 10.8909 43.8439C9.55017 44.2289 7.79442 43.4374 6.30272 41.7817C5.70771 41.1197 4.74709 39.4939 4.43575 38.6241C3.71569 36.5887 3.85859 34.752 4.81783 33.6551C5.0657 33.3725 5.07387 33.3607 5.01972 32.8856C4.93033 32.1079 4.88982 30.9566 4.93066 30.2138L4.96343 29.5205L3.92091 27.6777C2.3078 24.8074 1.28326 22.3968 0.887982 20.5554C0.679402 19.546 0.692781 19.0981 0.949061 18.7667C1.10529 18.5666 1.61622 18.3594 2.23252 18.2455C3.78518 17.9729 7.17203 18.2198 10.9394 18.885L11.3303 18.9525L12.1903 18.1921C13.6179 16.9275 14.5665 16.2176 16.315 15.1274C18.1373 13.9872 20.1943 13.0498 22.5103 12.3071L23.2533 12.0687L23.6615 10.9964C25.1239 7.13587 26.6218 4.28969 27.6897 3.3426ZM15.4393 23.1261C13.7864 24.0804 12.9602 24.5582 12.3529 25.093C9.89364 27.2585 8.9738 30.6888 10.0208 33.7938C10.2794 34.5606 10.7568 35.387 11.7111 37.0398C12.6653 38.6926 13.1424 39.5194 13.6771 40.1267C15.8426 42.5859 19.2732 43.5045 22.3783 42.4574C23.145 42.1989 23.972 41.7223 25.6248 40.768L35.1333 35.2783C36.7862 34.324 37.6124 33.8462 38.2196 33.3114C40.6789 31.1459 41.5988 27.7156 40.5518 24.6105C40.2932 23.8438 39.8157 23.0174 38.8615 21.3646C37.9072 19.7117 37.4302 18.885 36.8955 18.2777C34.7299 15.8185 31.2993 14.8999 28.1943 15.947C27.4275 16.2055 26.6006 16.6821 24.9478 17.6364L15.4393 23.1261Z',
						fill: 'url(#' + uid + 'bird)'
					}),
					h('rect', { x: 15.8816, y: 30.0273, width: 4.00904, height: 8.32646, rx: 2.00452, transform: 'rotate(-30 15.8816 30.0273)', fill: '#fff' }),
					h('rect', { x: 26.6978, y: 23.7812, width: 4.00904, height: 8.32646, rx: 2.00452, transform: 'rotate(-30 26.6978 23.7812)', fill: '#fff' })
				)
			);
		}

		function Dot({ tone }) {
			return h('span', { className: 'cbc-dot cbc-dot-' + tone, 'aria-hidden': true });
		}

		/** Read one JSON route; a non-2xx answer keeps the Host's error text. */
		async function requestJson(path, init) {
			const response = await fetch(path, {
				credentials: 'same-origin',
				headers: { accept: 'application/json', ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }) },
				...init
			});
			const value = await response.json().catch(() => undefined);
			if (!response.ok) {
				const reason = typeof value?.error === 'string' ? value.error : typeof value?.reason === 'string' ? value.reason : 'HTTP ' + response.status;
				throw new Error(reason);
			}
			return value;
		}

		function CodeBuddyPanel({ t, close }) {
			const [load, setLoad] = React.useState({ phase: 'loading' });
			const [draft, setDraft] = React.useState('');
			const [busy, setBusy] = React.useState(null);
			const [notice, setNotice] = React.useState(null);
			const live = React.useRef(true);

			React.useEffect(() => {
				live.current = true;
				return () => {
					live.current = false;
				};
			}, []);

			const [spend, setSpend] = React.useState(null);
			const [quota, setQuota] = React.useState(null);
			const [session, setSession] = React.useState(null);

			const read = React.useCallback(async () => {
				try {
					const value = await requestJson(STATUS_PATH);
					if (live.current) setLoad({ phase: 'ok', value });
				} catch (error) {
					if (live.current) setLoad({ phase: 'error', message: error instanceof Error ? error.message : t('requestFailed') });
				}
				// Spend is a second, independent read: a usage failure must not hide
				// the connection state the panel exists to show.
				try {
					const value = await requestJson(USAGE_PATH);
					if (live.current) setSpend(value);
				} catch {
					if (live.current) setSpend(null);
				}
				// The real balance is a third read: it drives a browser and can be
				// slow or unavailable, and must never block the other two.
				try {
					const value = await requestJson(BALANCE_PATH);
					if (live.current) setQuota(value);
				} catch {
					if (live.current) setQuota(null);
				}
				// The sign-in session is a fourth read: it is optional, and its
				// absence simply means the catalogue cannot be read.
				try {
					const value = await requestJson(LOGIN_PATH);
					if (live.current) setSession(value);
				} catch {
					if (live.current) setSession(null);
				}
			}, [t]);

			React.useEffect(() => {
				read();
			}, [read]);

			const store = async () => {
				const candidate = draft.trim();
				if (candidate.length < MIN_KEY_LENGTH) {
					setNotice({ tone: 'error', text: t('keyTooShort', { min: String(MIN_KEY_LENGTH) }) });
					return;
				}
				setBusy('save');
				setNotice(null);
				try {
					const value = await requestJson(KEY_PATH, { method: 'POST', body: JSON.stringify({ apiKey: candidate }) });
					if (!live.current) return;
					if (value?.ok !== true) throw new Error(typeof value?.reason === 'string' ? value.reason : t('requestFailed'));
					setDraft('');
					setNotice({ tone: 'ok', text: t('savedNotice') });
					await read();
				} catch (error) {
					if (live.current) setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('requestFailed') });
				} finally {
					if (live.current) setBusy(null);
				}
			};

			const clear = async () => {
				setBusy('clear');
				setNotice(null);
				try {
					const value = await requestJson(KEY_PATH, { method: 'DELETE' });
					if (!live.current) return;
					if (value?.ok !== true) throw new Error(typeof value?.reason === 'string' ? value.reason : t('requestFailed'));
					setNotice({ tone: 'ok', text: t('clearedNotice') });
					await read();
				} catch (error) {
					if (live.current) setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('requestFailed') });
				} finally {
					if (live.current) setBusy(null);
				}
			};

			/**
			* Start the browser sign-in. The Host answers a URL as soon as the
			* handshake is minted, so this returns quickly and the panel then polls
			* while the user finishes on CodeBuddy's own page.
			*/
			const startLogin = async () => {
				setBusy('login');
				setNotice(null);
				try {
					const value = await requestJson(LOGIN_PATH, { method: 'POST' });
					if (!live.current) return;
					setSession(value);
					if (value?.authUrl) window.open(value.authUrl, '_blank', 'noopener,noreferrer');
				} catch (error) {
					if (live.current) setNotice({ tone: 'error', scope: 'login', text: error instanceof Error ? error.message : t('requestFailed') });
				} finally {
					if (live.current) setBusy(null);
				}
			};

			const signOut = async () => {
				setBusy('signout');
				setNotice(null);
				try {
					const value = await requestJson(LOGIN_PATH, { method: 'DELETE' });
					if (!live.current) return;
					setSession(value);
				} catch (error) {
					if (live.current) setNotice({ tone: 'error', scope: 'login', text: error instanceof Error ? error.message : t('requestFailed') });
				} finally {
					if (live.current) setBusy(null);
				}
			};

			// While a sign-in is pending, poll so the panel can flip to "signed in"
			// on its own — the user is over in another tab and will not refresh.
			React.useEffect(() => {
				if (session?.phase !== 'pending') return undefined;
				const timer = window.setInterval(async () => {
					try {
						const value = await requestJson(LOGIN_PATH);
						if (live.current) setSession(value);
					} catch {
						// A failed poll keeps the last known phase.
					}
				}, 2000);
				return () => window.clearInterval(timer);
			}, [session?.phase]);

			const credential = load.phase === 'ok' ? load.value?.credential : undefined;
			const provider = load.phase === 'ok' ? load.value?.provider : undefined;
			const models = Array.isArray(provider?.models) ? provider.models : [];
			const stored = credential?.configured === true;
			const serving = provider?.registered === true && models.length > 0;

			return h(
				'div',
				{ className: 'cbc-panel' },
				h(
					'div',
					{ className: 'cbc-masthead' },
					typeof close === 'function'
						? h(
								'button',
								{ type: 'button', className: 'cbc-back', onClick: close, 'aria-label': t('backToConversation') },
								h(
									'svg',
									{ width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, focusable: 'false' },
									h('path', {
										d: 'M10 3.5 5.5 8l4.5 4.5',
										stroke: 'currentColor',
										strokeWidth: 1.5,
										strokeLinecap: 'round',
										strokeLinejoin: 'round'
									})
								),
								h('span', null, t('backToConversation'))
							)
						: null,
					h('h2', { className: 'cbc-title' }, t('title'))
				),
				// Masthead stays put; everything below scrolls. The host clips the
				// column, so this scroller is what actually makes the panel reachable.
				h(
					'div',
					{ className: 'cbc-scroll' },
					h(
						'div',
						{ className: 'cbc-body' },
						h('p', { className: 'cbc-intro' }, t('intro')),

				load.phase === 'loading' ? h('div', { className: 'cbc-center' }, t('loading')) : null,
				load.phase === 'error'
					? h(
							'div',
							{ className: 'cbc-section' },
							h('div', { className: 'cbc-row' }, h('span', { className: 'cbc-rowLabel' }, t('errorHeading'))),
							h('p', { className: 'cbc-notice cbc-notice-error' }, load.message ?? t('requestFailed'))
						)
					: null,

				load.phase === 'ok'
					? h(
							'div',
							{ className: 'cbc-section' },
							h('div', { className: 'cbc-sectionHead' }, h('h3', { className: 'cbc-sectionTitle' }, t('statusHeading'))),
							h(
								'div',
								{ className: 'cbc-row' },
								h('span', { className: 'cbc-rowLabel' }, t('routeLabel')),
								h('span', { className: 'cbc-value' }, h('code', null, 'codebuddy'), h(Dot, { tone: serving ? 'ok' : 'idle' }), serving ? t('routeLive') : t('routeDormant'))
							),
							h(
								'div',
								{ className: 'cbc-row' },
								h('span', { className: 'cbc-rowLabel' }, t('keyLabel')),
								h(
									'span',
									{ className: 'cbc-value' },
									h(Dot, { tone: stored ? 'ok' : credential?.error !== undefined ? 'error' : 'warn' }),
									stored
										? credential?.source !== null && credential?.source !== undefined
											? t('keyStoredVia', { source: credential.source })
											: t('keyStored')
										: t('keyMissing')
								)
							),
							credential?.error !== undefined ? h('p', { className: 'cbc-hint cbc-notice-error' }, credential.error) : null,
							provider?.error !== undefined ? h('p', { className: 'cbc-hint cbc-notice-error' }, provider.error) : null,
							h(
								'div',
								{ className: 'cbc-field' },
								h(
									'button',
									{ type: 'button', className: 'cbc-button cbc-button-quiet', onClick: read, disabled: busy !== null },
									t('refresh')
								)
							)
						)
					: null,

				load.phase === 'ok'
					? h(
							'div',
							{ className: 'cbc-section' },
							h('div', { className: 'cbc-sectionHead' }, h('h3', { className: 'cbc-sectionTitle' }, t('usageHeading'))),
							spend === null
								? h('p', { className: 'cbc-hint' }, t('usageEmpty'))
								: h(
										'div',
										null,
										h(
											'div',
											{ className: 'cbc-row' },
											h('span', { className: 'cbc-rowLabel' }, t('usageSpent')),
											h('span', { className: 'cbc-value' }, h('strong', null, spend.creditSpent.toFixed(2)), ' credits')
										),
										h(
											'div',
											{ className: 'cbc-row' },
											h('span', { className: 'cbc-rowLabel' }, t('usageRequests')),
											h('span', { className: 'cbc-value' }, String(spend.requests))
										),
										h(
											'div',
											{ className: 'cbc-row' },
											h('span', { className: 'cbc-rowLabel' }, t('usageTokens')),
											h('span', { className: 'cbc-value' }, String(spend.promptTokens) + ' / ' + String(spend.completionTokens))
										),
										spend.quota === null || spend.quota === undefined || spend.quota.percent === null
											? null
											: h(
													'div',
													{ className: 'cbc-row' },
													h('span', { className: 'cbc-rowLabel' }, t('usagePlan')),
													h(
														'span',
														{ className: 'cbc-value' },
														h('strong', null, String(Math.round(spend.quota.percent)) + '%'),
														spend.quota.resetAt === null ? null : h('span', { className: 'cbc-hint' }, ' ' + t('usageResets', { date: shortDate(spend.quota.resetAt) }))
													)
												),
										quota?.ok === true
											? h(
													'div',
													{ className: 'cbc-row' },
													h('span', { className: 'cbc-rowLabel' }, t('usageBalance')),
													h(
														'span',
														{ className: 'cbc-value' },
														quota.unlimited === true
															? h('strong', null, t('balanceUnlimited'))
															: h(
																	'span',
																	null,
																	h('strong', null, formatCredits(quota.remainingCredits)),
																	h('span', { className: 'cbc-hint' }, ' / ' + formatCredits(quota.limitCredits)),
																	quota.percentUsed === null
																		? null
																		: h('span', { className: 'cbc-chipPercent' }, ' ' + quota.percentUsed.toFixed(1) + '%')
																),
														quota.resetsAt === null
															? null
															: h('span', { className: 'cbc-hint' }, ' · ' + t('usageResets', { date: shortDate(quota.resetsAt) }))
													)
												)
											: h(
													'div',
													{ className: 'cbc-row' },
													h('span', { className: 'cbc-rowLabel' }, t('usageBalance')),
													h(
														'span',
														{ className: 'cbc-value' },
														// Reaching the account needs a signed-in browser; when that
														// is not available the panel says so and links to the page
														// rather than inventing a number.
														h('span', { className: 'cbc-hint' }, t('balanceUnavailable')),
														' ',
														h(
															'a',
															{
																className: 'cbc-link',
																href: 'https://www.codebuddy.cn/profile/usage',
																target: '_blank',
															},
															t('usageBalanceLink')
														)
													)
												),
										// The cycle's own consumption, read with the stored API key
										// — the same figures the account page shows. Absent when the
										// balance could not be read at all.
										quota?.ok === true && quota.unlimited !== true && typeof quota.usedCredits === 'number'
											? h(
													'div',
													{ className: 'cbc-row' },
													h('span', { className: 'cbc-rowLabel' }, t('usageCycleUsed')),
													h('span', { className: 'cbc-value' }, h('strong', null, formatCredits(quota.usedCredits)))
												)
											: null,
										quota?.ok === true && (quota.cycleStart !== null || quota.cycleEnd !== null)
											? h(
													'div',
													{ className: 'cbc-row' },
													h('span', { className: 'cbc-rowLabel' }, t('usageCycleRange')),
													h(
														'span',
														{ className: 'cbc-value' },
														shortDate(quota.cycleStart) + ' → ' + shortDate(quota.cycleEnd)
													)
												)
											: null,
										h('p', { className: 'cbc-hint' }, t('usageNote', { date: spend.measuredAt ?? '' }))
									)
						)
					: null,

				// ---- Browser sign-in ----
				load.phase === 'ok'
					? h(
							'div',
							{ className: 'cbc-section' },
							h('div', { className: 'cbc-sectionHead' }, h('h3', { className: 'cbc-sectionTitle' }, t('loginHeading'))),
							h(
								'div',
								{ className: 'cbc-row' },
								h('span', { className: 'cbc-rowLabel' }, t('loginHeading')),
								h(
									'span',
									{ className: 'cbc-value' },
									h(Dot, { tone: session?.signedIn === true ? 'ok' : session?.phase === 'failed' ? 'error' : 'idle' }),
									session?.signedIn === true
										? t('loginDone') + (session.signedAt ? ' · ' + t('loginSignedInAt', { date: shortDate(session.signedAt) }) : '')
										: session?.phase === 'pending'
											? t('loginWaiting')
											: t('loginNotSignedIn')
								)
							),
							session?.phase === 'failed' && session.error !== null && session.error !== undefined
								? h('p', { className: 'cbc-hint cbc-notice-error' }, session.error)
								: null,
							h(
								'div',
								{ className: 'cbc-field' },
								h(
									'button',
									{ type: 'button', className: 'cbc-button cbc-button-primary', onClick: startLogin, disabled: busy !== null },
									busy === 'login' ? t('loginStarting') : t('loginStart')
								),
								session?.authUrl
									? h(
											'a',
											{ className: 'cbc-button', href: session.authUrl, target: '_blank', rel: 'noreferrer' },
											t('loginOpen')
										)
									: null,
								session?.signedIn === true
									? h(
											'button',
											{ type: 'button', className: 'cbc-button', onClick: signOut, disabled: busy !== null },
											t('loginSignOut')
										)
									: null
							),
							h('p', { className: 'cbc-hint' }, t('loginHint')),
							// Only a sign-in failure is reported here: the API key block
							// below renders the same `notice`, and duplicating it would
							// show one error twice on one screen.
							notice === null || notice.tone !== 'error' || notice.scope !== 'login'
								? null
								: h('p', { className: 'cbc-notice cbc-notice-error' }, notice.text)
						)
					: null,

				load.phase === 'ok'
					? h(
							'div',
							{ className: 'cbc-section' },
							h('div', { className: 'cbc-sectionHead' }, h('h3', { className: 'cbc-sectionTitle' }, t('keyFieldHeading'))),
							h(
								'div',
								{ className: 'cbc-field' },
								h('input', {
									className: 'cbc-input',
									type: 'password',
									autoComplete: 'off',
									spellCheck: false,
									placeholder: t('keyFieldPlaceholder'),
									value: draft,
									disabled: busy !== null,
									onChange: (event) => setDraft(event.target.value),
									onKeyDown: (event) => {
										if (event.key === 'Enter') store();
									}
								}),
								h(
									'button',
									{ type: 'button', className: 'cbc-button cbc-button-primary', onClick: store, disabled: busy !== null || draft.trim().length === 0 },
									busy === 'save' ? t('saving') : t('save')
								),
								stored
									? h(
											'button',
											{ type: 'button', className: 'cbc-button', onClick: clear, disabled: busy !== null },
											busy === 'clear' ? t('clearing') : t('clear')
										)
									: null
							),
							h('p', { className: 'cbc-hint' }, t('keyFieldHint')),
							notice === null ? null : h('p', { className: 'cbc-notice ' + (notice.tone === 'ok' ? 'cbc-notice-ok' : 'cbc-notice-error') }, notice.text)
						)
					: null,

				load.phase === 'ok'
					? h(
							'div',
							{ className: 'cbc-section' },
							h(
								'div',
								{ className: 'cbc-sectionHead' },
								h('h3', { className: 'cbc-sectionTitle' }, t('modelsHeading')),
								h('span', { className: 'cbc-hint' }, models.length === 0 ? '' : t('modelsCount', { count: String(models.length) }))
							),
							models.length === 0
								? h('p', { className: 'cbc-hint' }, t('modelsEmpty'))
								: h(
										'ul',
										{ className: 'cbc-models' },
										models.map((model) =>
											h(
												'li',
												{ className: 'cbc-model', key: model.id },
												h('span', { className: 'cbc-modelName' }, model.name),
												h(
													'span',
													{ className: 'cbc-modelMeta' },
													model.rate === undefined
														? model.estRate === undefined
															? null
															: h(
																	'span',
																	{ className: 'cbc-rate cbc-rate-est', title: t('rateEstimatedHint') },
																	'~' + rateLabel(t, model.estRate)
																)
														: h('span', { className: 'cbc-rate', title: t('rateOfficialHint') }, rateLabel(t, model.rate)),
													model.tps === undefined ? null : h('span', { className: 'cbc-speed cbc-speed-' + (model.speed ?? 'unknown') }, speedLabel(model.tps)),
													Array.isArray(model.input) && model.input.includes('image') ? h('span', { className: 'cbc-badge' }, t('imageCapable')) : null,
													h('code', null, model.id)
												)
											)
										)
									)
						)
					: null
						)
					)
			);
		}

		/**
		* The toolbar readout: how much this profile has spent, in the session
		* header beside the view tabs.
		*
		* It rides the declared `conversation.session.header.utilities` slot, so it
		* needs no DOM knowledge and follows the host's own header layout. The chip
		* shows the one number that fits a toolbar — spend — and stays silent until
		* the route has actually produced traffic, because a `0` would read as a
		* balance of zero rather than "nothing spent yet".
		*/
		/**
		 * How far below the header seat the tab row may sit and still belong to
		 * the same header, in CSS pixels. The row is one text line under the title
		 * row, so this only has to clear that gap plus a wrap.
		 */
		const HEADER_TABS_MAX_GAP = 120;
		/** Minimum spacing between two target re-resolutions, in milliseconds. */
		const HEADER_TABS_THROTTLE = 200;

		function CodeBuddyUsageChip({ t }) {
			const [spend, setSpend] = React.useState(null);
			const [quota, setQuota] = React.useState(null);
			const [seat, setSeat] = React.useState(null);
			const [target, setTarget] = React.useState(null);
			React.useEffect(() => {
				let live = true;
				let controller = null;
				const load = async () => {
					if (document.hidden) return;
					if (controller !== null) controller.abort();
					const current = new AbortController();
					controller = current;
					try {
						const value = await requestJson(USAGE_PATH, { signal: current.signal });
						if (live && !current.signal.aborted) setSpend(value);
					} catch {
						// A readout is decoration: a failed poll keeps the last number.
					}
					// The real balance is the better toolbar number, but it drives a
					// browser and can be unavailable, so it is a separate read.
					try {
						const value = await requestJson(BALANCE_PATH, { signal: current.signal });
						if (live && !current.signal.aborted) setQuota(value);
					} catch {
						// Keep whatever balance was shown before.
					}
				};
				load();
				const timer = window.setInterval(load, 60_000);
				const onVisible = () => {
					if (!document.hidden) load();
				};
				document.addEventListener('visibilitychange', onVisible);
				return () => {
					live = false;
					controller?.abort();
					window.clearInterval(timer);
					document.removeEventListener('visibilitychange', onVisible);
				};
			}, []);

			/**
			 * Find the row that holds the view tabs (对话 / 轨迹) and render there.
			 *
			 * The utilities slot itself sits on the TITLE row, top-right. The tab
			 * row underneath is the one that has spare width beside the view tabs,
			 * and no slot reaches it — so the chip is portalled in, and the anchor
			 * span stays behind in the slot to keep the seat measurable.
			 *
			 * Resolution is geometric: the nearest tab row below the seat. When
			 * nothing qualifies (no tabs, hidden header) the chip degrades to
			 * rendering inside its own slot rather than disappearing.
			 */
			React.useEffect(() => {
				if (seat === null) return undefined;
				const basis = seat.parentElement ?? seat;
				const resolve = () => {
					const seatRect = basis.getBoundingClientRect();
					let best = null;
					let bestScore = Infinity;
					for (const row of document.querySelectorAll('[data-conversation-tabs]')) {
						const rect = row.getBoundingClientRect();
						if (rect.width <= 0 || rect.height <= 0) continue;
						const gap = rect.top - seatRect.top;
						if (gap < -8 || gap > HEADER_TABS_MAX_GAP) continue;
						const side = seatRect.left < rect.left ? rect.left - seatRect.left : seatRect.left > rect.right ? seatRect.left - rect.right : 0;
						const score = Math.abs(gap) * 1e4 + side;
						if (score < bestScore) {
							bestScore = score;
							best = row;
						}
					}
					return best === null ? null : best.parentElement;
				};
				const sync = () => {
					const next = resolve();
					setTarget((previous) => (previous === next ? previous : next));
				};
				sync();
				let timer = 0;
				const poke = () => {
					if (timer !== 0) return;
					timer = window.setTimeout(() => {
						timer = 0;
						sync();
					}, HEADER_TABS_THROTTLE);
				};
				const observer = new MutationObserver(poke);
				observer.observe(document.body, { childList: true, subtree: true });
				window.addEventListener('resize', poke);
				return () => {
					observer.disconnect();
					window.removeEventListener('resize', poke);
					if (timer !== 0) window.clearTimeout(timer);
					setTarget(null);
				};
			}, [seat]);

			/**
			 * Wrap the chip in the shared tooltip, falling back to the native one.
			 *
			 * The primitive owns the styling, the 150ms dwell and the portalled
			 * placement; `label` renders `\n` as line breaks, so the multi-line
			 * detail stays one tooltip rather than a stack of title strings. A host
			 * without primitives keeps the plain `title` — readable, just unstyled.
			 */
			const withTip = (chip, detail) => {
				if (typeof Tooltip !== 'function') return chip;
				return h(Tooltip, { label: detail, side: 'bottom', align: 'start', portal: true, delayMs: 150 }, chip);
			};

			/**
			 * Put the chip where the tab row is, or in its own seat when there is
			 * no tab row to reach.
			 *
			 * The anchor span always renders so `seat` stays measurable; the chip
			 * itself is portalled beside the view tabs when a target exists.
			 */
			const placeChip = (chip) =>
				h(
					React.Fragment,
					null,
					h('span', { ref: setSeat, className: 'cbc-seat' }, target === null ? chip : null),
					target !== null && typeof createPortal === 'function' ? createPortal(chip, target) : null
				);

			// Prefer the authoritative remaining balance; fall back to measured
			// spend only when the account is unreachable.
			if (quota?.ok === true && quota.unlimited !== true && typeof quota.remainingCredits === 'number') {
				const forecast = forecastOf(quota, Date.now());
				const percent = typeof quota.percentUsed === 'number' && quota.percentUsed > 0 ? quota.percentUsed.toFixed(1) + '%' : '';
				/**
				* The hover detail, one fact per line in the order a reader asks for
				* them: what is used, what is left, what that allows per day, when it
				* renews. Every line comes from the account's own cycle; a field the
				* service did not report is simply absent.
				*/
				const lines = [];
				if (typeof quota.usedCredits === 'number' && typeof quota.limitCredits === 'number') {
					lines.push(t('chipHintUsed', { used: formatCredits(quota.usedCredits), limit: formatCredits(quota.limitCredits) }));
				}
				lines.push(t('chipHintLeft', { remaining: formatCredits(quota.remainingCredits), percent: percent === '' ? '—' : percent }));
				if (forecast !== null) lines.push(t('chipHintDaily', { amount: rateText(forecast.perWorkday), days: String(forecast.workdays) }));
				const resetOn = shortDate(quota.resetsAt ?? quota.cycleEnd);
				const cycleStart = shortDate(quota.cycleStart);
				const cycleEnd = shortDate(quota.cycleEnd);
				if (cycleStart !== '' && cycleEnd !== '') lines.push(t('chipHintCycle', { start: cycleStart, end: cycleEnd }));
				if (resetOn !== '') lines.push(t('chipHintReset', { date: resetOn }));
				if (spend !== null && typeof spend.creditSpent === 'number' && spend.requests > 0) {
					lines.push(t('chipHintSpent', { spent: formatCredits(spend.creditSpent), requests: String(spend.requests) }));
				}
				return placeChip(withTip(h(
					'span',
					{ className: 'cbc-chip' },
					h(CodeBuddyMark, { size: 11 }),
					h('span', { className: 'cbc-chipText' }, h('strong', null, formatCredits(quota.remainingCredits)), ' ' + t('chipRemaining')),
					percent === '' ? null : h('span', { className: 'cbc-chipPercent' }, percent),
					// The forecast rides the chip as one more segment, so the balance
					// stays the number the eye lands on and the allowance reads as the
					// derived figure it is.
					forecast === null
						? null
						: h(
								'span',
								{ className: 'cbc-chipDaily' },
								h('span', { className: 'cbc-chipSep' }, '·'),
								h('span', null, t('chipDaily') + ' ' + rateText(forecast.perWorkday))
							)
				), lines.join('\n')));
			}
			if (quota?.ok === true && quota.unlimited === true) {
				return placeChip(withTip(h('span', { className: 'cbc-chip' }, h(CodeBuddyMark, { size: 11 }), h('span', { className: 'cbc-chipText' }, t('balanceUnlimited'))), t('chipHintUnlimited')));
			}
			if (spend === null || spend.requests === 0) return null;
			return placeChip(withTip(h(
				'span',
				{ className: 'cbc-chip' },
				h(CodeBuddyMark, { size: 11 }),
				h('span', { className: 'cbc-chipText' }, h('strong', null, spend.creditSpent.toFixed(2)), ' credits')
			), t('chipTitle')));
		}

		/** Decorative rail glyph; the row's `label` supplies the accessible name. */
		/**
		 * Live multipliers, keyed by model id.
		 *
		 * The picker can render this component before any of our effects have
		 * run, so the map starts empty and is filled by a poll: a missing entry
		 * simply means "no better figure than the patch", never "no rate".
		 */
		const liveRates = new Map();
		let ratesLoadedAt = 0;
		const RATES_TTL_MS = 60000;
		let ratesInflight = null;

		/** Refresh the map from the Host, at most once a minute and never twice at once. */
		function refreshLiveRates() {
			if (Date.now() - ratesLoadedAt < RATES_TTL_MS) return;
			if (ratesInflight !== null) return;
			ratesInflight = requestJson(STATUS_PATH)
				.then((value) => {
					const models = Array.isArray(value?.provider?.models) ? value.provider.models : [];
					liveRates.clear();
					for (const model of models) {
						if (typeof model?.id === 'string' && typeof model.rate === 'number' && Number.isFinite(model.rate)) {
							liveRates.set(model.id, model.rate);
						}
					}
					ratesLoadedAt = Date.now();
				})
				.catch(() => {
					// A failed refresh keeps the last known figures.
				})
				.finally(() => {
					ratesInflight = null;
				});
		}

		/**
		 * The model name the picker renders, carrying the multiplier CodeBuddy
		 * actually bills.
		 *
		 * The patch can only bake a multiplier into the model's `name` once, at
		 * profile load, so those suffixes go stale the moment CodeBuddy reprices
		 * anything (`deepseek-v4.1-flash` has already moved x0.04 to x0.11). This
		 * slot replaces the suffix with the live figure the Host read from the
		 * signed-in catalogue. With nothing known it still strips the stale suffix
		 * rather than repeating a number it cannot vouch for.
		 *
		 * It renders inline, non-interactive content only: the selector keeps
		 * ownership of click, focus, search and the checkmark.
		 */
		function CodeBuddyModelLabel(props) {
			const model = props?.model;
			const provider = props?.provider;
			React.useEffect(() => {
				refreshLiveRates();
			}, []);
			/**
			 * `conversation.input.model.label` is a SINGLE slot: whatever this
			 * component returns becomes the label for EVERY provider's models, not
			 * just CodeBuddy's. Returning `null` for a foreign model therefore does
			 * not "leave it alone" — it blanks the row, which is exactly what
			 * happened to Qoder's model list. Foreign models must be handed back
			 * their own name.
			 */
			if (model === undefined) return null;
			const name = typeof model.name === 'string' ? model.name : '';
			if (provider?.id !== 'codebuddy') return name === '' ? null : h('span', null, name);
			if (name === '') return null;
			const base = name.includes(' · ') ? name.slice(0, name.indexOf(' · ')) : name;
			const rate = liveRates.get(model.id);
			const rateNode = rate === undefined ? null : h('span', { className: 'cbc-rate-live' }, ' · x' + rate.toFixed(2));
			// The trigger is the one place a reader sees a model name without the
			// provider group around it, so that is where the badge is worth its
			// width. Inside the menu every row is already under the CodeBuddy
			// heading, and repeating the tag there would only add noise.
			if (props?.placement !== 'trigger') return h('span', null, base, rateNode);
			return h(
				'span',
				{ className: 'cbc-modelTrigger' },
				h(CodeBuddyMark, { size: 13 }),
				h('span', { className: 'cbc-brandName' }, base),
				rateNode
			);
		}

		/**
		 * The Settings-page section that opens the CodeBuddy panel.
		 *
		 * The panel itself is a `main` registration rather than a left-rail row,
		 * so without this section the only way in is the plugin manager. A row in
		 * Settings puts it where a reader looks for provider configuration.
		 *
		 * It renders one summary row and a button; all it does is select the
		 * panel, which `ctx.layout.selectPanel` answers for by looking the id up
		 * in the live `main` registry.
		 */
		function CodeBuddySettingsSection({ t }) {
			// The panel body itself, rendered in place. No `close` is passed, so the
			// panel drops its own back button and the reader stays in Settings
			// instead of being moved to another page to read the same content.
			return h(
				'div',
				{ className: 'cbc-settingsBody' },
				h('p', { className: 'cbc-hint' }, t('settingsHint')),
				h(CodeBuddyPanel, { t })
			);
		}

		function attempt(label, run) {
			try {
				run();
			} catch (error) {
				console.error('[dsh-codebuddy-connect] ' + label + ' failed to register (Host provider unaffected):', error);
			}
		}

		return {
			name: 'dsh-codebuddy-connect-client',
			inject: ['slots', 'locale', 'layout'],
			apply(ctx) {
				installStyles();
				const namespace = NAMESPACE;
				ctx.effect(() => ctx.locale.register(namespace, { zh, en }), 'dsh-codebuddy-connect: panel copy');
				const t = ctx.locale.bind(namespace);

				attempt('sidebar panel', () => {
					ctx.slots.inject('main', () =>
						ctx.slots.register(
							{
								name: 'main',
								key: SIDEBAR_PANEL_ID,
								locale: namespace,
								inject: () => ({
									t,
									close: () => {
										ctx.layout.selectPanel(null);
									}
								})
							},
							CodeBuddyPanel
						)
					);
					ctx.slots.inject('conversation.session.header.utilities', () =>
						ctx.slots.register(
							{
								name: 'conversation.session.header.utilities',
								id: 'dsh-codebuddy-connect-usage',
								order: 20,
								locale: namespace,
								inject: () => ({ t })
							},
							CodeBuddyUsageChip
						)
					);
					// A Settings row, so the panel is reachable where provider
					// configuration is looked for, not only from the plugin manager.
					attempt('settings section', () => {
						ctx.slots.inject('settings.section', () =>
							ctx.slots.register(
								{
									name: 'settings.section',
									id: SIDEBAR_PANEL_ID,
									order: 40,
									label: () => t('settingsHeading'),
									locale: namespace,
									inject: () => ({ t })
								},
								CodeBuddySettingsSection
							)
						);
					});
					// The picker's model names, so their multiplier tracks the live
					// catalogue instead of the one baked into the patch at load time.
					attempt('model label', () => {
						ctx.slots.inject('conversation.input.model.label', () =>
							ctx.slots.register({ name: 'conversation.input.model.label' }, CodeBuddyModelLabel)
						);
					});
				});
			}
		};
	}
});
