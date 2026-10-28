window.__ModuleLoader__.load({
	id: "dsh-zcode-ui",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_dom = require("react-dom");
		//#region src/client/session-host.ts
		var UnknownSessionError = class extends Error {
			constructor() {
				super("unknown session");
				this.name = "UnknownSessionError";
			}
		};
		/** 旧宿主读 list.current；alpha.2 主视图改由 retainedBy.mainView 标记。 */
		function currentSessionId(state) {
			if (state === void 0) return void 0;
			if (typeof state.current === "string" && state.current !== "") return state.current;
			const byId = state.byId ?? {};
			const ids = Array.isArray(state.ids) && state.ids.length > 0 ? state.ids : Object.keys(byId);
			const pick = (id, row) => {
				if (row === void 0 || (row.retainedBy?.mainView ?? 0) <= 0) return void 0;
				const explicit = row.id?.trim();
				return explicit !== void 0 && explicit !== "" ? explicit : id;
			};
			for (const id of ids) {
				const found = pick(id, byId[id]);
				if (found !== void 0) return found;
			}
			for (const id of Object.keys(byId)) {
				if (ids.includes(id)) continue;
				const found = pick(id, byId[id]);
				if (found !== void 0) return found;
			}
		}
		/** 官方树在全局面板打开时取消会话选中。 */
		function visibleSelectedSessionId(state, panelActive = false) {
			return panelActive ? void 0 : currentSessionId(state);
		}
		function sessionRowUnread(localUnread, status, selected = false) {
			return localUnread || status?.completionUnread === true && !selected;
		}
		function sessionRunningFlags(byId, status) {
			const ids = new Set(Object.keys(byId));
			if (status !== void 0) for (const id of status.keys()) ids.add(id);
			const next = {};
			for (const id of ids) next[id] = sessionIsRunning(byId[id], status?.get(id));
			return next;
		}
		/** 旧宿主看 current 是否空会话；alpha.2 看主视图 retain 的 blank。 */
		function isBlankOnboardingSession(state) {
			if (state?.phase !== "ready") return false;
			const id = currentSessionId(state);
			return id === void 0 || state.byId?.[id]?.blank === true;
		}
		function hostAccess(ctx) {
			return ctx;
		}
		/** 有 reflect 时只 probe，不能硬读未注入服务，否则 Cordis 会挡住插件激活。 */
		function probeService(ctx, name) {
			if (ctx === void 0) return void 0;
			const access = hostAccess(ctx);
			const reflectGet = access.reflect?.get;
			const hasReflect = typeof reflectGet === "function";
			if (hasReflect) try {
				const found = reflectGet.call(access.reflect, name);
				if (found !== void 0) return found;
			} catch {}
			if (typeof access.get === "function") try {
				const found = access.get(name);
				if (found !== void 0) return found;
			} catch {
				return;
			}
			if (hasReflect) return void 0;
			try {
				return access[name];
			} catch {
				return;
			}
		}
		function openHostSession(ctx, id) {
			if (id === "") return false;
			const access = hostAccess(ctx);
			const uiWorkspace = probeService(access, "uiWorkspace");
			if (typeof uiWorkspace?.openSession === "function") {
				uiWorkspace.openSession(id);
				return true;
			}
			if (typeof access.sessions?.retain === "function") return false;
			if (typeof access.sessions?.open === "function") {
				access.sessions.open(id);
				return true;
			}
			return false;
		}
		async function withSessionBinding(sessions, sessionId, operation) {
			const host = sessions === void 0 ? void 0 : hostAccess({ sessions }).sessions;
			if (host === void 0) throw new UnknownSessionError();
			if (typeof host.using === "function") return host.using(sessionId, { source: "controllerOperation" }, async (reference) => {
				if (reference.ready !== void 0) await reference.ready;
				if (reference.binding === void 0) throw new UnknownSessionError();
				return operation(reference.binding);
			});
			const existing = host.binding?.(sessionId);
			if (existing !== void 0) return operation(existing);
			if (typeof host.retain !== "function") throw new UnknownSessionError();
			const reference = host.retain(sessionId, { source: "controllerOperation" });
			try {
				if (reference.ready !== void 0) await reference.ready;
				if (reference.binding === void 0) throw new UnknownSessionError();
				return await operation(reference.binding);
			} finally {
				reference.release?.();
			}
		}
		async function renameHostSession(ctx, sessionId, title) {
			await withSessionBinding(hostAccess(ctx).sessions, sessionId, async (binding) => {
				if (typeof binding.session?.rename !== "function") throw new UnknownSessionError();
				const result = await binding.session.rename(title);
				if (result.ok === false) throw result.error ?? /* @__PURE__ */ new Error("rename failed");
			});
		}
		async function forkHostSession(ctx, sessionId) {
			const access = hostAccess(ctx);
			const uiWorkspace = probeService(access, "uiWorkspace");
			if (typeof uiWorkspace?.forkSession === "function") {
				await uiWorkspace.forkSession(sessionId);
				return;
			}
			const childId = await access.sessions?.fork?.({
				sessionId,
				increaseTitle: true
			});
			if (typeof childId === "string" && childId !== "") openHostSession(access, childId);
		}
		async function archiveHostSession(ctx, sessionId) {
			const access = hostAccess(ctx);
			const uiWorkspace = probeService(access, "uiWorkspace");
			if (typeof uiWorkspace?.archiveSession === "function") {
				await uiWorkspace.archiveSession(sessionId);
				return;
			}
			await access.workspaces?.archiveSession?.(sessionId);
		}
		function mergePendingInteractions(legacy, status) {
			const next = new Map(legacy);
			for (const [id, row] of status) if (row?.pendingInteraction !== void 0) next.set(id, row.pendingInteraction);
			return next;
		}
		function sessionIsRunning(session, status) {
			if (status?.running !== void 0) return status.running === true;
			return session?.running === true;
		}
		//#endregion
		//#region src/client/session-navigation.ts
		function openConversation(host, layout, id) {
			const opened = openHostSession(host, id);
			if (opened) selectGlobalPanel(layout, null);
			return opened;
		}
		/** 先打开再写草稿，避免 using 释放后 composer 换新 binding。 */
		async function openConversationWithDraft(host, layout, sessions, sessionId, writeDraft) {
			return withSessionBinding(sessions, sessionId, (binding) => {
				const opened = openConversation(host, layout, sessionId);
				writeDraft(binding);
				return opened;
			});
		}
		/** 统一检测旧宿主是否提供面板切换能力，保留宿主方法的 this。 */
		function selectGlobalPanel(layout, id) {
			if ("selectPanel" in layout && typeof layout.selectPanel === "function") layout.selectPanel(id);
		}
		//#endregion
		//#region src/client/navigation-history.ts
		/** Follow host session selections without navigating the Electron document history. */
		function createNavigationHistory(store, open) {
			let entries = [];
			let index = -1;
			let pending;
			let snapshot = {
				canBack: false,
				canForward: false
			};
			const listeners = /* @__PURE__ */ new Set();
			const target = (direction) => {
				for (let next = index + direction; next >= 0 && next < entries.length; next += direction) if (store.getSnapshot().byId?.[entries[next]] !== void 0) return next;
			};
			const update = () => {
				const current = currentSessionId(store.getSnapshot());
				if (current !== void 0 && pending !== void 0 && entries[pending] === current) {
					index = pending;
					pending = void 0;
				} else if (current !== void 0 && entries[index] !== current) {
					entries = entries.slice(0, index + 1);
					entries.push(current);
					index = entries.length - 1;
					pending = void 0;
				}
				const next = {
					canBack: target(-1) !== void 0,
					canForward: target(1) !== void 0
				};
				if (next.canBack === snapshot.canBack && next.canForward === snapshot.canForward) return;
				snapshot = next;
				for (const listener of listeners) listener();
			};
			const navigate = (direction) => {
				const next = target(direction);
				if (next === void 0) return;
				pending = next;
				try {
					if (!open(entries[next])) pending = void 0;
				} catch (error) {
					pending = void 0;
					throw error;
				}
				update();
			};
			update();
			const unsubscribe = store.subscribe(update);
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				back: () => {
					navigate(-1);
				},
				forward: () => {
					navigate(1);
				},
				dispose: () => {
					unsubscribe();
					listeners.clear();
				}
			};
		}
		//#endregion
		//#region src/client/workspace-shortcuts.ts
		function hasBindings(value) {
			const state = value.hooks?.workspaceShortcuts;
			return typeof state?.getSnapshot === "function" && typeof state.subscribe === "function" && typeof value.closeAddWorkspace === "function" && typeof value.setDirectoryBusy === "function" && typeof value.createWorkspace === "function";
		}
		/** Read the official, shadowed registration's public injected face; keep its command IDs and key bindings. */
		function createWorkspaceShortcutSource(slots) {
			let entry;
			let bindings;
			let lastSearch = 0;
			let snapshot = {
				searchRequest: 0,
				addRequested: false
			};
			const listeners = /* @__PURE__ */ new Set();
			let offState = () => {};
			const publish = () => {
				const state = bindings?.hooks.workspaceShortcuts.getSnapshot();
				const searchRequest = snapshot.searchRequest + (state !== void 0 && state.searchRequest !== lastSearch ? 1 : 0);
				lastSearch = state?.searchRequest ?? 0;
				const addRequested = state?.addRequested ?? false;
				if (snapshot.bindings === bindings && snapshot.searchRequest === searchRequest && snapshot.addRequested === addRequested) return;
				snapshot = {
					searchRequest,
					addRequested,
					bindings
				};
				for (const listener of listeners) listener();
			};
			const reconcile = () => {
				const next = slots.entries("sidebar.workspaces").find((row) => row.locale === "workspace");
				if (next === entry) return;
				offState();
				entry = next;
				const injected = next?.inject?.();
				bindings = injected && hasBindings(injected) ? injected : void 0;
				lastSearch = bindings?.hooks.workspaceShortcuts.getSnapshot().searchRequest ?? 0;
				offState = bindings?.hooks.workspaceShortcuts.subscribe(publish) ?? (() => {});
				publish();
			};
			reconcile();
			const offSlots = slots.subscribe("sidebar.workspaces", reconcile);
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				dispose: () => {
					offSlots();
					offState();
					listeners.clear();
				}
			};
		}
		//#endregion
		//#region src/client/channel-api.ts
		const CHANNELS_ENDPOINT = "/api/dsh-im-connect/channels";
		/** DSH 会话头不能写 origin=im，频道会话只靠 id 前缀。 */
		function isChannelSession(id) {
			return id.startsWith("im:");
		}
		function text(value, fallback = "") {
			return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
		}
		function updatedAt(value) {
			if (typeof value === "number" && Number.isFinite(value)) return value;
			if (typeof value === "string" && value !== "") {
				const parsed = Date.parse(value);
				if (Number.isFinite(parsed)) return parsed;
			}
		}
		function parseChannelSession(value) {
			if (value === null || typeof value !== "object") return void 0;
			const row = value;
			const sessionId = text(row.sessionId);
			if (sessionId === "") return void 0;
			return {
				sessionId,
				title: text(row.title) || text(row.chatId) || sessionId,
				updatedAt: updatedAt(row.updatedAt),
				running: row.running === true
			};
		}
		function parseChannelGroups(payload, fallbackLabel = "") {
			const root = payload !== null && typeof payload === "object" ? payload : {};
			return (Array.isArray(root.groups) ? root.groups : Array.isArray(payload) ? payload : []).flatMap((item, index) => {
				if (item === null || typeof item !== "object") return [];
				const group = item;
				const sessions = Array.isArray(group.sessions) ? group.sessions.flatMap((session) => {
					const parsed = parseChannelSession(session);
					return parsed === void 0 ? [] : [parsed];
				}) : [];
				return [{
					id: text(group.id, `channel-${index}`),
					label: text(group.label, text(group.title, fallbackLabel)),
					sessions
				}];
			});
		}
		/** 读取 IM 频道分组；失败时交给界面显示空态或错误。 */
		async function loadChannelGroups(signal, fallbackLabel = "") {
			const response = await fetch(CHANNELS_ENDPOINT, {
				cache: "no-store",
				signal
			});
			let payload;
			try {
				payload = await response.json();
			} catch {
				throw new Error(response.ok ? "频道会话数据格式无效" : "无法读取频道会话");
			}
			const root = payload !== null && typeof payload === "object" ? payload : {};
			if (!response.ok) throw new Error(text(root.error, "无法读取频道会话"));
			if (root.ok === false) throw new Error(text(root.error, "无法读取频道会话"));
			return parseChannelGroups(payload, fallbackLabel);
		}
		//#endregion
		//#region src/client/schedule-sessions.ts
		const AUTOMATION_SESSION_PREFIX = "dsh-automation-session-";
		function isScheduleSession(id, _title) {
			return id.startsWith(AUTOMATION_SESSION_PREFIX);
		}
		function scheduleGroupName(title) {
			const name = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*-\s*(.+)$/.exec(title.trim())?.[2]?.trim();
			return name !== void 0 && name !== "" ? name : title.trim();
		}
		/** 把定时运行会话按任务名收成和任务树一样的分组。 */
		function groupScheduleSessions(items, locale = "zh-CN") {
			const groups = /* @__PURE__ */ new Map();
			for (const item of items) {
				if (!isScheduleSession(item.id, item.title)) continue;
				const label = scheduleGroupName(item.title);
				const current = groups.get(label) ?? {
					id: label,
					label,
					sessions: []
				};
				current.sessions.push(item);
				groups.set(label, current);
			}
			return [...groups.values()].map((group) => ({
				...group,
				sessions: [...group.sessions].sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))
			})).sort((left, right) => left.label.localeCompare(right.label, locale, {
				numeric: true,
				sensitivity: "base"
			}));
		}
		//#endregion
		//#region src/client/workspace-browser.ts
		/** 任务树只保留普通会话，频道和定时会话各走自己的页签。 */
		function isTaskSession(session) {
			if (session.origin === "subagent" || session.origin === "im" || session.blank === true) return false;
			if (isChannelSession(session.id)) return false;
			return !isScheduleSession(session.id, session.displayTitle ?? session.title ?? "");
		}
		/**
		* 对齐本机 Codex 26.915.4065.0 的项目会话列表。
		* 未展开时显示 5 条；展开后每次再加 10 条。按钮文案保持「展开显示」，全部露出后消失。
		* 当前会话落在窗口外时追加到末尾。
		*/
		function projectSessionWindow(ids, state, forcedId) {
			const page = state.page < 1 ? 1 : state.page;
			const limit = state.expanded ? 5 + 10 * page : 5;
			const head = ids.slice(0, limit);
			const visible = forcedId !== void 0 && ids.includes(forcedId) && !head.includes(forcedId) ? [...head, forcedId] : head;
			return {
				ids: visible,
				showMore: visible.length < ids.length
			};
		}
		/**
		* 折叠项目文件夹时清掉「展开显示」。
		* 安装包 i$n：文件夹从展开变为折叠时，对 `project:${id}` 调用 sE(..., false)。
		*/
		function collapseProjectSessionWindow() {
			return {
				expanded: false,
				page: 1
			};
		}
		/** 第一次展开把页码设为 1（可见 15 条），之后每点一次页码加 1。 */
		function nextProjectSessionWindow(state) {
			const current = state ?? {
				expanded: false,
				page: 1
			};
			if (!current.expanded) return {
				expanded: true,
				page: 1
			};
			return {
				expanded: true,
				page: current.page + 1
			};
		}
		/**
		* 会话行蓝线的落点：只在被悬停的那一行下方，且仅当它后面那条会话被折起或不存在。
		* 下一行仍可见时交给它自己的 before 线，避免两条平行蓝线。
		*/
		function sessionDropAfterRowId(drop, renderedIds) {
			const hoveredId = drop?.hoveredId;
			if (hoveredId === void 0 || !renderedIds.includes(hoveredId)) return void 0;
			const beforeId = drop?.beforeId;
			if (beforeId !== void 0 && renderedIds.includes(beforeId)) return void 0;
			return hoveredId;
		}
		/** 过滤不应出现在工作区树中的会话。 */
		function visibleSessionIds(ids, byId, archivedIds) {
			const archived = new Set(archivedIds);
			return ids.filter((id) => {
				const session = byId[id];
				return session !== void 0 && !archived.has(id) && isTaskSession({
					...session,
					id: session.id || id
				});
			});
		}
		/** 没有归属任何项目的普通会话，放到「最近」。 */
		function ungroupedSessionIds(ids, byId, assignedIds, archivedIds) {
			const assigned = new Set(assignedIds);
			return visibleSessionIds(ids, byId, archivedIds).filter((id) => !assigned.has(id));
		}
		/** 将一个项目或会话移到指定项之前；省略锚点时追加到末尾。 */
		function moveBefore(ids, id, beforeId) {
			if (!ids.includes(id) || beforeId === id) return [...ids];
			const next = ids.filter((item) => item !== id);
			const index = beforeId === void 0 ? next.length : next.indexOf(beforeId);
			next.splice(index < 0 ? next.length : index, 0, id);
			return next;
		}
		/**
		* 复刻 Codex 的排序落点：先从当前列表移除被拖项，再把落点表示成“插到谁之前”。
		* null 表示悬停自身或最终顺序不变，此时不显示蓝线，也不执行排序。
		*/
		function reorderDropBeforeId(ids, draggedId, hoveredId, after) {
			if (draggedId === hoveredId || !ids.includes(hoveredId)) return null;
			const remaining = ids.filter((id) => id !== draggedId);
			const hoveredIndex = remaining.indexOf(hoveredId);
			if (hoveredIndex < 0) return null;
			const beforeId = after ? remaining[hoveredIndex + 1] : hoveredId;
			if (!ids.includes(draggedId)) return beforeId;
			return moveBefore(ids, draggedId, beforeId).every((id, index) => id === ids[index]) ? null : beforeId;
		}
		/**
		* 置顶标题区与首项目的上半区都表示“插到第一项之前”，因此必须共用同一条指示线。
		* 非空列表把指示线贴到首项目顶部；空列表才使用独立的起始占位线。
		*/
		function pinnedHeaderDropIndicator(ids) {
			const workspaceId = ids[0];
			return workspaceId === void 0 ? { kind: "empty" } : {
				kind: "workspace",
				workspaceId
			};
		}
		/**
		* 空置顶没有项目行可自行计算落点，松手时 dragleave 又常把 relatedTarget 置空并清掉蓝线。
		* 只要这次 drop 发生在置顶区，空列表也必须把项目置顶。
		*/
		function resolvePinnedSectionDrop(draggedWorkspace, target, pinnedEmpty) {
			if (draggedWorkspace === void 0) return void 0;
			if (target?.zone === "pinned") return {
				id: draggedWorkspace,
				beforeId: target.beforeId
			};
			return pinnedEmpty ? { id: draggedWorkspace } : void 0;
		}
		/** 按指定 id 顺序取出对应项；未出现在 ids 中的项丢弃。 */
		function orderByIds(items, ids, idOf) {
			const byId = new Map(items.map((item) => [idOf(item), item]));
			return ids.flatMap((id) => {
				const item = byId.get(id);
				return item === void 0 ? [] : [item];
			});
		}
		/**
		* 置顶会话排前：置顶项按宿主 `pinnedSessionIds` 顺序（最近置顶在前）取前缀，
		* 其余保持原相对顺序。宿主 API 的语义是「置顶会话排在未置顶之前」（Pin a Session
		* ahead of unpinned Sessions），本函数就是这条语义在本地顺序上的唯一实现——
		* 侧栏树与快捷键（上/下一个会话）共用它，避免两处各排各的。
		* 取消置顶会回到原相对位置（我们没有官方的本地手动顺序覆盖层，见 KNOWN-ISSUES §20）。
		*/
		function pinnedFirstSessionIds(ids, pinnedSessionIds) {
			if (pinnedSessionIds === void 0 || pinnedSessionIds.length === 0) return [...ids];
			const members = new Set(ids);
			const front = pinnedSessionIds.filter((id) => members.has(id));
			if (front.length === 0) return [...ids];
			const frontSet = new Set(front);
			return [...front, ...ids.filter((id) => !frontSet.has(id))];
		}
		/** 展开移动目标的全部父级，保证页面重载并选中会话后该行仍然可见。 */
		function expandedForSessionMove(current, target) {
			const next = { ...current };
			if (target.pinned) {
				next["section:pinned"] = true;
				next[`pin:${target.workspaceId}`] = true;
				return next;
			}
			next["section:projects"] = true;
			next[target.workspaceId] = true;
			if (target.groupId !== void 0) next[`workspace-group:${target.groupId}`] = true;
			else if (target.hasGroups) next["workspace-group:ungrouped"] = true;
			return next;
		}
		function workspaceIdForSession(workspaces, sessionId) {
			return workspaces.find((workspace) => workspace.sessionIds.some((id) => String(id) === sessionId))?.workspaceId;
		}
		/** 打开或闭合只跟展开状态走；当前会话所在项目额外使用当前色。 */
		function projectFolderPresentation(isExpanded, containsCurrent) {
			return {
				open: isExpanded,
				current: containsCurrent
			};
		}
		/** 当前会话变化时展开所属项目或「最近」；会话尚未进入树则保持原展开状态。 */
		function expandedForCurrentSession(current, sessionId, tree) {
			if (sessionId === void 0 || sessionId === "") return { ...current };
			const workspaceId = workspaceIdForSession(tree.workspaces, sessionId);
			if (workspaceId !== void 0) return expandedForSessionMove(current, {
				workspaceId: String(workspaceId),
				pinned: tree.pinnedWorkspaceIds.includes(String(workspaceId)),
				groupId: tree.groups.find((group) => group.workspaceIds.includes(String(workspaceId)))?.id,
				hasGroups: tree.groups.length > 0
			});
			if (tree.recentIds.includes(sessionId)) return {
				...current,
				"section:recent": true
			};
			return { ...current };
		}
		/** 仅提供真正改变归属的目标；未分组目标固定排在自定义分组之后。 */
		function workspaceGroupMoveTargets(groups, workspaceId) {
			const currentGroupId = groups.find((group) => group.workspaceIds.includes(workspaceId))?.id;
			const targets = groups.filter((group) => group.id !== currentGroupId).map((group) => ({
				groupId: group.id,
				title: group.title
			}));
			if (currentGroupId !== void 0) targets.push({
				groupId: void 0,
				title: void 0
			});
			return targets;
		}
		const SESSION_DRAG_TYPE = "application/x-dcu-session";
		const WORKSPACE_DRAG_TYPE = "application/x-dcu-workspace";
		const WORKSPACE_GROUP_DRAG_TYPE = "application/x-dcu-workspace-group";
		const SESSION_DRAG_PREFIX = "dcu-session:";
		const WORKSPACE_DRAG_PREFIX = "dcu-workspace:";
		const WORKSPACE_GROUP_DRAG_PREFIX = "dcu-workspace-group:";
		function textPayload(data) {
			try {
				return data?.getData("text/plain") ?? "";
			} catch {
				return "";
			}
		}
		/** 写入会话拖拽载荷；drop 时以这个为准，不依赖尚未刷新的 React 状态。 */
		function writeSessionDrag(data, sessionId, title) {
			data.effectAllowed = "move";
			data.setData("text/plain", `${SESSION_DRAG_PREFIX}${sessionId}`);
			data.setData(SESSION_DRAG_TYPE, sessionId);
		}
		function writeWorkspaceDrag(data, workspaceId, title) {
			data.effectAllowed = "move";
			data.setData("text/plain", `${WORKSPACE_DRAG_PREFIX}${workspaceId}`);
			data.setData(WORKSPACE_DRAG_TYPE, workspaceId);
		}
		function writeWorkspaceGroupDrag(data, groupId, title) {
			data.effectAllowed = "move";
			data.setData("text/plain", `${WORKSPACE_GROUP_DRAG_PREFIX}${groupId}`);
			data.setData(WORKSPACE_GROUP_DRAG_TYPE, groupId);
		}
		function readSessionDrag(data, fallback) {
			try {
				const typed = data?.getData(SESSION_DRAG_TYPE);
				if (typed !== void 0 && typed.trim() !== "") return typed;
			} catch {}
			const text = textPayload(data);
			if (text.startsWith(SESSION_DRAG_PREFIX)) return text.slice(12);
			return fallback !== void 0 && fallback.trim() !== "" ? fallback : void 0;
		}
		function sessionDropAction(sourceWorkspaceId, targetWorkspaceId) {
			return sourceWorkspaceId !== void 0 && sourceWorkspaceId === targetWorkspaceId ? "reorder" : "move";
		}
		function readWorkspaceGroupDrag(data, fallback) {
			if (readSessionDrag(data) !== void 0) return void 0;
			try {
				const typed = data?.getData(WORKSPACE_GROUP_DRAG_TYPE);
				if (typed !== void 0 && typed.trim() !== "") return typed;
			} catch {}
			const text = textPayload(data);
			if (text.startsWith(WORKSPACE_GROUP_DRAG_PREFIX)) return text.slice(20);
			return fallback !== void 0 && fallback.trim() !== "" ? fallback : void 0;
		}
		/** 会话拖拽优先；有会话载荷时不得再把父项目置顶。 */
		function readWorkspaceDrag(data, fallback) {
			if (readSessionDrag(data) !== void 0) return void 0;
			if (readWorkspaceGroupDrag(data) !== void 0) return void 0;
			try {
				const typed = data?.getData(WORKSPACE_DRAG_TYPE);
				if (typed !== void 0 && typed.trim() !== "") return typed;
			} catch {}
			const text = textPayload(data);
			if (text.startsWith(WORKSPACE_DRAG_PREFIX)) return text.slice(14);
			return fallback !== void 0 && fallback.trim() !== "" ? fallback : void 0;
		}
		const WORKSPACE_GROUP_ERROR_MESSAGES = {
			"group-invalid": "分组信息无效。",
			"workspace-invalid": "项目标识无效。",
			"group-missing": "目标分组不存在。",
			"order-anchor-missing": "排序锚点不存在。"
		};
		/** 以稳定错误码承载分组业务失败，诊断文案不参与界面控制逻辑。 */
		var WorkspaceGroupError = class extends Error {
			code;
			name = "WorkspaceGroupError";
			constructor(code, message = WORKSPACE_GROUP_ERROR_MESSAGES[code]) {
				super(message);
				this.code = code;
			}
		};
		/** 校验结构和归属；存储兼容模式保留旧 locale 下合法的大小写变体名称。 */
		function parseGroups(value, preserveCaseVariants) {
			if (!Array.isArray(value) || value.length > 100) return void 0;
			const groupIds = /* @__PURE__ */ new Set();
			const groupTitles = /* @__PURE__ */ new Set();
			const workspaceIds = /* @__PURE__ */ new Set();
			const groups = [];
			for (const valueGroup of value) {
				if (valueGroup === null || typeof valueGroup !== "object") return void 0;
				const group = valueGroup;
				const id = typeof group.id === "string" ? group.id.trim() : "";
				const title = typeof group.title === "string" ? group.title.trim() : "";
				if (id === "" || id.length > 128 || title === "" || title.length > 80) return void 0;
				const titleKey = preserveCaseVariants ? title : title.toLowerCase();
				if (groupIds.has(id) || groupTitles.has(titleKey)) return void 0;
				if (!Array.isArray(group.workspaceIds) || group.workspaceIds.length > 1e3) return void 0;
				const normalizedIds = [...new Set(group.workspaceIds)];
				if (!normalizedIds.every((workspaceId) => typeof workspaceId === "string" && workspaceId.trim() !== "" && workspaceId.length <= 256)) return void 0;
				if (normalizedIds.some((workspaceId) => workspaceIds.has(workspaceId))) return void 0;
				groupIds.add(id);
				groupTitles.add(titleKey);
				normalizedIds.forEach((workspaceId) => workspaceIds.add(workspaceId));
				groups.push({
					id,
					title,
					workspaceIds: normalizedIds
				});
			}
			return groups;
		}
		/** 旧数据可往返保存且不改名；新名称的大小写判重由创建、重命名操作执行。 */
		function parseStoredWorkspaceGroups(value) {
			return parseGroups(value, true);
		}
		/** 新建空分组；项目只有被显式移动后才会进入其中。 */
		function createWorkspaceGroup(groups, group) {
			if (groups.some((existing) => existing.title.toLowerCase() === group.title.trim().toLowerCase())) throw new WorkspaceGroupError("group-invalid");
			const next = parseStoredWorkspaceGroups([...groups, {
				...group,
				workspaceIds: []
			}]);
			if (next === void 0) throw new WorkspaceGroupError("group-invalid");
			return next;
		}
		/** 仅更改名称，保留分组标识、成员及其顺序。 */
		function renameWorkspaceGroup(groups, groupId, title) {
			if (!groups.some((group) => group.id === groupId)) throw new WorkspaceGroupError("group-missing");
			const normalizedTitle = title.trim();
			if (normalizedTitle === "" || normalizedTitle.length > 80 || groups.some((group) => group.id !== groupId && group.title.toLowerCase() === normalizedTitle.toLowerCase())) throw new WorkspaceGroupError("group-invalid");
			return groups.map((group) => group.id === groupId ? {
				...group,
				title: normalizedTitle
			} : group);
		}
		/** 将项目放入指定分组；未传分组时退回未分组区。 */
		function assignWorkspaceToGroup(groups, workspaceId, groupId) {
			if (workspaceId.trim() === "" || workspaceId.length > 256) throw new WorkspaceGroupError("workspace-invalid");
			if (groupId !== void 0 && !groups.some((group) => group.id === groupId)) throw new WorkspaceGroupError("group-missing");
			return groups.map((group) => ({
				...group,
				workspaceIds: group.id === groupId ? [...group.workspaceIds.filter((id) => id !== workspaceId), workspaceId] : group.workspaceIds.filter((id) => id !== workspaceId)
			}));
		}
		/** 将项目插入目标分组的指定位置，同时从原分组移除。 */
		function placeWorkspaceInGroup(groups, workspaceId, groupId, beforeId) {
			if (workspaceId.trim() === "" || workspaceId.length > 256) throw new WorkspaceGroupError("workspace-invalid");
			const target = groups.find((group) => group.id === groupId);
			if (target === void 0) throw new WorkspaceGroupError("group-missing");
			const targetIds = target.workspaceIds.filter((id) => id !== workspaceId);
			const index = beforeId === void 0 ? targetIds.length : targetIds.indexOf(beforeId);
			if (index < 0) throw new WorkspaceGroupError("order-anchor-missing");
			targetIds.splice(index, 0, workspaceId);
			return groups.map((group) => ({
				...group,
				workspaceIds: group.id === groupId ? targetIds : group.workspaceIds.filter((id) => id !== workspaceId)
			}));
		}
		/** 在同一分组内移动项目；省略锚点时放到分组末尾。 */
		function moveWorkspaceGroupMember(groups, workspaceId, groupId, beforeId) {
			const target = groups.find((group) => group.id === groupId);
			if (target === void 0) throw new WorkspaceGroupError("group-missing");
			if (!target.workspaceIds.includes(workspaceId)) return groups.map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
			const remaining = target.workspaceIds.filter((id) => id !== workspaceId);
			const index = beforeId === void 0 ? remaining.length : remaining.indexOf(beforeId);
			if (index < 0) throw new WorkspaceGroupError("order-anchor-missing");
			const workspaceIds = [...remaining];
			workspaceIds.splice(index, 0, workspaceId);
			return groups.map((group) => group.id === groupId ? {
				...group,
				workspaceIds
			} : {
				...group,
				workspaceIds: [...group.workspaceIds]
			});
		}
		/** 调整自定义分组顺序；省略锚点时移动到所有自定义分组末尾。 */
		function moveWorkspaceGroup(groups, groupId, beforeGroupId) {
			const moved = groups.find((group) => group.id === groupId);
			if (moved === void 0) throw new WorkspaceGroupError("group-missing");
			if (beforeGroupId === groupId) return groups.map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
			const remaining = groups.filter((group) => group.id !== groupId);
			const index = beforeGroupId === void 0 ? remaining.length : remaining.findIndex((group) => group.id === beforeGroupId);
			if (index < 0) throw new WorkspaceGroupError("order-anchor-missing");
			remaining.splice(index, 0, moved);
			return remaining.map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
		}
		/** 删除分组时仅解除归属，不影响工作区本身。 */
		function deleteWorkspaceGroup(groups, groupId) {
			return groups.filter((group) => group.id !== groupId).map((group) => ({
				...group,
				workspaceIds: [...group.workspaceIds]
			}));
		}
		/** 工作区清单变化后清理失效归属，但保留空分组供用户继续使用。 */
		function pruneWorkspaceGroups(groups, validIds) {
			const valid = new Set(validIds);
			return groups.map((group) => ({
				...group,
				workspaceIds: group.workspaceIds.filter((id) => valid.has(id))
			}));
		}
		function groupedWorkspaceIds(groups) {
			return groups.flatMap((group) => group.workspaceIds);
		}
		//#endregion
		//#region src/client/session-order.ts
		/**
		* 侧栏会话全序与相邻切换（对齐 ZCode 的「上/下一个任务」）。
		*
		* 调用方（快捷键命令）在触发时现读快照与本地偏好缓存，因此这里全是纯函数：
		* 顺序的段序与行序同侧栏树（CodexWorkspaceBrowser）共用同一批助手
		* （visibleSessionIds / ungroupedSessionIds / orderByIds / groupedWorkspaceIds），
		* 保证「快捷键走到的会话」就是「侧栏里看到的相邻行」。
		*
		* 段序：置顶项目 → 项目分组（组内按组员顺序）→ 未分组项目 → 最近。
		* 折叠状态不参与（与 ZCode 相同：折叠不改变任务集合，只改变显示）。
		*/
		/** 侧栏可见会话的全序：置顶项目 → 分组 → 未分组 → 最近；每组内会话再按宿主置顶排前。 */
		function flattenSidebarSessionOrder(input) {
			const archived = input.workspaces.archivedSessionIds ?? [];
			const pinnedSessions = input.workspaces.pinnedSessionIds;
			const byId = input.sessions.byId;
			const items = input.workspaces.items.map((workspace) => ({
				...workspace,
				visibleIds: pinnedFirstSessionIds(visibleSessionIds(workspace.sessionIds, byId, archived), pinnedSessions)
			}));
			const pinned = new Set(input.pinnedWorkspaceIds);
			const pinnedItems = orderByIds(items, input.pinnedWorkspaceIds, (workspace) => String(workspace.workspaceId));
			const regular = items.filter((workspace) => !pinned.has(String(workspace.workspaceId)));
			const grouped = new Set(groupedWorkspaceIds(input.workspaceGroups));
			const ungrouped = regular.filter((workspace) => !grouped.has(String(workspace.workspaceId)));
			const regularById = new Map(regular.map((workspace) => [String(workspace.workspaceId), workspace]));
			const order = [];
			for (const workspace of pinnedItems) order.push(...workspace.visibleIds);
			for (const group of input.workspaceGroups) for (const id of group.workspaceIds) {
				const workspace = regularById.get(String(id));
				if (workspace !== void 0) order.push(...workspace.visibleIds);
			}
			for (const workspace of ungrouped) order.push(...workspace.visibleIds);
			const assigned = input.workspaces.items.flatMap((workspace) => workspace.sessionIds.map((id) => String(id)));
			const recent = pinnedFirstSessionIds(ungroupedSessionIds(input.sessions.ids ?? Object.keys(input.sessions.byId), byId, assigned, archived).sort((left, right) => (input.sessions.byId[right]?.updatedAt ?? 0) - (input.sessions.byId[left]?.updatedAt ?? 0)), pinnedSessions);
			order.push(...recent);
			return order;
		}
		/**
		* 上/下一个会话解析 —— ZCode `resolveQuickPickConversationNavigation` 的逐字移植
		* （packages/ui/src/lib/quickPickConversationNavigation.ts）。语义：
		* - 先对传入列表去重、滤空串，保持原顺序（调用方给的是侧栏顺序）；
		* - 不循环：走到边界返回 null（命令据此报 blocked，而不是绕回另一端）；
		* - 当前会话不在列表时（如正停在首页）：previous = 列表最后一个，next = 列表第一个。
		*/
		function resolveAdjacentSessionNavigation(params) {
			const sessionIds = [...new Set(params.sessionIds.filter((id) => id.length > 0))];
			const activeIndex = params.currentId ? sessionIds.indexOf(params.currentId) : -1;
			const previousBaseIndex = activeIndex === -1 ? sessionIds.length : activeIndex;
			const nextBaseIndex = activeIndex === -1 ? -1 : activeIndex;
			return {
				previousSessionId: sessionIds[previousBaseIndex - 1] ?? null,
				nextSessionId: sessionIds[nextBaseIndex + 1] ?? null
			};
		}
		//#endregion
		//#region src/client/session-navigation-shortcuts.ts
		const COMMANDS = [{
			id: "session.previous",
			labelKey: "sessions.previous",
			aliases: ["previous session"],
			direction: "previous",
			code: "BracketLeft"
		}, {
			id: "session.next",
			labelKey: "sessions.next",
			aliases: ["next session"],
			direction: "next",
			code: "BracketRight"
		}];
		function bindings(code) {
			return {
				"desktop:macos": {
					code,
					modifiers: ["primary", "shift"]
				},
				"desktop:windows": {
					code,
					modifiers: ["primary", "shift"]
				},
				"desktop:linux": {
					code,
					modifiers: ["primary", "shift"]
				},
				"web:macos": {
					code,
					modifiers: ["primary", "alt"]
				},
				"web:windows": {
					code,
					modifiers: ["primary", "alt"]
				}
			};
		}
		function installSessionNavigationShortcuts(ctx, deps) {
			ctx.inject(["shortcuts"], (injected) => {
				const service = injected.shortcuts;
				if (service === void 0 || typeof service.register !== "function" || service.catalog === void 0) return;
				const shots = service;
				const disposers = [];
				for (const command of COMMANDS) {
					if (shots.catalog.getSnapshot().some((row) => row.id === command.id)) continue;
					disposers.push(shots.register({
						id: command.id,
						label: () => deps.t(command.labelKey),
						aliases: command.aliases,
						defaults: bindings(command.code),
						regions: ["page", "editable"],
						modals: [],
						resolve: (context) => {
							if (context.modal != null) return {
								status: "blocked",
								reason: deps.t("sessions.noTarget")
							};
							const navigation = resolveAdjacentSessionNavigation({
								sessionIds: deps.readOrder(),
								currentId: deps.currentId() ?? null
							});
							const target = command.direction === "previous" ? navigation.previousSessionId : navigation.nextSessionId;
							if (target === null) return {
								status: "blocked",
								reason: deps.t("sessions.noTarget")
							};
							return {
								status: "handled",
								run: () => {
									deps.openSession(target);
								}
							};
						}
					}));
				}
				return () => {
					for (const dispose of disposers) dispose();
				};
			});
		}
		//#endregion
		//#region src/client/shortcut-catalog.ts
		const emptyCatalog = [];
		const noopSubscribe = () => () => {};
		const emptySnapshot = () => emptyCatalog;
		function liveShortcutCatalog(ctx) {
			const listeners = /* @__PURE__ */ new Set();
			let catalog;
			const notify = () => {
				for (const listener of listeners) listener();
			};
			ctx.inject(["shortcuts"], (shortcutCtx) => {
				catalog = shortcutCtx.shortcuts.catalog;
				const unsubscribe = catalog.subscribe(notify);
				notify();
				return () => {
					unsubscribe();
					catalog = void 0;
					notify();
				};
			});
			return {
				getSnapshot: () => catalog?.getSnapshot() ?? emptyCatalog,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				}
			};
		}
		/** 只读查询钩子：返回 `commandId → 目录条目` 的查找函数（目录未就绪时恒 undefined）。 */
		function useShortcutLookup(source) {
			const rows = (0, react.useSyncExternalStore)(source?.subscribe ?? noopSubscribe, source?.getSnapshot ?? emptySnapshot, source?.getSnapshot ?? emptySnapshot);
			return (commandId) => rows.find((row) => row.id === commandId);
		}
		//#endregion
		//#region src/business-api.ts
		const CODEX_UI_API_BASE = "/api/dsh-codex-ui";
		const CODEX_UI_API_ENDPOINTS = Object.freeze({
			connectors: `${CODEX_UI_API_BASE}/connectors`,
			dependencies: `${CODEX_UI_API_BASE}/dependencies`,
			openInExplorer: `${CODEX_UI_API_BASE}/open-in-explorer`,
			preferences: `${CODEX_UI_API_BASE}/preferences`,
			sessionMove: `${CODEX_UI_API_BASE}/session-move`
		});
		//#endregion
		//#region src/client/business-request-error.ts
		var BusinessRequestError = class extends Error {
			status;
			constructor(status) {
				super(`业务请求失败：HTTP ${status}`);
				this.status = status;
				this.name = "BusinessRequestError";
			}
		};
		function businessRequestErrorKey(error) {
			if (!(error instanceof BusinessRequestError)) return void 0;
			if (error.status === 401) return "errors.unauthorized";
			if (error.status === 403) return "errors.forbidden";
			if (error.status === 503) return "errors.serviceUnavailable";
		}
		//#endregion
		//#region src/client/pinned-workspaces.ts
		/** 浏览器本地持久化键；用于工作区偏好的首帧恢复与 Host 故障兜底。 */
		const PINNED_WORKSPACES_STORAGE_KEY = "dsh-codex-ui.pinned-workspace-ids";
		const WORKSPACE_GROUPS_STORAGE_KEY = "dsh-codex-ui.workspace-groups.v1";
		const WORKSPACE_PREFERENCES_ENDPOINT = CODEX_UI_API_ENDPOINTS.preferences;
		/** 清理无效或重复的工作区标识。 */
		function normalizePinnedWorkspaceIds(ids) {
			return [...new Set(ids.filter((id) => id.trim() !== ""))];
		}
		/** 仅在宿主完整基线就绪后清理已经不存在的工作区，避免加载中的临时列表抹掉持久化置顶。 */
		function prunePinnedWorkspaceIds(ids, validIds) {
			const valid = new Set(validIds);
			const next = ids.filter((id) => valid.has(id));
			return next.length === ids.length ? [...ids] : next;
		}
		/** Host 数据优先；旧 Host 或待同步分组使用本地缓存，读取期间的用户操作始终优先。 */
		function resolveWorkspacePreferencesHydration(local, host, dirty, localWorkspaceGroupsPendingHostSync = false) {
			if (dirty !== void 0) return {
				pinnedWorkspaceIds: normalizePinnedWorkspaceIds(dirty.pinnedWorkspaceIds),
				workspaceGroups: dirty.workspaceGroups,
				writeHost: true
			};
			if (host.exists) {
				const preserveLocalGroups = host.workspaceGroupsSupported === false || localWorkspaceGroupsPendingHostSync;
				return {
					pinnedWorkspaceIds: normalizePinnedWorkspaceIds(host.pinnedWorkspaceIds),
					workspaceGroups: preserveLocalGroups ? local.workspaceGroups : host.workspaceGroups,
					writeHost: localWorkspaceGroupsPendingHostSync && host.workspaceGroupsSupported !== false
				};
			}
			const pinnedWorkspaceIds = normalizePinnedWorkspaceIds(local.pinnedWorkspaceIds);
			return {
				pinnedWorkspaceIds,
				workspaceGroups: local.workspaceGroups,
				writeHost: pinnedWorkspaceIds.length > 0 || local.workspaceGroups.length > 0
			};
		}
		async function readHostWorkspacePreferences(fetcher = fetch) {
			const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
				method: "GET",
				cache: "no-store",
				signal: AbortSignal.timeout(5e3)
			});
			if (!response.ok) throw new BusinessRequestError(response.status);
			const payload = await response.json();
			if (payload === null || typeof payload !== "object") throw new Error("置顶偏好响应格式无效。");
			const record = payload;
			const workspaceGroupsSupported = Object.prototype.hasOwnProperty.call(record, "workspaceGroups");
			const workspaceGroups = workspaceGroupsSupported ? parseStoredWorkspaceGroups(record.workspaceGroups) : [];
			if (typeof record.exists !== "boolean" || !Array.isArray(record.pinnedWorkspaceIds) || !record.pinnedWorkspaceIds.every((id) => typeof id === "string") || workspaceGroups === void 0) throw new Error("置顶偏好响应格式无效。");
			return {
				exists: record.exists,
				pinnedWorkspaceIds: normalizePinnedWorkspaceIds(record.pinnedWorkspaceIds),
				workspaceGroups,
				workspaceGroupsSupported
			};
		}
		async function writeHostWorkspacePreferences(pinnedWorkspaceIds, workspaceGroups, fetcher = fetch) {
			const groups = parseStoredWorkspaceGroups([...workspaceGroups]);
			if (groups === void 0) throw new Error("工作区分组数据无效。");
			const response = await fetcher(WORKSPACE_PREFERENCES_ENDPOINT, {
				method: "PUT",
				cache: "no-store",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					pinnedWorkspaceIds: normalizePinnedWorkspaceIds(pinnedWorkspaceIds),
					workspaceGroups: groups
				}),
				signal: AbortSignal.timeout(5e3)
			});
			if (!response.ok) throw new BusinessRequestError(response.status);
		}
		/** 兼容旧调用方；新代码应同时写入分组。 */
		async function readHostPinnedWorkspaceIds(fetcher = fetch) {
			return readHostWorkspacePreferences(fetcher);
		}
		/** 在置顶列表中切换一个工作区。 */
		/** 把工作区插入置顶列表的指定位置；省略锚点时追加到末尾。 */
		function insertPinnedWorkspace(ids, id, beforeId) {
			const next = ids.filter((item) => item !== id);
			if (beforeId === void 0) return [...next, id];
			if (beforeId === id) return ids.includes(id) ? [...ids] : [...next, id];
			const index = next.indexOf(beforeId);
			next.splice(index < 0 ? next.length : index, 0, id);
			return next;
		}
		function togglePinnedWorkspace(ids, workspaceId) {
			return ids.includes(workspaceId) ? ids.filter((id) => id !== workspaceId) : [...ids, workspaceId];
		}
		/** 从浏览器本地存储读取置顶工作区；损坏数据按空列表处理。 */
		function readPinnedWorkspaceIds(storage) {
			if (storage === void 0) return [];
			try {
				const value = JSON.parse(storage.getItem("dsh-codex-ui.pinned-workspace-ids") ?? "[]");
				return Array.isArray(value) && value.every((id) => typeof id === "string") ? normalizePinnedWorkspaceIds(value) : [];
			} catch {
				return [];
			}
		}
		/** 保存置顶工作区；存储不可用时不影响导航。 */
		function savePinnedWorkspaceIds(storage, ids) {
			if (storage === void 0) return;
			try {
				storage.setItem(PINNED_WORKSPACES_STORAGE_KEY, JSON.stringify(normalizePinnedWorkspaceIds(ids)));
			} catch {}
		}
		/** 分组缓存用于首帧恢复和 Host 暂时不可用时兜底，并记录尚未完成的 Host 迁移。 */
		function readWorkspaceGroupsCache(storage) {
			if (storage === void 0) return {
				workspaceGroups: [],
				pendingHostSync: false
			};
			try {
				const value = JSON.parse(storage.getItem("dsh-codex-ui.workspace-groups.v1") ?? "{\"version\":1,\"workspaceGroups\":[],\"pendingHostSync\":false}");
				if (value === null || typeof value !== "object") return {
					workspaceGroups: [],
					pendingHostSync: false
				};
				const record = value;
				const workspaceGroups = record.version === 1 ? parseStoredWorkspaceGroups(record.workspaceGroups) : void 0;
				if (workspaceGroups === void 0 || typeof record.pendingHostSync !== "boolean") return {
					workspaceGroups: [],
					pendingHostSync: false
				};
				return {
					workspaceGroups,
					pendingHostSync: record.pendingHostSync
				};
			} catch {
				return {
					workspaceGroups: [],
					pendingHostSync: false
				};
			}
		}
		function saveWorkspaceGroupsCache(storage, groups, pendingHostSync) {
			if (storage === void 0) return;
			const workspaceGroups = parseStoredWorkspaceGroups([...groups]);
			if (workspaceGroups === void 0) return;
			try {
				storage.setItem(WORKSPACE_GROUPS_STORAGE_KEY, JSON.stringify({
					version: 1,
					workspaceGroups,
					pendingHostSync
				}));
			} catch {}
		}
		//#endregion
		//#region src/client/workspace-directory-flow.ts
		const WORKSPACE_DIRECTORY_FLOW = "sidebar.codex.directoryFlow";
		/** Give the selected host picker an outlet owned by our sidebar, including while collapsed.
		* Directory pickers have no children; preserve their injected face, locale and store.
		* The registry has erased the original component's types, so only this forwarding boundary
		* uses the erased registration signature. No host implementation or private state is imported.
		*/
		function registerWorkspaceDirectoryFlow(ctx) {
			ctx.slots.inject(WORKSPACE_DIRECTORY_FLOW, () => {
				let entry;
				let offEntry = () => {};
				const register = ctx.slots.register.bind(ctx.slots);
				const reconcile = () => {
					const next = ctx.slots.entriesOfSlot("sidebar.workspaces.directoryFlow")[0];
					if (next === entry) return;
					offEntry();
					offEntry = () => {};
					entry = next;
					if (!next || Object.keys(next.children ?? {}).length > 0) return;
					offEntry = register({
						name: WORKSPACE_DIRECTORY_FLOW,
						priority: -1,
						inject: next.inject,
						store: next.store,
						locale: next.locale
					}, next.component);
				};
				reconcile();
				const off = ctx.slots.subscribe("sidebar.workspaces.directoryFlow", reconcile);
				return () => {
					off();
					offEntry();
				};
			});
		}
		//#endregion
		//#region src/client/official-slot-shadow.ts
		/**
		* 真实插槽核会在同一轮同步启动里继续挂官方插件。
		* 立刻声明官方也要声明的子插槽，官方注册会抛出且不会重试，停用后官方就回不来。
		* 测试夹具没有 spec，保持同步登记。
		*/
		function registerAfterOfficialWave(slots, slot, officialReady, register, waitForOfficial = false) {
			const face = slots;
			if (typeof face.spec !== "function") return register();
			let remove = () => {};
			let done = false;
			let off = () => {};
			let timer;
			const finish = (timedOut = false) => {
				if (done) return;
				done = true;
				if (timer !== void 0) clearTimeout(timer);
				off();
				if (timedOut) console.warn(`[zcode-ui-for-dsh] 等待官方 '${slot}' 注册超时；仅注册自有槽，保留官方共享声明。`);
				remove = register(timedOut);
			};
			if (officialReady()) return register();
			off = face.subscribe?.(slot, () => {
				if (officialReady()) finish(false);
			}) ?? (() => {});
			if (!waitForOfficial) queueMicrotask(() => finish(false));
			else timer = setTimeout(() => finish(true), 3e3);
			return () => {
				done = true;
				if (timer !== void 0) clearTimeout(timer);
				off();
				remove();
			};
		}
		//#endregion
		//#region src/client/settings-navigation.ts
		/**
		* 自有设置壳通过事件直接打开分区，不依赖账号入口的按钮或菜单结构。
		* 保留的宿主设置壳仍从设置入口触发，再按可访问名称选择页面。
		*/
		function pickSettingsSectionButton(buttons, labels) {
			for (const label of labels) {
				const match = buttons.find((button) => button.textContent?.trim() === label);
				if (match !== void 0) return match;
			}
		}
		/**
		* 可选插件未注册设置入口时，直接打开兜底页，避免先展示通用设置并等待导航超时。
		*/
		function routeOptionalSettingsSection(available, openRequested, openFallback) {
			if (available) {
				openRequested();
				return;
			}
			openFallback();
		}
		/** 官方 alpha.2 插件管理页占用 sidebar.panellist / main 的同一 id。 */
		const OFFICIAL_PLUGINS_PANEL_ID = "plugins";
		let cancelPendingNavigation;
		const SETTINGS_NAVIGATION_TIMEOUT_MS = 4e3;
		const SETTINGS_TRIGGER_SELECTOR = "[data-dcu-settings-trigger],[aria-haspopup=\"dialog\"]";
		const SETTINGS_OPEN_SECTION_EVENT = "dcu-settings-open-section";
		const SETTINGS_OPEN_ROOT_EVENT = "dcu-settings-open-root";
		const SETTINGS_OWNER_SELECTOR = "[data-dcu-settings-owner]";
		/** 根入口与分区跳转使用同一触发器合约，兼容保留的宿主设置壳。 */
		function openSettingsRoot(root) {
			const owner = root?.querySelector(SETTINGS_OWNER_SELECTOR);
			if (owner && !owner.dispatchEvent(new CustomEvent("dcu-settings-open-root", { cancelable: true }))) return;
			root?.querySelector(SETTINGS_TRIGGER_SELECTOR)?.click();
		}
		function openSettingsSection(root, label, onMissing, onSelected) {
			const labels = typeof label === "string" ? [label] : label;
			const trigger = root?.querySelector(SETTINGS_OWNER_SELECTOR) ?? root?.querySelector("[data-dcu-settings-trigger],[aria-haspopup=\"dialog\"]");
			if (trigger === null || trigger === void 0) {
				onMissing?.();
				return;
			}
			const opening = cancelPendingNavigation !== void 0;
			cancelPendingNavigation?.();
			const request = new CustomEvent(SETTINGS_OPEN_SECTION_EVENT, {
				detail: { labels },
				cancelable: true
			});
			const detail = { labels };
			const ownerRequest = new CustomEvent(SETTINGS_OPEN_SECTION_EVENT, {
				detail,
				cancelable: true
			});
			if (trigger.hasAttribute("data-dcu-settings-owner")) {
				trigger.dispatchEvent(ownerRequest);
				if (detail.result === "selected") onSelected?.();
				else onMissing?.();
				return;
			}
			if (!trigger.dispatchEvent(request)) {
				onSelected?.();
				return;
			}
			const pageSelector = trigger.hasAttribute("data-dcu-settings-trigger") ? "[data-dcu-settings-page]" : "[role=\"dialog\"]";
			if (!opening && document.querySelector(pageSelector) === null) trigger.click();
			let frame;
			let finished = false;
			const observer = new MutationObserver(() => {
				schedule();
			});
			const cleanup = () => {
				if (finished) return;
				finished = true;
				observer.disconnect();
				window.clearTimeout(timeout);
				if (frame !== void 0) window.cancelAnimationFrame(frame);
				if (cancelPendingNavigation === cleanup) cancelPendingNavigation = void 0;
			};
			const select = () => {
				const target = pickSettingsSectionButton([...document.querySelectorAll(`${pageSelector} nav button`)], labels);
				if (target === void 0) return false;
				cleanup();
				target.click();
				onSelected?.();
				return true;
			};
			const schedule = () => {
				if (finished || frame !== void 0) return;
				frame = window.requestAnimationFrame(() => {
					frame = void 0;
					select();
				});
			};
			const timeout = window.setTimeout(() => {
				if (select()) return;
				cleanup();
				console.warn(`[dsh-zcode-ui] 未找到设置分区：${labels.join(" / ")}`);
				onMissing?.();
			}, SETTINGS_NAVIGATION_TIMEOUT_MS);
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			cancelPendingNavigation = cleanup;
			schedule();
		}
		//#endregion
		//#region src/client/global-panels.tsx
		/** 从宿主注册表读取面板元数据；缓存快照以满足 React 外部状态订阅契约。 */
		function createGlobalPanelSource(slots, locale) {
			let cached = [];
			return {
				getSnapshot() {
					const next = slots.entriesOfSlot("sidebar.panellist").flatMap(({ options }) => {
						if (options.id === void 0 || options.id === "plugins") return [];
						return [{
							id: options.id,
							order: options.order ?? 0,
							label: (typeof options.label === "function" ? options.label() : options.label) ?? options.id
						}];
					}).sort((a, b) => a.order - b.order);
					if (next.length !== cached.length || next.some((panel, index) => {
						const previous = cached[index];
						return previous === void 0 || panel.id !== previous.id || panel.label !== previous.label || panel.order !== previous.order;
					})) cached = next;
					return cached;
				},
				subscribe(listener) {
					const offSlots = slots.subscribe("sidebar.panellist", listener);
					const offLocale = locale.subscribe(listener);
					return () => {
						offSlots();
						offLocale();
					};
				}
			};
		}
		/** 展开和紧凑侧栏只列出宿主注册的全局面板，不额外插入返回会话的任务入口。 */
		function GlobalPanelButtons({ panels, activeId, wide, selectPanel, renderIcon }) {
			if (panels.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: panels.map((panel) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: wide ? "dcu-global-panel" : "dcu-icon dcu-global-panel",
				"aria-label": panel.label,
				title: wide ? void 0 : panel.label,
				"aria-current": activeId === panel.id ? "page" : void 0,
				onClick: () => selectPanel(panel.id),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dcu-menu-icon",
					"aria-hidden": "true",
					children: renderIcon(panel.id, activeId === panel.id)
				}), wide && panel.label]
			}, panel.id)) });
		}
		/** 按用户要求用最窄宽度替代宿主自适应默认；已有有效偏好不重置，拖拽起点沿用宿主存储。 */
		function initializeComposerWidth(storage) {
			const key = "dsh.conversation.contentWidth";
			try {
				const saved = Number(storage.getItem(key));
				if (Number.isFinite(saved) && saved > 0) return;
				storage.setItem(key, String(640));
			} catch (error) {
				console.warn("[dsh-zcode-ui] 无法初始化输入区宽度，将使用宿主默认值。", error);
			}
		}
		/** 新建页没有宿主 WidthHandle，补充同一宽度偏好的拖拽入口。 */
		function observeHeroWidthHandles(label) {
			const mounted = /* @__PURE__ */ new Map();
			const style = document.createElement("style");
			style.textContent = `[data-phase=hero]:has([data-conversation-scroll]){position:relative}[data-dcu-width-handle]{position:absolute;top:0;bottom:0;width:32px;padding:0;border:0;background:transparent;cursor:col-resize;touch-action:none;z-index:8;outline-offset:-5px}[data-dcu-width-handle=left]{right:calc(50% + var(--dsh-chat-user-width,640px) / 2 + 16px);left:auto}[data-dcu-width-handle=right]{left:calc(50% + var(--dsh-chat-user-width,640px) / 2 + 16px);right:auto}[data-phase=hero]:has([data-conversation-composer-overlay]) [data-dcu-width-handle]{display:none}`;
			document.head.append(style);
			const sync = () => {
				for (const [root, dispose] of mounted) if (!root.isConnected || root.dataset.phase !== "hero") {
					dispose();
					mounted.delete(root);
				}
				for (const root of document.querySelectorAll("[data-phase=hero]")) {
					if (mounted.has(root) || !root.querySelector("[data-conversation-scroll]")) continue;
					const clamp = (value) => Math.min(Math.max(640, value), Math.max(640, root.clientWidth - 176));
					const current = () => {
						const raw = getComputedStyle(root).getPropertyValue("--dsh-chat-user-width");
						return clamp(parseFloat(raw) || 640);
					};
					const publish = (width, save) => {
						const value = clamp(width);
						root.style.setProperty("--dsh-chat-user-width", `${value}px`);
						if (save) try {
							localStorage.setItem("dsh.conversation.contentWidth", String(value));
						} catch (error) {
							console.warn("[dsh-zcode-ui] 无法保存输入区宽度。", error);
						}
					};
					const handles = ["left", "right"].map((side) => {
						const handle = document.createElement("button");
						handle.type = "button";
						handle.dataset.dcuWidthHandle = side;
						handle.setAttribute("aria-label", label);
						let origin = 0;
						let initial = 640;
						let dragging = false;
						handle.addEventListener("pointerdown", (event) => {
							if (event.button !== 0) return;
							event.preventDefault();
							origin = event.clientX;
							initial = current();
							dragging = true;
							handle.dataset.dragging = "";
							handle.setPointerCapture(event.pointerId);
						});
						handle.addEventListener("pointermove", (event) => {
							if (dragging) publish(initial + (event.clientX - origin) * (side === "right" ? 2 : -2), false);
						});
						handle.addEventListener("pointerup", (event) => {
							if (!dragging) return;
							publish(initial + (event.clientX - origin) * (side === "right" ? 2 : -2), true);
							dragging = false;
							delete handle.dataset.dragging;
							handle.releasePointerCapture(event.pointerId);
						});
						handle.addEventListener("lostpointercapture", () => {
							if (dragging) publish(initial, false);
							dragging = false;
							delete handle.dataset.dragging;
						});
						handle.addEventListener("keydown", (event) => {
							if (![
								"ArrowLeft",
								"ArrowRight",
								"Home"
							].includes(event.key)) return;
							event.preventDefault();
							const delta = (event.key === "ArrowRight" ? 1 : -1) * (side === "right" ? 1 : -1) * 20;
							publish(event.key === "Home" ? 640 : current() + delta, true);
						});
						root.append(handle);
						return handle;
					});
					mounted.set(root, () => {
						handles.forEach((handle) => handle.remove());
					});
				}
			};
			const observer = new MutationObserver(sync);
			observer.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["data-phase"]
			});
			sync();
			return () => {
				observer.disconnect();
				mounted.forEach((dispose) => dispose());
				mounted.clear();
				style.remove();
			};
		}
		//#endregion
		//#region src/client/tree-expansion.ts
		const WORKSPACE_EXPANSION_STORAGE_KEY = "dsh-codex-ui.workspace-expansion.v1";
		const CHANNEL_EXPANSION_STORAGE_KEY = "dsh-codex-ui.channel-expansion.v1";
		const SCHEDULE_EXPANSION_STORAGE_KEY = "dsh-codex-ui.schedule-expansion.v1";
		const MAX_EXPANSION_ENTRIES = 500;
		const MAX_EXPANSION_KEY_LENGTH = 512;
		function browserStorage() {
			if (typeof window === "undefined") return void 0;
			try {
				return window.localStorage;
			} catch {
				return;
			}
		}
		function parseTreeExpansionState(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const entries = Object.entries(value).filter(([key, expanded]) => key.length > 0 && key.length <= MAX_EXPANSION_KEY_LENGTH && typeof expanded === "boolean").slice(0, MAX_EXPANSION_ENTRIES);
			return Object.fromEntries(entries);
		}
		function readTreeExpansionState(storage, key) {
			if (storage === void 0) return {};
			try {
				return parseTreeExpansionState(JSON.parse(storage.getItem(key) ?? "{}"));
			} catch {
				return {};
			}
		}
		function writeTreeExpansionState(storage, key, state) {
			if (storage === void 0) return;
			try {
				storage.setItem(key, JSON.stringify(parseTreeExpansionState(state)));
			} catch {}
		}
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const mergeClasses = (...classes) => classes.filter((className, index, array) => {
			return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
		}).join(" ").trim();
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const toPascalCase = (string) => {
			const camelCase = toCamelCase(string);
			return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/defaultAttributes.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		var defaultAttributes = {
			xmlns: "http://www.w3.org/2000/svg",
			width: 24,
			height: 24,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const hasA11yProp = (props) => {
			for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
			return false;
		};
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/context.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const LucideContext = (0, react.createContext)({});
		const useLucideContext = () => (0, react.useContext)(LucideContext);
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/Icon.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Icon = (0, react.forwardRef)(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
			const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
			const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
			return (0, react.createElement)("svg", {
				ref,
				...defaultAttributes,
				width: size ?? contextSize ?? defaultAttributes.width,
				height: size ?? contextSize ?? defaultAttributes.height,
				stroke: color ?? contextColor,
				strokeWidth: calculatedStrokeWidth,
				className: mergeClasses("lucide", contextClass, className),
				...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
				...rest
			}, [...iconNode.map(([tag, attrs]) => (0, react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
		});
		//#endregion
		//#region node_modules/.pnpm/lucide-react@1.39.0_react@18.3.1/node_modules/lucide-react/dist/esm/createLucideIcon.mjs
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const createLucideIcon = (iconName, iconNode) => {
			const Component = (0, react.forwardRef)(({ className, ...props }, ref) => (0, react.createElement)(Icon, {
				ref,
				iconNode,
				className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
				...props
			}));
			Component.displayName = toPascalCase(iconName);
			return Component;
		};
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Archive = createLucideIcon("archive", [
			["rect", {
				width: "20",
				height: "5",
				x: "2",
				y: "3",
				rx: "1",
				key: "1wp1u1"
			}],
			["path", {
				d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",
				key: "1s80jp"
			}],
			["path", {
				d: "M10 12h4",
				key: "a56b0p"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ArrowLeft = createLucideIcon("arrow-left", [["path", {
			d: "m12 19-7-7 7-7",
			key: "1l729n"
		}], ["path", {
			d: "M19 12H5",
			key: "x3x0zl"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Bot = createLucideIcon("bot", [
			["path", {
				d: "M12 8V4H8",
				key: "hb8ula"
			}],
			["rect", {
				width: "16",
				height: "12",
				x: "4",
				y: "8",
				rx: "2",
				key: "enze0r"
			}],
			["path", {
				d: "M2 14h2",
				key: "vft8re"
			}],
			["path", {
				d: "M20 14h2",
				key: "4cs60a"
			}],
			["path", {
				d: "M15 13v2",
				key: "1xurst"
			}],
			["path", {
				d: "M9 13v2",
				key: "rq6x2g"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Box = createLucideIcon("box", [
			["path", {
				d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
				key: "hh9hay"
			}],
			["path", {
				d: "m3.3 7 8.7 5 8.7-5",
				key: "g66t2b"
			}],
			["path", {
				d: "M12 22V12",
				key: "d0xqtd"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Bug = createLucideIcon("bug", [
			["path", {
				d: "M12 20v-9",
				key: "1qisl0"
			}],
			["path", {
				d: "M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",
				key: "uouzyp"
			}],
			["path", {
				d: "M14.12 3.88 16 2",
				key: "qol33r"
			}],
			["path", {
				d: "M21 21a4 4 0 0 0-3.81-4",
				key: "1b0z45"
			}],
			["path", {
				d: "M21 5a4 4 0 0 1-3.55 3.97",
				key: "5cxbf6"
			}],
			["path", {
				d: "M22 13h-4",
				key: "1jl80f"
			}],
			["path", {
				d: "M3 21a4 4 0 0 1 3.81-4",
				key: "1fjd4g"
			}],
			["path", {
				d: "M3 5a4 4 0 0 0 3.55 3.97",
				key: "1d7oge"
			}],
			["path", {
				d: "M6 13H2",
				key: "82j7cp"
			}],
			["path", {
				d: "m8 2 1.88 1.88",
				key: "fmnt4t"
			}],
			["path", {
				d: "M9 7.13V6a3 3 0 1 1 6 0v1.13",
				key: "1vgav8"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const CalendarClock = createLucideIcon("calendar-clock", [
			["path", {
				d: "M16 14v2.2l1.6 1",
				key: "fo4ql5"
			}],
			["path", {
				d: "M16 2v3",
				key: "otl347"
			}],
			["path", {
				d: "M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338",
				key: "7hb8p4"
			}],
			["path", {
				d: "M3 9h5.859",
				key: "numkqi"
			}],
			["path", {
				d: "M8 2v3",
				key: "1ioesn"
			}],
			["circle", {
				cx: "16",
				cy: "16",
				r: "6",
				key: "qoo3c4"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Check = createLucideIcon("check", [["path", {
			d: "M20 6 9 17l-5-5",
			key: "1gmf2c"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ChevronLeft = createLucideIcon("chevron-left", [["path", {
			d: "m15 18-6-6 6-6",
			key: "1wnfg3"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ChevronRight = createLucideIcon("chevron-right", [["path", {
			d: "m9 18 6-6-6-6",
			key: "mthhwq"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const CircleQuestionMark = createLucideIcon("circle-question-mark", [
			["circle", {
				cx: "12",
				cy: "12",
				r: "10",
				key: "1mglay"
			}],
			["path", {
				d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
				key: "1u773s"
			}],
			["path", {
				d: "M12 17h.01",
				key: "p32p05"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Clock = createLucideIcon("clock", [["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}], ["path", {
			d: "M12 6v6l4 2",
			key: "mmk7yg"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Copy = createLucideIcon("copy", [["rect", {
			width: "14",
			height: "14",
			x: "8",
			y: "8",
			rx: "2",
			ry: "2",
			key: "17jyea"
		}], ["path", {
			d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
			key: "zix9uf"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Cpu = createLucideIcon("cpu", [
			["path", {
				d: "M12 20v2",
				key: "1lh1kg"
			}],
			["path", {
				d: "M12 2v2",
				key: "tus03m"
			}],
			["path", {
				d: "M17 20v2",
				key: "1rnc9c"
			}],
			["path", {
				d: "M17 2v2",
				key: "11trls"
			}],
			["path", {
				d: "M2 12h2",
				key: "1t8f8n"
			}],
			["path", {
				d: "M2 17h2",
				key: "7oei6x"
			}],
			["path", {
				d: "M2 7h2",
				key: "asdhe0"
			}],
			["path", {
				d: "M20 12h2",
				key: "1q8mjw"
			}],
			["path", {
				d: "M20 17h2",
				key: "1fpfkl"
			}],
			["path", {
				d: "M20 7h2",
				key: "1o8tra"
			}],
			["path", {
				d: "M7 20v2",
				key: "4gnj0m"
			}],
			["path", {
				d: "M7 2v2",
				key: "1i4yhu"
			}],
			["rect", {
				x: "4",
				y: "4",
				width: "16",
				height: "16",
				rx: "2",
				key: "1vbyd7"
			}],
			["rect", {
				x: "8",
				y: "8",
				width: "8",
				height: "8",
				rx: "1",
				key: "z9xiuo"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Download = createLucideIcon("download", [
			["path", {
				d: "M12 15V3",
				key: "m9g1x1"
			}],
			["path", {
				d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
				key: "ih7n3h"
			}],
			["path", {
				d: "m7 10 5 5 5-5",
				key: "brsn70"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Ellipsis = createLucideIcon("ellipsis", [
			["circle", {
				cx: "12",
				cy: "12",
				r: "1",
				key: "41hilf"
			}],
			["circle", {
				cx: "19",
				cy: "12",
				r: "1",
				key: "1wjl8i"
			}],
			["circle", {
				cx: "5",
				cy: "12",
				r: "1",
				key: "1pcz8c"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const EyeOff = createLucideIcon("eye-off", [
			["path", {
				d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
				key: "ct8e1f"
			}],
			["path", {
				d: "M14.084 14.158a3 3 0 0 1-4.242-4.242",
				key: "151rxh"
			}],
			["path", {
				d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
				key: "13bj9a"
			}],
			["path", {
				d: "m2 2 20 20",
				key: "1ooewy"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Eye = createLucideIcon("eye", [["path", {
			d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
			key: "1nclc0"
		}], ["circle", {
			cx: "12",
			cy: "12",
			r: "3",
			key: "1v7zrd"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const FolderOpen = createLucideIcon("folder-open", [["path", {
			d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
			key: "usdka0"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const FolderPlus = createLucideIcon("folder-plus", [
			["path", {
				d: "M12 10v6",
				key: "1bos4e"
			}],
			["path", {
				d: "M9 13h6",
				key: "1uhe8q"
			}],
			["path", {
				d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
				key: "1kt360"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Folder = createLucideIcon("folder", [["path", {
			d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
			key: "1kt360"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const GitBranch = createLucideIcon("git-branch", [
			["path", {
				d: "M15 6a9 9 0 0 0-9 9V3",
				key: "1cii5b"
			}],
			["circle", {
				cx: "18",
				cy: "6",
				r: "3",
				key: "1h7g24"
			}],
			["circle", {
				cx: "6",
				cy: "18",
				r: "3",
				key: "fqmcym"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Hammer = createLucideIcon("hammer", [
			["path", {
				d: "m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9",
				key: "1hayfq"
			}],
			["path", {
				d: "m18 15 4-4",
				key: "16gjal"
			}],
			["path", {
				d: "m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",
				key: "15ts47"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Link2 = createLucideIcon("link-2", [
			["path", {
				d: "M9 17H7A5 5 0 0 1 7 7h2",
				key: "8i5ue5"
			}],
			["path", {
				d: "M15 7h2a5 5 0 1 1 0 10h-2",
				key: "1b9ql8"
			}],
			["line", {
				x1: "8",
				x2: "16",
				y1: "12",
				y2: "12",
				key: "1jonct"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Loader = createLucideIcon("loader", [
			["path", {
				d: "M12 2v4",
				key: "3427ic"
			}],
			["path", {
				d: "m16.2 7.8 2.9-2.9",
				key: "r700ao"
			}],
			["path", {
				d: "M18 12h4",
				key: "wj9ykh"
			}],
			["path", {
				d: "m16.2 16.2 2.9 2.9",
				key: "1bxg5t"
			}],
			["path", {
				d: "M12 18v4",
				key: "jadmvz"
			}],
			["path", {
				d: "m4.9 19.1 2.9-2.9",
				key: "bwix9q"
			}],
			["path", {
				d: "M2 12h4",
				key: "j09sii"
			}],
			["path", {
				d: "m4.9 4.9 2.9 2.9",
				key: "giyufr"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const MessageCirclePlus = createLucideIcon("message-circle-plus", [
			["path", {
				d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",
				key: "1sd12s"
			}],
			["path", {
				d: "M8 12h8",
				key: "1wcyev"
			}],
			["path", {
				d: "M12 8v8",
				key: "napkw2"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const MessageCircle = createLucideIcon("message-circle", [["path", {
			d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",
			key: "1sd12s"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const MessageSquare = createLucideIcon("message-square", [["path", {
			d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
			key: "18887p"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PanelLeft = createLucideIcon("panel-left", [["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			key: "afitv7"
		}], ["path", {
			d: "M9 3v18",
			key: "fh3hqa"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const PanelRight = createLucideIcon("panel-right", [["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			key: "afitv7"
		}], ["path", {
			d: "M15 3v18",
			key: "14nvp0"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Pencil = createLucideIcon("pencil", [["path", {
			d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
			key: "1a8usu"
		}], ["path", {
			d: "m15 5 4 4",
			key: "1mk7zo"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Pin = createLucideIcon("pin", [["path", {
			d: "M12 17v5",
			key: "bb1du9"
		}], ["path", {
			d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
			key: "1nkz8b"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Plus = createLucideIcon("plus", [["path", {
			d: "M5 12h14",
			key: "1ays0h"
		}], ["path", {
			d: "M12 5v14",
			key: "s699le"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Puzzle = createLucideIcon("puzzle", [["path", {
			d: "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z",
			key: "w46dr5"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const ScanLine = createLucideIcon("scan-line", [
			["path", {
				d: "M3 7V5a2 2 0 0 1 2-2h2",
				key: "aa7l1z"
			}],
			["path", {
				d: "M17 3h2a2 2 0 0 1 2 2v2",
				key: "4qcy5o"
			}],
			["path", {
				d: "M21 17v2a2 2 0 0 1-2 2h-2",
				key: "6vwrx8"
			}],
			["path", {
				d: "M7 21H5a2 2 0 0 1-2-2v-2",
				key: "ioqczr"
			}],
			["path", {
				d: "M7 12h10",
				key: "b7w52i"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Search = createLucideIcon("search", [["path", {
			d: "m21 21-4.34-4.34",
			key: "14j7rj"
		}], ["circle", {
			cx: "11",
			cy: "11",
			r: "8",
			key: "4ej97u"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Settings = createLucideIcon("settings", [["path", {
			d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
			key: "1i5ecw"
		}], ["circle", {
			cx: "12",
			cy: "12",
			r: "3",
			key: "1v7zrd"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const SlidersHorizontal = createLucideIcon("sliders-horizontal", [
			["path", {
				d: "M10 5H3",
				key: "1qgfaw"
			}],
			["path", {
				d: "M12 19H3",
				key: "yhmn1j"
			}],
			["path", {
				d: "M14 3v4",
				key: "1sua03"
			}],
			["path", {
				d: "M16 17v4",
				key: "1q0r14"
			}],
			["path", {
				d: "M21 12h-9",
				key: "1o4lsq"
			}],
			["path", {
				d: "M21 19h-5",
				key: "1rlt1p"
			}],
			["path", {
				d: "M21 5h-7",
				key: "1oszz2"
			}],
			["path", {
				d: "M8 10v4",
				key: "tgpxqk"
			}],
			["path", {
				d: "M8 12H3",
				key: "a7s4jb"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Sparkles = createLucideIcon("sparkles", [
			["path", {
				d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
				key: "1s2grr"
			}],
			["path", {
				d: "M20 2v4",
				key: "1rf3ol"
			}],
			["path", {
				d: "M22 4h-4",
				key: "gwowj6"
			}],
			["circle", {
				cx: "4",
				cy: "20",
				r: "2",
				key: "6kqj1y"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const SquarePen = createLucideIcon("square-pen", [["path", {
			d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
			key: "1m0v6g"
		}], ["path", {
			d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",
			key: "ohrbg2"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Store = createLucideIcon("store", [
			["path", {
				d: "M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5",
				key: "slp6dd"
			}],
			["path", {
				d: "M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244",
				key: "o0xfot"
			}],
			["path", {
				d: "M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05",
				key: "wn3emo"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Telescope = createLucideIcon("telescope", [
			["path", {
				d: "m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44",
				key: "k4qptu"
			}],
			["path", {
				d: "m13.56 11.747 4.332-.924",
				key: "19l80z"
			}],
			["path", {
				d: "m16 21-3.105-6.21",
				key: "7oh9d"
			}],
			["path", {
				d: "M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z",
				key: "m7xp4m"
			}],
			["path", {
				d: "m6.158 8.633 1.114 4.456",
				key: "74o979"
			}],
			["path", {
				d: "m8 21 3.105-6.21",
				key: "1fvxut"
			}],
			["circle", {
				cx: "12",
				cy: "13",
				r: "2",
				key: "1c1ljs"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Trash2 = createLucideIcon("trash-2", [
			["path", {
				d: "M10 11v6",
				key: "nco0om"
			}],
			["path", {
				d: "M14 11v6",
				key: "outv1u"
			}],
			["path", {
				d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
				key: "miytrc"
			}],
			["path", {
				d: "M3 6h18",
				key: "d0wm0j"
			}],
			["path", {
				d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
				key: "e791ji"
			}]
		]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const User = createLucideIcon("user", [["path", {
			d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",
			key: "975kel"
		}], ["circle", {
			cx: "12",
			cy: "7",
			r: "4",
			key: "17ys0d"
		}]]);
		/**
		* @license lucide-react v1.39.0 - ISC
		*
		* This source code is licensed under the ISC license.
		* See the LICENSE file in the root directory of this source tree.
		*/
		const Users = createLucideIcon("users", [
			["path", {
				d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
				key: "1yyitq"
			}],
			["path", {
				d: "M16 3.128a4 4 0 0 1 0 7.744",
				key: "16gr8j"
			}],
			["path", {
				d: "M22 21v-2a4 4 0 0 0-3-3.87",
				key: "kshegd"
			}],
			["circle", {
				cx: "9",
				cy: "7",
				r: "4",
				key: "nufk8"
			}]
		]);
		//#endregion
		//#region src/client/zcode-icons.tsx
		/**
		* ZCode 图标语言：全站 Lucide（与 zai-org/ZCode 一致），导航/操作图标 16px（DESIGN.md size-4）。
		* 这里只包一层统一的 { size, className } 调用约定，供侧栏、外壳与设置区使用。
		*
		* 本模块是**插件界面图标的唯一来源**：侧栏外壳、会话树、列表行、行内操作、
		* 悬停卡、设置区一律从这里取图标。ZCode 全站使用 Lucide，混入宿主图标会让同一屏内
		* 出现两套图标语言（stroke 几何与视觉重量都不同）。
		* 2026-10-13：设置区最后三处宿主图标（About / Connectors / Schedule）已收归，
		* 旧的 host-icons 桥接模块随之退役删除——"唯一来源"从声明变成了事实。
		*/
		/** 新建任务：ZCode NewTaskButtonGroup 同款 MessageCirclePlus。 */
		const ZIconNewTask = MessageCirclePlus;
		/** 全局搜索：ZCode 侧栏搜索行同款 Search。 */
		const ZIconSearch = Search;
		/** 折叠侧栏 / 展开侧栏：ZCode 折叠轨同款 PanelLeft(PanelLeftOpen)。 */
		const ZIconCollapse = PanelLeft;
		/** 扩展分组：Puzzle。 */
		const ZIconExtensions = Puzzle;
		const ZIconChevronRight = ChevronRight;
		/** 全局面板打开时的「返回会话」入口（ZCode 侧栏没有上游那个「任务」导航项，需要显式返回）。 */
		const ZIconBack = ChevronLeft;
		/** 设置分区导航。 */
		const ZIconExperts = Users;
		const ZIconSkills = Sparkles;
		const ZIconPlugins = Store;
		const ZIconConnectors = Link2;
		const ZIconSchedule = CalendarClock;
		/** IM 助理。 */
		const ZIconAssistant = Bot;
		const ZIconChannels = MessageCircle;
		/** 行内更多操作。 */
		const ZIconMore = Ellipsis;
		const ZIconLoading = Loader;
		/** 项目 / 分组文件夹（闭合态）。 */
		const ZIconFolder = Folder;
		/** 项目 / 分组文件夹（展开态）。 */
		const ZIconFolderOpen = FolderOpen;
		/** 新建项目 / 加入分组。 */
		const ZIconProjectAdd = FolderPlus;
		/** 归档会话。 */
		const ZIconArchive = Archive;
		/** 重命名。 */
		const ZIconRename = Pencil;
		/** 复制。 */
		const ZIconCopy = Copy;
		/** 删除。 */
		const ZIconDelete = Trash2;
		/** 导出 / 下载。 */
		const ZIconDownload = Download;
		/** 勾选态。 */
		const ZIconCheck = Check;
		/** 分支 / 派生会话。 */
		const ZIconBranch = GitBranch;
		/** 会话链接。 */
		const ZIconLink = Link2;
		/** 列表行内编辑。 */
		const ZIconListPen = SquarePen;
		/** 设置。 */
		const ZIconSettings = Settings;
		/** 个性化。 */
		const ZIconPersonalization = SlidersHorizontal;
		/** 账号。 */
		const ZIconUser = User;
		/** 置顶。 */
		const ZIconPin = Pin;
		/** 已隐藏 / 显示切换。 */
		const ZIconEye = Eye;
		const ZIconEyeOff = EyeOff;
		/**
		* 设置页与面板页使用的补充图标。
		* 这些页面此前直接从 `lucide-react` 取图标，绕过了本入口——同一份图标语言却有两个来源，
		* 改名或换库时要改多处。现统一从这里导出，仍是 Lucide，视觉不变。
		*/
		const ZIconArrowLeft = ArrowLeft;
		const ZIconBox = Box;
		const ZIconHelp = CircleQuestionMark;
		const ZIconClock = Clock;
		const ZIconCpu = Cpu;
		const ZIconMessageSquare = MessageSquare;
		const ZIconPanelRight = PanelRight;
		const ZIconTelescope = Telescope;
		const ZIconHammer = Hammer;
		const ZIconScanLine = ScanLine;
		const ZIconBug = Bug;
		//#endregion
		//#region src/client/foreign-content-contract.ts
		/**
		* 外来内容契约 —— 第三方插件在本插件侧栏内必须遵守的最低样式约定。
		*
		* ## 为什么需要这份契约
		*
		* 侧栏页脚由各插件自绘（`sidebar.footer.action` / `sidebar.settings` 插槽），本插件只提供容器。
		* dsh-cost-meter 的余额卡片自带白底卡片与加粗大数字，视觉重量压过整条导航；折叠轨只有 56px，
		* 它的文字会被裁成 `F41-peak` 这类乱码（详见 docs/KNOWN-ISSUES.md 的实机反馈记录）。
		*
		* ## 契约四条（完整表述见 docs/ZCODE-DESIGN.md §10）
		*
		* 1. **文字色只能用侧栏自己的色阶**（`--dcu-sidebar-primary/secondary/tertiary` 三档），
		*    不得引入外来色或纯黑；默认档位是 `secondary`，**只有承载数据本身的数值**可以用
		*    `primary`。侧栏是单色系统，明度就是层级（见 docs/ZCODE-DESIGN.md §9）——
		*    外来内容比导航更黑，导航就失去了层级。
		* 2. **不得自带不透明卡片底与阴影**——侧栏是一个连续表面，不是卡片墙。
		* 3. **折叠态必须可降级**——装不下就隐藏或只留图标，不得横向溢出。
		* 4. **数据可视化的语义色允许保留**（2026-10-13 补）——进度条填充这类承载
		*    「峰值 / 非峰值」状态的颜色，压成中性等于把信息抹掉；因此**只约束填充本身**，
		*    它不得用于文字或卡片底（那两条归第 1、2 条管）。当前唯一实例：计费插件峰值条的
		*    `.cm-peak-segment.cm-peak-high` 填充（`rgb(255,152,0)`，实机测得，段宽 95px），
		*    其文字与卡片早已按第 1、2 条收敛。
		*
		*    这一条是**显式允许，不是漏管**：没有它，下一个做整洁化的人会把这抹暖色当杂质清掉，
		*    而峰值条会因此失去「现在是不是峰值」这个信息。
		*
		* ## 为什么是「锚点 + 哨兵」而不是「扫到 cm-* 就改」
		*
		* 本插件的样式只覆盖**契约锚点**（下面这份清单），而不是匹配任意外来类名——后者会让
		* 覆盖范围随对方改版而漂移，且无法审查。代价是：锚点一旦改名，覆盖会**静默失效**
		* （样式还在，但选不中任何元素，界面悄悄变回原样）。
		*
		* 所以这里配一个运行时哨兵：只要页脚里出现了外来类名（`cm-` 前缀），就检查锚点是否齐全，
		* 缺失即 `console.warn`。它不修复问题，但把「静默失效」变成「响亮失效」——
		* 让契约破裂在发生的当天被看见，而不是等用户截图来投诉。
		*/
		/**
		* 契约锚点：本插件为外来页脚内容提供样式钩子的类名。
		* 改动时必须与 CodexSidebar.tsx 的覆盖样式同步——tests/design-system.assert.ts 会校验两边一致，
		* 覆盖了未登记的锚点会直接让门禁变红。
		*/
		const FOREIGN_FOOTER_ANCHORS = [
			".cm-footer-stack",
			".cm-simple-summary",
			".cm-foot",
			".cm-balance-name",
			".cm-num",
			".cm-peak-classic",
			".cm-peak-classic-chip",
			".cm-peak-strip",
			".cm-peak-chip",
			".cm-peak-rail-label",
			".cm-peak-rail-classic-label"
		];
		/** 外来内容的识别前缀（当前只有 dsh-cost-meter 的 `cm-*`）。 */
		const FOREIGN_PREFIX = "cm-";
		/** 页脚内是否存在任何外来内容（按类名 token 前缀判定，避免 `foo-cm-bar` 这类误命中）。 */
		function hasForeignFooterContent(footer) {
			return [...footer.querySelectorAll("*")].some((element) => {
				const className = element.getAttribute("class");
				return className !== null && className.split(/\s+/).some((token) => token.startsWith(FOREIGN_PREFIX));
			});
		}
		/** 返回缺失的契约锚点；全部在位时返回空数组。 */
		function missingForeignFooterAnchors(footer) {
			return FOREIGN_FOOTER_ANCHORS.filter((anchor) => footer.querySelector(anchor) === null);
		}
		/**
		* 持续审计页脚里的外来内容：外来内容在场但锚点缺失即报警。
		* 同一组缺失只报一次，避免 MutationObserver 反复触发时刷屏。
		* @param footer - 侧栏页脚元素。
		* @returns dispose 函数。
		*/
		function auditForeignFooterContent(footer) {
			const reported = /* @__PURE__ */ new Set();
			const check = () => {
				if (!hasForeignFooterContent(footer)) return;
				const missing = missingForeignFooterAnchors(footer);
				if (missing.length === 0) return;
				const key = missing.join(",");
				if (reported.has(key)) return;
				reported.add(key);
				console.warn(`[dsh-zcode-ui] 外来内容契约失效：页脚出现 ${FOREIGN_PREFIX}* 元素，但契约锚点缺失 ${key}。 侧栏对这些元素的样式覆盖已静默失效，请同步更新 FOREIGN_FOOTER_ANCHORS 与 CodexSidebar.tsx 的覆盖样式（见 docs/ZCODE-DESIGN.md §10）。`);
			};
			const observer = new MutationObserver(check);
			observer.observe(footer, {
				childList: true,
				subtree: true
			});
			check();
			return () => {
				observer.disconnect();
			};
		}
		//#endregion
		//#region src/client/sidebar-search.ts
		/** 按用户可见名称和辅助关键词筛选侧栏搜索结果。 */
		function filterSidebarSearchItems(items, query) {
			const needle = query.trim().toLocaleLowerCase();
			if (needle === "") return [...items];
			return items.filter((item) => `${item.label} ${item.keywords}`.toLocaleLowerCase().includes(needle));
		}
		/**
		* 按组分配结果配额：**每组保底 floor 条，剩余额度按组顺序回填**。
		*
		* ## 为什么不是「全场 slice(0, limit)」
		*
		* 那会在分组之前截断，而会话条目永远排在前面 —— 会话组能独自吃满配额，把设置/操作两组
		* 整段挤掉（实测 6+6=12 正好卡在限额上，再多一条会话就有一组消失）。
		*
		* ## 为什么也不是「每组 1/3」
		*
		* 三组大小差异极大：设置组固定 9 条、操作组固定 1 条、会话组可达数百条。
		* 四等分会让「搜 settings 时设置组只显示 4 条」「搜会话标题时只显示 4 条」——比修之前更差。
		*
		* ## 保底 + 回填
		*
		* ① 每组先取 floor 条，保证三个组都露头；
		* ② 剩余额度按组顺序回填，单组可以继续增长。
		*
		* 于是：只有会话命中时仍能拿到接近 limit 条；设置全命中时能一次看全；三类都命中时每组都在。
		*
		* @param groups - 已按渲染顺序分好组的条目
		* @param limit  - 总条数上限
		* @param floor  - 每组保底条数
		*/
		function allocateSearchQuota(groups, limit, floor) {
			const picked = groups.map((group) => group.slice(0, floor));
			let pickedTotal = 0;
			const floored = picked.map((group) => {
				const room = Math.max(0, limit - pickedTotal);
				const capped = group.length > room ? group.slice(0, room) : group;
				pickedTotal += capped.length;
				return capped;
			});
			let left = limit - pickedTotal;
			for (const [index, group] of groups.entries()) {
				if (left <= 0) break;
				const extra = group.slice(floor, floor + left);
				floored[index] = [...floored[index] ?? [], ...extra];
				left -= extra.length;
			}
			return floored.flat();
		}
		//#endregion
		//#region src/client/companion-slots.ts
		const EMPTY_COMPANION_TABS = {
			channels: false,
			schedule: false
		};
		const reportedSlotErrors = /* @__PURE__ */ new WeakSet();
		/** 插槽声明本身不算占用；只有其他插件 register 后才视为已安装。 */
		function readSlotEntries(slots, name) {
			if (slots === void 0) return [];
			const read = slots.entriesOfSlot ?? slots.entries;
			if (typeof read !== "function") return [];
			try {
				return read.call(slots, name) ?? [];
			} catch (error) {
				if (!reportedSlotErrors.has(slots)) {
					reportedSlotErrors.add(slots);
					console.warn("[dsh-zcode-ui] 无法读取配套插件插槽。", error);
				}
				return [];
			}
		}
		function slotHasEntries(slots, name) {
			return readSlotEntries(slots, name).length > 0;
		}
		function companionTabAvailability(slots) {
			return {
				channels: slotHasEntries(slots, "sidebar.channels"),
				schedule: slotHasEntries(slots, "sidebar.schedule")
			};
		}
		function sameCompanionTabs(left, right) {
			return left.channels === right.channels && left.schedule === right.schedule;
		}
		/** 给 React useSyncExternalStore 用的配套页签快照源。 */
		function createCompanionTabSource(slots) {
			let cached = companionTabAvailability(slots);
			return {
				getSnapshot() {
					const next = companionTabAvailability(slots);
					if (sameCompanionTabs(next, cached)) return cached;
					cached = next;
					return cached;
				},
				subscribe(onStoreChange) {
					if (slots === void 0 || typeof slots.subscribe !== "function") return () => {};
					const offChannels = slots.subscribe("sidebar.channels", onStoreChange);
					const offSchedule = slots.subscribe("sidebar.schedule", onStoreChange);
					return () => {
						offChannels?.();
						offSchedule?.();
					};
				}
			};
		}
		//#endregion
		//#region src/client/channel-brand.tsx
		function ChannelBrandIcon({ id }) {
			const brand = id.trim().toLowerCase();
			if (brand === "telegram") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dcu-wb-brand",
				viewBox: "0 0 24 24",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#26A5E4",
					d: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
				})
			});
			if (brand === "weixin") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dcu-wb-brand",
				viewBox: "0 0 48 48",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#07C160",
					fillRule: "evenodd",
					d: "M32.8 18.003 32.5 18C25.732 18 20 22.798 20 29c0 1.007.151 1.976.433 2.894A18 18 0 0 1 18.5 32c-1.809 0-3.54-.274-5.137-.775-.394-.123-1.828.696-3.039 1.389-.927.53-1.724.986-1.824.886-.094-.094.169-.718.476-1.448.446-1.06.986-2.346.664-2.552C6.21 27.305 4 23.866 4 20c0-6.627 6.492-12 14.5-12 7.186 0 13.151 4.326 14.3 10.003M16 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0m7 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#07C160",
					fillRule: "evenodd",
					d: "M44 29c0 3.362-1.908 6.336-4.833 8.149-.13.08.169.858.446 1.583.237.618.459 1.196.387 1.268-.075.075-.802-.327-1.571-.752-.829-.458-1.706-.942-1.871-.888-1.262.413-2.63.64-4.058.64C26.149 39 21 34.523 21 29s5.149-10 11.5-10S44 23.477 44 29m-6-3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M28.5 27a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
				})]
			});
			if (brand === "wecom") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dcu-wb-brand",
				viewBox: "4 6 39 34",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#fb6500",
						d: "M28.856 31.647a.483.483 0 0 0 .06.738 6.2 6.2 0 0 1 1.911 3.725 2.02 2.02 0 1 0 2.16-2.54 6.2 6.2 0 0 1-3.448-1.922.483.483 0 0 0-.683-.001"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#0082ef",
						d: "M37.057 28.448a2 2 0 0 0-.58 1.215 6.2 6.2 0 0 1-1.918 3.454.484.484 0 1 0 .738.616 6.2 6.2 0 0 1 3.725-1.91 2.02 2.02 0 1 0-1.96-3.376z"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#2dbc00",
						d: "M31.366 22.75a2.02 2.02 0 0 0 1.215 3.435 6.2 6.2 0 0 1 3.454 1.918.483.483 0 0 0 .829-.27.48.48 0 0 0-.212-.468 6.2 6.2 0 0 1-1.911-3.726 2.02 2.02 0 0 0-3.375-.889"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#fc0",
						d: "m30.374 25.907-.037.037a6.2 6.2 0 0 1-3.78 1.978 2.007 2.007 0 0 0-.895 3.374 2.02 2.02 0 0 0 3.435-1.216 6.2 6.2 0 0 1 1.923-3.453.484.484 0 0 0-.646-.72"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#0082ef",
						d: "M18.17 8.471c-3.624.4-6.908 1.948-9.266 4.367-.938.956-1.7 2.032-2.262 3.182a11.08 11.08 0 0 0 .78 11.188c.64.968 1.693 2.178 2.654 3.037l-.435 3.423-.048.145c-.012.042-.012.09-.018.133l-.012.108.012.11a1.1 1.1 0 0 0 1.657.852h.018l.067-.049 1.04-.52 3.102-1.56a16 16 0 0 0 4.537.623c1.897.004 3.78-.323 5.564-.968a2.014 2.014 0 0 1-1.373-2.11 13.7 13.7 0 0 1-5.721.568l-.309-.042a14 14 0 0 1-2.056-.43 1.4 1.4 0 0 0-1.1.116l-.085.042-2.552 1.5-.109.066c-.06.036-.09.048-.12.048a.176.176 0 0 1-.164-.181l.097-.393.115-.43.181-.707.212-.787a1.07 1.07 0 0 0-.387-1.19 11.2 11.2 0 0 1-2.577-2.686 8.73 8.73 0 0 1-.629-8.818c.46-.92 1.065-1.773 1.815-2.54 1.935-1.997 4.657-3.267 7.669-3.593a14.3 14.3 0 0 1 3.132 0c2.994.344 5.704 1.633 7.627 3.617a10 10 0 0 1 1.796 2.551 8.7 8.7 0 0 1 .901 3.84c0 .14-.012.279-.018.412a2.015 2.015 0 0 1 2.48.29l.09.109a11 11 0 0 0-1.1-5.733 12.3 12.3 0 0 0-2.238-3.182 15.18 15.18 0 0 0-9.229-4.397 17 17 0 0 0-3.739-.01"
					})
				]
			});
			if (brand === "qq") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dcu-wb-brand",
				viewBox: "0 0 24 24",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#12B7F5",
					d: "M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"
				})
			});
			if (brand === "dingtalk") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dcu-wb-brand",
				viewBox: "6 6 36 36",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "6",
					y: "6",
					width: "36",
					height: "36",
					rx: "8",
					fill: "#0285fc"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#fff",
					d: "m20.178 37.577 3.5-6h-3l2-3c-5.5-1-6.281-3.938-6-4.5.162-.325 2.5 1 6.281 1-8.281-.5-8.281-7-7.781-7.5.423-.424 2.44 1.666 6.564 3.53-9.126-4.314-6.453-11.956-5.064-11.03 3.344 3 9.5 8.5 15 13 .658.538 1 2 0 3.25s-2.5 2.75-3 3.25h2.5z"
				})]
			});
			if (brand === "feishu" || brand === "lark") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dcu-wb-brand",
				viewBox: "0 0 48 48",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#00d6b9",
						d: "M10 8c0 1 7 3.5 14.745 16.744 0 0 4.184-4.363 6.255-5.744 1.5-1 2.712-1.332 2.712-1.332C33.712 15.156 29.5 8 28 8z"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#163c9a",
						d: "M43.5 18.5c-1-.667-3.65-1.771-6.5-1.5a15 15 0 0 0-3.288.668S32.5 18 31 19c-2.07 1.38-6.255 5.744-6.255 5.744-1.428 1.397-3.05 2.732-5.245 3.756 0 0 7 3 11.5 3 5.063 0 7-3.5 7-3.5 1.5-3.305 3.5-7 5.5-9.5"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#3370ff",
						d: "M4 17.5v17c0 1 6 5.5 15 5.5 10 0 17.05-7.705 19-12 0 0-1.937 3.5-7 3.5-4.5 0-11.5-3-11.5-3-5.117-2.239-10.03-6.577-12.906-9.117C4.974 17.953 4 17.093 4 17.5"
					})
				]
			});
			if (brand === "discord") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dcu-wb-brand",
				viewBox: "0 -8.5 65 65",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#5865F2",
					d: "M41.2351 0C40.6164 1.09866 40.0607 2.2352 39.5556 3.397C34.7569 2.67719 29.8697 2.67719 25.0584 3.397C24.5658 2.2352 23.9976 1.09866 23.3788 0C18.8705 0.770324 14.4759 2.12155 10.3085 4.02841C2.04967 16.2652 -0.185531 28.1863 0.925755 39.9432C5.76238 43.517 11.1799 46.2447 16.951 47.9874C18.2517 46.2447 19.4009 44.3883 20.3859 42.4562C18.5169 41.7616 16.7111 40.8903 14.981 39.88C15.4356 39.5517 15.8776 39.2107 16.307 38.8824C26.4475 43.6559 38.1917 43.6559 48.3449 38.8824C48.7742 39.236 49.2162 39.577 49.6708 39.88C47.9408 40.9029 46.1349 41.7616 44.2533 42.4688C45.2383 44.4009 46.3875 46.2573 47.6882 48C53.4593 46.2573 58.8768 43.5422 63.7134 39.9684C65.0268 26.3299 61.4656 14.5099 54.3054 4.04104C50.1507 2.13418 45.7561 0.782952 41.2478 0.0252565L41.2351 0ZM21.8003 32.7072C18.6811 32.7072 16.0923 29.8785 16.0923 26.3804C16.0923 22.8824 18.5801 20.041 21.7876 20.041C24.9952 20.041 27.5461 22.895 27.4956 26.3804C27.4451 29.8658 24.9826 32.7072 21.8003 32.7072ZM42.8389 32.7072C39.7071 32.7072 37.1436 29.8785 37.1436 26.3804C37.1436 22.8824 39.6314 20.041 42.8389 20.041C46.0465 20.041 48.5848 22.895 48.5343 26.3804C48.4838 29.8658 46.0213 32.7072 42.8389 32.7072Z"
				})
			});
			if (brand === "slack") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				className: "dcu-wb-brand",
				viewBox: "0 0 127 127",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#E01E5A",
						d: "M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#36C5F0",
						d: "M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#2EB67D",
						d: "M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#ECB22E",
						d: "M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z"
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: "dcu-wb-brand",
				viewBox: "0 0 16 16",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "8",
					r: "7",
					fill: "#8b949e"
				})
			});
		}
		//#endregion
		//#region src/client/session-title-scroll.ts
		/**
		* 会话行只展示标题第一行，避免换行把胶囊撑高。
		*
		* 说明：本模块原先还导出 titleOverflowPx / titleScrollDurationMs，配合 CSS 实现
		* 「hover 时标题跑马灯滚动」。该机制已移除——父容器 `.dcu-wb-session-title` 是
		* `overflow:hidden`，而滚动时内层被撑成 `width:max-content`，导致标题**两端同时被裁**
		* （实测容器 130px、文字 175px，滚动中途两端都不可读）。现改为纯 ellipsis 截断，
		* 完整标题由既有的 tooltip 承担。
		*/
		function sessionTitleLine(title) {
			return title.split(/\r?\n/)[0] ?? title;
		}
		//#endregion
		//#region src/client/archive-confirm.ts
		/**
		* 行内归档的两步确认（对齐 ZCode TaskListItem 的归档交互）。
		*
		* ZCode 3.15.1 的实际行为（packages/ui/src/TaskListItem.tsx）：
		* - 首次点击只进入确认态：普通归档按钮换成 destructive 的「确认」按钮；
		* - Escape 取消；条目外的任意 pointerdown 取消；
		* - 鼠标离开条目不取消——确认是显式等待用户决策的状态；
		* - 二次点击才真正执行归档。
		*
		* press(id) 一次调用完成两个阶段：首次返回 false（进入确认态，调用方不执行），
		* 再次返回 true（调用方执行归档，同时清掉确认态）。
		*/
		function useArchiveConfirm() {
			const confirmingRef = (0, react.useRef)();
			const [confirmingId, setConfirmingId] = (0, react.useState)();
			const cancel = (0, react.useCallback)(() => {
				if (confirmingRef.current === void 0) return;
				confirmingRef.current = void 0;
				setConfirmingId(void 0);
			}, []);
			const press = (0, react.useCallback)((id) => {
				if (confirmingRef.current === id) {
					cancel();
					return true;
				}
				confirmingRef.current = id;
				setConfirmingId(id);
				return false;
			}, [cancel]);
			(0, react.useEffect)(() => {
				if (confirmingId === void 0) return;
				const cancelOnKeyDown = (event) => {
					if (event.key === "Escape") cancel();
				};
				const cancelOnPointerDown = (event) => {
					const target = event.target;
					if (target instanceof Element && target.closest("[data-dcu-session]")?.getAttribute("data-dcu-session") === confirmingId) return;
					cancel();
				};
				window.addEventListener("keydown", cancelOnKeyDown, true);
				window.addEventListener("pointerdown", cancelOnPointerDown, true);
				return () => {
					window.removeEventListener("keydown", cancelOnKeyDown, true);
					window.removeEventListener("pointerdown", cancelOnPointerDown, true);
				};
			}, [confirmingId, cancel]);
			return {
				confirmingId,
				press,
				cancel
			};
		}
		//#endregion
		//#region src/client/session-tree.tsx
		function PinIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconPin, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		function QuickArchiveIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconArchive, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		/**
		* 行首置顶按钮（对齐 ZCode TaskListItem 的 pinActionButton：同一枚 16px 图钉兼作
		* 「已置顶」状态显示与「置顶/取消置顶」操作）。显示时机全部由 CSS 控制（常显 =
		* 已置顶且行首槽空闲；悬停/聚焦 = 临时接管行首槽），组件只负责属性与事件。
		* 置顶状态来自宿主（`workspaces.pinnedSessionIds`），本组件不持有任何状态。
		*/
		function SessionPinButton({ pinned, label, onToggle }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "dcu-wb-pin",
				"aria-label": label,
				onMouseDown: (event) => {
					event.preventDefault();
					event.stopPropagation();
				},
				onClick: (event) => {
					event.stopPropagation();
					onToggle();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {})
			});
		}
		function SessionHoverCard({ tip, onEnter, onLeave }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-wb-tip",
				style: {
					left: tip.left,
					top: tip.top
				},
				onMouseEnter: onEnter,
				onMouseLeave: onLeave,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-wb-tip-title",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-tip-title-main",
						children: tip.title
					})
				}), tip.branch !== void 0 && tip.branch !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-wb-tip-row",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-folder",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconBranch, { size: 16 })
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tip.branch })]
				})]
			});
		}
		function sessionMenuItems(t, options) {
			const shortcut = (commandId) => {
				const found = options.shortcutOf?.(commandId);
				return found === void 0 ? {} : { shortcut: found };
			};
			const items = [
				...options.pinned === void 0 ? [] : [{
					id: "pin",
					label: t(options.pinned ? "sessions.unpin" : "sessions.pin"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {})
				}],
				{
					id: "rename",
					label: t("sessions.rename"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconRename, { size: 16 }),
					...shortcut("session.rename")
				},
				{
					id: "archive",
					label: t("sessions.archive"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconArchive, { size: 16 }),
					...shortcut("session.archive")
				},
				{
					id: "unread",
					label: t(options.unread ? "sessions.markRead" : "sessions.markUnread"),
					icon: options.unread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconEyeOff, {
						"aria-hidden": "true",
						size: 16,
						strokeWidth: 1.5
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconEye, {
						"aria-hidden": "true",
						size: 16,
						strokeWidth: 1.5
					})
				},
				{
					id: "fork",
					label: t("sessions.fork"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconBranch, { size: 16 }),
					...shortcut("session.fork")
				}
			];
			if (options.moveTargets !== void 0) items.push({
				id: "moveWorkspace",
				label: t("sessions.moveWorkspace"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, { size: 16 }),
				disabled: options.moveTargets.length === 0,
				submenu: options.moveTargets.map((target) => ({
					id: target.id,
					label: target.label,
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, { size: 16 })
				}))
			});
			items.push({
				type: "separator",
				id: "main-separator"
			}, ...options.includePath === true ? [{
				id: "openPath",
				label: t("sessions.openPath"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolderOpen, { size: 16 }),
				disabled: options.path === void 0
			}] : [], {
				id: "copyId",
				label: t("sessions.copyId"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconLink, { size: 16 })
			}, {
				id: "copyTitle",
				label: t("sessions.copyTitle"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconCopy, { size: 16 })
			}, ...options.includePath === true ? [{
				id: "copyPath",
				label: t("sessions.copyPath"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconCopy, { size: 16 }),
				disabled: options.path === void 0
			}] : []);
			if (options.canDelete !== false) items.push({
				type: "separator",
				id: "delete-separator"
			}, {
				id: "delete",
				label: t("sessions.delete"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconDelete, { size: 16 }),
				danger: true
			});
			return items;
		}
		/** 把右键落点收成 Menu 的锚点矩形，让列表贴着指针打开。 */
		function pointerMenuRect(x, y) {
			return new DOMRect(x, y, 0, 0);
		}
		function pendingLabel(kind, t) {
			switch (kind) {
				case "approval": return t("sessions.waitingApproval");
				case "plan-review": return t("sessions.planReview");
				case "question": return t("sessions.waitingAnswer");
			}
		}
		function SessionState({ pendingInteraction, unread, running, t }) {
			if (pendingInteraction !== void 0) {
				const label = pendingLabel(pendingInteraction, t);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dcu-wb-pending",
					"data-state": "warning",
					"data-pending-kind": pendingInteraction,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-pending-dot",
						"aria-hidden": "true"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-pending-label",
						children: label
					})]
				});
			}
			if (unread) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-wb-unread",
				role: "img",
				"aria-label": t("sessions.unread")
			});
			if (running) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-wb-running",
				role: "img",
				"aria-label": t("sessions.running"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconLoading, {
					size: 14,
					className: "dcu-spin",
					"aria-hidden": "true"
				})
			});
			return null;
		}
		function SessionTime({ time }) {
			if (time === void 0 || time === "") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-wb-session-time",
				children: time
			});
		}
		function SessionRowTitle({ title }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-wb-session-title",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dcu-wb-session-title-text",
					children: sessionTitleLine(title)
				})
			});
		}
		function SessionRow({ id, title, selected, menuOpen, unread, running, pendingInteraction, t, menuItems, onOpen, onMenuChange, onSelectAction, onArchive, onHover, onLeave, onContextMenu, menuPoint, subtitle, flat, draggable, dropActive, onDragStart, onDragEnd, onDragOver, onDrop, time, pinned, onTogglePin }) {
			const archiveConfirm = useArchiveConfirm();
			const confirmingArchive = archiveConfirm.confirmingId === id;
			const requestArchive = () => {
				if (archiveConfirm.press(id)) onArchive();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-dcu-session": id,
				"data-pinned": pinned === true ? "true" : void 0,
				className: `dcu-wb-session${selected ? " dcu-wb-selected" : ""}${menuOpen ? " dcu-wb-menu-open" : ""}${dropActive === true ? " dcu-wb-drop" : ""}${flat === true ? " dcu-wb-session-flat" : ""}${confirmingArchive ? " dcu-wb-archive-confirming" : ""}`,
				role: "treeitem",
				"aria-selected": selected,
				draggable,
				onDragStart,
				onDragEnd,
				onDragOver,
				onDrop,
				onClick: onOpen,
				onKeyDown: (event) => {
					if (event.target !== event.currentTarget) return;
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onOpen();
					}
				},
				onContextMenu,
				onMouseEnter: onHover,
				onMouseLeave: onLeave,
				children: [
					subtitle !== void 0 && subtitle !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dcu-wb-session-copy",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRowTitle, { title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-session-sub",
							children: subtitle
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRowTitle, { title }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionState, {
						pendingInteraction,
						unread,
						running,
						t
					}),
					onTogglePin !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionPinButton, {
						pinned: pinned === true,
						label: t(pinned === true ? "sessions.unpin" : "sessions.pin"),
						onToggle: onTogglePin
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionTime, { time }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-quick-actions",
						children: confirmingArchive ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dcu-wb-confirm",
							onMouseDown: (event) => {
								event.preventDefault();
								event.stopPropagation();
							},
							onClick: (event) => {
								event.stopPropagation();
								requestArchive();
							},
							children: t("sessions.confirm")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dcu-wb-more",
							"aria-label": t("sessions.archive"),
							onMouseDown: (event) => {
								event.preventDefault();
								event.stopPropagation();
							},
							onClick: (event) => {
								event.stopPropagation();
								requestArchive();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuickArchiveIcon, {})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: menuOpen,
							onClose: () => {
								onMenuChange(false);
							},
							items: menuItems,
							onSelect: onSelectAction,
							portal: true,
							dense: true,
							getAnchorRect: menuPoint === void 0 ? void 0 : () => pointerMenuRect(menuPoint.x, menuPoint.y),
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dcu-wb-more dcu-wb-context-anchor",
								"aria-label": t("sessions.actions", { name: title }),
								onClick: (event) => {
									event.stopPropagation();
									onMenuChange(!menuOpen);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconMore, { size: 16 })
							})
						})
					})
				]
			});
		}
		function GroupHead({ expanded, title, icon, onToggle, actions, menuOpen }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dcu-wb-project-head${menuOpen === true ? " dcu-wb-menu-open" : ""}`,
				role: "treeitem",
				"aria-expanded": expanded,
				onClick: onToggle,
				onKeyDown: (event) => {
					if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
						event.preventDefault();
						onToggle();
					}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-folder",
						children: icon
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-project-title",
						children: title
					}),
					actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-wb-actions",
						children: actions
					})
				]
			});
		}
		//#endregion
		//#region src/client/session-pending.ts
		const EMPTY_PENDING_INTERACTIONS = /* @__PURE__ */ new Map();
		const EMPTY_SESSION_STATUS = /* @__PURE__ */ new Map();
		function useEmptySessionPendingInteraction(selector) {
			return selector(EMPTY_PENDING_INTERACTIONS);
		}
		function useEmptySessionStatus(selector) {
			return selector(EMPTY_SESSION_STATUS);
		}
		function useHostSessionStatus(useSessionStatus) {
			return (useSessionStatus ?? useEmptySessionStatus)((state) => state);
		}
		/** 旧宿主订阅 pending Store；alpha.2 改走 useSessionStatus。两路都要订阅，避免条件 Hook。 */
		function useHostPendingInteractions(useSessionPendingInteraction, useSessionStatus) {
			return mergePendingInteractions((useSessionPendingInteraction ?? useEmptySessionPendingInteraction)((state) => state), (useSessionStatus ?? useEmptySessionStatus)((state) => state));
		}
		function visiblePendingKind(kind) {
			switch (kind) {
				case "approval":
				case "plan-review":
				case "question": return kind;
				default: return;
			}
		}
		/** 旧版 SessionSummary 的兼容读取；alpha.5 已将该状态迁移到独立 Store。 */
		function legacyPendingInteraction(summary) {
			if (typeof summary !== "object" || summary === null || !("pendingInteraction" in summary)) return void 0;
			return summary.pendingInteraction;
		}
		function pendingInteractionForSession(sessionId, pendingInteractions, summaryKind) {
			return visiblePendingKind(summaryKind) ?? visiblePendingKind(pendingInteractions.get(sessionId)?.kind);
		}
		//#endregion
		//#region src/client/session-manager.ts
		const SESSION_UNREAD_STORAGE_KEY = "dsh.session-unread.v1";
		function normalizeSessionIds(ids) {
			return [...new Set(ids.filter((id) => id.trim() !== ""))];
		}
		function toggleSessionId(ids, sessionId) {
			return ids.includes(sessionId) ? ids.filter((id) => id !== sessionId) : [sessionId, ...ids.filter((id) => id !== sessionId)];
		}
		/** 返回本次刷新中结束、且不在当前会话中的后台会话。 */
		function completedBackgroundSessionIds(previous, current, currentSessionId) {
			return Object.entries(current).flatMap(([id, running]) => previous[id] === true && running !== true && id !== currentSessionId ? [id] : []);
		}
		function readSessionIds(storage, key) {
			if (storage === void 0) return [];
			try {
				const value = JSON.parse(storage.getItem(key) ?? "{\"version\":1,\"ids\":[]}");
				if (value === null || typeof value !== "object") return [];
				const ids = value.ids;
				return Array.isArray(ids) && ids.every((id) => typeof id === "string") ? normalizeSessionIds(ids) : [];
			} catch {
				return [];
			}
		}
		function writeSessionIds(storage, key, ids) {
			if (storage === void 0) return;
			try {
				storage.setItem(key, JSON.stringify({
					version: 1,
					ids: normalizeSessionIds(ids)
				}));
			} catch {}
		}
		//#endregion
		//#region src/client/hover-tip.ts
		/** 把悬停卡片限制在视口内，避免贴边裁切。 */
		function clampHoverCardPosition(left, top, width, height, viewportWidth, viewportHeight) {
			const pad = 8;
			return {
				left: Math.min(Math.max(left, pad), Math.max(pad, viewportWidth - width - pad)),
				top: Math.min(Math.max(top, pad), Math.max(pad, viewportHeight - height - pad))
			};
		}
		/** 从行元素算出卡片出现在右侧的初始坐标。 */
		function hoverCardAnchor(rect) {
			return {
				left: rect.right + 8,
				top: rect.top
			};
		}
		const HOUR = 3600;
		const DAY = HOUR * 24;
		const WEEK = DAY * 7;
		const MONTH = DAY * 30;
		const YEAR = DAY * 365;
		function formatRelativeTime(updatedAt, t, now, justNow) {
			const seconds = Math.max(0, Math.floor((now - updatedAt) / 1e3));
			if (seconds < 60) return t(justNow);
			if (seconds < HOUR) return t("time.minutes", { count: Math.floor(seconds / 60) });
			if (seconds < DAY) return t("time.hours", { count: Math.floor(seconds / HOUR) });
			if (seconds < WEEK) return t("time.days", { count: Math.floor(seconds / DAY) });
			if (seconds < MONTH) return t("time.weeks", { count: Math.floor(seconds / WEEK) });
			if (seconds < YEAR) return t("time.months", { count: Math.floor(seconds / MONTH) });
			return t("time.years", { count: Math.floor(seconds / YEAR) });
		}
		/** 悬停卡片右上角。分档与 ChatGPT `$wa` 一致；英文刚刚用 Just now。 */
		function formatHoverTime(updatedAt, t, now = Date.now()) {
			return formatRelativeTime(updatedAt, t, now, "time.justNow");
		}
		/** 会话行右侧。分档相同；英文刚刚用 now，避免挤占标题。 */
		function formatCompactTime(updatedAt, t, now = Date.now()) {
			return formatRelativeTime(updatedAt, t, now, "time.justNowShort");
		}
		//#endregion
		//#region src/client/shared-now.ts
		const SHARED_NOW_INTERVAL_MS = 6e4;
		/** 对齐到下一个整档，避免「刚刚」在整分钟边界之后还多停将近一轮。 */
		function msUntilNextNowTick(now, intervalMs = SHARED_NOW_INTERVAL_MS) {
			const remainder = now % intervalMs;
			return remainder === 0 ? intervalMs : intervalMs - remainder;
		}
		const listeners = /* @__PURE__ */ new Set();
		let sharedNow = Date.now();
		let timeoutId = 0;
		let intervalId = 0;
		let cancelled = true;
		function publish(now) {
			sharedNow = now;
			for (const listener of listeners) listener();
		}
		function startClock() {
			cancelled = false;
			timeoutId = window.setTimeout(() => {
				if (cancelled) return;
				publish(Date.now());
				intervalId = window.setInterval(() => {
					publish(Date.now());
				}, SHARED_NOW_INTERVAL_MS);
				if (cancelled) {
					window.clearInterval(intervalId);
					intervalId = 0;
				}
			}, msUntilNextNowTick(Date.now()));
		}
		function stopClock() {
			cancelled = true;
			window.clearTimeout(timeoutId);
			window.clearInterval(intervalId);
			timeoutId = 0;
			intervalId = 0;
		}
		function subscribe(listener) {
			if (listeners.size === 0) {
				sharedNow = Date.now();
				startClock();
			}
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0) stopClock();
			};
		}
		function getSnapshot() {
			return sharedNow;
		}
		/** 模块级当前时刻。几棵树挂着都只走一套定时器，每分钟刷新一次。 */
		function useSharedNow() {
			return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
		}
		//#endregion
		//#region src/client/conversation-bubbles.ts
		/** 撤回旧版用户卡片和长文本展开覆盖，恢复 DSH 官方气泡。 */
		const USER_BUBBLE_STYLE_ID = "dcu-user-bubble-style";
		const USER_BUBBLE_EXPAND_STYLE_ID = "dcu-user-bubble-expand-style";
		function restoreOfficialUserBubbles(root) {
			const doc = "getElementById" in root ? root : root.ownerDocument;
			doc?.getElementById(USER_BUBBLE_STYLE_ID)?.remove();
			doc?.getElementById(USER_BUBBLE_EXPAND_STYLE_ID)?.remove();
			for (const card of root.querySelectorAll("[data-dcu-user-card]")) card.remove();
			const selector = "[data-dcu-user-source],[data-dcu-expandable-user-bubble]";
			const sources = [...root.querySelectorAll(selector)];
			if (root instanceof HTMLElement && root.matches(selector)) sources.unshift(root);
			for (const source of sources) {
				source.removeAttribute("data-dcu-user-source");
				source.removeAttribute("data-dcu-expandable-user-bubble");
			}
		}
		//#endregion
		//#region src/client/conversation-header.ts
		const CONVERSATION_HEADER_STYLE_ID = "dcu-conversation-header-style";
		const HEADER_PROJECT_TIP_EVENT = "dcu-header-project-tip";
		const HEADER_SESSION_MENU_EVENT = "dcu-header-session-menu";
		const CONVERSATION_HEADER_STYLE = `
/* HD2（2026-10-27 顶栏对齐 03e）：左右内边距归一为 24px。
   宿主原本是 padding:10px 28px 0 20px（左 20 / 右 28，不对称，疑为侧栏适配残留）。
   实测页签距右边界 266px —— 28px 并不贴合任何元素，纯粹是宿主的非对称习惯。
   注入试验：对称 24px 后页签右距 266→262，无布局冲突、无水平溢出。 */
/* HD1 高度补偿：border-box 下加 1px 边框会把总高顶到 49，内容区整体下移 1px（实测 scrollTop 48→49）。
   ZCode 的 48 是含边框的总高，故 min-height 减 1 补偿，恢复总高 48。 */
header:has([data-dcu-inline-tabs]){box-sizing:border-box;display:flex;flex-wrap:nowrap;align-items:center;gap:var(--dcu-space-2);min-height:calc(var(--dcu-header-height,48px) - 1px);padding-top:calc((var(--dcu-header-height,48px) - 28px - 1px)/2);padding-bottom:calc((var(--dcu-header-height,48px) - 28px - 1px)/2);padding-left:24px;padding-right:24px;border-bottom:1px solid rgba(13,13,13,.05)}
/* 1.1.37：没有内联页签但存在面包屑的旧版宿主，同样按 34px 控件带重排（紧凑顶栏覆盖面）。 */
header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]){box-sizing:border-box;display:flex;flex-wrap:nowrap;align-items:center;gap:var(--dcu-space-2);min-height:calc(var(--dcu-header-height,48px) - 1px);padding-top:calc((var(--dcu-header-height,48px) - 28px - 1px)/2);padding-bottom:calc((var(--dcu-header-height,48px) - 28px - 1px)/2);padding-left:24px;padding-right:24px;border-bottom:1px solid rgba(13,13,13,.05)}
/* HD1：--dcu-header-border 只在 .dcu-root 作用域内定义，header 不在其内、变量解析为空，
   整条 border 会被丢弃（与 composer 那次同一个坑）。改为在本作用域直接给值：
   默认（浅色）黑 5%，深色分支白 5%。 */
body[data-ds-dark-theme] header:has([data-dcu-inline-tabs]),
body[data-ds-dark-theme] header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]){border-bottom:1px solid rgba(255,255,255,.05)}
html.theme-zai-dark header:has([data-dcu-inline-tabs]),
html.theme-zai-dark header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]){border-bottom:1px solid rgba(255,255,255,.05)}
header:has([data-dcu-inline-tabs]):after{display:none;content:none}
header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]):after{display:none;content:none}
header:has([data-dcu-inline-tabs]) [class*="titleRow"],header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]) [class*="titleRow"],header:has([data-dcu-inline-tabs]) [class*="titleCluster"],header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]) [class*="titleCluster"]{display:contents}
header:has([data-dcu-inline-tabs]) [class*="crumbs"],header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]) [class*="crumbs"]{order:1;flex:0 1 auto;min-width:0}
header:has([data-dcu-inline-tabs]) [class*="headerActions"],header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]) [class*="headerActions"]{order:2;flex:none}
/* 旧版宿主没有页签带（order:3）占位，动作区需要 margin-right:auto 把扩展区顶到右侧。 */
header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]) [class*="headerActions"]{margin-right:auto}
header [data-dcu-inline-tabs]{box-sizing:border-box;order:3;flex:none;display:flex;align-items:center;gap:0;margin:0 0 0 auto;padding:0;height:28px;position:relative;z-index:1;overflow:hidden;border:1px solid var(--dsw-alias-border-subtle);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-background-secondary)}
header:has([data-dcu-inline-tabs]) [class*="headerUtilities"]{order:4;flex:none}
header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]) [class*="headerUtilities"]{order:4;flex:none}
/* 新版角落插槽被 display:contents 摊平后，需要独立排序并撤销嵌套布局的边距补偿。 */
header:has([data-dcu-inline-tabs]) [data-conversation-header-corner],header:not(:has([data-dcu-inline-tabs])):has([class*="crumbCurrent"]) [data-conversation-header-corner]{order:5;flex:none;margin-left:0;margin-right:0}
header [data-dcu-tab-slider]{position:absolute;left:0;top:0;height:26px;border-radius:var(--dsw-radius-md);background:color-mix(in srgb,var(--dsw-alias-button-info-fill) 18%,transparent);pointer-events:none;z-index:0;opacity:0;transform:translateX(0);width:0;transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),width var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 顶栏统一使用 34px 控件带：与宿主扩展常用的 top:3px + 28px 图标按钮同心。
   better-sidebar 0.18.0 收起时会把开关组改到 14px（按官方 padding-top:12px 算），
   这里只在紧凑顶栏存在时扣回 3px，不搬 DOM、不跟展开/收起跳动。 */
body[data-dsh-sidebar-collapsed]:has([data-dcu-inline-tabs]) [data-dsh-toggle-cluster]{top:calc(3px + env(safe-area-inset-top))}
body[data-dsh-sidebar-collapsed][data-dsh-title-bar-compat]:has([data-dcu-inline-tabs]) [data-dsh-toggle-cluster]{top:calc(var(--dsh-title-bar-strip, 40px) + 3px)}
header [data-dcu-inline-tabs] [role=tab]{box-sizing:border-box;position:relative;z-index:1;height:26px;padding:3px var(--dcu-space-2);margin:0;line-height:20px;color:var(--dsw-alias-label-tertiary);border:0;box-shadow:none;background:transparent;font-size:var(--dsw-font-size-caption);white-space:nowrap}
header [data-dcu-inline-tabs] [role=tab][aria-selected=true],header [data-dcu-inline-tabs] [role=tab][data-state=active]{color:var(--dsw-alias-button-info-fill);font-weight:500}
header [data-dcu-inline-tabs] [role=tab]+[role=tab]{border-left:1px solid var(--dsw-alias-border-subtle)}
header [data-dcu-inline-tabs] [role=tab]:after,header [data-dcu-inline-tabs] [role=tab]:before{display:none!important;content:none!important;background:transparent!important;height:0!important}
header [data-dcu-inline-tabs] [role=tab]:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px}
header [data-dcu-title-folder],header [data-dcu-title-more]{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,currentColor);display:inline-grid;place-items:center;padding:0;cursor:pointer;border-radius:var(--dsw-radius-sm)}
header [data-dcu-title-folder]{width:16px;height:20px}
header [data-dcu-title-more]{width:20px;height:20px}
header [data-dcu-title-folder]:hover,header [data-dcu-title-more]:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,currentColor)}
header [data-dcu-title-folder] svg,header [data-dcu-title-more] svg{display:block}
/* HD3（2026-10-27 顶栏对齐 03e）：页签字号/字重对齐 ZCode 标题口径。
   ZCode 顶栏标题实测 14px / font-weight 600；DSH 页签原为 13px / 500。
   只调字号与字重，不动高度（26px）与内边距 —— 那是宿主结构，见 HD5 单独处理。 */
/* 特异性必须高于插件自身已有的 header [data-dcu-inline-tabs] [role="tab"]（0,2,1），
   否则虽然排在后面也压不过去（实测第一版只写 .ST7X_W_tab 完全无效）。 */
/* ZCode 顶栏标题 14px/600。字号必须走令牌（--dsw-font-size-base = 14px），
   字面值会被 design-system 断言拦截。 */
header [data-dcu-inline-tabs] [role="tab"].ST7X_W_tab{font-size:var(--dsw-font-size-base);font-weight:600}
/* HD5（2026-10-27 顶栏对齐 03e）：顶栏内的图标按钮从 16×20 / 20×20 统一到 28×28 + 圆角 8px。
   ZCode 实测顶栏按钮默认 28×28 / radius 8px（唯一例外是「打开方式」触发器 20×28 无圆角）。
   ⚠ 这是本轮风险最高的一项：放大后整排按钮变宽，可能挤压标题。已在 1280 与窄窗口各截图复核。
   限定在 header 内，不波及页签与内容区。 */
/* ⚠ 选择器修正（2026-10-27）：.ST7X_W_header 本身就是 <header>，
   第一版写成 header 空格 .ST7X_W_header button（即 header 的后代里的 .ST7X_W_header），
   永远匹配不到，实测按钮仍是 16×20/4px。改为直接命中 header 内的 button，
   并用 :not([role="tab"]) 排除页签、用 [class*=ST7X_W_] 限定在顶栏自己的按钮上。 */
/* 2026-10-27 回滚：第一版作用于 header 内所有 button，实测把顶栏从 48 撑到 55px
   （内容高 0、padding 按 28px 基准算，按钮放大后公式失配），
   并连带使页签规则失效（tabFs 14→13）。改为只作用于**可见**且非页签的图标按钮，
   并用 overflow 限制不影响高度。 */
/* HD5（2026-10-27 顶栏对齐 03e）：图标按钮从小尺寸统一到 28×28 + 圆角 8px。

   ⚠ 踩过的两次坑，都写在这里避免重犯：
   1) 第一版用 header button 一刀切 → 把 headerUtilities 内部按钮全放大，
      实测顶栏 48→55px、HD3 页签规则连带失效。
   2) 第二版按「子节点只有 svg」判定 → 「访达」是 IMG、「更多打开方式」无子节点，两者被漏掉。
      另外把文字按钮（「会话管理」88×28）强制成方形会**竖排折行**
      （实测截图里变成「会话管 理」两行）。

   最终策略：按结构分三条，各管一类，都不碰文字按钮。
     A. crumbSeg 内按钮（面包屑图标）
     B. headerUtilities 内**含 svg** 的按钮（纯图标，天然排除文字按钮）
     C. 两个非 svg 的特殊按钮「访达」「更多打开方式」，按 aria 精确命中
   headerUtilities 容器固定 28px 高，放大其子按钮不会改变容器高度（已实测）。 */
header.ST7X_W_header [class*=ST7X_W_crumbSeg] button:not([role="tab"]),
/* ⚠ :has(svg) 是**后代**匹配 —— 「会话管理」内部 SPAN 里也有 svg，会被误命中后压成 28 宽折行。
   必须用「直接子节点只有 svg」：:has(> svg):not(:has(> :not(svg)))。
   实测该写法对图标按钮=true，对「会话管理」(kids=SPAN、内含 svg)=false。 */
header.ST7X_W_header [class*=ST7X_W_headerUtilities] button:not([role="tab"]):has(> svg):not(:has(> :not(svg))),
header.ST7X_W_header button[aria-label*="访达"],
header.ST7X_W_header button[aria-label*="打开方式"]{
  box-sizing:border-box;
  display:inline-flex;align-items:center;justify-content:center;
  width:28px;height:28px;min-width:28px;min-height:28px;
  padding:0;
  border-radius:var(--dsw-radius-lg);
}
header.ST7X_W_header button:not([role="tab"]){border-radius:var(--dsw-radius-lg)}

`;
		const FOLDER_SVG = "<svg viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" fill=\"none\" aria-hidden=\"true\"><path fill=\"currentColor\" transform=\"translate(1.5 2.429)\" d=\"M5.05582 0.518756L4.50669 0.86654L5.05582 0.518756ZM13 9.4837L13.65 9.4837L13.65 3.53962L13 3.53962L12.35 3.53962L12.35 9.4837L13 9.4837ZM11.3264 1.86603L11.3264 1.21603L6.52313 1.21603L6.52313 1.86603L6.52313 2.51603L11.3264 2.51603L11.3264 1.86603ZM5.58054 1.34727L6.12968 0.999489L5.60495 0.170972L5.05582 0.518756L4.50669 0.86654L5.03141 1.69506L5.58054 1.34727ZM4.11323 1.23058e-13L4.11323 -0.65L1.67359 -0.65L1.67359 5.00699e-14L1.67359 0.65L4.11323 0.65L4.11323 1.23058e-13ZM0 1.67359L-0.65 1.67359L-0.65 9.4837L0 9.4837L0.65 9.4837L0.65 1.67359L0 1.67359ZM11.3264 11.1573L11.3264 10.5073L1.67359 10.5073L1.67359 11.1573L1.67359 11.8073L11.3264 11.8073L11.3264 11.1573ZM0 9.4837L-0.65 9.4837C-0.65 10.767 0.390308 11.8073 1.67359 11.8073L1.67359 11.1573L1.67359 10.5073C1.10828 10.5073 0.65 10.049 0.65 9.4837L0 9.4837ZM1.67359 5.00699e-14L1.67359 -0.65C0.390307 -0.65 -0.65 0.390309 -0.65 1.67359L0 1.67359L0.65 1.67359C0.65 1.10828 1.10828 0.65 1.67359 0.65L1.67359 5.00699e-14ZM5.05582 0.518756L5.60495 0.170972C5.28121 -0.340193 4.71829 -0.65 4.11323 -0.65L4.11323 1.23058e-13L4.11323 0.65C4.27282 0.65 4.4213 0.731715 4.50669 0.86654L5.05582 0.518756ZM6.52313 1.86603L6.52313 1.21603C6.36354 1.21603 6.21507 1.13431 6.12968 0.999489L5.58054 1.34727L5.03141 1.69506C5.35515 2.20622 5.91808 2.51603 6.52313 2.51603L6.52313 1.86603ZM13 3.53962L13.65 3.53962C13.65 2.25634 12.6097 1.21603 11.3264 1.21603L11.3264 1.86603L11.3264 2.51603C11.8917 2.51603 12.35 2.97431 12.35 3.53962L13 3.53962ZM13 9.4837L12.35 9.4837C12.35 10.049 11.8917 10.5073 11.3264 10.5073L11.3264 11.1573L11.3264 11.8073C12.6097 11.8073 13.65 10.767 13.65 9.4837L13 9.4837Z\"/></svg>";
		const MORE_SVG = "<svg viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" aria-hidden=\"true\"><circle cx=\"4\" cy=\"8\" r=\"1.15\" fill=\"currentColor\"/><circle cx=\"8\" cy=\"8\" r=\"1.15\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"8\" r=\"1.15\" fill=\"currentColor\"/></svg>";
		function findConversationTablist(root) {
			if ("matches" in root && typeof root.matches === "function" && root.matches("[role=tablist]")) return root;
			return root.querySelector("header [role=tablist]") ?? void 0;
		}
		/** 只给宿主页签打内联标记，视觉重排交给样式表；DOM 结构保持宿主原样。 */
		function placeConversationTabs(root) {
			const tabs = findConversationTablist(root);
			if (tabs === void 0 || tabs.dataset.dcuInlineTabs === "") return false;
			tabs.dataset.dcuInlineTabs = "";
			return true;
		}
		function emit(name, target, extra = {}) {
			const box = target.getBoundingClientRect();
			target.dispatchEvent(new CustomEvent(name, {
				bubbles: true,
				detail: {
					left: box.right + 8,
					top: box.top,
					getRect: () => target.getBoundingClientRect(),
					...extra
				}
			}));
		}
		function buildTitleButton(doc, marker, svg, event, extra) {
			const button = doc.createElement("button");
			button.type = "button";
			button.setAttribute("aria-label", marker === "folder" ? "打开所在项目" : "更多操作");
			if (marker === "folder") button.dataset.dcuTitleFolder = "";
			else button.dataset.dcuTitleMore = "";
			button.innerHTML = svg;
			button.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				emit(event, button, extra);
			});
			return button;
		}
		/** 在标题前后插入文件夹/三点按钮：只插入插件自己的节点，不搬移宿主标题。 */
		function decorateConversationTitle(root) {
			const title = root.querySelector("header [class*=\"crumbCurrent\"]");
			if (title === null) return false;
			const scope = title.closest("header") ?? title.ownerDocument;
			for (const stale of scope.querySelectorAll("[data-dcu-title-folder], [data-dcu-title-more]")) if (stale.previousElementSibling !== title && stale.nextElementSibling !== title) stale.remove();
			const folder = title.previousElementSibling;
			const more = title.nextElementSibling;
			if (folder?.matches("[data-dcu-title-folder]") === true && more?.matches("[data-dcu-title-more]") === true) return false;
			folder?.matches("[data-dcu-title-folder]") === true && folder.remove();
			more?.matches("[data-dcu-title-more]") === true && more.remove();
			const doc = title.ownerDocument;
			title.before(buildTitleButton(doc, "folder", FOLDER_SVG, HEADER_PROJECT_TIP_EVENT, { toggle: true }));
			title.after(buildTitleButton(doc, "more", MORE_SVG, HEADER_SESSION_MENU_EVENT));
			return true;
		}
		function selectedConversationTab(tabs) {
			return tabs.querySelector("[role=tab][aria-selected=true], [role=tab][data-state=active]") ?? void 0;
		}
		function syncTabSlider(root) {
			const tabs = findConversationTablist(root);
			if (tabs === void 0) return;
			const doc = tabs.ownerDocument;
			let slider = tabs.querySelector("[data-dcu-tab-slider]");
			if (slider === null) {
				slider = doc.createElement("span");
				slider.dataset.dcuTabSlider = "";
				tabs.prepend(slider);
			}
			const selected = selectedConversationTab(tabs);
			if (selected === void 0) {
				slider.style.opacity = "0";
				return;
			}
			const listBox = tabs.getBoundingClientRect();
			const tabBox = selected.getBoundingClientRect();
			slider.style.opacity = "1";
			slider.style.width = `${Math.max(0, tabBox.width)}px`;
			slider.style.transform = `translateX(${Math.max(0, tabBox.left - listBox.left)}px)`;
		}
		function watchTabSelection(tabs) {
			tabs.dataset.dcuTabWatch = "";
			const sync = () => {
				syncTabSlider(tabs);
			};
			const onClick = () => {
				window.requestAnimationFrame(sync);
			};
			const observer = new MutationObserver(sync);
			observer.observe(tabs, {
				attributes: true,
				subtree: true,
				attributeFilter: ["aria-selected", "data-state"]
			});
			tabs.addEventListener("click", onClick);
			return () => {
				observer.disconnect();
				tabs.removeEventListener("click", onClick);
				delete tabs.dataset.dcuTabWatch;
			};
		}
		function ensureStyle(doc) {
			if (doc.getElementById("dcu-conversation-header-style") !== null) return;
			const style = doc.createElement("style");
			style.id = CONVERSATION_HEADER_STYLE_ID;
			style.textContent = CONVERSATION_HEADER_STYLE;
			doc.head.append(style);
		}
		const CONVERSATION_BUBBLE_SELECTOR = "[data-time-hover-root],[data-dcu-user-card],[data-dcu-user-source]";
		function inspectConversationNode(node, impact, includeDescendants) {
			if (!(node instanceof Element)) return;
			if (node.matches("header") || node.closest("header") !== null || includeDescendants && node.querySelector("header") !== null) impact.headerChanged = true;
			const row = node.closest("[data-time-hover-root]");
			if (row !== null) {
				impact.bubbleRoots.add(row);
				return;
			}
			if (node.matches(CONVERSATION_BUBBLE_SELECTOR) || includeDescendants && node.querySelector(CONVERSATION_BUBBLE_SELECTOR) !== null) impact.bubbleRoots.add(node);
		}
		function conversationMutationImpact(records) {
			const impact = {
				headerChanged: false,
				bubbleRoots: /* @__PURE__ */ new Set()
			};
			for (const record of records) {
				inspectConversationNode(record.target, impact, false);
				for (const node of record.addedNodes) inspectConversationNode(node, impact, true);
				for (const node of record.removedNodes) if (node instanceof Element && (node.matches("header") || node.querySelector("header") !== null)) impact.headerChanged = true;
			}
			return impact;
		}
		/** 观察会话顶栏与用户气泡；只对相关子树变更按帧合并，流式回答不会触发全文档扫描。 */
		function observeConversationHeader(doc = document) {
			if (doc.head === null || doc.body === null) return () => {};
			ensureStyle(doc);
			restoreOfficialUserBubbles(doc);
			let applying = false;
			let frame;
			let headerPending = true;
			const bubbleRoots = /* @__PURE__ */ new Set();
			let watchedTabs;
			let stopWatchingTabs;
			const run = () => {
				frame = void 0;
				if (applying) return;
				applying = true;
				try {
					const roots = [...bubbleRoots];
					bubbleRoots.clear();
					for (const root of roots) restoreOfficialUserBubbles(root);
					if (headerPending) {
						headerPending = false;
						placeConversationTabs(doc);
						const tabs = findConversationTablist(doc);
						if (tabs !== watchedTabs) {
							stopWatchingTabs?.();
							watchedTabs = tabs;
							stopWatchingTabs = tabs === void 0 ? void 0 : watchTabSelection(tabs);
						}
						syncTabSlider(doc);
						decorateConversationTitle(doc);
					}
				} finally {
					applying = false;
				}
			};
			const sync = () => {
				if (frame !== void 0) return;
				frame = window.requestAnimationFrame(run);
			};
			sync();
			const observer = new MutationObserver((records) => {
				const impact = conversationMutationImpact(records);
				if (!impact.headerChanged && impact.bubbleRoots.size === 0) return;
				headerPending ||= impact.headerChanged;
				for (const root of impact.bubbleRoots) bubbleRoots.add(root);
				sync();
			});
			observer.observe(doc.body, {
				childList: true,
				subtree: true
			});
			return () => {
				observer.disconnect();
				stopWatchingTabs?.();
				if (frame !== void 0) window.cancelAnimationFrame(frame);
				doc.getElementById(CONVERSATION_HEADER_STYLE_ID)?.remove();
				doc.querySelectorAll("[data-dcu-title-folder], [data-dcu-title-more], [data-dcu-tab-slider]").forEach((node) => node.remove());
			};
		}
		//#endregion
		//#region src/client/hover-shell.tsx
		const HOVER_TIP_SHOW_DELAY_MS = 1e3;
		const WORKSPACE_HOVER_CARD_ESTIMATED_HEIGHT = 152;
		const HoverDispatchContext = (0, react.createContext)({
			showTip: () => {},
			hideTip: () => {},
			dismissTip: () => {},
			keepTip: () => {},
			isShowing: () => false
		});
		const HoverValueContext = (0, react.createContext)(void 0);
		/** 悬停状态放在独立 Provider 里，读 tip 的卡片会更新，树组件只拿稳定的 dispatch。 */
		function HoverShell({ blocked = false, children }) {
			const [hoverTip, setHoverTip] = (0, react.useState)();
			const hideTipTimer = (0, react.useRef)();
			const showTipTimer = (0, react.useRef)();
			const pendingTip = (0, react.useRef)();
			const blockedRef = (0, react.useRef)(blocked);
			blockedRef.current = blocked;
			const tipRef = (0, react.useRef)(hoverTip);
			tipRef.current = hoverTip;
			const place = (tip) => ({
				...tip,
				...clampHoverCardPosition(tip.left, tip.top, tip.kind === "workspace" ? 316 : 248, tip.kind === "workspace" ? WORKSPACE_HOVER_CARD_ESTIMATED_HEIGHT : 148, window.innerWidth, window.innerHeight)
			});
			const dispatch = (0, react.useMemo)(() => ({
				showTip: (tip, options) => {
					if (blockedRef.current) return;
					if (hideTipTimer.current !== void 0) {
						window.clearTimeout(hideTipTimer.current);
						hideTipTimer.current = void 0;
					}
					pendingTip.current = tip;
					if (options?.immediate === true || tipRef.current !== void 0) {
						if (showTipTimer.current !== void 0) {
							window.clearTimeout(showTipTimer.current);
							showTipTimer.current = void 0;
						}
						setHoverTip(place(tip));
						return;
					}
					if (showTipTimer.current !== void 0) window.clearTimeout(showTipTimer.current);
					showTipTimer.current = window.setTimeout(() => {
						showTipTimer.current = void 0;
						const next = pendingTip.current;
						if (blockedRef.current || next === void 0) return;
						setHoverTip(place(next));
					}, HOVER_TIP_SHOW_DELAY_MS);
				},
				hideTip: () => {
					pendingTip.current = void 0;
					if (showTipTimer.current !== void 0) {
						window.clearTimeout(showTipTimer.current);
						showTipTimer.current = void 0;
					}
					if (hideTipTimer.current !== void 0) window.clearTimeout(hideTipTimer.current);
					hideTipTimer.current = window.setTimeout(() => {
						setHoverTip(void 0);
					}, 120);
				},
				dismissTip: () => {
					pendingTip.current = void 0;
					if (showTipTimer.current !== void 0) {
						window.clearTimeout(showTipTimer.current);
						showTipTimer.current = void 0;
					}
					if (hideTipTimer.current !== void 0) {
						window.clearTimeout(hideTipTimer.current);
						hideTipTimer.current = void 0;
					}
					setHoverTip(void 0);
				},
				keepTip: () => {
					if (hideTipTimer.current !== void 0) {
						window.clearTimeout(hideTipTimer.current);
						hideTipTimer.current = void 0;
					}
				},
				isShowing: (kind, id) => tipRef.current?.kind === kind && tipRef.current.id === id
			}), []);
			(0, react.useEffect)(() => () => {
				if (hideTipTimer.current !== void 0) window.clearTimeout(hideTipTimer.current);
				if (showTipTimer.current !== void 0) window.clearTimeout(showTipTimer.current);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverDispatchContext.Provider, {
				value: dispatch,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverValueContext.Provider, {
					value: hoverTip,
					children
				})
			});
		}
		function useHoverDispatch() {
			return (0, react.useContext)(HoverDispatchContext);
		}
		function useHoverValue() {
			return (0, react.useContext)(HoverValueContext);
		}
		//#endregion
		//#region src/client/workspace-hover-card.tsx
		/** 只订阅悬停值，避免工作区树随鼠标移动整树重绘。 */
		function WorkspaceHoverCard({ t, onEditWorkspace, onToggleWorkspacePin }) {
			const hoverTip = useHoverValue();
			const { keepTip, hideTip, dismissTip } = useHoverDispatch();
			(0, react.useEffect)(() => {
				if (hoverTip === void 0) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest(".dcu-wb-tip") !== null || target.closest("[data-dcu-title-folder]") !== null || target.closest(".dcu-wb-project-head") !== null) return;
					dismissTip();
				};
				window.addEventListener("pointerdown", onPointerDown, true);
				return () => {
					window.removeEventListener("pointerdown", onPointerDown, true);
				};
			}, [hoverTip, dismissTip]);
			if (hoverTip === void 0) return null;
			const workspace = hoverTip.kind === "workspace";
			const workspaceId = workspace ? hoverTip.id : void 0;
			const taskSummary = hoverTip.unreadCount !== void 0 && hoverTip.unreadCount > 0 ? t("workspace.taskSummary", {
				count: hoverTip.count ?? 0,
				unreadCount: hoverTip.unreadCount
			}) : t("workspace.taskCount", { count: hoverTip.count ?? 0 });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dcu-wb-tip${workspace ? " dcu-wb-tip-workspace" : ""}`,
				style: {
					left: hoverTip.left,
					top: hoverTip.top
				},
				onMouseEnter: keepTip,
				onMouseLeave: hideTip,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-title",
						children: [
							workspace && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-folder",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, { size: 16 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-tip-title-main",
								children: hoverTip.title
							}),
							workspaceId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dcu-wb-tip-pin",
								"aria-label": t(hoverTip.pinned === true ? "workspace.unpin" : "workspace.pin"),
								onClick: () => {
									onToggleWorkspacePin(workspaceId);
									dismissTip();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {})
							})
						]
					}),
					workspace && hoverTip.count !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-meta",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconChannels, {
							"aria-hidden": "true",
							size: 16,
							strokeWidth: 1.5
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: taskSummary })]
					}),
					workspace && hoverTip.path !== void 0 && hoverTip.path !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-row dcu-wb-tip-path",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-folder",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, { size: 16 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-tip-path-copy",
							children: hoverTip.path
						})]
					}),
					!workspace && hoverTip.branch !== void 0 && hoverTip.branch !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tip-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-folder",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconBranch, { size: 16 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: hoverTip.branch })]
					}),
					workspaceId !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dcu-wb-tip-sep" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dcu-wb-tip-edit",
						onClick: () => {
							onEditWorkspace(workspaceId, hoverTip.title);
							dismissTip();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSettings, { size: 16 }), t("workspace.edit")]
					})] })
				]
			});
		}
		//#endregion
		//#region src/client/workspace-compat.ts
		function hasStartSession(value) {
			return value !== null && typeof value === "object" && "startSession" in value && typeof value.startSession === "function";
		}
		function hasConnectWorkspace(value) {
			return value !== null && typeof value === "object" && "connectWorkspace" in value && typeof value.connectWorkspace === "function";
		}
		function hasOpenWorkspace(value) {
			return value !== null && typeof value === "object" && "openWorkspace" in value && typeof value.openWorkspace === "function";
		}
		/** 与 DSH 官方最近工作区策略一致；时间相同时保留 Host 工作区顺序。 */
		function recentWorkspaceId(workspaces, sessions) {
			let selected;
			let selectedTime = Number.NEGATIVE_INFINITY;
			for (const workspace of workspaces) {
				let latest = Number.NEGATIVE_INFINITY;
				for (const sessionId of workspace.sessionIds) {
					const session = sessions[sessionId];
					if (session !== void 0) latest = Math.max(latest, session.updatedAt);
				}
				if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.createdAt);
				if (selected === void 0 || latest > selectedTime) {
					selected = workspace.workspaceId;
					selectedTime = latest;
				}
			}
			return selected;
		}
		/** 旧版提供聚合字段；alpha.5 起由工作区和会话两个 Store 分别报告基线阶段。 */
		function workspaceBaselinesReady(workspaces, sessions) {
			if ("baselinesReady" in workspaces) return workspaces.baselinesReady === true;
			return "phase" in workspaces && workspaces.phase === "ready" && "phase" in sessions && sessions.phase === "ready";
		}
		//#endregion
		//#region src/client/user-error.ts
		const WORKSPACE_GROUP_ERROR_KEYS = {
			"group-invalid": "errors.groupInvalid",
			"workspace-invalid": "errors.workspaceInvalid",
			"group-missing": "errors.groupMissing",
			"order-anchor-missing": "errors.orderAnchorMissing"
		};
		const HOST_ACTION_DEFAULT_KEYS = {
			rename: "sessions.renameFailed",
			delete: "sessions.deleteFailed",
			archive: "sessions.archiveFailed",
			fork: "sessions.forkFailed",
			pin: "sessions.pinFailed"
		};
		const HOST_ACTION_ERROR_KEYS = {
			rename: {
				"session/not-found": "sessions.unknown",
				"session/title-invalid": "sessions.renameInvalid"
			},
			delete: { "session/not-found": "sessions.unknown" },
			archive: { "session/not-found": "sessions.unknown" },
			fork: {
				"session/not-found": "sessions.unknown",
				"session/fork-unavailable": "sessions.forkUnavailable"
			},
			pin: { "session/not-found": "sessions.unknown" }
		};
		const INSTALL_ERROR_KEYS = [
			[/没有进入当前 Profile|did not enter this profile/i, "about.installUnchanged"],
			[/pnpm 仓库不一致.*停止当前 DSH Web|pnpm store do not match.*stop the current DSH Web/i, "about.installStoreMismatchWeb"],
			[/停止当前 DSH Web|stop the current DSH Web/i, "about.installExitWeb"],
			[/完全退出桌面端|无法覆盖正在运行的插件文件|running plugin files|quit DSH Desktop/i, "about.installExitDesktop"],
			[/DSH Web 终端输出|DSH Web terminal/i, "about.installWebFailed"],
			[/pnpm 仓库不一致|pnpm store do not match/i, "about.installStoreMismatch"],
			[/构建脚本策略|build-script policy/i, "about.installBuildPolicy"],
			[/找不到 pnpm|pnpm (?:is )?not (?:available|found)/i, "about.installPnpmMissing"],
			[/安装超时|installation timed out/i, "about.installTimeout"],
			[/服务尚未就绪|Profile 信息无效|dependency service is not ready/i, "about.installServiceUnavailable"]
		];
		/** 仅显式构造的本地化错误允许原样进入界面。 */
		var UserFacingError = class extends Error {};
		/** 保留 Host 结构化失败及操作语境，界面只消费受控映射。 */
		var HostActionError = class extends Error {
			action;
			reason;
			name = "HostActionError";
			constructor(action, reason) {
				super(`Host ${action} 操作失败`);
				this.action = action;
				this.reason = reason;
			}
		};
		function objectRecord(value) {
			return value !== null && typeof value === "object" ? value : void 0;
		}
		/** DSH 明确要求跨 bundle 按结构标记识别 RemoteFailure，不能使用 instanceof。 */
		function remoteFailureCode(value) {
			const seen = /* @__PURE__ */ new Set();
			let current = value;
			while (true) {
				const record = objectRecord(current);
				if (record === void 0 || seen.has(record)) return void 0;
				seen.add(record);
				if (record.isDSHRemoteError === true && typeof record.code === "string") return record.code;
				current = record.rpcError;
			}
		}
		function diagnosticMessage(value) {
			if (value instanceof Error) return value.message;
			const record = objectRecord(value);
			return typeof record?.message === "string" ? record.message : void 0;
		}
		function hostActionErrorKey(error) {
			const code = remoteFailureCode(error.reason);
			if (code !== void 0) {
				const key = HOST_ACTION_ERROR_KEYS[error.action][code];
				if (key !== void 0) return key;
			}
			if (error.action === "delete" && diagnosticMessage(error.reason)?.includes("UNKNOWN_SESSION") === true) return "sessions.unknown";
			return HOST_ACTION_DEFAULT_KEYS[error.action];
		}
		/** 将业务错误映射为当前语言，未知底层错误统一脱敏。 */
		function userErrorText(error, t) {
			const requestKey = businessRequestErrorKey(error);
			if (requestKey !== void 0) return t(requestKey);
			if (error instanceof UserFacingError) return error.message;
			if (error instanceof WorkspaceGroupError) return t(WORKSPACE_GROUP_ERROR_KEYS[error.code]);
			if (error instanceof HostActionError) return t(hostActionErrorKey(error));
			return t("errors.generic");
		}
		/** 安装错误保留用户可执行的处理建议，但不直接展示 Host 原文。 */
		function installErrorText(error, t) {
			const requestKey = businessRequestErrorKey(error);
			if (requestKey !== void 0) return t(requestKey);
			const message = error instanceof Error ? error.message : String(error);
			return t(INSTALL_ERROR_KEYS.find(([pattern]) => pattern.test(message))?.[1] ?? "about.installFailed");
		}
		//#endregion
		//#region src/client/session-move.ts
		const SESSION_MOVE_ENDPOINT = CODEX_UI_API_ENDPOINTS.sessionMove;
		const MOVE_ACTION_PREFIX = "move-session:";
		const SESSION_MOVE_ERROR_KEYS = {
			"session-move/unavailable": "sessions.moveUnavailable",
			"session-move/service-unavailable": "sessions.moveUnavailable",
			"session-move/unauthorized": "sessions.moveUnauthorized",
			"session-move/forbidden": "sessions.moveForbidden",
			"session-move/session-not-found": "sessions.moveNotFound",
			"session-move/workspace-not-found": "sessions.moveNotFound",
			"session-move/subagent-unsupported": "sessions.moveSubagent",
			"session-move/busy": "sessions.moveBusy",
			"session-move/rollback-failed": "sessions.moveRollbackFailed"
		};
		var SessionMoveRequestError = class extends Error {
			code;
			constructor(code) {
				super(code);
				this.code = code;
				this.name = "SessionMoveRequestError";
			}
		};
		/** 将 Host 公开错误码映射为受控 i18n 键，未知错误统一使用安全兜底。 */
		function sessionMoveErrorKey(code) {
			return SESSION_MOVE_ERROR_KEYS[code] ?? "sessions.moveFailed";
		}
		function moveSessionActionId(workspaceId) {
			return `${MOVE_ACTION_PREFIX}${encodeURIComponent(workspaceId)}`;
		}
		function parseMoveSessionActionId(actionId) {
			if (!actionId.startsWith(MOVE_ACTION_PREFIX)) return void 0;
			try {
				const workspaceId = decodeURIComponent(actionId.slice(13));
				return workspaceId === "" ? void 0 : workspaceId;
			} catch {
				return;
			}
		}
		/** 按 Host 项目顺序生成目标列表，并排除会话当前所属项目。 */
		function sessionMoveTargets(workspaces, sessionId) {
			return workspaces.filter((workspace) => !workspace.sessionIds.includes(sessionId)).map((workspace) => ({
				id: workspace.workspaceId,
				label: workspace.title || workspace.workspaceId
			}));
		}
		async function requestSessionMove(sessionId, targetWorkspaceId, fetcher = fetch) {
			let response;
			try {
				response = await fetcher(SESSION_MOVE_ENDPOINT, {
					method: "POST",
					cache: "no-store",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						sessionId,
						targetWorkspaceId
					}),
					signal: AbortSignal.timeout(3e4)
				});
			} catch {
				throw new SessionMoveRequestError("session-move/unavailable");
			}
			let payload;
			try {
				payload = await response.json();
			} catch {
				throw new SessionMoveRequestError("session-move/unavailable");
			}
			const code = payload !== null && typeof payload === "object" && typeof payload.code === "string" ? payload.code : void 0;
			if (!response.ok || payload === null || typeof payload !== "object" || payload.ok !== true) throw new SessionMoveRequestError(code ?? "session-move/failed");
		}
		/** 通过现有深链入口选中移动后的会话，同时用页面重建清除 DSH 保留的只读会话对象。 */
		function finishSessionMove({ sessionId, currentUrl, navigate }) {
			const targetUrl = new URL(currentUrl);
			targetUrl.searchParams.set("session", sessionId);
			navigate(targetUrl.toString());
		}
		//#endregion
		//#region src/client/workspace-archive.ts
		/** 按项目顺序归档会话；失败后停止，交由调用方显示并允许用户重试。 */
		async function archiveWorkspaceSessions(sessionIds, archiveSession) {
			for (const sessionId of new Set(sessionIds)) await archiveSession(sessionId);
		}
		//#endregion
		//#region src/client/workspace-drop-indicator.ts
		const ROWS = ".dcu-wb-section-head,.dcu-wb-collection-head,.dcu-wb-project-head,.dcu-wb-session,.dcu-wb-nochat,.dcu-wb-empty";
		const TARGETS = ".dcu-wb-drop,.dcu-wb-group-order-drop";
		function measureWorkspaceDropIndicator(root, onTargets) {
			const measured = Array.from(root.querySelectorAll(TARGETS)).filter((node) => node.closest("[data-open=false]") === null).map((target) => ({
				target,
				rect: measureTarget(root, target)
			})).filter((item) => item.rect !== void 0);
			const unique = measured.filter((item, index) => !measured.slice(0, index).some((previous) => previous.rect.top === item.rect.top && previous.rect.left === item.rect.left && previous.rect.width === item.rect.width));
			onTargets?.(unique.map((item) => item.target));
			return unique[0]?.rect;
		}
		function measureTarget(root, target) {
			const section = target.closest(".dcu-wb-section") ?? root;
			const rows = Array.from(section.querySelectorAll(ROWS)).filter((node) => node.closest("[data-open=false]") === null).map((node) => ({
				node,
				rect: node.getBoundingClientRect()
			})).filter((row) => row.rect.height > 0 && row.rect.width > 0);
			const owned = rows.filter((row) => row.node === target || target.contains(row.node));
			const after = target.classList.contains("dcu-wb-drop-after");
			let upper;
			let lower;
			let anchor = target.getBoundingClientRect();
			if (owned.length > 0) {
				const edge = after ? owned[owned.length - 1] : owned[0];
				const index = rows.indexOf(edge);
				anchor = edge.rect;
				upper = after ? edge.rect.bottom : rows[index - 1]?.rect.bottom;
				lower = after ? rows[index + 1]?.rect.top : edge.rect.top;
			} else if (target.matches(".dcu-wb-pin-start,.dcu-wb-pin-end")) {
				if (anchor.width <= 0 || anchor.height <= 0) return void 0;
				const itemRows = rows.filter((row) => !row.node.matches(".dcu-wb-section-head,.dcu-wb-empty,.dcu-wb-nochat"));
				if (target.matches(".dcu-wb-pin-end") && itemRows.length > 0) {
					const last = itemRows[itemRows.length - 1];
					anchor = last.rect;
					upper = last.rect.bottom;
					lower = rows.find((row) => row.rect.top >= last.rect.bottom - .5)?.rect.top;
				} else if (target.matches(".dcu-wb-pin-start") && itemRows.length > 0) {
					const first = itemRows[0];
					anchor = first.rect;
					lower = first.rect.top;
					upper = rows.filter((row) => row.rect.bottom <= first.rect.top + .5).at(-1)?.rect.bottom;
				} else {
					upper = rows.filter((row) => row.rect.bottom <= anchor.top).at(-1)?.rect.bottom;
					lower = rows.find((row) => row.rect.top >= anchor.bottom)?.rect.top;
					if (lower === void 0) lower = anchor.bottom;
					if (upper === void 0) upper = anchor.top;
				}
			} else return void 0;
			const center = upper === void 0 ? lower - 4 : lower === void 0 ? upper + 4 : (upper + lower) / 2;
			const box = root.getBoundingClientRect();
			return {
				top: center - box.top - root.clientTop + root.scrollTop - 4,
				left: anchor.left - box.left - root.clientLeft + root.scrollLeft + 4,
				width: Math.max(0, anchor.width - 12)
			};
		}
		/** 仅拖拽期间刷新，滚动、折叠动画和尺寸变化都使用当前帧的布局；结束时完整清理。 */
		function mountWorkspaceDropIndicator(root) {
			const line = root.ownerDocument.createElement("div");
			line.className = "dcu-wb-drop-indicator";
			line.setAttribute("aria-hidden", "true");
			root.append(line);
			root.dataset.dropIndicator = "measured";
			const view = root.ownerDocument.defaultView;
			let frame = 0;
			let previous = "";
			let previousConflict = [];
			const update = () => {
				const rect = measureWorkspaceDropIndicator(root, (targets) => {
					const conflict = targets.length > 1 ? targets : [];
					if (conflict.length > 1 && (conflict.length !== previousConflict.length || conflict.some((target, index) => target !== previousConflict[index]))) console.warn("[dsh-zcode-ui] 拖拽存在多个有效落点，请检查跨区状态清理。", { count: conflict.length });
					previousConflict = conflict;
				});
				const next = rect === void 0 ? "" : `${rect.top},${rect.left},${rect.width}`;
				line.hidden = rect === void 0;
				if (rect !== void 0 && next !== previous) {
					line.style.top = `${rect.top}px`;
					line.style.left = `${rect.left}px`;
					line.style.width = `${rect.width}px`;
				}
				previous = next;
				frame = view.requestAnimationFrame(update);
			};
			update();
			return () => {
				view.cancelAnimationFrame(frame);
				line.remove();
				delete root.dataset.dropIndicator;
			};
		}
		//#endregion
		//#region src/client/tree-keyboard.ts
		/**
		* ARIA 树的键盘模型：roving tabindex + 方向键。
		*
		* ## 为什么需要它（2026-10-14）
		*
		* 侧栏此前**声明**了 `role="tree"` / `role="treeitem"`，但没有兑现树的任何契约：
		*
		* 1. **没有方向键**——全仓 `ArrowDown/ArrowUp/ArrowLeft/ArrowRight` 在侧栏相关文件里
		*    匹配数为 0。树的全部意义就是「一个 Tab 站 + 方向键遍历」；没有方向键，
		*    100 个会话就要按 100 次 Tab 才能穿过侧栏（尼尔森第 7 条「灵活高效」失效）。
		* 2. **每个 treeitem 都是 `tabIndex={0}`**——正确的做法是 roving tabindex：
		*    全树只有**一个**可 Tab 项，方向键在树内移动并转移这个 tabindex。
		* 3. **没有 `aria-level`**——treeitem 的必填属性，缺了屏幕阅读器无法播报层级。
		* 4. **treeitem 的归属被打断**——ARIA 要求 treeitem 由 `tree` 或 `group` 直接拥有，
		*    而 `.dcu-wb-section` / `.dcu-wb-collections` / `.dcu-wb-group-member` 等纯结构层
		*    既没有 `role` 也不是 presentation，夹在中间会让树结构在无障碍树里散架。
		*
		* 本模块把 1–4 一次性补齐，且**不要求逐个节点手写属性**：层级由 DOM 嵌套推导，
		* 纯结构层由本模块统一标记为 presentation。这样加一个新的中间容器不需要记得改四处。
		*
		* ## 分工（谁处理哪些键）
		*
		* 本模块只处理**方向键与 Home/End**，并在捕获阶段 `preventDefault`——这些键行内元素
		* 自己都不消费。`Enter` / `Space` 刻意**不碰**：行内元素各自有 `onKeyDown`
		* （会话行打开会话、项目头展开收起），且 React 18 把合成事件挂在 React 根容器上，
		* 容器级监听器会**先于**它们触发，若在这里也处理一遍就会双触发。
		*
		* ## 与 MutationObserver 的相处
		*
		* 只观察 `childList`，**不观察 `attributes`**：本模块自己要写 `aria-level` /
		* `role` / `tabindex`，若观察属性就会自触发。这个坑本仓库踩过——相同值的
		* `setAttribute` 同样会触发属性观察器，曾导致渲染进程被拖死（见 KNOWN-ISSUES §14.4）。
		*/
		const TREEITEM = "[role=\"treeitem\"]";
		/** 折叠容器的显式标记：本插件的 `DisclosureBody` 在收起时写 `data-open="false"`。 */
		function isCollapsedIn(item, root) {
			let node = item;
			while (node !== null && node !== root) {
				if (node.getAttribute("data-open") === "false") return true;
				node = node.parentElement;
			}
			return false;
		}
		/** 树内当前**可见**的 treeitem。折叠子树不参与键盘遍历。 */
		function visibleTreeItems(root) {
			return [...root.querySelectorAll(TREEITEM)].filter((item) => !isCollapsedIn(item, root));
		}
		/**
		* 把纯结构包裹层标为 `role="presentation"`，让 treeitem 的归属不被夹断。
		*
		* 只处理**没有 role 的 div**：任何已经有 role 的元素（`tree` / `group` / `treeitem`）
		* 都不动，所以「显式声明过的语义」永远优先于本归一化。
		*/
		function normalizeWrappers(root) {
			for (const el of root.querySelectorAll("div:not([role])")) el.setAttribute("role", "presentation");
		}
		/** `aria-level` = 该 treeitem 到树根之间隔了几层 `role="group"`，再加 1。 */
		function assignLevels(root) {
			for (const item of root.querySelectorAll(TREEITEM)) {
				let level = 1;
				let parent = item.parentElement;
				while (parent !== null && parent !== root) {
					if (parent.getAttribute("role") === "group") level += 1;
					parent = parent.parentElement;
				}
				item.setAttribute("aria-level", String(level));
			}
		}
		function levelOf(item) {
			const raw = item.getAttribute("aria-level");
			const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
			return Number.isNaN(parsed) ? 1 : parsed;
		}
		/**
		* roving tabindex：全树只留一个 `tabIndex=0`。
		* 优先用调用方指定的项（正在聚焦的那个），否则用选中项，否则第一个可见项。
		*/
		function applyRoving(root, preferred) {
			for (const item of root.querySelectorAll(TREEITEM)) item.tabIndex = -1;
			const items = visibleTreeItems(root);
			if (items.length === 0) return;
			const target = preferred != null && items.includes(preferred) ? preferred : items.find((item) => item.getAttribute("aria-selected") === "true") ?? items[0];
			if (target === void 0) return;
			target.tabIndex = 0;
		}
		/** 展开/收起一个可展开项：优先点它内部的展开控件，其次点它自己。 */
		function toggleItem(item) {
			const control = item.querySelector("button[aria-expanded]");
			if (control !== null) {
				control.click();
				return;
			}
			item.click();
		}
		/** 沿可见顺序向上找第一个层级更浅的项，即父项。 */
		function parentItem(item, root) {
			const items = visibleTreeItems(root);
			const index = items.indexOf(item);
			if (index <= 0) return null;
			const level = levelOf(item);
			for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
				const candidate = items[cursor];
				if (candidate !== void 0 && levelOf(candidate) < level) return candidate;
			}
			return null;
		}
		/**
		* 在树容器上安装键盘模型，返回卸载函数。
		*
		* 幂等：重复安装同一容器时，旧的一份会先被卸载（容器上挂 `Symbol` 标记）。
		*/
		function installTreeKeyboard(root) {
			const refresh = (preferred) => {
				normalizeWrappers(root);
				assignLevels(root);
				applyRoving(root, preferred);
			};
			refresh();
			const focusAt = (index) => {
				const items = visibleTreeItems(root);
				if (items.length === 0) return;
				const next = items[Math.max(0, Math.min(index, items.length - 1))];
				if (next === void 0) return;
				applyRoving(root, next);
				next.focus();
			};
			const onKeyDown = (event) => {
				if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
				const origin = event.target;
				const current = origin instanceof HTMLElement ? origin.closest(TREEITEM) : null;
				if (current === null || !root.contains(current)) return;
				const items = visibleTreeItems(root);
				const index = items.indexOf(current);
				if (index < 0) return;
				switch (event.key) {
					case "ArrowDown":
						event.preventDefault();
						focusAt(index + 1);
						return;
					case "ArrowUp":
						event.preventDefault();
						focusAt(index - 1);
						return;
					case "Home":
						event.preventDefault();
						focusAt(0);
						return;
					case "End":
						event.preventDefault();
						focusAt(items.length - 1);
						return;
					case "ArrowRight": {
						event.preventDefault();
						if (current.getAttribute("aria-expanded") === "false") {
							toggleItem(current);
							return;
						}
						const next = items[index + 1];
						if (next !== void 0 && levelOf(next) > levelOf(current)) focusAt(index + 1);
						return;
					}
					case "ArrowLeft": {
						event.preventDefault();
						if (current.getAttribute("aria-expanded") === "true") {
							toggleItem(current);
							return;
						}
						const parent = parentItem(current, root);
						if (parent !== null) {
							applyRoving(root, parent);
							parent.focus();
						}
						return;
					}
					default: return;
				}
			};
			const onFocusIn = (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const item = target.closest(TREEITEM);
				if (item === null || !root.contains(item)) return;
				applyRoving(root, item);
			};
			root.addEventListener("keydown", onKeyDown, true);
			root.addEventListener("focusin", onFocusIn);
			const observer = new MutationObserver(() => {
				refresh();
			});
			observer.observe(root, {
				childList: true,
				subtree: true
			});
			return () => {
				observer.disconnect();
				root.removeEventListener("keydown", onKeyDown, true);
				root.removeEventListener("focusin", onFocusIn);
			};
		}
		//#endregion
		//#region src/client/CodexWorkspaceBrowser.tsx
		const DISCLOSURE_EXIT_MS = 300;
		function NewSessionIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconListPen, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		function CreateGroupIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconProjectAdd, { size: 16 });
		}
		function AddWorkspaceIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Plus, {
				"aria-hidden": "true",
				size: 16,
				strokeWidth: 1.5
			});
		}
		/** 使用独立节点生成稳定的拖拽预览，避免浏览器把目标高亮和操作按钮截入默认快照。 */
		function setDragPreview(dataTransfer, title, icon) {
			const preview = document.createElement("div");
			preview.className = "dcu-wb-drag-ghost";
			if (icon !== void 0 && icon !== null) {
				const previewIcon = icon.cloneNode(true);
				previewIcon.className = "dcu-wb-drag-ghost-icon";
				previewIcon.setAttribute("aria-hidden", "true");
				preview.appendChild(previewIcon);
			}
			const previewTitle = document.createElement("span");
			previewTitle.className = "dcu-wb-drag-ghost-title";
			previewTitle.textContent = sessionTitleLine(title);
			preview.appendChild(previewTitle);
			document.body.appendChild(preview);
			preview.offsetWidth;
			dataTransfer.setDragImage(preview, 16, 15);
			window.requestAnimationFrame(() => {
				preview.remove();
			});
		}
		function animateDisclosure(body, wasOpen, open) {
			if (wasOpen === open || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return void 0;
			const height = `${body.scrollHeight}px`;
			const from = wasOpen ? {
				height,
				opacity: 1,
				transform: "translateY(0)"
			} : {
				height: "0px",
				opacity: 0,
				transform: "translateY(-2px)"
			};
			const to = open ? {
				height,
				opacity: 1,
				transform: "translateY(0)"
			} : {
				height: "0px",
				opacity: 0,
				transform: "translateY(-2px)"
			};
			return body.animate([from, to], {
				duration: DISCLOSURE_EXIT_MS,
				easing: "cubic-bezier(0,0,0.2,1)",
				fill: "none"
			});
		}
		/** 所有可折叠层级使用同一套原生高度动画，兼容宿主内核对 auto 高度过渡的差异。 */
		function DisclosureBody({ className, children, open, role }) {
			const bodyRef = (0, react.useRef)(null);
			const previousOpen = (0, react.useRef)(open);
			(0, react.useLayoutEffect)(() => {
				const body = bodyRef.current;
				if (body === null) return;
				body.inert = !open;
				const animation = animateDisclosure(body, previousOpen.current, open);
				previousOpen.current = open;
				return () => {
					animation?.cancel();
				};
			}, [open]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: bodyRef,
				className,
				"data-open": open,
				"aria-hidden": !open,
				role,
				children
			});
		}
		/** 顶层分区使用已有结构，通过统一监听器复用与项目、分组一致的原生动画。 */
		function useSectionDisclosureMotion(rootRef) {
			const previousOpen = (0, react.useRef)(/* @__PURE__ */ new WeakMap());
			(0, react.useLayoutEffect)(() => {
				const bodies = rootRef.current?.querySelectorAll(".dcu-wb-section-body") ?? [];
				for (const body of bodies) {
					const open = body.dataset.open === "true";
					const previous = previousOpen.current.get(body);
					previousOpen.current.set(body, open);
					body.inert = !open;
					if (previous !== void 0) animateDisclosure(body, previous, open);
				}
			});
		}
		function sameWorkspaceDropTarget(left, right) {
			if (left === void 0 || right === void 0) return left === right;
			if (left.zone !== right.zone) return false;
			if (left.zone === "group" && right.zone === "group") return left.groupId === right.groupId && left.beforeId === right.beforeId && left.ontoGroup === right.ontoGroup && left.crossGroup === right.crossGroup;
			if (left.zone === "ungrouped" && right.zone === "ungrouped") return left.beforeId === right.beforeId && left.ontoSection === right.ontoSection && left.crossGroup === right.crossGroup;
			return "beforeId" in left && "beforeId" in right && left.beforeId === right.beforeId;
		}
		function sameWorkspaceGroups(left, right) {
			return left.length === right.length && left.every((group, index) => group.id === right[index]?.id && group.title === right[index]?.title && sameIds(group.workspaceIds, right[index]?.workspaceIds ?? []));
		}
		function newWorkspaceGroupId() {
			if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `group-${crypto.randomUUID()}`;
			return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
		}
		function workspaceGroupMoveActionId(groupId) {
			return `moveWorkspaceToGroup:${groupId ?? ""}`;
		}
		const stylesheet$4 = `
.dcu-wb{--dcu-wb-inset:4px;display:flex;flex:1;min-height:0;flex-direction:column;padding:4px var(--dcu-wb-inset) 8px;color:var(--dcu-sidebar-primary)}
.dcu-wb *{box-sizing:border-box}
/* 2026-10-18（设计审计 P0-6）：滚动边界硬切内容，看起来像渲染 bug。
   事实：滚动条被隐藏（scrollbar-width:none）、无渐隐、无投影，内容在容器边缘被切掉，
   如「最近」分区标题只露出上半截。
   采用**方案 A（留白 + 页脚上投影）**而非 mask-image：mask 会创建合成层，
   与 KNOWN-ISSUES 里的合成层预算结论冲突（§27/§31 均已实测合成层开销），
   且 mask 在滚动容器上会强制每帧重绘。投影 + 留白零合成层成本。
   16 → 24px：留出让最后一行不被页脚投影压住的空间。 */
.dcu-wb-tree{flex:1;min-height:0;overflow-x:hidden;overflow-y:auto;padding-bottom:24px;scrollbar-gutter:auto;scrollbar-width:none;user-select:none;-webkit-user-select:none}
.dcu-wb-tree::-webkit-scrollbar{display:none}
.dcu-wb-section+.dcu-wb-section{margin-top:12px}
.dcu-wb-section-head{position:relative;display:flex;align-items:center;min-height:28px;padding:0;border-radius:var(--dsw-radius-lg)}.dcu-wb-section-head:hover .dcu-wb-actions{display:flex}.dcu-wb-section-label{position:relative;display:flex;align-items:center;gap:4px;flex:1;min-width:0;min-height:28px;border:0;padding:2px 4px 2px 12px;background:transparent;color:var(--dcu-sidebar-tertiary);font:500 14px/20px var(--dsw-font-family);letter-spacing:0;text-align:left;cursor:pointer}.dcu-wb-section-caret{display:grid;place-items:center;flex:none;width:12px;height:12px;color:currentColor;opacity:0;transform:rotate(0deg);transform-origin:50% 50%;transition:opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-wb-section-head .dcu-wb-section-caret{position:absolute;left:0;top:6px}.dcu-wb-section-caret svg{display:block}.dcu-wb-section-head:hover .dcu-wb-section-caret,.dcu-wb-section-label:focus-visible .dcu-wb-section-caret{opacity:.78}.dcu-wb-section-label[aria-expanded=true] .dcu-wb-section-caret{transform:rotate(90deg)}.dcu-wb-section-body{display:block}.dcu-wb-section-body[data-open=false]{display:none}.dcu-wb-section-body>div{min-height:0}.dcu-wb-section-body[data-open=true]>div{animation:dcu-wb-section-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}@keyframes dcu-wb-section-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dcu-wb-section-caret{transition:none}.dcu-wb-section-body[data-open=true]>div{animation:none}}
.dcu-wb-project{position:relative;min-width:0}
.dcu-wb-collection-head .dcu-wb-more{opacity:0;pointer-events:none}
.dcu-wb-collection-head:hover .dcu-wb-more,.dcu-wb-collection-head:focus-within .dcu-wb-more,.dcu-wb-collection-head .dcu-wb-more[aria-expanded=true]{opacity:1;pointer-events:auto}
@media (pointer:coarse){.dcu-wb-collection-head .dcu-wb-more{opacity:1;pointer-events:auto}}
.dcu-wb-collection-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-wb-collection-actions{flex-shrink:0;width:20px}
.dcu-wb-collections{display:grid;min-width:0;gap:4px}.dcu-wb-collection,.dcu-wb-ungrouped{position:relative;min-width:0;overflow:visible}.dcu-wb-collection-head{display:flex;align-items:center;min-height:28px;padding:0 4px;border-radius:var(--dsw-radius-lg);transition:background var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-wb-collection-head:hover,.dcu-wb-collection-head:focus-within,.dcu-wb-collection-head.dcu-wb-group-drop{background:var(--dcu-sidebar-hover)}.dcu-wb-collection-head.dcu-wb-group-drop{outline:1px solid var(--dsw-alias-state-business-primary)}.dcu-wb-collection-head[draggable=true],.dcu-wb-collection-head[draggable=true] .dcu-wb-collection-label{cursor:grab}.dcu-wb-collection-head[draggable=true]:active,.dcu-wb-collection-head[draggable=true]:active .dcu-wb-collection-label{cursor:grabbing}.dcu-wb-collection-label{display:flex;align-items:center;gap:var(--dcu-space-1);min-width:0;flex:1;border:0;padding:4px;background:transparent;color:var(--dcu-sidebar-primary);font:13px/20px var(--dsw-font-family);text-align:left;cursor:pointer}.dcu-wb-collection-label .dcu-wb-section-caret{position:static;order:-1;opacity:.78}.dcu-wb-collection-head[aria-expanded=true] .dcu-wb-collection-label .dcu-wb-section-caret{transform:rotate(90deg)}.dcu-wb-collection-count{margin-left:auto;color:var(--dcu-sidebar-secondary);font-variant-numeric:tabular-nums}.dcu-wb-collection-body{position:relative;min-width:0;padding-left:12px}.dcu-wb-collection-body::before{content:"";position:absolute;left:31px;top:0;bottom:8px;width:1px;background:var(--dcu-sidebar-border)}.dcu-wb-group-member{position:relative}.dcu-wb-group-member.dcu-wb-drop::before,.dcu-wb-collection.dcu-wb-group-order-drop::before,.dcu-wb-ungrouped.dcu-wb-group-order-drop::before{content:"";position:absolute;z-index:2;left:7px;right:8px;top:-8px;height:8px;pointer-events:none;background:radial-gradient(circle at 4px 50%,transparent 1.75px,var(--dsw-alias-state-business-primary) 2px 3.75px,transparent 4px),linear-gradient(var(--dsw-alias-state-business-primary),var(--dsw-alias-state-business-primary)) 10px 50%/calc(100% - 10px) 2px no-repeat}.dcu-wb-group-member.dcu-wb-drop-after::before{top:auto;bottom:-8px}.dcu-wb-collection-body .dcu-wb-project-head{padding-left:12px}
.dcu-wb-collection.dcu-wb-workspace-move-drop,.dcu-wb-ungrouped.dcu-wb-workspace-move-drop{border-radius:var(--dsw-radius-lg);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 9%,transparent);outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dcu-wb-project-head,.dcu-wb-session{position:relative;display:flex;align-items:center;gap:6px;width:100%;min-width:0;border-radius:var(--dsw-radius-lg);padding:0 8px;color:var(--dcu-sidebar-primary);cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-wb-collection-body::before{left:calc(4px + 4px + 6px)}
.dcu-wb-project-head{height:32px;background:transparent;font:inherit;text-align:left}
.dcu-wb-project-head:hover,.dcu-wb-project-head.dcu-wb-menu-open,.dcu-wb-session:hover,.dcu-wb-session.dcu-wb-menu-open{background:var(--dcu-sidebar-selected)}.dcu-wb-session.dcu-wb-selected{background:var(--dcu-sidebar-selected)}.dcu-wb-project.dcu-wb-session-drop>.dcu-wb-project-head{border-radius:var(--dsw-radius-lg);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 9%,transparent);outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.dcu-wb-project.dcu-wb-session-move-drop{border-radius:var(--dsw-radius-lg);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 9%,transparent);outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.dcu-wb-project.dcu-wb-session-move-drop>.dcu-wb-project-head{background:transparent;outline:0}.dcu-wb-project-body>.dcu-wb-session:first-child,.dcu-wb-project-body>.dcu-wb-nochat:first-child{margin-top:4px}.dcu-wb-session+.dcu-wb-session{margin-top:0}
.dcu-wb-project-head[draggable=true],.dcu-wb-session[draggable=true]{cursor:grab}
.dcu-wb-project-head[draggable=true]:active,.dcu-wb-session[draggable=true]:active{cursor:grabbing}
.dcu-wb-section,.dcu-wb-section:focus,.dcu-wb-section:focus-visible,.dcu-wb-project-head:focus,.dcu-wb-session:focus{outline:0}.dcu-wb-pinned-list{position:relative}.dcu-wb-pin-end,.dcu-wb-pin-start{position:absolute;left:0;right:0;height:8px;z-index:2;pointer-events:none}.dcu-wb-pin-end.dcu-wb-drop,.dcu-wb-pin-start.dcu-wb-drop{pointer-events:auto}.dcu-wb-pin-start{top:0}.dcu-wb-pin-end{bottom:-8px}.dcu-wb-project.dcu-wb-drop::before,.dcu-wb-session.dcu-wb-drop::before,.dcu-wb-pin-end.dcu-wb-drop::before,.dcu-wb-pin-start.dcu-wb-drop::before{content:"";position:absolute;z-index:2;left:7px;right:8px;top:-8px;height:8px;pointer-events:none;background:radial-gradient(circle at 4px 50%,transparent 1.75px,var(--dsw-alias-state-business-primary) 2px 3.75px,transparent 4px),linear-gradient(var(--dsw-alias-state-business-primary),var(--dsw-alias-state-business-primary)) 10px 50%/calc(100% - 10px) 2px no-repeat}.dcu-wb-pin-start.dcu-wb-drop::before{top:0}.dcu-wb-pinned-list>.dcu-wb-project:first-child.dcu-wb-drop::before{top:-4px}.dcu-wb-project.dcu-wb-drop-after::before,.dcu-wb-session.dcu-wb-drop-after::before{top:auto;bottom:-8px}.dcu-wb-dragging{opacity:.28}.dcu-wb-drag-ghost{position:fixed;top:8px;left:-9999px;z-index:10040;display:flex;align-items:center;gap:8px;max-width:220px;height:30px;padding:0 var(--dcu-space-2);border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg);background:var(--dcu-sidebar-hover);box-shadow:0 4px 12px rgba(0,0,0,.24);color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family);white-space:nowrap;pointer-events:none}.dcu-wb-drag-ghost-icon{display:grid;place-items:center;flex:none;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-wb-drag-ghost-icon svg{display:block;width:16px;height:16px}.dcu-wb-drag-ghost-title{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wb-folder{display:grid;place-items:center;flex:none;width:16px;height:20px;color:var(--dcu-sidebar-icon)}.dcu-wb-folder.dcu-wb-folder-current{color:var(--dsw-alias-state-business-primary)}.dcu-wb-brand{display:block;width:16px;height:16px}
.dcu-wb-project-title,.dcu-wb-session-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--dsw-font-size-base);line-height:20px}
.dcu-wb-project-title{flex:1;font-weight:400;color:var(--dcu-sidebar-primary)}
/* 2026-10-18（设计审计 P0-4）：会话行左内距 30 → 40px，让两级树重新有缩进。
   背景：ZCode 侧栏是**平铺任务列表**（TaskListItem, pl-2.5），零缩进在它那里正确；
   但 DSH 的组织主轴是 workspace → session 两级树，把列表几何直接搬过来会让两级
   在视觉上变成同一级（实测两者文字起点都是 46px、同为 14px/400）。
   为什么是 40px 而不是审计原文的 42px：42 不在 4px 标度上，会额外触发
   design-system.assert 的间距棘轮（报「未登记的离刻度值」）；40 在标度内
   （SPACING_SCALE 含 40），只清一行基线即可，门禁改动量减半。
   实测缩进：项目文字 46px → 会话文字 56px（+10px 视觉缩进）。
   标题宽度 240px 夹具下 146 → 136px（中文等宽近似 10 字 → 10 字，未减少可见字数）。

   ⚠ 行首状态槽（图钉 / 转圈 / 未读点）是 absolute 定位，**不会**跟着 padding 走。
   只改 padding 会让「槽↔标题」间隙从 11px 涨到 21px（实测），视觉上像图钉漂在行中间。
   所以槽位偏移跟着内距一起 +10px，用局部变量下发；平铺行（flat/top，见下方规则）
   不参与树缩进，覆盖回原值 8/13px。 */
.dcu-wb-session{--dcu-wb-slot-left:18px;--dcu-wb-dot-left:23px;position:relative;min-width:0;min-height:32px;gap:0;overflow:hidden;padding-left:40px;padding-right:28px}
.dcu-wb-session-title{flex:1;margin-left:0}.dcu-wb-session-title-text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-session-time{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-sm);line-height:18px;font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:none}.dcu-wb-session:has(.dcu-wb-session-time){padding-right:64px}.dcu-wb-session-copy{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}.dcu-wb-session-sub{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);line-height:16px}.dcu-wb-session-flat,.dcu-wb-session-top{--dcu-wb-slot-left:8px;--dcu-wb-dot-left:13px;padding-left:8px}.dcu-wb-session-flat[data-pinned=true]:not(:has(.dcu-wb-pending)),.dcu-wb-session-top[data-pinned=true]:not(:has(.dcu-wb-pending)),.dcu-wb-session-flat:has(.dcu-wb-running,.dcu-wb-unread),.dcu-wb-session-top:has(.dcu-wb-running,.dcu-wb-unread){--dcu-wb-slot-left:18px;--dcu-wb-dot-left:23px;padding-left:40px}
.dcu-wb-actions{display:none;align-items:center;gap:8px;flex:none}
.dcu-wb-quick-actions{position:absolute;right:8px;top:50%;display:none;align-items:center;gap:2px;pointer-events:none;transform:translateY(-50%);background:var(--dcu-sidebar-hover);border-radius:var(--dsw-radius-md)}
.dcu-wb-project-head:hover .dcu-wb-actions,.dcu-wb-project-head:focus-within .dcu-wb-actions,.dcu-wb-project-head.dcu-wb-menu-open .dcu-wb-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-actions{display:flex}
.dcu-wb-session:hover .dcu-wb-quick-actions,.dcu-wb-session:focus-within .dcu-wb-quick-actions,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-quick-actions,.dcu-wb-session.dcu-wb-archive-confirming .dcu-wb-quick-actions{display:flex;pointer-events:auto}.dcu-wb-session:hover .dcu-wb-pending,.dcu-wb-session:focus-within .dcu-wb-pending,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-pending,.dcu-wb-session.dcu-wb-archive-confirming .dcu-wb-pending,.dcu-wb-session:hover .dcu-wb-session-time,.dcu-wb-session:focus-within .dcu-wb-session-time,.dcu-wb-session.dcu-wb-menu-open .dcu-wb-session-time,.dcu-wb-session.dcu-wb-archive-confirming .dcu-wb-session-time{visibility:hidden}.dcu-wb-session:has(.dcu-wb-pending) .dcu-wb-session-time{display:none}
/* 行首置顶按钮（对齐 ZCode TaskListItem：同一枚图钉兼作常显状态与悬停操作）。
   常显 = 已置顶且行首槽空闲；悬停/聚焦/菜单打开/归档确认时临时接管行首槽，
   此时未读点与运行中转圈让位（ZCode 同款 hidden 语义）。触屏（pointer:coarse）
   不参与接管：与 ZCode 相同——hover:none 只让右侧操作常驻，行首仍留给状态指示。 */
.dcu-wb-pin{position:absolute;left:var(--dcu-wb-slot-left);top:50%;display:none;place-items:center;width:16px;height:20px;margin-top:-10px;border:0;padding:0;background:transparent;color:var(--dcu-sidebar-tertiary);cursor:pointer}
.dcu-wb-pin svg{display:block;width:16px;height:16px}
.dcu-wb-pin:hover{color:var(--dcu-sidebar-primary)}
.dcu-wb-session[data-pinned=true]:not(:has(.dcu-wb-unread)):not(:has(.dcu-wb-running)):not(:has(.dcu-wb-pending)) .dcu-wb-pin{display:grid}
.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top):hover .dcu-wb-pin,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top):focus-within .dcu-wb-pin,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top).dcu-wb-menu-open .dcu-wb-pin,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top).dcu-wb-archive-confirming .dcu-wb-pin{display:grid}
.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top):hover .dcu-wb-unread,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top):focus-within .dcu-wb-unread,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top).dcu-wb-menu-open .dcu-wb-unread,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top).dcu-wb-archive-confirming .dcu-wb-unread,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top):hover .dcu-wb-running,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top):focus-within .dcu-wb-running,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top).dcu-wb-menu-open .dcu-wb-running,.dcu-wb-session:not(.dcu-wb-session-flat):not(.dcu-wb-session-top).dcu-wb-archive-confirming .dcu-wb-running{visibility:hidden}
/* 触屏（无悬停）——ZCode 同原则：触屏必须能看到操作（(hover:none) 时操作常驻）。
   快捷归档与 ⋯ 菜单常驻；时间左移让位；三者几何互不重叠（见 verify-session-coarse-actions.mjs）。
   待处理胶囊占位时除外：胶囊本身是行动号召，不让操作与它抢位。 */
/* 触屏（pointer:coarse）：操作常驻 + **目标尺寸补足** + **单一入口**。
   2026-10-14 前这里只解决「按钮是否常驻可见」，没解决「是否够大」：会话行 32px、
   行内 ⋯ / 归档按钮 20×20，而放宽规则只写给了集合头（那里也只到 36/28px）。
   20×20 低于 WCAG 2.2 AA 2.5.8 目标尺寸（最小值）的 24×24，也远低于触屏惯例的 44px。

   1.10.0 曾把两个按钮都放到 44×44，结果「时间 + 两个 44px 操作」要占 156px，
   240px 侧栏的内容宽只剩 84px、标题元素实测只有 54px——用可读性换目标尺寸，
   得不偿失（见 KNOWN-ISSUES §21.2）。
   1.11.0 改为**触屏只保留 ⋯ 一个 44×44 入口**（归档移到菜单里，多一次点击）。
   同一 240px 夹具实测：预留从 156px 降到 120px，标题元素从 54px 回到 90px。
   依据：触屏行列表的惯例是单一「更多」入口（iOS/Android list row），且把一键归档这种
   破坏性动作从易误触的常驻位挪进菜单，本身就更安全。 */
@media (pointer:coarse){
  .dcu-wb-session{min-height:44px}
  .dcu-wb-session .dcu-wb-more{width:44px;height:44px;border-radius:var(--dsw-radius-lg)}
  /* 快捷归档在触屏下退场：菜单里有同一动作（见 workspace-browser.ts 的 sessionMenuItems）。 */
  /* 触屏下快捷归档退场（菜单有同一动作）。 */
  .dcu-wb-session:not(:has(.dcu-wb-pending)):is(:hover,:focus-within) .dcu-wb-quick-actions{display:none}
  .dcu-wb-session:not(:has(.dcu-wb-pending)) .dcu-wb-actions{display:flex;position:absolute;right:8px;top:50%;transform:translateY(-50%)}
  .dcu-wb-session:not(:has(.dcu-wb-pending)) .dcu-wb-actions .dcu-wb-context-anchor{opacity:1;pointer-events:auto}
  .dcu-wb-session:not(:has(.dcu-wb-pending)) .dcu-wb-session-time{right:56px}
  .dcu-wb-session:not(:has(.dcu-wb-pending)){padding-right:56px}
  .dcu-wb-session:not(:has(.dcu-wb-pending)):has(.dcu-wb-session-time){padding-right:120px}
  .dcu-wb-collection-head,.dcu-wb-collection-label{min-height:44px}
  .dcu-wb-collection-actions{width:44px}
  .dcu-wb-collection-actions .dcu-wb-more{width:44px;height:44px;border-radius:var(--dsw-radius-lg)}
  .dcu-wb-confirm{height:32px;padding:0 var(--dcu-space-3)}
}
.dcu-wb-more{display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:var(--dsw-radius-md);padding:0;background:transparent;color:var(--dcu-sidebar-tertiary);cursor:pointer}
.dcu-wb-more:hover{color:var(--dcu-sidebar-primary)}.dcu-wb-confirm{display:inline-flex;align-items:center;height:20px;padding:0 8px;border:0;border-radius:var(--dsw-radius-md);background:var(--dcu-state-error-fill);color:var(--dsw-alias-bg-layer-3);font:500 12px/18px var(--dsw-font-family);cursor:pointer;white-space:nowrap}.dcu-wb-confirm:hover{background:var(--dcu-state-error-fill-hover)}
.dcu-wb-context-anchor{opacity:0;pointer-events:none}
.dcu-wb-tip{position:fixed;z-index:10050;min-width:220px;max-width:280px;padding:var(--dcu-space-2) var(--dcu-space-3);border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-xl);background:var(--dcu-tip-bg);box-shadow:var(--dcu-tip-shadow);color:var(--dcu-tip-primary);animation:dcu-tip-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}.dcu-wb-tip-workspace{width:316px;min-width:0;max-width:calc(100vw - 16px);padding:var(--dcu-space-2)}@keyframes dcu-tip-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dcu-wb-tip{animation:none}}.dcu-wb-tip-title{display:flex;align-items:center;gap:6px;min-width:0;min-height:20px;font-size:var(--dsw-font-size-base);line-height:20px;font-weight:500}.dcu-wb-tip-title-main{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-pin{display:grid;place-items:center;flex:none;width:20px;height:20px;border:0;border-radius:var(--dsw-radius-sm);padding:0;background:transparent;color:var(--dcu-tip-tertiary);cursor:pointer}.dcu-wb-tip-pin:hover{background:var(--dcu-tip-hover,var(--dcu-sidebar-hover));color:var(--dcu-tip-primary)}.dcu-wb-tip-meta,.dcu-wb-tip-row{display:flex;align-items:center;gap:6px;min-width:0;margin-top:4px;color:var(--dcu-tip-secondary);font-size:var(--dsw-font-size-base);line-height:20px}.dcu-wb-tip-meta svg,.dcu-wb-tip-row svg{flex:none}.dcu-wb-tip-row>span:not(.dcu-wb-folder){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-tip-path{align-items:flex-start;margin-top:8px}.dcu-wb-tip-path-copy{min-width:0;overflow-wrap:anywhere;white-space:normal}.dcu-wb-tip-sep{height:1px;margin:8px 0 4px;background:var(--dcu-sidebar-border)}.dcu-wb-tip-edit{display:flex;align-items:center;gap:6px;width:100%;min-height:24px;border:0;padding:2px 0;background:transparent;color:var(--dcu-tip-primary);font:14px/20px var(--dsw-font-family);text-align:left;cursor:pointer}.dcu-wb-tip-edit svg{flex:none;color:var(--dcu-tip-secondary)}
.dcu-wb-session:has(.dcu-wb-pending){padding-right:112px}.dcu-wb-unread{position:absolute;left:var(--dcu-wb-dot-left);top:50%;width:6px;height:6px;margin:-3px 0 0;border-radius:50%;background:var(--dsw-alias-state-business-primary)}
.dcu-wb-pending{position:absolute;right:10px;top:50%;display:flex;align-items:center;gap:4px;max-width:88px;margin:0;transform:translateY(-50%);color:var(--dcu-state-warn-text);font-size:var(--dsw-font-size-sm);line-height:16px;white-space:nowrap}.dcu-wb-pending-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dcu-state-warn-text)}.dcu-wb-pending-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.dcu-wb-empty{padding:var(--dcu-space-2);color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-caption)}
/* 三态外壳接管了排版与语义色（见 zcode-theme.ts 的 .dcu-state 段）。
   这里只保留侧栏需要的两件事：与上方内容的间距、以及「不再铺 12% 破坏性底色」——
   那层底色在 240px 窄栏里是一整块刺眼的红，且与契约第 4 条相抵触。 */
.dcu-wb-error{margin:4px 0;background:transparent}
.dcu-wb-rail{display:none}
.dcu-wb-rename-actions{display:flex;justify-content:flex-end;gap:8px}
.dcu-wb-delete-button{color:var(--dcu-state-error-text)!important}
.dcu-wb-delete-copy{margin:0;color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-caption);line-height:20px}
.dcu-wb-move-target{display:flex;min-width:0;align-items:center;gap:8px;margin-top:4px;color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family)}.dcu-wb-move-target svg{flex:none;color:var(--dcu-sidebar-secondary)}.dcu-wb-move-target-copy{min-width:0}.dcu-wb-move-project,.dcu-wb-move-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-wb-move-path{color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm)}
.dcu-wb-rename-input{box-sizing:border-box;width:100%;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);padding:var(--dcu-space-2);outline:0;background:var(--dsw-alias-background-secondary);color:var(--dsw-alias-label-primary);font:14px/20px var(--dsw-font-family);caret-color:var(--dsw-alias-state-business-primary);transition:border-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),box-shadow var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-wb-rename-input:hover{border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 32%,var(--dsw-alias-border-l2))}
.dcu-wb-rename-input:focus{border-color:var(--dsw-focus-ring-color,var(--dcu-focus));box-shadow:0 0 0 1px var(--dsw-focus-ring-color,var(--dcu-focus))}
`;
		const runningStyles = `.dcu-wb-running{position:absolute;left:var(--dcu-wb-slot-left);top:50%;display:grid;place-items:center;flex:none;width:16px;height:20px;margin-top:-10px;border:0;background:transparent}.dcu-wb-running svg{display:block;width:14px;height:14px;color:var(--dcu-sidebar-tertiary)}`;
		const typographyStyles = `.dcu-wb{--dcu-wb-disclosure-duration:var(--dcu-motion-move-duration);--dcu-wb-disclosure-ease:var(--dcu-motion-move-ease);font:14px/20px var(--dsw-font-family)}.dcu-wb-section-label{color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-base);line-height:21px;font-weight:500;font-family:var(--dsw-font-family);letter-spacing:0;padding-left:0}.dcu-wb-section-caret{transition:opacity var(--dcu-wb-disclosure-duration) var(--dcu-wb-disclosure-ease),transform var(--dcu-wb-disclosure-duration) var(--dcu-wb-disclosure-ease)}.dcu-wb-section-head .dcu-wb-section-caret{position:static;left:auto;top:auto;opacity:.78}.dcu-wb-section-body,.dcu-wb-project-body,.dcu-wb-collection-body{display:block;min-height:0;height:auto;overflow:clip;opacity:1;transform:none;visibility:visible}.dcu-wb-section-body[data-open=false],.dcu-wb-project-body[data-open=false],.dcu-wb-collection-body[data-open=false]{display:block;height:0;opacity:0;transform:translateY(-2px);pointer-events:none}.dcu-wb-section-body[data-open=true]:has(.dcu-wb-drop),.dcu-wb-project-body[data-open=true]:has(.dcu-wb-drop),.dcu-wb-collection-body[data-open=true]:has(.dcu-wb-drop){overflow:visible}.dcu-wb-section-body[data-open=true]>div{animation:none}@media (prefers-reduced-motion:reduce){.dcu-wb-section-caret{transition:none}}.dcu-wb-project-title{font-size:var(--dsw-font-size-base);line-height:21px;font-weight:400;color:var(--dcu-sidebar-secondary)}.dcu-wb-session-title{font-size:var(--dsw-font-size-base);line-height:21px;font-weight:500;color:var(--dcu-sidebar-primary)}.dcu-wb-session.dcu-wb-selected .dcu-wb-session-title,.dcu-wb-session:hover .dcu-wb-session-title{color:var(--dcu-sidebar-primary)}.dcu-wb-empty{color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-caption);line-height:18px}.dcu-wb-session.dcu-wb-selected .dcu-wb-session-time{color:var(--dcu-selected-secondary,var(--dcu-sidebar-secondary))}`;
		const collectionLayoutStyles = `
.dcu-wb-tree{position:relative}
.dcu-wb-tree[data-drop-indicator=measured] .dcu-wb-drop::before,.dcu-wb-tree[data-drop-indicator=measured] .dcu-wb-group-order-drop::before{display:none}
.dcu-wb-drop-indicator{position:absolute;z-index:3;height:8px;pointer-events:none;color:var(--dsw-alias-state-business-primary)}
.dcu-wb-drop-indicator::before{content:"";position:absolute;left:6px;right:0;top:3px;height:2px;border-radius:var(--dsw-radius-full);background:currentColor}
.dcu-wb-drop-indicator::after{content:"";position:absolute;box-sizing:border-box;left:0;top:0;width:8px;height:8px;border:2px solid currentColor;border-radius:50%}
/* 2026-10-18（设计审计 P0-5）：组间留白 4 → 12px，让分组重新可读。
   实测缺陷：会话行节奏 34px（32 行高 + 2 margin），组间 32 + 4 + 0 = 36px，只差 2px，
   人眼读不出组边界。12px 后组间 44px / 组内 34px = 1.29 倍，分组在视网膜上成立。
   不加分隔线：240px 窄栏里一条横线会很吵，间距够用。
   ⚠ 选择器必须带 :has(> .dcu-wb-session) —— 去掉后规则会作用于**空项目**（本来就没有
   会话，等于给无内容的项目凭空加 12px），这是审计原文写错的地方。 */
.dcu-wb-project-body:has(>.dcu-wb-session)::after{content:"";display:block;height:12px;pointer-events:none}
.dcu-wb-section-body[data-open=true]:has(.dcu-wb-group-order-drop),.dcu-wb-section-body[data-open=true]:has(.dcu-wb-pin-end),.dcu-wb-section-body[data-open=true]:has(.dcu-wb-pin-start){overflow:visible}
.dcu-wb-collection-body{padding-left:0}
.dcu-wb-collection-body>.dcu-wb-group-member:first-child{padding-top:4px}
.dcu-wb-collection-body .dcu-wb-project-head{padding-left:8px}
.dcu-wb-collection-body>.dcu-wb-empty{padding:8px 8px 8px 26px}
.dcu-wb-collection-body>.dcu-wb-empty,.dcu-wb-nochat{font-size:var(--dsw-font-size-caption);line-height:18px;color:var(--dcu-sidebar-tertiary)}
.dcu-wb-nochat{padding:1px 8px 5px 40px}
/* P0-4：与会话文字同列（40px），保持「显示更多」贴着它展开的那一列。 */
.dcu-wb-session-more{display:flex;gap:4px;padding:2px 8px 2px 40px}
.dcu-wb-session-more button{height:28px;border:0;border-radius:var(--dsw-radius-lg);padding:0 8px;background:transparent;color:var(--dcu-sidebar-tertiary);font:13px/20px var(--dsw-font-family);cursor:pointer}
.dcu-wb-session-more button:hover{color:var(--dcu-sidebar-secondary)}
.dcu-wb-collection:has(+.dcu-wb-collection)>.dcu-wb-collection-body>.dcu-wb-empty,.dcu-wb-collection:has(+.dcu-wb-ungrouped)>.dcu-wb-collection-body>.dcu-wb-empty{padding-top:14px;padding-bottom:2px}
.dcu-wb-collection-body::before,.dcu-wb-group-member::after{display:none}
.dcu-wb-collections{gap:12px}
.dcu-wb-collections:has(>.dcu-wb-project){gap:0}
.dcu-wb-collection-head{min-height:32px}
.dcu-wb-collection-head:hover{background:var(--dcu-sidebar-hover)}
.dcu-wb-collection-head.dcu-wb-group-drop{background:var(--dcu-sidebar-hover)}
.dcu-wb-collection-head{background:color-mix(in srgb,var(--dcu-sidebar-hover) 55%,transparent)}
.dcu-wb-collection-label{gap:4px;min-height:32px;font-size:var(--dsw-font-size-base);font-weight:400}
.dcu-wb-collection-label .dcu-wb-section-caret{width:14px;height:14px;opacity:1;color:var(--dcu-sidebar-primary)}
.dcu-wb-collection-label .dcu-wb-section-caret svg{width:14px;height:14px}
.dcu-wb-collection-label .dcu-wb-section-caret svg path{stroke-width:2}
.dcu-wb-collection-count{flex:none;font-size:var(--dsw-font-size-sm);font-weight:400;padding-left:8px}
.dcu-wb-ungrouped .dcu-wb-collection-label{color:var(--dcu-sidebar-secondary)}
.dcu-wb-collection-head:focus-within,.dcu-wb-collection-head:has(.dcu-wb-more[aria-expanded=true]){background:var(--dcu-sidebar-hover)}
.dcu-wb-workspace-move-drop>.dcu-wb-collection-head{background:transparent}
.dcu-wb-collection-label:focus-visible,.dcu-wb-project-head:focus-visible,.dcu-wb-session:focus-visible,.dcu-wb-section-label:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px;border-radius:var(--dsw-radius-md)}
`;
		const WORKSPACE_TREE_STYLE = stylesheet$4 + runningStyles + typographyStyles + collectionLayoutStyles;
		function storage$1() {
			return browserStorage();
		}
		function sameIds(left, right) {
			return left.length === right.length && left.every((id, index) => id === right[index]);
		}
		function optionalText(value, key) {
			if (!(key in value)) return void 0;
			const next = value[key];
			return typeof next === "string" && next !== "" ? next : void 0;
		}
		/** 插件自有的工作区树：复刻原生层级和拖拽行为，并在每个会话菜单中增加管理操作。 */
		const noSubscription = () => () => {};
		const noBindings = () => void 0;
		const emptyShortcutRows = [];
		const noRows = () => emptyShortcutRows;
		function CodexWorkspaceBrowser(props) {
			const snapshot = (0, react.useSyncExternalStore)(props.workspaceShortcuts?.subscribe ?? noSubscription, props.workspaceShortcuts?.getSnapshot ?? noBindings);
			const catalog = snapshot?.bindings?.hooks.shortcuts;
			const bridgeShortcuts = (0, react.useSyncExternalStore)(catalog?.subscribe ?? noSubscription, catalog?.getSnapshot ?? noRows);
			const requestAddWorkspace = props.workspaceShortcuts ? snapshot?.bindings?.requestAddWorkspace : props.requestAddWorkspace;
			const addWorkspaceShortcutAria = bridgeShortcuts.find((row) => row.id === "workspace.add")?.aria ?? props.addWorkspaceShortcutAria;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverShell, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodexWorkspaceTree, {
				...props,
				requestAddWorkspace,
				addWorkspaceShortcutAria
			}) });
		}
		function CodexWorkspaceTree({ wide, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces, t, archiveSession, deleteSession, deleteWorkspace, forkSession, insertSessionBefore, insertWorkspaceBefore, moveSession, openPath, openSession, pinSession, unpinSession, renameSession, renameWorkspace, startSession, canDeleteSession, shortcuts, panelActive = false, requestAddWorkspace, addWorkspaceShortcutAria }) {
			const sessions = useSessions((state) => state);
			const now = useSharedNow();
			const pendingInteractions = useHostPendingInteractions(useSessionPendingInteraction, useSessionStatus);
			const sessionStatus = useHostSessionStatus(useSessionStatus);
			const selectedId = visibleSelectedSessionId(sessions, panelActive);
			const workspaces = useWorkspaces((state) => state);
			const shortcutOf = useShortcutLookup(shortcuts);
			const baselinesReady = workspaceBaselinesReady(workspaces, sessions);
			const [expanded, setExpanded] = (0, react.useState)(() => readTreeExpansionState(storage$1(), WORKSPACE_EXPANSION_STORAGE_KEY));
			const [sessionWindows, setSessionWindows] = (0, react.useState)({});
			const revealMoreSessions = (workspaceId) => {
				setSessionWindows((current) => ({
					...current,
					[workspaceId]: nextProjectSessionWindow(current[workspaceId])
				}));
			};
			const [pinnedWorkspaceIds, setPinnedWorkspaceIdsState] = (0, react.useState)(() => readPinnedWorkspaceIds(storage$1()));
			const initialWorkspaceGroups = (0, react.useMemo)(() => readWorkspaceGroupsCache(storage$1()), []);
			const [workspaceGroups, setWorkspaceGroupsState] = (0, react.useState)(() => initialWorkspaceGroups.workspaceGroups);
			const pinnedWorkspaceIdsRef = (0, react.useRef)(pinnedWorkspaceIds);
			pinnedWorkspaceIdsRef.current = pinnedWorkspaceIds;
			const workspaceGroupsRef = (0, react.useRef)(workspaceGroups);
			workspaceGroupsRef.current = workspaceGroups;
			const workspaceGroupsPendingHostSyncRef = (0, react.useRef)(initialWorkspaceGroups.pendingHostSync);
			const pinnedHostSupportsWorkspaceGroupsRef = (0, react.useRef)(false);
			const pinnedHostHydratedRef = (0, react.useRef)(false);
			const pinnedHostDirtyRef = (0, react.useRef)(false);
			const pinnedHostSkipWriteRef = (0, react.useRef)();
			const pinnedHostWriteRef = (0, react.useRef)(Promise.resolve());
			const [preferencesFailure, setPreferencesFailure] = (0, react.useState)();
			const workspaceBaselineRef = (0, react.useRef)({
				ready: false,
				validIds: []
			});
			workspaceBaselineRef.current = {
				ready: baselinesReady,
				validIds: workspaces.items.map((workspace) => String(workspace.workspaceId))
			};
			const queuePinnedHostWrite = (ids, groups) => {
				const snapshot = {
					pinnedWorkspaceIds: [...ids],
					workspaceGroups: groups.map((group) => ({
						...group,
						workspaceIds: [...group.workspaceIds]
					}))
				};
				const pending = pinnedHostWriteRef.current.then(async () => {
					await writeHostWorkspacePreferences(snapshot.pinnedWorkspaceIds, snapshot.workspaceGroups);
					setPreferencesFailure(void 0);
					if (!pinnedHostSupportsWorkspaceGroupsRef.current) return;
					if (!sameIds(pinnedWorkspaceIdsRef.current, snapshot.pinnedWorkspaceIds) || !sameWorkspaceGroups(workspaceGroupsRef.current, snapshot.workspaceGroups)) return;
					workspaceGroupsPendingHostSyncRef.current = false;
					saveWorkspaceGroupsCache(storage$1(), snapshot.workspaceGroups, false);
				});
				pinnedHostWriteRef.current = pending.catch((reason) => {
					setPreferencesFailure(reason);
				});
			};
			const setPinnedWorkspaceIds = (update) => {
				pinnedHostDirtyRef.current = true;
				const current = pinnedWorkspaceIdsRef.current;
				const next = typeof update === "function" ? update(current) : update;
				pinnedWorkspaceIdsRef.current = next;
				setPinnedWorkspaceIdsState(next);
			};
			const setWorkspaceGroups = (update) => {
				const current = workspaceGroupsRef.current;
				const next = typeof update === "function" ? update(current) : update;
				pinnedHostDirtyRef.current = true;
				workspaceGroupsPendingHostSyncRef.current = true;
				workspaceGroupsRef.current = next;
				setWorkspaceGroupsState(next);
			};
			const [unreadSessionIds, setUnreadSessionIds] = (0, react.useState)(() => readSessionIds(storage$1(), SESSION_UNREAD_STORAGE_KEY));
			const rowUnread = (id) => sessionRowUnread(unreadSessionIds.includes(id), sessionStatus.get(id), selectedId === id);
			const rowRunning = (id, session) => sessionIsRunning(session ?? sessions.byId[id], sessionStatus.get(id));
			const previousSessionRunningRef = (0, react.useRef)();
			const [menu, setMenu] = (0, react.useState)();
			const archiveConfirm = useArchiveConfirm();
			const [renameTarget, setRenameTarget] = (0, react.useState)();
			const [deleteTarget, setDeleteTarget] = (0, react.useState)();
			const [archiveWorkspaceTarget, setArchiveWorkspaceTarget] = (0, react.useState)();
			const [sessionMoveTarget, setSessionMoveTarget] = (0, react.useState)();
			const { showTip: publishTip, hideTip, dismissTip, isShowing } = useHoverDispatch();
			const showTip = (tip, options) => {
				if (menu !== void 0) return;
				publishTip(tip, options);
			};
			const [renameDraft, setRenameDraft] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)();
			const busyRef = (0, react.useRef)();
			const [error, setError] = (0, react.useState)();
			const [workspaceDragId, setWorkspaceDragId] = (0, react.useState)();
			const [workspaceDropTarget, setWorkspaceDropTargetState] = (0, react.useState)();
			const [workspaceGroupDragId, setWorkspaceGroupDragId] = (0, react.useState)();
			const [workspaceGroupDropTarget, setWorkspaceGroupDropTargetState] = (0, react.useState)();
			const setWorkspaceGroupDropTarget = (target) => {
				setWorkspaceGroupDropTargetState((current) => {
					if (current === void 0 || target === void 0) return current === target ? current : target;
					return current.beforeId === target.beforeId ? current : target;
				});
			};
			const workspaceDropTargetRef = (0, react.useRef)();
			const setWorkspaceDropTarget = (target) => {
				if (sameWorkspaceDropTarget(workspaceDropTargetRef.current, target)) return;
				workspaceDropTargetRef.current = target;
				setWorkspaceDropTargetState(target);
			};
			const [headerMenu, setHeaderMenu] = (0, react.useState)();
			const headerMenuRef = (0, react.useRef)();
			headerMenuRef.current = headerMenu;
			const headerMenuPointerAt = (0, react.useRef)(0);
			const [sessionDrag, setSessionDrag] = (0, react.useState)();
			const [sessionDropTarget, setSessionDropTarget] = (0, react.useState)();
			const [createGroupOpen, setCreateGroupOpen] = (0, react.useState)(false);
			const [groupTitleDraft, setGroupTitleDraft] = (0, react.useState)("");
			const [deleteGroupId, setDeleteGroupId] = (0, react.useState)();
			const [groupMenuId, setGroupMenuId] = (0, react.useState)();
			const [renameGroupId, setRenameGroupId] = (0, react.useState)();
			const [renameGroupDraft, setRenameGroupDraft] = (0, react.useState)("");
			const [renameGroupError, setRenameGroupError] = (0, react.useState)();
			const groupActionTriggerRef = (0, react.useRef)();
			const projectsSectionButtonRef = (0, react.useRef)(null);
			const lastRevealedSessionIdRef = (0, react.useRef)();
			const pendingRevealScrollRef = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				writeTreeExpansionState(storage$1(), WORKSPACE_EXPANSION_STORAGE_KEY, expanded);
			}, [expanded]);
			(0, react.useEffect)(() => {
				savePinnedWorkspaceIds(storage$1(), pinnedWorkspaceIds);
				saveWorkspaceGroupsCache(storage$1(), workspaceGroups, workspaceGroupsPendingHostSyncRef.current);
				if (!pinnedHostHydratedRef.current) return;
				const skippedHydration = pinnedHostSkipWriteRef.current;
				pinnedHostSkipWriteRef.current = void 0;
				if (skippedHydration !== void 0 && sameIds(skippedHydration.pinnedWorkspaceIds, pinnedWorkspaceIds) && sameWorkspaceGroups(skippedHydration.workspaceGroups, workspaceGroups)) return;
				queuePinnedHostWrite(pinnedWorkspaceIds, workspaceGroups);
			}, [pinnedWorkspaceIds, workspaceGroups]);
			(0, react.useEffect)(() => {
				let alive = true;
				const local = {
					pinnedWorkspaceIds: [...pinnedWorkspaceIdsRef.current],
					workspaceGroups: workspaceGroupsRef.current
				};
				readHostPinnedWorkspaceIds().then((host) => {
					if (!alive) return;
					const dirty = pinnedHostDirtyRef.current ? {
						pinnedWorkspaceIds: pinnedWorkspaceIdsRef.current,
						workspaceGroups: workspaceGroupsRef.current
					} : void 0;
					const hydration = resolveWorkspacePreferencesHydration(local, host, dirty, workspaceGroupsPendingHostSyncRef.current);
					const baseline = workspaceBaselineRef.current;
					const ids = baseline.ready ? prunePinnedWorkspaceIds(hydration.pinnedWorkspaceIds, baseline.validIds) : hydration.pinnedWorkspaceIds;
					const groups = baseline.ready ? pruneWorkspaceGroups(hydration.workspaceGroups, baseline.validIds) : hydration.workspaceGroups;
					const writeHost = hydration.writeHost || !sameIds(ids, hydration.pinnedWorkspaceIds) || !sameWorkspaceGroups(groups, hydration.workspaceGroups);
					pinnedHostSupportsWorkspaceGroupsRef.current = host.workspaceGroupsSupported !== false;
					workspaceGroupsPendingHostSyncRef.current = workspaceGroupsPendingHostSyncRef.current || host.workspaceGroupsSupported === false && groups.length > 0 || !host.exists && local.workspaceGroups.length > 0;
					pinnedHostHydratedRef.current = true;
					if (!sameIds(pinnedWorkspaceIdsRef.current, ids) || !sameWorkspaceGroups(workspaceGroupsRef.current, groups)) {
						pinnedHostSkipWriteRef.current = {
							pinnedWorkspaceIds: [...ids],
							workspaceGroups: groups
						};
						pinnedWorkspaceIdsRef.current = ids;
						workspaceGroupsRef.current = groups;
						setPinnedWorkspaceIdsState(ids);
						setWorkspaceGroupsState(groups);
					}
					savePinnedWorkspaceIds(storage$1(), ids);
					if (writeHost) queuePinnedHostWrite(ids, groups);
				}).catch((reason) => {
					if (!alive) return;
					setPreferencesFailure(reason);
					pinnedHostHydratedRef.current = true;
				});
				return () => {
					alive = false;
				};
			}, []);
			(0, react.useEffect)(() => {
				writeSessionIds(storage$1(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds);
			}, [unreadSessionIds]);
			(0, react.useEffect)(() => {
				if (!baselinesReady) return;
				const validIds = workspaces.items.map((workspace) => String(workspace.workspaceId));
				const nextPinned = prunePinnedWorkspaceIds(pinnedWorkspaceIdsRef.current, validIds);
				const nextGroups = pruneWorkspaceGroups(workspaceGroupsRef.current, validIds);
				if (!sameIds(pinnedWorkspaceIdsRef.current, nextPinned)) {
					pinnedWorkspaceIdsRef.current = nextPinned;
					setPinnedWorkspaceIdsState(nextPinned);
				}
				if (!sameWorkspaceGroups(workspaceGroupsRef.current, nextGroups)) {
					workspaceGroupsRef.current = nextGroups;
					setWorkspaceGroupsState(nextGroups);
				}
			}, [baselinesReady, workspaces.items]);
			(0, react.useEffect)(() => {
				if (selectedId !== void 0) setUnreadSessionIds((ids) => ids.filter((id) => id !== selectedId));
			}, [selectedId]);
			(0, react.useEffect)(() => {
				const next = sessionRunningFlags(sessions.byId, sessionStatus);
				const previous = previousSessionRunningRef.current;
				previousSessionRunningRef.current = next;
				if (previous === void 0) return;
				const completed = completedBackgroundSessionIds(previous, next, selectedId);
				if (completed.length > 0) setUnreadSessionIds((ids) => [...completed, ...ids.filter((id) => !completed.includes(id))]);
			}, [
				selectedId,
				sessionStatus,
				sessions.byId
			]);
			const groups = (0, react.useMemo)(() => {
				const archived = workspaces.archivedSessionIds;
				const visible = (ids) => pinnedFirstSessionIds(visibleSessionIds(ids, sessions.byId, archived), workspaces.pinnedSessionIds);
				return { items: workspaces.items.map((workspace) => ({
					...workspace,
					visibleIds: visible(workspace.sessionIds)
				})) };
			}, [
				sessions.byId,
				sessions.ids,
				workspaces.archivedSessionIds,
				workspaces.items,
				workspaces.pinnedSessionIds
			]);
			const pinCapable = pinSession !== void 0 && unpinSession !== void 0;
			const pinnedSet = (0, react.useMemo)(() => new Set(workspaces.pinnedSessionIds ?? []), [workspaces.pinnedSessionIds]);
			const togglePin = (sessionId) => {
				if (pinSession === void 0 || unpinSession === void 0) return;
				run("pin", () => pinnedSet.has(sessionId) ? unpinSession(sessionId) : pinSession(sessionId));
			};
			const sourceWorkspaceIdForSession = (sessionId) => {
				if (sessionDrag?.sessionId === sessionId && sessionDrag.workspaceId !== "") return sessionDrag.workspaceId;
				const source = groups.items.find((workspace) => workspace.sessionIds.some((id) => String(id) === sessionId));
				return source === void 0 ? void 0 : String(source.workspaceId);
			};
			(0, react.useEffect)(() => {
				const onPointerDown = () => {
					if (headerMenuRef.current !== void 0) headerMenuPointerAt.current = performance.now();
				};
				window.addEventListener("pointerdown", onPointerDown, true);
				return () => {
					window.removeEventListener("pointerdown", onPointerDown, true);
				};
			}, []);
			(0, react.useEffect)(() => {
				const onProject = (event) => {
					const detail = event.detail;
					const current = selectedId;
					const workspace = groups.items.find((item) => current !== void 0 && item.visibleIds.includes(String(current)));
					if (workspace === void 0 || detail === void 0) return;
					if (detail.toggle === true && isShowing("workspace", workspace.workspaceId)) {
						dismissTip();
						return;
					}
					showTip({
						kind: "workspace",
						id: workspace.workspaceId,
						title: workspace.title,
						path: workspace.path,
						count: workspace.visibleIds.length,
						unreadCount: workspace.visibleIds.filter((id) => rowUnread(String(id))).length,
						pinned: pinnedWorkspaceIds.includes(String(workspace.workspaceId)),
						left: detail.left,
						top: detail.top
					}, { immediate: true });
				};
				const onMenu = (event) => {
					const detail = event.detail;
					const current = selectedId;
					if (current === void 0 || detail === void 0) return;
					dismissTip();
					if (performance.now() - headerMenuPointerAt.current < 500) {
						headerMenuPointerAt.current = 0;
						setHeaderMenu(void 0);
						return;
					}
					setHeaderMenu({
						id: current,
						getRect: detail.getRect
					});
				};
				window.addEventListener(HEADER_PROJECT_TIP_EVENT, onProject);
				window.addEventListener(HEADER_SESSION_MENU_EVENT, onMenu);
				return () => {
					window.removeEventListener(HEADER_PROJECT_TIP_EVENT, onProject);
					window.removeEventListener(HEADER_SESSION_MENU_EVENT, onMenu);
				};
			}, [
				groups.items,
				menu,
				pinnedWorkspaceIds,
				selectedId,
				unreadSessionIds
			]);
			const projectPinned = (id) => pinnedWorkspaceIds.includes(String(id));
			const pinnedGroups = orderByIds(groups.items, pinnedWorkspaceIds, (workspace) => String(workspace.workspaceId));
			const regularGroups = groups.items.filter((workspace) => !projectPinned(workspace.workspaceId));
			const pinDragActive = workspaceDragId !== void 0;
			const pinnedGroupIds = pinnedGroups.map((workspace) => String(workspace.workspaceId));
			const regularGroupIds = regularGroups.map((workspace) => String(workspace.workspaceId));
			const groupedIds = new Set(groupedWorkspaceIds(workspaceGroups));
			const workspaceGroupIds = workspaceGroups.map((group) => group.id);
			const ungroupedGroups = regularGroups.filter((workspace) => !groupedIds.has(String(workspace.workspaceId)));
			const ungroupedGroupIds = ungroupedGroups.map((workspace) => String(workspace.workspaceId));
			const workspaceById = new Map(regularGroups.map((workspace) => [String(workspace.workspaceId), workspace]));
			const pinnedHeaderDrop = workspaceDropTarget?.zone === "pinned" && workspaceDropTarget.beforeId === pinnedGroupIds[0] ? pinnedHeaderDropIndicator(pinnedGroupIds) : void 0;
			const assignedIds = workspaces.items.flatMap((workspace) => workspace.sessionIds.map((id) => String(id)));
			const recentIds = (0, react.useMemo)(() => pinnedFirstSessionIds(ungroupedSessionIds(sessions.ids ?? Object.keys(sessions.byId), sessions.byId, assignedIds, workspaces.archivedSessionIds).sort((left, right) => (sessions.byId[right]?.updatedAt ?? 0) - (sessions.byId[left]?.updatedAt ?? 0)), workspaces.pinnedSessionIds), [
				sessions.ids,
				sessions.byId,
				workspaces.items,
				workspaces.archivedSessionIds,
				workspaces.pinnedSessionIds
			]);
			const run = async (key, action) => {
				if (busyRef.current !== void 0) return;
				busyRef.current = key;
				setBusy(key);
				setError(void 0);
				try {
					await action();
					setMenu(void 0);
				} catch (reason) {
					setError(userErrorText(reason, t));
				} finally {
					busyRef.current = void 0;
					setBusy(void 0);
				}
			};
			const beginRename = (kind, id, title) => {
				setRenameTarget({
					kind,
					id,
					title
				});
				setRenameDraft(title);
				setMenu(void 0);
			};
			const submitRename = () => {
				if (renameTarget === void 0 || renameDraft.trim() === "") return;
				run("rename", async () => {
					if (renameTarget.kind === "workspace") await renameWorkspace(renameTarget.id, renameDraft.trim());
					else await renameSession(renameTarget.id, renameDraft.trim());
					setRenameTarget(void 0);
				});
			};
			const submitDelete = () => {
				if (deleteTarget === void 0) return;
				const target = deleteTarget;
				const operation = target.kind === "session" ? "delete-session" : "delete-workspace";
				run(operation, async () => {
					if (target.kind === "session") {
						await deleteSession(target.id);
						setUnreadSessionIds((ids) => ids.filter((id) => id !== target.id));
					} else {
						await deleteWorkspace(target.id);
						setPinnedWorkspaceIds((ids) => ids.filter((id) => id !== target.id));
					}
					setDeleteTarget(void 0);
				});
			};
			const submitArchiveWorkspace = () => {
				if (archiveWorkspaceTarget === void 0) return;
				const target = archiveWorkspaceTarget;
				run("archive-workspace", async () => {
					await archiveWorkspaceSessions(target.sessionIds, (sessionId) => archiveSession(sessionId));
					setUnreadSessionIds((ids) => ids.filter((id) => !target.sessionIds.includes(id)));
					setArchiveWorkspaceTarget(void 0);
				});
			};
			const copy = (value) => {
				if (value === void 0 || value === "") return;
				run("copy", async () => {
					await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(value);
				});
			};
			const openPathImmediately = (path) => {
				setMenu(void 0);
				setHeaderMenu(void 0);
				run("open-path", () => openPath(path));
			};
			const toggleGroup = (key, defaultOpen = true) => {
				setExpanded((current) => ({
					...current,
					[key]: !(current[key] ?? defaultOpen)
				}));
			};
			const toggleProject = (expandKey, id) => {
				if (expanded[expandKey] ?? true) setSessionWindows((current) => ({
					...current,
					[id]: collapseProjectSessionWindow()
				}));
				toggleGroup(expandKey, true);
			};
			const submitCreateGroup = () => {
				if (groupTitleDraft.trim() === "") return;
				try {
					setWorkspaceGroups((current) => createWorkspaceGroup(current, {
						id: newWorkspaceGroupId(),
						title: groupTitleDraft
					}));
					setCreateGroupOpen(false);
					setGroupTitleDraft("");
				} catch (reason) {
					setError(userErrorText(reason, t));
				}
			};
			const closeRenameGroup = () => {
				setRenameGroupId(void 0);
				setRenameGroupDraft("");
				setRenameGroupError(void 0);
				const trigger = groupActionTriggerRef.current;
				const focusTarget = trigger?.isConnected ? trigger : projectsSectionButtonRef.current;
				groupActionTriggerRef.current = void 0;
				focusTarget?.focus();
			};
			const submitRenameGroup = () => {
				if (renameGroupId === void 0 || renameGroupDraft.trim() === "") return;
				if (workspaceGroupsRef.current.find((group) => group.id === renameGroupId)?.title === renameGroupDraft.trim()) {
					closeRenameGroup();
					return;
				}
				try {
					setWorkspaceGroups((current) => renameWorkspaceGroup(current, renameGroupId, renameGroupDraft));
					closeRenameGroup();
				} catch (reason) {
					setRenameGroupError(userErrorText(reason, t));
				}
			};
			const sectionOpen = (id) => expanded[`section:${id}`] ?? true;
			const toggleSection = (id) => {
				setExpanded((current) => ({
					...current,
					[`section:${id}`]: !(current[`section:${id}`] ?? true)
				}));
			};
			const workspaceGroupIdFor = (workspaceId) => workspaceGroups.find((group) => group.workspaceIds.includes(workspaceId))?.id;
			const moveWorkspaceToGroup = (workspaceId, groupId) => {
				setWorkspaceGroups((current) => assignWorkspaceToGroup(current, workspaceId, groupId));
				if (pinnedWorkspaceIdsRef.current.includes(workspaceId)) setPinnedWorkspaceIds((ids) => ids.filter((id) => id !== workspaceId));
			};
			const projectMenu = (workspace) => {
				const workspaceId = String(workspace.workspaceId);
				const moveTargets = workspaceGroupMoveTargets(workspaceGroups, workspaceId).map((target) => ({
					id: workspaceGroupMoveActionId(target.groupId),
					label: target.title ?? t("workspace.removeFromGroup"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, { size: 16 })
				}));
				return [
					{
						id: "pin",
						label: t(projectPinned(workspace.workspaceId) ? "workspace.unpin" : "workspace.pin"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {})
					},
					{
						id: "rename",
						label: t("workspace.rename"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconRename, { size: 16 })
					},
					{
						type: "separator",
						id: "project-main-separator"
					},
					{
						id: "moveToGroup",
						label: t("workspace.moveToGroup"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, { size: 16 }),
						disabled: moveTargets.length === 0,
						submenu: moveTargets
					},
					{
						id: "openPath",
						label: t("workspace.openPath"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolderOpen, { size: 16 })
					},
					{
						type: "separator",
						id: "project-archive-separator"
					},
					{
						id: "archiveWorkspace",
						label: t("workspace.archive"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconArchive, { size: 16 }),
						disabled: workspace.visibleIds.length === 0
					},
					{
						type: "separator",
						id: "project-delete-separator"
					},
					{
						id: "delete",
						label: t("workspace.delete"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconDelete, { size: 16 }),
						danger: true
					}
				];
			};
			const handleProjectMenuAction = (workspace, id) => {
				if (busy !== void 0) return;
				const workspaceId = String(workspace.workspaceId);
				const targetGroup = workspaceGroups.find((group) => id === workspaceGroupMoveActionId(group.id));
				if (targetGroup !== void 0 || id === workspaceGroupMoveActionId()) {
					moveWorkspaceToGroup(workspaceId, targetGroup?.id);
					setMenu(void 0);
					return;
				}
				if (id === "rename") beginRename("workspace", workspace.workspaceId, workspace.title);
				if (id === "pin") {
					setPinnedWorkspaceIds((ids) => togglePinnedWorkspace(ids, workspace.workspaceId));
					setMenu(void 0);
				}
				if (id === "archiveWorkspace") {
					setArchiveWorkspaceTarget({
						id: workspaceId,
						title: workspace.title,
						sessionIds: [...workspace.visibleIds]
					});
					setError(void 0);
					setMenu(void 0);
				}
				if (id === "openPath") openPathImmediately(workspace.path);
				if (id === "delete") {
					setDeleteTarget({
						id: workspace.workspaceId,
						kind: "workspace",
						title: workspace.title
					});
					setError(void 0);
					setMenu(void 0);
				}
			};
			const canDelete = canDeleteSession?.() === true;
			const sessionMenu = (sessionId, path) => sessionMenuItems(t, {
				unread: rowUnread(sessionId),
				path,
				includePath: true,
				moveTargets: sessionMoveTargets(groups.items, sessionId).map((target) => ({
					...target,
					id: moveSessionActionId(target.id)
				})),
				canDelete,
				pinned: pinCapable ? pinnedSet.has(sessionId) : void 0,
				shortcutOf
			});
			const requestSessionMove = (sessionId, targetWorkspaceId) => {
				const targetWorkspace = groups.items.find((workspace) => String(workspace.workspaceId) === targetWorkspaceId);
				const session = sessions.byId[sessionId];
				if (targetWorkspace === void 0 || session === void 0) {
					setError(t("sessions.moveNotFound"));
					return;
				}
				setMenu(void 0);
				setHeaderMenu(void 0);
				setError(void 0);
				setSessionMoveTarget({
					sessionId,
					sessionTitle: session.displayTitle,
					targetWorkspaceId,
					targetWorkspaceTitle: targetWorkspace.title,
					targetPath: targetWorkspace.path
				});
			};
			const runSessionMoveAction = (action, sessionId) => {
				const targetWorkspaceId = parseMoveSessionActionId(action);
				if (targetWorkspaceId === void 0) return false;
				requestSessionMove(sessionId, targetWorkspaceId);
				return true;
			};
			const submitSessionMove = () => {
				const target = sessionMoveTarget;
				if (target === void 0) return;
				run("session-move", async () => {
					const nextExpanded = expandedForSessionMove(expanded, {
						workspaceId: target.targetWorkspaceId,
						pinned: projectPinned(target.targetWorkspaceId),
						groupId: workspaceGroupIdFor(target.targetWorkspaceId),
						hasGroups: workspaceGroups.length > 0
					});
					setExpanded(nextExpanded);
					writeTreeExpansionState(storage$1(), WORKSPACE_EXPANSION_STORAGE_KEY, nextExpanded);
					await moveSession(target.sessionId, target.targetWorkspaceId);
					setSessionMoveTarget(void 0);
				});
			};
			const pinWorkspaceAt = (id, beforeId) => {
				setPinnedWorkspaceIds((ids) => insertPinnedWorkspace(ids, id, beforeId));
			};
			const renderGroup = (workspace, zone) => {
				const expandKey = zone === "pinned" ? `pin:${workspace.workspaceId}` : String(workspace.workspaceId);
				const isExpanded = expanded[expandKey] ?? true;
				const currentSessionId = selectedId;
				const folder = projectFolderPresentation(isExpanded, workspace.visibleIds.some((id) => id === currentSessionId));
				const shownIds = workspace.visibleIds;
				const menuOpen = menu?.type === "workspace" && menu.id === workspace.workspaceId;
				const menuAt = menuOpen && menu.x !== void 0 && menu.y !== void 0 ? {
					x: menu.x,
					y: menu.y
				} : void 0;
				const isPinnedHeaderDrop = zone === "pinned" && pinnedHeaderDrop?.kind === "workspace" && pinnedHeaderDrop.workspaceId === String(workspace.workspaceId);
				const workspaceId = String(workspace.workspaceId);
				const sessionWindow = projectSessionWindow(shownIds, sessionWindows[workspaceId] ?? {
					expanded: false,
					page: 1
				}, currentSessionId !== void 0 && shownIds.includes(currentSessionId) ? currentSessionId : void 0);
				const renderedIds = sessionWindow.ids;
				const dropAfterSessionId = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject !== true ? sessionDropAfterRowId(sessionDropTarget, renderedIds) : void 0;
				const zoneIds = zone === "pinned" ? pinnedGroupIds : regularGroupIds;
				const dropsBefore = workspaceDropTarget?.zone === zone && workspaceDropTarget.beforeId === workspaceId;
				const dropsAfterLast = zone === "projects" && workspaceDropTarget?.zone === zone && workspaceDropTarget.beforeId === void 0 && zoneIds[zoneIds.length - 1] === workspaceId;
				const projectSessionDrop = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject === true;
				const projectSessionMoveDrop = projectSessionDrop && sessionDropTarget.crossWorkspace === true;
				const handleProjectDragOver = (event) => {
					const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
					if (draggedWorkspace !== void 0) {
						event.preventDefault();
						event.stopPropagation();
						event.dataTransfer.dropEffect = "move";
						const rect = event.currentTarget.getBoundingClientRect();
						const beforeId = reorderDropBeforeId(zoneIds, draggedWorkspace, workspaceId, event.clientY > rect.top + rect.height / 2);
						setSessionDropTarget(void 0);
						setWorkspaceDropTarget(beforeId === null ? void 0 : {
							zone,
							beforeId
						});
						return;
					}
					const draggedSessionId = readSessionDrag(event.dataTransfer, sessionDrag?.sessionId);
					if (draggedSessionId === void 0) return;
					event.preventDefault();
					event.stopPropagation();
					event.dataTransfer.dropEffect = "move";
					const action = sessionDropAction(sourceWorkspaceIdForSession(draggedSessionId), workspaceId);
					setWorkspaceDropTarget(void 0);
					setSessionDropTarget({
						workspaceId,
						beforeId: action === "reorder" ? shownIds[0] : void 0,
						ontoProject: true,
						crossWorkspace: action === "move"
					});
				};
				const handleProjectDrop = (event) => {
					const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
					if (draggedWorkspace !== void 0) {
						event.preventDefault();
						event.stopPropagation();
						const rect = event.currentTarget.getBoundingClientRect();
						const beforeId = reorderDropBeforeId(zoneIds, draggedWorkspace, workspaceId, event.clientY > rect.top + rect.height / 2);
						setWorkspaceDragId(void 0);
						setWorkspaceDropTarget(void 0);
						if (beforeId === null) return;
						if (zone === "pinned") {
							pinWorkspaceAt(draggedWorkspace, beforeId);
							return;
						}
						const hostIds = groups.items.map((item) => String(item.workspaceId));
						if (moveBefore(hostIds, draggedWorkspace, beforeId).some((id, index) => id !== hostIds[index])) run("workspace-order", () => insertWorkspaceBefore(draggedWorkspace, beforeId));
						return;
					}
					const draggedSessionId = readSessionDrag(event.dataTransfer, sessionDrag?.sessionId);
					if (draggedSessionId === void 0) return;
					event.preventDefault();
					event.stopPropagation();
					const action = sessionDropAction(sourceWorkspaceIdForSession(draggedSessionId), workspaceId);
					setSessionDrag(void 0);
					setSessionDropTarget(void 0);
					setWorkspaceDropTarget(void 0);
					if (action === "move") {
						requestSessionMove(draggedSessionId, workspaceId);
						return;
					}
					run("session-order", () => insertSessionBefore(workspace.workspaceId, draggedSessionId, shownIds[0]));
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `dcu-wb-project${isPinnedHeaderDrop || dropsBefore ? " dcu-wb-drop" : ""}${dropsAfterLast ? " dcu-wb-drop dcu-wb-drop-after" : ""}${projectSessionDrop ? " dcu-wb-session-drop" : ""}${projectSessionMoveDrop ? " dcu-wb-session-move-drop" : ""}`,
					onDragOver: handleProjectDragOver,
					onDragLeave: (event) => {
						if (event.currentTarget.contains(event.relatedTarget)) return;
						setWorkspaceDropTarget(void 0);
						setSessionDropTarget(void 0);
					},
					onDrop: handleProjectDrop,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `dcu-wb-project-head${menuOpen ? " dcu-wb-menu-open" : ""}${workspaceDragId === workspaceId ? " dcu-wb-dragging" : ""}`,
						role: "treeitem",
						"aria-expanded": isExpanded,
						draggable: true,
						onDragStart: (event) => {
							event.stopPropagation();
							setSessionDrag(void 0);
							setSessionDropTarget(void 0);
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
							writeWorkspaceDrag(event.dataTransfer, workspaceId, workspace.title);
							setDragPreview(event.dataTransfer, workspace.title, event.currentTarget.querySelector(".dcu-wb-folder"));
							setWorkspaceDragId(workspaceId);
						},
						onDragEnd: () => {
							setWorkspaceDragId(void 0);
							setWorkspaceDropTarget(void 0);
							setWorkspaceGroupDropTarget(void 0);
						},
						onClick: () => {
							toggleProject(expandKey, workspaceId);
						},
						onContextMenu: (event) => {
							event.preventDefault();
							event.stopPropagation();
							dismissTip();
							setMenu({
								id: workspace.workspaceId,
								type: "workspace",
								x: event.clientX,
								y: event.clientY
							});
						},
						onMouseEnter: (event) => {
							const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
							showTip({
								kind: "workspace",
								id: workspace.workspaceId,
								title: workspace.title,
								path: workspace.path,
								count: workspace.visibleIds.length,
								unreadCount: workspace.visibleIds.filter((id) => rowUnread(String(id))).length,
								pinned: projectPinned(workspace.workspaceId),
								left: box.left,
								top: box.top
							});
						},
						onMouseLeave: hideTip,
						onKeyDown: (event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								toggleProject(expandKey, workspaceId);
							}
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `dcu-wb-folder${folder.current ? " dcu-wb-folder-current" : ""}`,
								onClick: (event) => {
									event.stopPropagation();
									const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
									if (isShowing("workspace", workspace.workspaceId)) {
										dismissTip();
										return;
									}
									showTip({
										kind: "workspace",
										id: workspace.workspaceId,
										title: workspace.title,
										path: workspace.path,
										count: workspace.visibleIds.length,
										unreadCount: workspace.visibleIds.filter((id) => rowUnread(String(id))).length,
										pinned: projectPinned(workspace.workspaceId),
										left: box.left,
										top: box.top
									}, { immediate: true });
								},
								children: folder.open ? folder.current ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolderOpen, {
									size: 16,
									strokeWidth: 1.5
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolderOpen, {
									size: 16,
									strokeWidth: 1.5
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, {
									size: 16,
									strokeWidth: 1.5
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-project-title",
								children: workspace.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-actions",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
									open: menuOpen,
									onClose: () => {
										setMenu(void 0);
									},
									items: projectMenu(workspace),
									onSelect: (id) => {
										handleProjectMenuAction(workspace, id);
									},
									portal: true,
									dense: true,
									compact: true,
									getAnchorRect: menuAt === void 0 ? void 0 : () => pointerMenuRect(menuAt.x, menuAt.y),
									anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dcu-wb-more",
										"aria-label": t("workspace.actions", { name: workspace.title }),
										onClick: (event) => {
											event.stopPropagation();
											dismissTip();
											setMenu((current) => current?.id === workspace.workspaceId && current?.type === "workspace" ? void 0 : {
												id: workspace.workspaceId,
												type: "workspace"
											});
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconMore, { size: 16 })
									})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dcu-wb-actions",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-wb-more",
									"aria-label": t("workspace.newSession"),
									"aria-keyshortcuts": shortcutOf("session.new")?.aria,
									onClick: (event) => {
										event.stopPropagation();
										startSession(workspace.workspaceId);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewSessionIcon, {})
								})
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DisclosureBody, {
						className: "dcu-wb-project-body",
						open: isExpanded,
						role: "group",
						children: [
							shownIds.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-nochat",
								children: t("workspace.noChat")
							}),
							renderedIds.map((id) => {
								const session = sessions.byId[id];
								if (session === void 0) return null;
								const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, legacyPendingInteraction(session));
								const path = session.cwd ?? workspace.path;
								const selected = selectedId === id;
								const sessionMenuOpen = menu?.type === "session" && menu.id === id;
								const sessionMenuAt = sessionMenuOpen && menu.x !== void 0 && menu.y !== void 0 ? {
									x: menu.x,
									y: menu.y
								} : void 0;
								const dropsBeforeSession = sessionDropTarget?.workspaceId === workspaceId && sessionDropTarget.ontoProject !== true && sessionDropTarget.beforeId === id;
								const dropsAfterLastSession = dropAfterSessionId !== void 0 && id === dropAfterSessionId;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-dcu-session": id,
									"data-pinned": pinnedSet.has(id) ? "true" : void 0,
									className: `dcu-wb-session${selected ? " dcu-wb-selected" : ""}${sessionMenuOpen ? " dcu-wb-menu-open" : ""}${dropsBeforeSession ? " dcu-wb-drop" : ""}${dropsAfterLastSession ? " dcu-wb-drop dcu-wb-drop-after" : ""}${archiveConfirm.confirmingId === id ? " dcu-wb-archive-confirming" : ""}`,
									role: "treeitem",
									"aria-selected": selected,
									draggable: true,
									onDragStart: (event) => {
										event.stopPropagation();
										setWorkspaceDragId(void 0);
										setWorkspaceDropTarget(void 0);
										setWorkspaceGroupDragId(void 0);
										setWorkspaceGroupDropTarget(void 0);
										writeSessionDrag(event.dataTransfer, id, session.displayTitle);
										setDragPreview(event.dataTransfer, session.displayTitle);
										setSessionDrag({
											sessionId: id,
											workspaceId
										});
									},
									onDragEnd: () => {
										setSessionDrag(void 0);
										setSessionDropTarget(void 0);
										setWorkspaceGroupDropTarget(void 0);
									},
									onDragOver: (event) => {
										const drag = sessionDrag;
										if (drag === void 0 || drag.workspaceId !== workspaceId) return;
										event.preventDefault();
										event.stopPropagation();
										event.dataTransfer.dropEffect = "move";
										const rect = event.currentTarget.getBoundingClientRect();
										const beforeId = reorderDropBeforeId(shownIds, drag.sessionId, id, event.clientY > rect.top + rect.height / 2);
										setSessionDropTarget(beforeId === null ? void 0 : {
											workspaceId,
											beforeId,
											hoveredId: id
										});
									},
									onDragLeave: (event) => {
										if (event.currentTarget.contains(event.relatedTarget)) return;
										setSessionDropTarget(void 0);
									},
									onDrop: (event) => {
										const drag = sessionDrag;
										if (drag === void 0 || drag.workspaceId !== workspaceId) return;
										event.preventDefault();
										event.stopPropagation();
										const rect = event.currentTarget.getBoundingClientRect();
										setSessionDrag(void 0);
										setSessionDropTarget(void 0);
										const beforeId = reorderDropBeforeId(shownIds, drag.sessionId, id, event.clientY > rect.top + rect.height / 2);
										if (beforeId !== null) run("session-order", () => insertSessionBefore(workspace.workspaceId, drag.sessionId, beforeId));
									},
									onClick: () => {
										setUnreadSessionIds((ids) => ids.filter((item) => item !== id));
										openSession(id);
									},
									tabIndex: 0,
									onKeyDown: (event) => {
										if (event.target !== event.currentTarget) return;
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											setUnreadSessionIds((ids) => ids.filter((item) => item !== id));
											openSession(id);
										}
									},
									onContextMenu: (event) => {
										event.preventDefault();
										event.stopPropagation();
										dismissTip();
										setMenu({
											id,
											type: "session",
											x: event.clientX,
											y: event.clientY
										});
									},
									onMouseEnter: (event) => {
										const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
										const branch = optionalText(session, "branch");
										showTip({
											kind: "session",
											id,
											title: session.displayTitle,
											project: workspace.title,
											path,
											branch,
											time: formatHoverTime(session.updatedAt, t, now),
											left: box.left,
											top: box.top
										});
									},
									onMouseLeave: hideTip,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRowTitle, { title: session.displayTitle }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionState, {
											pendingInteraction,
											unread: rowUnread(id),
											running: rowRunning(id, session),
											t
										}),
										pinCapable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionPinButton, {
											pinned: pinnedSet.has(id),
											label: t(pinnedSet.has(id) ? "sessions.unpin" : "sessions.pin"),
											onToggle: () => {
												togglePin(id);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionTime, { time: formatCompactTime(session.updatedAt, t, now) }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-quick-actions",
											children: archiveConfirm.confirmingId === id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dcu-wb-confirm",
												onMouseDown: (event) => {
													event.preventDefault();
													event.stopPropagation();
												},
												onClick: (event) => {
													event.stopPropagation();
													if (archiveConfirm.press(id)) run("archive", () => archiveSession(id));
												},
												children: t("sessions.confirm")
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dcu-wb-more",
												"aria-label": t("sessions.archive"),
												onMouseDown: (event) => {
													event.preventDefault();
													event.stopPropagation();
												},
												onClick: (event) => {
													event.stopPropagation();
													if (archiveConfirm.press(id)) run("archive", () => archiveSession(id));
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuickArchiveIcon, {})
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-actions",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
												open: sessionMenuOpen,
												onClose: () => {
													setMenu(void 0);
												},
												items: sessionMenu(id, path),
												onSelect: (action) => {
													if (busy !== void 0 || runSessionMoveAction(action, id)) return;
													if (action === "pin") togglePin(id);
													if (action === "rename") beginRename("session", id, session.displayTitle);
													if (action === "unread") {
														setUnreadSessionIds((ids) => toggleSessionId(ids, id));
														setMenu(void 0);
													}
													if (action === "archive") run("archive", () => archiveSession(id));
													if (action === "delete") {
														setDeleteTarget({
															id,
															kind: "session",
															title: session.displayTitle
														});
														setError(void 0);
														setMenu(void 0);
													}
													if (action === "fork") run("fork", () => forkSession(id));
													if (action === "openPath" && path !== void 0) openPathImmediately(path);
													if (action === "copyPath") copy(path);
													if (action === "copyTitle") copy(session.displayTitle);
													if (action === "copyId") copy(id);
												},
												portal: true,
												dense: true,
												compact: true,
												getAnchorRect: sessionMenuAt === void 0 ? void 0 : () => pointerMenuRect(sessionMenuAt.x, sessionMenuAt.y),
												anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: "dcu-wb-more dcu-wb-context-anchor",
													"aria-label": t("sessions.actions", { name: session.displayTitle }),
													onClick: (event) => {
														event.stopPropagation();
														setMenu((current) => current?.id === id && current?.type === "session" ? void 0 : {
															id,
															type: "session"
														});
													},
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconMore, { size: 16 })
												})
											})
										})
									]
								}, id);
							}),
							sessionWindow.showMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-session-more",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: (event) => {
										event.stopPropagation();
										revealMoreSessions(workspaceId);
									},
									children: t("workspace.showMore")
								})
							})
						]
					})]
				}, workspace.workspaceId);
			};
			const renderWorkspaceCollection = (group) => {
				const groupId = group.id;
				const expandKey = `workspace-group:${group.id}`;
				const isExpanded = expanded[expandKey] ?? true;
				const members = group.workspaceIds.flatMap((id) => {
					const workspace = workspaceById.get(id);
					return workspace === void 0 ? [] : [workspace];
				});
				const memberIds = members.map((workspace) => String(workspace.workspaceId));
				const groupWorkspaceMoveDrop = workspaceDropTarget?.zone === "group" && workspaceDropTarget.groupId === group.id && workspaceDropTarget.crossGroup === true;
				const groupOrderDrop = workspaceGroupDropTarget?.beforeId === groupId;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `dcu-wb-collection${groupOrderDrop ? " dcu-wb-group-order-drop" : ""}${groupWorkspaceMoveDrop ? " dcu-wb-workspace-move-drop" : ""}`,
					onDragOver: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							event.dataTransfer.dropEffect = "move";
							setWorkspaceDropTarget(void 0);
							const rect = event.currentTarget.querySelector(":scope > .dcu-wb-collection-head")?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
							const beforeId = reorderDropBeforeId(workspaceGroupIds, draggedGroupId, groupId, event.clientY > rect.top + rect.height / 2);
							setWorkspaceGroupDropTarget(beforeId === null ? void 0 : { beforeId });
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						event.dataTransfer.dropEffect = "move";
						setWorkspaceGroupDropTarget(void 0);
						if (workspaceGroupIdFor(dragged) === groupId) {
							const lastId = memberIds[memberIds.length - 1];
							const beforeId = lastId === void 0 ? null : reorderDropBeforeId(memberIds, dragged, lastId, true);
							setWorkspaceDropTarget(beforeId === null ? void 0 : {
								zone: "group",
								groupId,
								beforeId
							});
							return;
						}
						setWorkspaceDropTarget({
							zone: "group",
							groupId,
							ontoGroup: true,
							crossGroup: true
						});
					},
					onDragLeave: (event) => {
						if (event.currentTarget.contains(event.relatedTarget)) return;
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroupDropTarget(void 0);
					},
					onDrop: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							const rect = event.currentTarget.querySelector(":scope > .dcu-wb-collection-head")?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
							const beforeId = reorderDropBeforeId(workspaceGroupIds, draggedGroupId, groupId, event.clientY > rect.top + rect.height / 2);
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
							if (beforeId !== null) setWorkspaceGroups((current) => moveWorkspaceGroup(current, draggedGroupId, beforeId));
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						setWorkspaceDragId(void 0);
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroups((current) => current.find((candidate) => candidate.workspaceIds.includes(dragged))?.id === groupId ? moveWorkspaceGroupMember(current, dragged, groupId) : assignWorkspaceToGroup(current, dragged, groupId));
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `dcu-wb-collection-head${workspaceGroupDragId === groupId ? " dcu-wb-dragging" : ""}`,
						role: "treeitem",
						"aria-expanded": isExpanded,
						onClick: () => {
							toggleGroup(expandKey, true);
						},
						onKeyDown: (event) => {
							if (event.target !== event.currentTarget) return;
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								toggleGroup(expandKey, true);
							}
						},
						draggable: true,
						onDragStart: (event) => {
							event.stopPropagation();
							setSessionDrag(void 0);
							setSessionDropTarget(void 0);
							setWorkspaceDragId(void 0);
							setWorkspaceDropTarget(void 0);
							setWorkspaceGroupDropTarget(void 0);
							writeWorkspaceGroupDrag(event.dataTransfer, groupId, group.title);
							setDragPreview(event.dataTransfer, group.title);
							setWorkspaceGroupDragId(groupId);
						},
						onDragEnd: () => {
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dcu-wb-collection-label",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-section-caret",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										viewBox: "0 0 16 16",
										width: "12",
										height: "12",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											d: "M6.25 4.25 10.25 8 6.25 11.75",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round",
											strokeLinejoin: "round"
										})
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-collection-title",
									children: group.title
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-collection-count",
									children: members.length
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-collection-actions",
							onClick: (event) => {
								event.stopPropagation();
							},
							onDragStart: (event) => {
								event.preventDefault();
								event.stopPropagation();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: groupMenuId === groupId,
								onClose: () => {
									setGroupMenuId(void 0);
								},
								items: [
									{
										id: "rename",
										label: t("workspace.renameGroup"),
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconRename, { size: 16 })
									},
									{
										type: "separator",
										id: "group-delete-separator"
									},
									{
										id: "delete",
										label: t("workspace.deleteGroupAction"),
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconDelete, { size: 16 }),
										danger: true
									}
								],
								onSelect: (action) => {
									setGroupMenuId(void 0);
									if (action === "rename") {
										setRenameGroupId(groupId);
										setRenameGroupDraft(group.title);
										setRenameGroupError(void 0);
									}
									if (action === "delete") setDeleteGroupId(groupId);
								},
								portal: true,
								dense: true,
								compact: true,
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-wb-more",
									draggable: false,
									"aria-haspopup": "menu",
									"aria-expanded": groupMenuId === groupId,
									"aria-label": t("workspace.groupActions", { name: group.title }),
									title: t("workspace.groupActions", { name: group.title }),
									onClick: (event) => {
										groupActionTriggerRef.current = event.currentTarget;
										setGroupMenuId((current) => current === groupId ? void 0 : groupId);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconMore, { size: 16 })
								})
							})
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DisclosureBody, {
						className: "dcu-wb-collection-body",
						open: isExpanded,
						role: "group",
						children: [members.map((workspace) => {
							const workspaceId = String(workspace.workspaceId);
							const preciseTarget = workspaceDropTarget?.zone === "group" && workspaceDropTarget.groupId === groupId && workspaceDropTarget.ontoGroup !== true && workspaceDropTarget.crossGroup !== true;
							const orderDrop = preciseTarget && workspaceDropTarget.beforeId === workspaceId;
							const orderDropAfter = preciseTarget && workspaceDropTarget.beforeId === void 0 && memberIds[memberIds.length - 1] === workspaceId;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								"data-dcu-group-member": true,
								className: `dcu-wb-group-member${orderDrop ? " dcu-wb-drop" : ""}${orderDropAfter ? " dcu-wb-drop dcu-wb-drop-after" : ""}`,
								onDragOverCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									event.dataTransfer.dropEffect = "move";
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(memberIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDropTarget(beforeId === null ? void 0 : {
										zone: "group",
										groupId,
										beforeId,
										crossGroup: workspaceGroupIdFor(dragged) !== groupId
									});
								},
								onDropCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(memberIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDragId(void 0);
									setWorkspaceDropTarget(void 0);
									if (beforeId === null) return;
									setWorkspaceGroups((current) => current.find((candidate) => candidate.workspaceIds.includes(dragged))?.id === groupId ? moveWorkspaceGroupMember(current, dragged, groupId, beforeId) : placeWorkspaceInGroup(current, dragged, groupId, beforeId));
								},
								children: renderGroup(workspace, "projects")
							}, workspaceId);
						}), members.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-empty",
							children: t("workspace.empty")
						})]
					})]
				}, group.id);
			};
			const renderUngroupedCollection = () => {
				const ungroupedExpandKey = "workspace-group:ungrouped";
				const ungroupedExpanded = expanded[ungroupedExpandKey] ?? true;
				const ungroupedWorkspaceMoveDrop = workspaceDropTarget?.zone === "ungrouped" && workspaceDropTarget.crossGroup === true;
				const groupOrderDrop = workspaceGroupDropTarget !== void 0 && workspaceGroupDropTarget.beforeId === void 0;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `dcu-wb-ungrouped${groupOrderDrop ? " dcu-wb-group-order-drop" : ""}${ungroupedWorkspaceMoveDrop ? " dcu-wb-workspace-move-drop" : ""}`,
					onDragOver: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							event.dataTransfer.dropEffect = "move";
							setWorkspaceDropTarget(void 0);
							const lastGroupId = workspaceGroupIds[workspaceGroupIds.length - 1];
							const beforeId = lastGroupId === void 0 ? null : reorderDropBeforeId(workspaceGroupIds, draggedGroupId, lastGroupId, true);
							setWorkspaceGroupDropTarget(beforeId === null ? void 0 : { beforeId: void 0 });
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						event.dataTransfer.dropEffect = "move";
						setWorkspaceGroupDropTarget(void 0);
						if (workspaceGroupIdFor(dragged) === void 0) {
							const lastId = ungroupedGroupIds[ungroupedGroupIds.length - 1];
							const beforeId = lastId === void 0 ? null : reorderDropBeforeId(ungroupedGroupIds, dragged, lastId, true);
							setWorkspaceDropTarget(beforeId === null ? void 0 : {
								zone: "ungrouped",
								beforeId
							});
							return;
						}
						setWorkspaceDropTarget({
							zone: "ungrouped",
							ontoSection: true,
							crossGroup: true
						});
					},
					onDragLeave: (event) => {
						if (event.currentTarget.contains(event.relatedTarget)) return;
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroupDropTarget(void 0);
					},
					onDrop: (event) => {
						const draggedGroupId = readWorkspaceGroupDrag(event.dataTransfer, workspaceGroupDragId);
						if (draggedGroupId !== void 0) {
							event.preventDefault();
							event.stopPropagation();
							const lastGroupId = workspaceGroupIds[workspaceGroupIds.length - 1];
							const beforeId = lastGroupId === void 0 ? null : reorderDropBeforeId(workspaceGroupIds, draggedGroupId, lastGroupId, true);
							setWorkspaceGroupDragId(void 0);
							setWorkspaceGroupDropTarget(void 0);
							if (beforeId !== null) setWorkspaceGroups((current) => moveWorkspaceGroup(current, draggedGroupId));
							return;
						}
						const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
						if (dragged === void 0) return;
						event.preventDefault();
						event.stopPropagation();
						setWorkspaceDragId(void 0);
						setWorkspaceDropTarget(void 0);
						setWorkspaceGroups((current) => assignWorkspaceToGroup(current, dragged));
						run("workspace-order", () => insertWorkspaceBefore(dragged));
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-collection-head",
						role: "treeitem",
						"aria-expanded": ungroupedExpanded,
						onClick: () => {
							toggleGroup(ungroupedExpandKey, true);
						},
						onKeyDown: (event) => {
							if (event.target !== event.currentTarget) return;
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								toggleGroup(ungroupedExpandKey, true);
							}
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dcu-wb-collection-label",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-section-caret",
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										viewBox: "0 0 16 16",
										width: "12",
										height: "12",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											d: "M6.25 4.25 10.25 8 6.25 11.75",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "1.5",
											strokeLinecap: "round",
											strokeLinejoin: "round"
										})
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("workspace.ungrouped") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dcu-wb-collection-count",
									children: ungroupedGroups.length
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dcu-wb-collection-actions",
							"aria-hidden": "true"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DisclosureBody, {
						className: "dcu-wb-collection-body",
						open: ungroupedExpanded,
						role: "group",
						children: ungroupedGroups.map((workspace) => {
							const workspaceId = String(workspace.workspaceId);
							const preciseTarget = workspaceDropTarget?.zone === "ungrouped" && workspaceDropTarget.ontoSection !== true && workspaceDropTarget.crossGroup !== true;
							const orderDrop = preciseTarget && workspaceDropTarget.beforeId === workspaceId;
							const orderDropAfter = preciseTarget && workspaceDropTarget.beforeId === void 0 && ungroupedGroupIds[ungroupedGroupIds.length - 1] === workspaceId;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								"data-dcu-ungrouped-member": true,
								className: `dcu-wb-group-member dcu-wb-ungrouped-member${orderDrop ? " dcu-wb-drop" : ""}${orderDropAfter ? " dcu-wb-drop dcu-wb-drop-after" : ""}`,
								onDragOverCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									event.dataTransfer.dropEffect = "move";
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(ungroupedGroupIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDropTarget(beforeId === null ? void 0 : {
										zone: "ungrouped",
										beforeId,
										crossGroup: workspaceGroupIdFor(dragged) !== void 0
									});
								},
								onDropCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged === void 0) return;
									event.preventDefault();
									event.stopPropagation();
									const rect = event.currentTarget.getBoundingClientRect();
									const beforeId = reorderDropBeforeId(ungroupedGroupIds, dragged, workspaceId, event.clientY > rect.top + rect.height / 2);
									setWorkspaceDragId(void 0);
									setWorkspaceDropTarget(void 0);
									if (beforeId === null) return;
									if (groupedIds.has(dragged)) setWorkspaceGroups((current) => assignWorkspaceToGroup(current, dragged));
									run("workspace-order", () => insertWorkspaceBefore(dragged, beforeId));
								},
								children: renderGroup(workspace, "projects")
							}, workspaceId);
						})
					})]
				});
			};
			const treeRef = (0, react.useRef)(null);
			useSectionDisclosureMotion(treeRef);
			(0, react.useEffect)(() => {
				const tree = treeRef.current;
				if (tree === null || !wide) return;
				return installTreeKeyboard(tree);
			}, [wide]);
			const sorting = workspaceDragId !== void 0 || workspaceGroupDragId !== void 0 || sessionDrag !== void 0;
			(0, react.useLayoutEffect)(() => {
				if (!wide || !sorting || treeRef.current === null) return;
				return mountWorkspaceDropIndicator(treeRef.current);
			}, [wide, sorting]);
			(0, react.useEffect)(() => {
				const current = selectedId;
				if (current === void 0 || lastRevealedSessionIdRef.current === current) return;
				const tree = {
					workspaces: workspaces.items.map((item) => ({
						workspaceId: String(item.workspaceId),
						sessionIds: item.sessionIds.map((id) => String(id))
					})),
					pinnedWorkspaceIds,
					groups: workspaceGroups.map((group) => ({
						id: group.id,
						workspaceIds: group.workspaceIds
					})),
					recentIds
				};
				if (!(tree.workspaces.some((item) => item.sessionIds.includes(current)) || tree.recentIds.includes(current))) return;
				lastRevealedSessionIdRef.current = current;
				pendingRevealScrollRef.current = true;
				setExpanded((currentExpanded) => expandedForCurrentSession(currentExpanded, current, tree));
			}, [
				pinnedWorkspaceIds,
				recentIds,
				selectedId,
				workspaceGroups,
				workspaces.items
			]);
			(0, react.useLayoutEffect)(() => {
				if (!pendingRevealScrollRef.current) return;
				pendingRevealScrollRef.current = false;
				treeRef.current?.querySelector(".dcu-wb-session.dcu-wb-selected")?.scrollIntoView?.({ block: "nearest" });
			}, [expanded]);
			if (!wide) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-wb dcu-wb-rail",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet$4 })
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-wb",
				"aria-label": t("workspace.label"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("style", { children: [
						stylesheet$4,
						runningStyles,
						typographyStyles,
						collectionLayoutStyles
					] }),
					preferencesFailure !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-error",
						role: "status",
						children: [t("workspace.preferencesLocalOnly"), businessRequestErrorKey(preferencesFailure) !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" ", userErrorText(preferencesFailure, t)] })]
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-wb-error",
						role: "alert",
						children: t("sessions.failed", { message: error })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: treeRef,
						className: "dcu-wb-tree",
						role: "tree",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dcu-wb-section",
								role: "presentation",
								"aria-label": t("workspace.pinned"),
								onDragOver: (event) => {
									if (!pinDragActive) return;
									event.preventDefault();
									event.dataTransfer.dropEffect = "move";
									if (pinnedGroups.length === 0 || event.target === event.currentTarget || event.target instanceof Element && event.target.closest(".dcu-wb-section-head") !== null) {
										const firstId = pinnedGroupIds[0];
										const beforeId = firstId === void 0 ? void 0 : reorderDropBeforeId(pinnedGroupIds, workspaceDragId, firstId, false);
										setWorkspaceDropTarget(beforeId === null ? void 0 : {
											zone: "pinned",
											beforeId
										});
									}
								},
								onDrop: (event) => {
									event.preventDefault();
									const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									const target = workspaceDropTargetRef.current;
									setWorkspaceDragId(void 0);
									setWorkspaceDropTarget(void 0);
									const drop = resolvePinnedSectionDrop(draggedWorkspace, target, pinnedGroups.length === 0);
									if (drop !== void 0) pinWorkspaceAt(drop.id, drop.beforeId);
								},
								onDragLeave: (event) => {
									if (!(event.relatedTarget instanceof Node) || event.currentTarget.contains(event.relatedTarget)) return;
									setWorkspaceDropTarget(void 0);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-head",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "treeitem",
										className: "dcu-wb-section-label",
										"aria-expanded": sectionOpen("pinned"),
										onClick: () => {
											toggleSection("pinned");
										},
										children: [t("workspace.pinned"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-section-caret",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												viewBox: "0 0 16 16",
												width: "12",
												height: "12",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M6.25 4.25 10.25 8 6.25 11.75",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round",
													strokeLinejoin: "round"
												})
											})
										})]
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-body",
									role: "group",
									"data-open": sectionOpen("pinned"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-wb-pinned-list",
										children: [
											pinDragActive && pinnedGroups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: `dcu-wb-pin-start${pinnedHeaderDrop?.kind === "empty" ? " dcu-wb-drop" : ""}`,
												onDragOver: (event) => {
													event.preventDefault();
													event.stopPropagation();
													event.dataTransfer.dropEffect = "move";
													setWorkspaceDropTarget({
														zone: "pinned",
														beforeId: void 0
													});
												},
												onDrop: (event) => {
													event.preventDefault();
													event.stopPropagation();
													const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
													setWorkspaceDragId(void 0);
													setWorkspaceDropTarget(void 0);
													if (draggedWorkspace !== void 0) pinWorkspaceAt(draggedWorkspace);
												}
											}),
											pinnedGroups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dcu-wb-empty",
												onDragOver: (event) => {
													if (!pinDragActive) return;
													event.preventDefault();
													event.stopPropagation();
													event.dataTransfer.dropEffect = "move";
													setWorkspaceDropTarget({
														zone: "pinned",
														beforeId: void 0
													});
												},
												onDrop: (event) => {
													event.preventDefault();
													event.stopPropagation();
													const draggedWorkspace = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
													setWorkspaceDragId(void 0);
													setWorkspaceDropTarget(void 0);
													if (draggedWorkspace !== void 0) pinWorkspaceAt(draggedWorkspace);
												},
												children: t("workspace.pinnedEmpty")
											}),
											pinnedGroups.map((workspace) => renderGroup(workspace, "pinned")),
											pinDragActive && pinnedGroups.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: `dcu-wb-pin-end${workspaceDropTarget?.zone === "pinned" && workspaceDropTarget.beforeId === void 0 ? " dcu-wb-drop" : ""}`,
												onDragOver: (event) => {
													if (!pinDragActive) return;
													event.preventDefault();
													event.stopPropagation();
													event.dataTransfer.dropEffect = "move";
													const lastId = pinnedGroupIds[pinnedGroupIds.length - 1];
													if (lastId === void 0 || workspaceDragId === void 0) return;
													const beforeId = reorderDropBeforeId(pinnedGroupIds, workspaceDragId, lastId, true);
													setWorkspaceDropTarget(beforeId === null ? void 0 : {
														zone: "pinned",
														beforeId
													});
												}
											})
										]
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dcu-wb-section",
								role: "presentation",
								"aria-label": t("workspace.projects"),
								onDropCapture: (event) => {
									const dragged = readWorkspaceDrag(event.dataTransfer, workspaceDragId);
									if (dragged !== void 0 && projectPinned(dragged)) setPinnedWorkspaceIds((ids) => ids.filter((id) => id !== dragged));
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-wb-section-head",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "treeitem",
										className: "dcu-wb-section-label",
										ref: projectsSectionButtonRef,
										"aria-expanded": sectionOpen("projects"),
										onClick: () => {
											toggleSection("projects");
										},
										children: [t("workspace.projects"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-section-caret",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												viewBox: "0 0 16 16",
												width: "12",
												height: "12",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M6.25 4.25 10.25 8 6.25 11.75",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round",
													strokeLinejoin: "round"
												})
											})
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "dcu-wb-actions",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dcu-wb-more",
											"aria-label": t("workspace.createGroup"),
											title: t("workspace.createGroup"),
											onClick: (event) => {
												event.stopPropagation();
												setGroupTitleDraft("");
												setError(void 0);
												setCreateGroupOpen(true);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateGroupIcon, {})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dcu-wb-more",
											"aria-label": t("workspace.add"),
											title: t("workspace.add"),
											"aria-keyshortcuts": addWorkspaceShortcutAria,
											disabled: requestAddWorkspace === void 0,
											onClick: (event) => {
												event.stopPropagation();
												requestAddWorkspace?.();
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddWorkspaceIcon, {})
										})]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-body",
									role: "group",
									"data-open": sectionOpen("projects"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-wb-collections",
										children: [
											workspaceGroups.map(renderWorkspaceCollection),
											workspaceGroups.length > 0 && renderUngroupedCollection(),
											workspaceGroups.length === 0 && ungroupedGroups.map((workspace) => renderGroup(workspace, "projects")),
											workspaceGroups.length === 0 && ungroupedGroups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dcu-wb-empty",
												children: t("workspace.empty")
											})
										]
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: "dcu-wb-section",
								role: "presentation",
								"aria-label": t("workspace.recent"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-head",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "treeitem",
										className: "dcu-wb-section-label",
										"aria-expanded": sectionOpen("recent"),
										onClick: () => {
											toggleSection("recent");
										},
										children: [t("workspace.recent"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dcu-wb-section-caret",
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												viewBox: "0 0 16 16",
												width: "12",
												height: "12",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M6.25 4.25 10.25 8 6.25 11.75",
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.5",
													strokeLinecap: "round",
													strokeLinejoin: "round"
												})
											})
										})]
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-wb-section-body",
									role: "group",
									"data-open": sectionOpen("recent"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [recentIds.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-wb-empty",
										children: t("workspace.recentEmpty")
									}), recentIds.map((id) => {
										const session = sessions.byId[id];
										if (session === void 0) return null;
										const title = session.displayTitle;
										const unread = rowUnread(id);
										const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, legacyPendingInteraction(session));
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
											id,
											title,
											selected: selectedId === id,
											menuOpen: menu?.type === "session" && menu.id === id,
											unread,
											running: rowRunning(id, session),
											pendingInteraction,
											time: formatCompactTime(session.updatedAt, t, now),
											t,
											menuItems: sessionMenu(id, session.cwd),
											draggable: true,
											onDragStart: (event) => {
												event.stopPropagation();
												setWorkspaceDragId(void 0);
												setWorkspaceDropTarget(void 0);
												setWorkspaceGroupDragId(void 0);
												setWorkspaceGroupDropTarget(void 0);
												writeSessionDrag(event.dataTransfer, id, title);
												setDragPreview(event.dataTransfer, title);
												setSessionDrag({
													sessionId: id,
													workspaceId: ""
												});
											},
											onDragEnd: () => {
												setSessionDrag(void 0);
												setSessionDropTarget(void 0);
												setWorkspaceDropTarget(void 0);
												setWorkspaceGroupDropTarget(void 0);
											},
											menuPoint: menu?.type === "session" && menu.id === id && menu.x !== void 0 && menu.y !== void 0 ? {
												x: menu.x,
												y: menu.y
											} : void 0,
											onOpen: () => {
												setUnreadSessionIds((ids) => ids.filter((item) => item !== id));
												openSession(id);
											},
											onMenuChange: (open) => {
												setMenu(open ? {
													id,
													type: "session"
												} : void 0);
											},
											onArchive: () => {
												run("archive", () => archiveSession(id));
											},
											onHover: (event) => {
												const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
												showTip({
													kind: "session",
													id,
													title,
													time: formatHoverTime(session.updatedAt, t, now),
													left: box.left,
													top: box.top
												});
											},
											onLeave: hideTip,
											onContextMenu: (event) => {
												event.preventDefault();
												event.stopPropagation();
												dismissTip();
												setMenu({
													id,
													type: "session",
													x: event.clientX,
													y: event.clientY
												});
											},
											onSelectAction: (action) => {
												if (busy !== void 0 || runSessionMoveAction(action, id)) return;
												if (action === "rename") beginRename("session", id, title);
												if (action === "unread") {
													setUnreadSessionIds((ids) => toggleSessionId(ids, id));
													setMenu(void 0);
												}
												if (action === "archive") run("archive", () => archiveSession(id));
												if (action === "delete") {
													setDeleteTarget({
														id,
														kind: "session",
														title
													});
													setError(void 0);
													setMenu(void 0);
												}
												if (action === "fork") run("fork", () => forkSession(id));
												if (action === "openPath" && session.cwd !== void 0) openPathImmediately(session.cwd);
												if (action === "copyPath") copy(session.cwd);
												if (action === "copyTitle") copy(title);
												if (action === "copyId") copy(id);
											}
										}, id);
									})] })
								})]
							})
						]
					}),
					headerMenu !== void 0 && sessions.byId[headerMenu.id] !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open: true,
						onClose: () => {
							setHeaderMenu(void 0);
						},
						items: sessionMenu(headerMenu.id, sessions.byId[headerMenu.id].cwd ?? groups.items.find((item) => item.visibleIds.includes(headerMenu.id))?.path),
						onSelect: (action) => {
							const id = headerMenu.id;
							const session = sessions.byId[id];
							if (session === void 0 || busy !== void 0 || runSessionMoveAction(action, id)) return;
							const path = session.cwd ?? groups.items.find((item) => item.visibleIds.includes(id))?.path;
							if (action === "rename") beginRename("session", id, session.displayTitle);
							if (action === "unread") setUnreadSessionIds((ids) => toggleSessionId(ids, id));
							if (action === "archive") run("archive", () => archiveSession(id));
							if (action === "delete") {
								setDeleteTarget({
									id,
									kind: "session",
									title: session.displayTitle
								});
								setError(void 0);
							}
							if (action === "fork") run("fork", () => forkSession(id));
							if (action === "openPath" && path !== void 0) openPathImmediately(path);
							if (action === "copyPath") copy(path);
							if (action === "copyTitle") copy(session.displayTitle);
							if (action === "copyId") copy(id);
							setHeaderMenu(void 0);
						},
						portal: true,
						dense: true,
						compact: true,
						side: "bottom",
						align: "start",
						getAnchorRect: () => headerMenu.getRect(),
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceHoverCard, {
						t,
						onEditWorkspace: (id, title) => {
							beginRename("workspace", id, title);
						},
						onToggleWorkspacePin: (id) => {
							setPinnedWorkspaceIds((ids) => togglePinnedWorkspace(ids, id));
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: renameGroupId !== void 0,
						onClose: closeRenameGroup,
						closeLabel: t("sessions.close"),
						title: t("workspace.renameGroup"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: closeRenameGroup,
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: renameGroupDraft.trim() === "",
								onClick: submitRenameGroup,
								children: t("sessions.save")
							})]
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "dcu-workspace-group-name",
								children: t("workspace.groupName")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "dcu-workspace-group-name",
								className: "dcu-wb-rename-input",
								"aria-label": t("workspace.groupName"),
								maxLength: 80,
								value: renameGroupDraft,
								autoFocus: true,
								onFocus: (event) => {
									event.target.select();
								},
								onChange: (event) => {
									setRenameGroupDraft(event.target.value);
									setRenameGroupError(void 0);
								},
								onKeyDown: (event) => {
									if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
										event.preventDefault();
										submitRenameGroup();
									}
								}
							}),
							renameGroupError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: t("sessions.failed", { message: renameGroupError })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: createGroupOpen,
						onClose: () => {
							setCreateGroupOpen(false);
							setGroupTitleDraft("");
							setError(void 0);
						},
						closeLabel: t("sessions.close"),
						title: t("workspace.createGroup"),
						description: t("workspace.createGroupDescription"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setCreateGroupOpen(false);
									setGroupTitleDraft("");
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: groupTitleDraft.trim() === "",
								onClick: submitCreateGroup,
								children: t("sessions.save")
							})]
						}),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dcu-wb-rename-input",
							"aria-label": t("workspace.groupName"),
							value: groupTitleDraft,
							autoFocus: true,
							onChange: (event) => {
								setGroupTitleDraft(event.target.value);
								setError(void 0);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
									event.preventDefault();
									submitCreateGroup();
								}
							}
						}), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "alert",
							children: t("sessions.failed", { message: error })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleteGroupId !== void 0,
						onClose: () => {
							setDeleteGroupId(void 0);
						},
						closeLabel: t("sessions.close"),
						title: t("workspace.deleteGroup", { name: workspaceGroups.find((group) => group.id === deleteGroupId)?.title ?? "" }),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setDeleteGroupId(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: "dcu-wb-delete-button",
								onClick: () => {
									if (deleteGroupId !== void 0) setWorkspaceGroups((current) => deleteWorkspaceGroup(current, deleteGroupId));
									setDeleteGroupId(void 0);
								},
								children: t("workspace.deleteGroupAction")
							})]
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dcu-wb-delete-copy",
							children: t("workspace.deleteGroupDescription")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: renameTarget !== void 0,
						onClose: () => {
							setRenameTarget(void 0);
							setError(void 0);
						},
						closeLabel: t("sessions.close"),
						title: renameTarget?.kind === "workspace" ? t("workspace.rename") : t("sessions.rename"),
						description: t("sessions.renameDescription"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => {
									setRenameTarget(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy !== void 0 || renameDraft.trim() === "",
								onClick: submitRename,
								children: t("sessions.save")
							})]
						}),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "dcu-wb-rename-input",
							"aria-label": renameTarget?.kind === "workspace" ? t("workspace.rename") : t("sessions.rename"),
							value: renameDraft,
							autoFocus: true,
							onFocus: (event) => {
								event.target.select();
							},
							onChange: (event) => {
								setRenameDraft(event.target.value);
								setError(void 0);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter") submitRename();
							}
						}), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "alert",
							children: t("sessions.failed", { message: error })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: archiveWorkspaceTarget !== void 0,
						onClose: () => {
							if (busy !== "archive-workspace") {
								setArchiveWorkspaceTarget(void 0);
								setError(void 0);
							}
						},
						closeLabel: t("sessions.close"),
						title: t("workspace.archiveTitle", { count: archiveWorkspaceTarget?.sessionIds.length ?? 0 }),
						description: archiveWorkspaceTarget === void 0 ? void 0 : t("workspace.archiveDescription", { name: archiveWorkspaceTarget.title }),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy === "archive-workspace",
								onClick: () => {
									setArchiveWorkspaceTarget(void 0);
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy === "archive-workspace",
								onClick: submitArchiveWorkspace,
								children: t("workspace.archiveConfirm")
							})]
						}),
						children: [busy === "archive-workspace" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "status",
							children: t("workspace.archivePending")
						}), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-wb-error",
							role: "alert",
							children: t("sessions.failed", { message: error })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: sessionMoveTarget !== void 0,
						onClose: () => {
							if (busy !== "session-move") {
								setSessionMoveTarget(void 0);
								setError(void 0);
							}
						},
						closeLabel: t("sessions.close"),
						title: t("sessions.moveConfirmTitle", { project: sessionMoveTarget?.targetWorkspaceTitle ?? "" }),
						description: sessionMoveTarget === void 0 ? void 0 : t("sessions.moveConfirmDescription", { name: sessionMoveTarget.sessionTitle }),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy === "session-move",
								onClick: () => {
									setSessionMoveTarget(void 0);
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy === "session-move",
								onClick: submitSessionMove,
								children: t("sessions.moveConfirmAction")
							})]
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dcu-wb-move-target",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconFolder, { size: 16 }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-wb-move-target-copy",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-wb-move-project",
										children: sessionMoveTarget?.targetWorkspaceTitle
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-wb-move-path",
										children: sessionMoveTarget?.targetPath
									})]
								})]
							}),
							busy === "session-move" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "status",
								children: t("sessions.movePending")
							}),
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: t("sessions.failed", { message: error })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleteTarget !== void 0,
						onClose: () => {
							if (busy !== "delete-workspace" && busy !== "delete-session") {
								setDeleteTarget(void 0);
								setError(void 0);
							}
						},
						closeLabel: t("sessions.close"),
						title: deleteTarget?.kind === "session" ? t("sessions.delete") : t("workspace.delete"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy === "delete-workspace" || busy === "delete-session",
								onClick: () => {
									setDeleteTarget(void 0);
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: "dcu-wb-delete-button",
								disabled: busy === "delete-workspace" || busy === "delete-session",
								onClick: submitDelete,
								children: deleteTarget?.kind === "session" ? t("sessions.delete") : t("workspace.delete")
							})]
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-wb-delete-copy",
								children: deleteTarget === void 0 ? "" : deleteTarget.kind === "session" ? t("sessions.deleteDescription", { name: deleteTarget.title }) : t("workspace.deleteDescription", { name: deleteTarget.title })
							}),
							busy === "delete-workspace" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "status",
								children: t("workspace.deletePending")
							}),
							busy === "delete-session" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "status",
								children: t("sessions.deletePending")
							}),
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: t("sessions.failed", { message: error })
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/session-row-actions.tsx
		function storage() {
			return browserStorage();
		}
		/** 频道/定时共用的本地未读标记。 */
		function useSessionFlags(current) {
			const [unreadSessionIds, setUnreadSessionIds] = (0, react.useState)(() => readSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY));
			(0, react.useEffect)(() => {
				writeSessionIds(storage(), SESSION_UNREAD_STORAGE_KEY, unreadSessionIds);
			}, [unreadSessionIds]);
			(0, react.useEffect)(() => {
				if (current !== void 0) setUnreadSessionIds((ids) => ids.filter((id) => id !== current));
			}, [current]);
			return {
				unreadSessionIds,
				setUnreadSessionIds
			};
		}
		function SessionHoverCardLayer() {
			const tip = useHoverValue();
			const { keepTip, hideTip } = useHoverDispatch();
			if (tip === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionHoverCard, {
				tip,
				onEnter: keepTip,
				onLeave: hideTip
			});
		}
		function useBusyAction(t, onSuccess) {
			const [busy, setBusy] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const busyRef = (0, react.useRef)();
			const run = async (key, action) => {
				if (busyRef.current !== void 0) return;
				busyRef.current = key;
				setBusy(key);
				setError(void 0);
				try {
					await action();
					onSuccess?.();
				} catch (reason) {
					setError(userErrorText(reason, t));
				} finally {
					busyRef.current = void 0;
					setBusy(void 0);
				}
			};
			return {
				busy,
				error,
				setError,
				run
			};
		}
		/** 频道/定时共用的重命名、删除对话框与菜单动作分派。 */
		function useSessionDialogs(actions, flags, run, closeMenu) {
			const [renameTarget, setRenameTarget] = (0, react.useState)();
			const [deleteTarget, setDeleteTarget] = (0, react.useState)();
			const [renameDraft, setRenameDraft] = (0, react.useState)("");
			const submitRename = () => {
				if (renameTarget === void 0 || renameDraft.trim() === "") return;
				run("rename", async () => {
					await actions.renameSession(renameTarget.id, renameDraft.trim());
					setRenameTarget(void 0);
				});
			};
			const submitDelete = () => {
				if (deleteTarget === void 0) return;
				const target = deleteTarget;
				run("delete", async () => {
					await actions.deleteSession(target.id);
					flags.setUnreadSessionIds((ids) => ids.filter((id) => id !== target.id));
					setDeleteTarget(void 0);
				});
			};
			const handleAction = (action, id, title) => {
				if (action === "rename") {
					setRenameTarget({
						id,
						title
					});
					setRenameDraft(title);
					closeMenu();
				}
				if (action === "unread") {
					flags.setUnreadSessionIds((ids) => toggleSessionId(ids, id));
					closeMenu();
				}
				if (action === "archive") run("archive", () => actions.archiveSession(id));
				if (action === "delete") {
					setDeleteTarget({
						id,
						title
					});
					closeMenu();
				}
				if (action === "fork") run("fork", () => actions.forkSession(id));
				if (action === "copyTitle") run("copy", async () => {
					await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(title);
				});
				if (action === "copyId") run("copy", async () => {
					await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(id);
				});
			};
			return {
				renameTarget,
				deleteTarget,
				renameDraft,
				setRenameDraft,
				setRenameTarget,
				setDeleteTarget,
				submitRename,
				submitDelete,
				handleAction
			};
		}
		function SessionModals({ t, busy, error, renameTarget, deleteTarget, renameDraft, setRenameDraft, setRenameTarget, setDeleteTarget, setError, submitRename, submitDelete }) {
			const deleting = busy === "delete";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: renameTarget !== void 0,
				onClose: () => {
					setRenameTarget(void 0);
					setError(void 0);
				},
				closeLabel: t("sessions.close"),
				title: t("sessions.rename"),
				description: t("sessions.renameDescription"),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-wb-rename-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: () => {
							setRenameTarget(void 0);
						},
						children: t("sessions.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						disabled: busy !== void 0 || renameDraft.trim() === "",
						onClick: submitRename,
						children: t("sessions.save")
					})]
				}),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: "dcu-wb-rename-input",
					"aria-label": t("sessions.rename"),
					value: renameDraft,
					autoFocus: true,
					onFocus: (event) => {
						event.target.select();
					},
					onChange: (event) => {
						setRenameDraft(event.target.value);
						setError(void 0);
					},
					onKeyDown: (event) => {
						if (event.key === "Enter") submitRename();
					}
				}), error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-wb-error",
					role: "alert",
					children: t("sessions.failed", { message: error })
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: deleteTarget !== void 0,
				onClose: () => {
					if (!deleting) {
						setDeleteTarget(void 0);
						setError(void 0);
					}
				},
				closeLabel: t("sessions.close"),
				title: t("sessions.delete"),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-wb-rename-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						disabled: deleting,
						onClick: () => {
							setDeleteTarget(void 0);
							setError(void 0);
						},
						children: t("sessions.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						className: "dcu-wb-delete-button",
						disabled: deleting,
						onClick: submitDelete,
						children: t("sessions.delete")
					})]
				}),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dcu-wb-delete-copy",
						children: deleteTarget === void 0 ? "" : t("sessions.deleteDescription", { name: deleteTarget.title })
					}),
					deleting && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-wb-error",
						role: "status",
						children: t("sessions.deletePending")
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-wb-error",
						role: "alert",
						children: t("sessions.failed", { message: error })
					})
				]
			})] });
		}
		//#endregion
		//#region src/client/ChannelBrowser.tsx
		const CHANNEL_LOCALE_KEYS = {
			dingtalk: "channel.dingtalk",
			feishu: "channel.feishu",
			lark: "channel.lark",
			weixin: "channel.weixin",
			wecom: "channel.wecom",
			qq: "channel.qq",
			telegram: "channel.telegram"
		};
		function channelLabel(id, fallback, t) {
			const key = CHANNEL_LOCALE_KEYS[id];
			return key === void 0 ? fallback : t(key);
		}
		/** 频道树：数据来自 IM，行/菜单/悬停与任务树共用。 */
		function ChannelBrowser(props) {
			const [menu, setMenu] = (0, react.useState)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverShell, {
				blocked: menu !== void 0,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelBrowserTree, {
					...props,
					menu,
					setMenu
				})
			});
		}
		function ChannelBrowserTree({ openSession, archiveSession, deleteSession, forkSession, moveSession, renameSession, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces, t, canDeleteSession, panelActive = false, menu, setMenu }) {
			const sessions = useSessions((state) => state);
			const now = useSharedNow();
			const workspaces = useWorkspaces?.((state) => state);
			const pendingInteractions = useHostPendingInteractions(useSessionPendingInteraction, useSessionStatus);
			const sessionStatus = useHostSessionStatus(useSessionStatus);
			const selectedId = visibleSelectedSessionId(sessions, panelActive);
			const [groups, setGroups] = (0, react.useState)([]);
			const [pollError, setPollError] = (0, react.useState)();
			const [expanded, setExpanded] = (0, react.useState)(() => readTreeExpansionState(browserStorage(), CHANNEL_EXPANSION_STORAGE_KEY));
			const flags = useSessionFlags(selectedId);
			const { showTip, hideTip, dismissTip } = useHoverDispatch();
			const { busy, error, setError, run } = useBusyAction(t, () => {
				setMenu(void 0);
			});
			const dialogs = useSessionDialogs({
				archiveSession,
				deleteSession,
				forkSession,
				renameSession
			}, flags, run, () => {
				setMenu(void 0);
				setError(void 0);
			});
			(0, react.useEffect)(() => {
				writeTreeExpansionState(browserStorage(), CHANNEL_EXPANSION_STORAGE_KEY, expanded);
			}, [expanded]);
			(0, react.useEffect)(() => {
				let disposed = false;
				let active;
				const load = () => {
					if (active !== void 0 || document.visibilityState === "hidden") return;
					const controller = new AbortController();
					active = controller;
					const timeout = window.setTimeout(() => {
						controller.abort();
					}, 8e3);
					loadChannelGroups(controller.signal, t("channel.unknown")).then((next) => {
						if (!disposed) {
							setGroups(next);
							setPollError(void 0);
						}
					}).catch(() => {
						if (!disposed) setPollError(t("channels.loadError"));
					}).finally(() => {
						window.clearTimeout(timeout);
						if (active === controller) active = void 0;
					});
				};
				load();
				const timer = window.setInterval(load, 4e3);
				const onVisibilityChange = () => {
					if (document.visibilityState === "visible") load();
				};
				document.addEventListener("visibilitychange", onVisibilityChange);
				return () => {
					disposed = true;
					active?.abort();
					window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisibilityChange);
				};
			}, [t]);
			const archived = new Set(workspaces?.archivedSessionIds ?? []);
			const visibleGroups = groups.map((group) => ({
				...group,
				sessions: group.sessions.filter((session) => !archived.has(session.sessionId))
			})).filter((group) => group.sessions.length > 0);
			const banner = pollError ?? error;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-wb",
				"aria-label": t("sidebar.channelsTab"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: WORKSPACE_TREE_STYLE }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tree",
						role: "tree",
						children: [
							banner !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: banner
							}),
							pollError === void 0 && visibleGroups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-empty",
								children: t("channels.empty")
							}),
							visibleGroups.map((group) => {
								const isExpanded = expanded[group.id] ?? true;
								const label = channelLabel(group.id, group.label, t);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-wb-project",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupHead, {
										expanded: isExpanded,
										title: label,
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelBrandIcon, { id: group.id }),
										onToggle: () => {
											setExpanded((current) => ({
												...current,
												[group.id]: !isExpanded
											}));
										}
									}), isExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-wb-project-body",
										children: group.sessions.map((session) => {
											const id = session.sessionId;
											const title = session.title;
											const selected = selectedId === id;
											const status = sessionStatus.get(id);
											const running = sessionIsRunning({ running: session.running === true || sessions.byId[id]?.running === true }, status);
											const updatedAt = session.updatedAt ?? sessions.byId[id]?.updatedAt;
											const unread = sessionRowUnread(flags.unreadSessionIds.includes(id), status, selected);
											const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, sessions.byId[id]?.pendingInteraction);
											const moveTargets = moveSession === void 0 || workspaces === void 0 ? void 0 : sessionMoveTargets(workspaces.items, id).map((target) => ({
												...target,
												id: moveSessionActionId(target.id)
											}));
											const canDelete = canDeleteSession?.() === true;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
												id,
												title,
												selected,
												menuOpen: menu?.id === id,
												unread,
												running,
												pendingInteraction,
												time: updatedAt === void 0 ? void 0 : formatCompactTime(updatedAt, t, now),
												t,
												menuItems: sessionMenuItems(t, {
													unread,
													moveTargets,
													canDelete
												}),
												menuPoint: menu?.id === id && menu.x !== void 0 && menu.y !== void 0 ? {
													x: menu.x,
													y: menu.y
												} : void 0,
												onOpen: () => {
													flags.setUnreadSessionIds((ids) => ids.filter((item) => item !== id));
													openSession(id);
												},
												onMenuChange: (open) => {
													setMenu(open ? { id } : void 0);
												},
												onArchive: () => {
													run("archive", () => archiveSession(id));
												},
												onHover: (event) => {
													const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
													showTip({
														title,
														project: label,
														time: updatedAt === void 0 ? void 0 : formatHoverTime(updatedAt, t, now),
														left: box.left,
														top: box.top
													});
												},
												onLeave: hideTip,
												onContextMenu: (event) => {
													event.preventDefault();
													event.stopPropagation();
													dismissTip();
													setMenu({
														id,
														x: event.clientX,
														y: event.clientY
													});
												},
												onSelectAction: (action) => {
													if (busy !== void 0) return;
													const targetWorkspaceId = parseMoveSessionActionId(action);
													if (targetWorkspaceId !== void 0 && moveSession !== void 0) {
														setMenu(void 0);
														run("session-move", () => moveSession(id, targetWorkspaceId));
														return;
													}
													dialogs.handleAction(action, id, title);
												}
											}, id);
										})
									})]
								}, group.id);
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionHoverCardLayer, {}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionModals, {
						t,
						busy,
						error,
						...dialogs,
						setError
					})
				]
			});
		}
		//#endregion
		//#region src/client/schedule-group-actions.ts
		/** 尝试归档整组并保留逐项结果，避免首个失败让后续会话永远不执行。 */
		async function archiveScheduleGroup(sessionIds, archiveSession) {
			const archivedIds = [];
			const failedIds = [];
			for (const sessionId of sessionIds) try {
				await archiveSession(sessionId);
				archivedIds.push(sessionId);
			} catch {
				failedIds.push(sessionId);
			}
			return {
				archivedIds,
				failedIds
			};
		}
		//#endregion
		//#region src/client/ScheduleBrowser.tsx
		function ScheduleClock() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 16 16",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "currentColor",
					d: "M8 1.15A6.85 6.85 0 1 0 8 14.85 6.85 6.85 0 0 0 8 1.15Zm0 1.4a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Z"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "currentColor",
					d: "M8.62 4.35H7.28v4.2l3.02 1.78.67-1.13-2.35-1.39V4.35Z"
				})]
			});
		}
		/** 定时树：数据来自会话快照，行/菜单/悬停与任务树共用。 */
		function ScheduleBrowser(props) {
			const [menu, setMenu] = (0, react.useState)();
			const [view, setView] = (0, react.useState)("runs");
			if (props.overviewContent === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverShell, {
				blocked: menu !== void 0,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScheduleBrowserTree, {
					...props,
					menu,
					setMenu
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-schedule-browser",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-schedule-views",
					role: "tablist",
					"aria-label": props.t("sidebar.scheduleTab"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": view === "runs",
						onClick: () => {
							setMenu(void 0);
							setView("runs");
						},
						children: props.t("sidebar.runsTab")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": view === "overview",
						onClick: () => {
							setMenu(void 0);
							setView("overview");
						},
						children: props.t("sidebar.overviewTab")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-schedule-pane",
					children: view === "runs" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HoverShell, {
						blocked: menu !== void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScheduleBrowserTree, {
							...props,
							menu,
							setMenu
						})
					}) : props.overviewContent
				})]
			});
		}
		function ScheduleBrowserTree({ openSession, archiveSession, deleteSession, forkSession, moveSession, renameSession, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces, t, canDeleteSession, panelActive = false, openTaskSettings, menu, setMenu }) {
			const sessions = useSessions((state) => state);
			const now = useSharedNow();
			const pendingInteractions = useHostPendingInteractions(useSessionPendingInteraction, useSessionStatus);
			const sessionStatus = useHostSessionStatus(useSessionStatus);
			const selectedId = visibleSelectedSessionId(sessions, panelActive);
			const workspaces = useWorkspaces((state) => state);
			const [expanded, setExpanded] = (0, react.useState)(() => readTreeExpansionState(browserStorage(), SCHEDULE_EXPANSION_STORAGE_KEY));
			const [groupMenu, setGroupMenu] = (0, react.useState)();
			const [archiveGroupTarget, setArchiveGroupTarget] = (0, react.useState)();
			const flags = useSessionFlags(selectedId);
			const { showTip, hideTip, dismissTip } = useHoverDispatch();
			const { busy, error, setError, run } = useBusyAction(t, () => {
				setMenu(void 0);
			});
			const dialogs = useSessionDialogs({
				archiveSession,
				deleteSession,
				forkSession,
				renameSession
			}, flags, run, () => {
				setMenu(void 0);
				setError(void 0);
			});
			const groupMenuItems = [
				{
					id: "task-settings",
					label: t("schedule.taskSettings"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSettings, { size: 16 })
				},
				{
					type: "separator",
					id: "group-separator"
				},
				{
					id: "archive-group",
					label: t("schedule.archiveGroup"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconArchive, { size: 16 }),
					danger: true
				}
			];
			(0, react.useEffect)(() => {
				writeTreeExpansionState(browserStorage(), SCHEDULE_EXPANSION_STORAGE_KEY, expanded);
			}, [expanded]);
			const groups = (0, react.useMemo)(() => {
				const archived = new Set(workspaces.archivedSessionIds ?? []);
				return groupScheduleSessions((sessions.ids ?? Object.keys(sessions.byId)).flatMap((id) => {
					const session = sessions.byId[id];
					if (session === void 0 || archived.has(id) || session.blank === true || session.origin === "im" || session.origin === "subagent" || isChannelSession(id)) return [];
					return [{
						id,
						title: session.displayTitle ?? session.title ?? id,
						updatedAt: session.updatedAt,
						running: session.running === true
					}];
				}), t("meta.locale"));
			}, [
				sessions.byId,
				sessions.ids,
				t,
				workspaces.archivedSessionIds
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-wb",
				"aria-label": t("sidebar.scheduleTab"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: WORKSPACE_TREE_STYLE }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-wb-tree",
						role: "tree",
						children: [
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: error
							}),
							groups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-empty",
								children: t("schedule.empty")
							}),
							groups.map((group) => {
								const isExpanded = expanded[group.id] ?? true;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-wb-project",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GroupHead, {
										expanded: isExpanded,
										title: group.label,
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScheduleClock, {}),
										menuOpen: groupMenu === group.id,
										onToggle: () => {
											setExpanded((current) => ({
												...current,
												[group.id]: !isExpanded
											}));
										},
										actions: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
											open: groupMenu === group.id,
											onClose: () => {
												setGroupMenu(void 0);
											},
											items: groupMenuItems,
											onSelect: (action) => {
												setGroupMenu(void 0);
												if (action === "task-settings") {
													setMenu(void 0);
													openTaskSettings?.({
														name: group.label,
														sessionIds: group.sessions.map((session) => session.id)
													});
												}
												if (action === "archive-group") {
													setError(void 0);
													setArchiveGroupTarget({
														id: group.id,
														label: group.label,
														sessionIds: group.sessions.map((session) => session.id)
													});
												}
											},
											portal: true,
											dense: true,
											compact: true,
											anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: "dcu-wb-more",
												"aria-label": t("schedule.groupActions", { name: group.label }),
												onClick: (event) => {
													event.stopPropagation();
													setMenu(void 0);
													setGroupMenu((current) => current === group.id ? void 0 : group.id);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconMore, { size: 16 })
											})
										})
									}), isExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-wb-project-body",
										children: group.sessions.map((session) => {
											const id = session.id;
											const title = session.title;
											const selected = selectedId === id;
											const status = sessionStatus.get(id);
											const unread = sessionRowUnread(flags.unreadSessionIds.includes(id), status, selected);
											const pendingInteraction = pendingInteractionForSession(id, pendingInteractions, sessions.byId[id]?.pendingInteraction);
											const moveTargets = moveSession === void 0 ? void 0 : sessionMoveTargets(workspaces.items ?? [], id).map((target) => ({
												...target,
												id: moveSessionActionId(target.id)
											}));
											const canDelete = canDeleteSession?.() === true;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
												id,
												title,
												selected,
												menuOpen: menu?.id === id,
												unread,
												running: sessionIsRunning(sessions.byId[id], status),
												pendingInteraction,
												time: session.updatedAt === void 0 ? void 0 : formatCompactTime(session.updatedAt, t, now),
												t,
												menuItems: sessionMenuItems(t, {
													unread,
													moveTargets,
													canDelete
												}),
												menuPoint: menu?.id === id && menu.x !== void 0 && menu.y !== void 0 ? {
													x: menu.x,
													y: menu.y
												} : void 0,
												onOpen: () => {
													flags.setUnreadSessionIds((ids) => ids.filter((item) => item !== id));
													openSession(id);
												},
												onMenuChange: (open) => {
													setMenu(open ? { id } : void 0);
												},
												onArchive: () => {
													run("archive", () => archiveSession(id));
												},
												onHover: (event) => {
													const box = hoverCardAnchor(event.currentTarget.getBoundingClientRect());
													showTip({
														title,
														project: group.label,
														time: session.updatedAt === void 0 ? void 0 : formatHoverTime(session.updatedAt, t, now),
														left: box.left,
														top: box.top
													});
												},
												onLeave: hideTip,
												onContextMenu: (event) => {
													event.preventDefault();
													event.stopPropagation();
													dismissTip();
													setMenu({
														id,
														x: event.clientX,
														y: event.clientY
													});
												},
												onSelectAction: (action) => {
													if (busy !== void 0) return;
													const targetWorkspaceId = parseMoveSessionActionId(action);
													if (targetWorkspaceId !== void 0 && moveSession !== void 0) {
														setMenu(void 0);
														run("session-move", () => moveSession(id, targetWorkspaceId));
														return;
													}
													dialogs.handleAction(action, id, title);
												}
											}, id);
										})
									})]
								}, group.id);
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionHoverCardLayer, {}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionModals, {
						t,
						busy,
						error,
						...dialogs,
						setError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: archiveGroupTarget !== void 0,
						onClose: () => {
							if (busy !== "archive-group") {
								setArchiveGroupTarget(void 0);
								setError(void 0);
							}
						},
						closeLabel: t("sessions.close"),
						title: t("schedule.archiveGroup"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-wb-rename-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: busy === "archive-group",
								onClick: () => {
									setArchiveGroupTarget(void 0);
									setError(void 0);
								},
								children: t("sessions.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: "dcu-wb-delete-button",
								disabled: busy === "archive-group",
								onClick: () => {
									if (archiveGroupTarget === void 0) return;
									const target = archiveGroupTarget;
									run("archive-group", async () => {
										const result = await archiveScheduleGroup(target.sessionIds, (id) => archiveSession(id));
										flags.setUnreadSessionIds((ids) => ids.filter((id) => !result.archivedIds.includes(id)));
										if (result.failedIds.length > 0) {
											setArchiveGroupTarget({
												...target,
												sessionIds: result.failedIds
											});
											throw new UserFacingError(t("schedule.archiveGroupPartial", {
												archived: result.archivedIds.length,
												failed: result.failedIds.length
											}));
										}
										setArchiveGroupTarget(void 0);
									});
								},
								children: t("schedule.archiveGroupConfirm")
							})]
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-wb-delete-copy",
								children: archiveGroupTarget === void 0 ? "" : t("schedule.archiveGroupDescription", {
									name: archiveGroupTarget.label,
									count: archiveGroupTarget.sessionIds.length
								})
							}),
							busy === "archive-group" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "status",
								children: t("schedule.archiveGroupPending")
							}),
							error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-wb-error",
								role: "alert",
								children: t("sessions.failed", { message: error })
							})
						]
					})
				]
			});
		}
		const visibleSidebarWidths = /* @__PURE__ */ new WeakMap();
		const hostSidebarSnapshots = /* @__PURE__ */ new WeakMap();
		/** 每帧当前飞行中的动画（同一帧只可能有一个）。 */
		const motions = /* @__PURE__ */ new WeakMap();
		/** 每帧当前已落定的静止态（收起与否），用于识别「状态翻转」。 */
		const restStates = /* @__PURE__ */ new WeakMap();
		/** 动画标记：取值 'collapse' | 'expand'，由 CSS 消费。 */
		const SIDEBAR_MOTION_ATTRIBUTE$1 = "data-dcu-sidebar-motion";
		/**
		* 节点数阈值——**已废弃，不再参与决策**（2026-10-19 移除）。
		*
		* 历史：这里曾有 `SIDEBAR_MOTION_MAX_ELEMENTS = 8000`，超过就不播动画直接落定。
		* 它的前提假设是「长会话里动画的每帧绘制比动画本身贵」，但该假设在位移改走
		* `transform`（合成层属性，见 `beginAnimation`）之后已经不成立：
		*
		*   实测（2026-10-19，同一套 fixture，300ms linear 位移）——
		*   节点 2,007 / 8,007 / 15,007 / 25,007：平均帧间隔 16.65 / 16.23 / 15.82 / 16.01ms，
		*   最大 17.4ms。**帧成本与内容量完全脱钩**，2.5 万节点照样满帧。
		*
		* 而阈值本身造成的伤害是可量化的：用户的真实会话 12,685 个节点 = 阈值的 1.6 倍，
		* 于是侧栏开合**长期完全不播动画**（`beginSidebarMotion` 直接返回 false），
		* 用户感知到的「不丝滑」不是动画卡，而是**根本没有动画**——点一下瞬间跳到位。
		*
		* 与此同时，跳过动画并不能省掉那次同步重排（轨道真的要从 240px 变 56px）：
		* 12,685 节点实测重排 27ms，跳不跳都要付。所以「跳动画」只损失了过渡，
		* 没有换来任何流畅度。
		*
		* 真正该保留的自适应判据在 `beginSidebarMotion` 末尾：**按实测阻塞时间**
		* （`blocked > duration / 2`）决定是否跳过——那是纯测量驱动、随内容量自适应、
		* 不依赖任何魔法节点常量。节点数阈值与它重复，且更粗糙。
		*/
		/**
		* 旧版位移变量名。2026-10-16 起位移改由 JS 直接写内容列的 transform（原因见
		* `beginSidebarMotion` 里的长注释），本变量**不再写入**，只在清理路径上移除历史残留
		* （热更新或旧版本页面可能还留着它）。
		*/
		const SIDEBAR_SHIFT_VAR = "--dcu-sidebar-shift";
		/** 宿主侧栏列 / 内容列标记，由 CSS 消费。 */
		const SIDEBAR_COLUMN_ATTRIBUTE = "data-dcu-sidebar-column";
		const CENTER_COLUMN_ATTRIBUTE = "data-dcu-center-column";
		/**
		* 清除内容列上的位移动画痕迹（内联 transform / transition）。
		*
		* 位移改走内联 transform 后，「落定」「取消」「卸载」三条路径都必须把内联值撤掉，
		* 否则残留的 transform 会盖住 CSS 规则、让内容列停在半程位置。
		* 同时顺手移除历史遗留的 `--dcu-sidebar-shift`（旧版本会写在 frame 上）。
		*/
		function clearCenterShift(frame) {
			const center = frame.querySelector(`[${CENTER_COLUMN_ATTRIBUTE}]`);
			if (center !== null) {
				center.style.removeProperty("transform");
				center.style.removeProperty("transition");
			}
			frame.style.removeProperty(SIDEBAR_SHIFT_VAR);
			clearRailShift(frame);
			clearSidebarSlide(frame);
		}
		/** 侧栏外壳（面）的临时宽度/裁剪由本文件写入，落定、取消、卸载三条路径都要撤掉。 */
		const SIDEBAR_ROOT_SELECTOR = ".dcu-root";
		/** 侧栏面裁掉的右缘宽度（= 展开宽度 - 收起轨宽）。 */
		function slideClipPx(expandedWidth) {
			return Math.max(0, expandedWidth - 56);
		}
		/**
		* 写入侧栏面的裁剪**起点**（无过渡）。
		*
		* 必须在挂 `data-dcu-sidebar-motion` 标记**之前**调用：过渡规则以该标记为前提，
		* 先写起点再挂标记，才不会被浏览器当成一次「从 0 到起点」的过渡。
		*/
		function primeSidebarSlide(frame, collapsed, expandedWidth) {
			const root = frame.querySelector(SIDEBAR_ROOT_SELECTOR);
			if (root === null) return;
			root.style.width = `${expandedWidth}px`;
			root.style.transition = "none";
			root.style.clipPath = collapsed ? "inset(0 0 0 0)" : `inset(0 ${slideClipPx(expandedWidth)}px 0 0)`;
		}
		/** 交回过渡规则，让裁剪从起点跑到终点（收起=裁到 56，展开=裁到 0）。 */
		function runSidebarSlide(frame, collapsed, expandedWidth) {
			const root = frame.querySelector(SIDEBAR_ROOT_SELECTOR);
			if (root === null) return;
			root.style.removeProperty("transition");
			root.style.clipPath = collapsed ? `inset(0 ${slideClipPx(expandedWidth)}px 0 0)` : "inset(0 0 0 0)";
		}
		/** 撤掉侧栏面的临时宽度、裁剪与内联过渡，交还给样式表与宿主宽度。 */
		function clearSidebarSlide(frame) {
			const root = frame.querySelector(SIDEBAR_ROOT_SELECTOR);
			if (root === null) return;
			root.style.removeProperty("transition");
			root.style.removeProperty("clip-path");
			root.style.removeProperty("width");
		}
		/** 自绘索引栏消费的同步位移变量。 */
		const RAIL_SYNC_VAR = "--dcu-rail-sync-shift";
		/** 官方轮次导航消费的同步位移变量（同值，挂在宿主 nav 上）。 */
		const OFFICIAL_RAIL_SYNC_VAR = "--dcu-official-rail-shift";
		/** 索引栏标记：只有真挂载了自绘索引栏时才写变量，避免无谓的样式失效。 */
		const RAIL_ATTRIBUTE = "data-dcu-rail-sync";
		/** 自绘索引栏的左缘变量（由 TurnNavigator 的 React 写入；开合时这里同步补写一次）。 */
		const TURN_LEFT_VAR = "--dcu-turn-left";
		/**
		* 官方轮次导航的选择器。优先用插件打过的标记；未打标时（导航刚挂载、观察器还没跑）
		* 用结构特征兜底——判定规则与 official-turn-navigator.ts 的 isOfficialTurnNavigator 一致。
		*/
		const OFFICIAL_RAIL_SELECTOR = "nav[data-dcu-official-turn-navigator],nav:has(button[type=\"button\"][data-index][aria-label])";
		/** 收集当前文档里所有需要补偿的轮次索引栏（自绘 + 官方，可能只有一条，也可能都没有）。 */
		function collectRails(frame) {
			const doc = frame.ownerDocument;
			const rails = [];
			const own = doc.querySelector(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`);
			if (own !== null) rails.push({
				element: own,
				varName: RAIL_SYNC_VAR,
				compensation: 0
			});
			for (const nav of doc.querySelectorAll(OFFICIAL_RAIL_SELECTOR)) rails.push({
				element: nav,
				varName: OFFICIAL_RAIL_SYNC_VAR,
				compensation: 0
			});
			return rails.filter((rail) => rail.element.getBoundingClientRect().width > 0);
		}
		/** 写起点 → 强制回流 → 交回过渡 → 跑向 0。所有索引栏共用这套时间轴。 */
		function primeShift(element, varName, shiftPx) {
			element.style.transition = "none";
			element.style.setProperty(varName, `${shiftPx}px`);
			element.offsetWidth;
			element.style.removeProperty("transition");
			element.style.setProperty(varName, "0px");
		}
		function clearShift(element, varName) {
			element.style.removeProperty("transition");
			element.style.removeProperty(varName);
		}
		/** 让所有轮次索引栏同时补上各自算好的位移。 */
		function applyRailShifts(rails) {
			for (const rail of rails) {
				if (rail.element.classList.contains("dcu-turn-navigator")) rail.element.style.zIndex = "0";
				primeShift(rail.element, rail.varName, rail.compensation);
			}
		}
		/** 移除所有轮次索引栏的同步位移与内联过渡痕迹。 */
		function clearRailShift(frame) {
			const doc = frame.ownerDocument;
			const own = doc.querySelector(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`);
			if (own !== null) {
				clearShift(own, RAIL_SYNC_VAR);
				own.style.removeProperty("z-index");
			}
			for (const nav of doc.querySelectorAll(OFFICIAL_RAIL_SELECTOR)) clearShift(nav, OFFICIAL_RAIL_SYNC_VAR);
		}
		/** 记下插件改写前的宿主列宽。已经带初始化标记的列宽是本插件留下的，不能当成宿主原值。 */
		function rememberHostSidebar(frame) {
			if (hostSidebarSnapshots.has(frame) || frame.hasAttribute("data-dcu-codex-sidebar-initialized")) return;
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			hostSidebarSnapshots.set(frame, {
				grid: frame.style.gridTemplateColumns,
				handleLeft: handle?.style.left ?? "",
				windowsWidth: frame.style.getPropertyValue("--dsh-windows-sidebar-width")
			});
		}
		/** 停用或卸载时撤回列宽、拖拽柄、动画标记和初始化标记，让官方侧栏按宿主宽度重排。 */
		function restoreHostSidebar(frame) {
			cancelSidebarMotion(frame);
			frame.removeAttribute(SIDEBAR_MOTION_ATTRIBUTE$1);
			clearCenterShift(frame);
			clearColumnMarkers(frame);
			frame.removeAttribute("data-dcu-codex-sidebar-initialized");
			frame.style.removeProperty("--dcu-sidebar-expanded-width");
			const html = frame.ownerDocument.documentElement;
			const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
			if (frame.hasAttribute("data-sidebar-collapsed")) {
				if ((html.hasAttribute("data-windows-titlebar") || html.dataset.platform === "darwin") && tracks?.sidebar === 56) {
					frame.style.gridTemplateColumns = `0px ${tracks.middle} ${tracks.details}`;
					if (html.hasAttribute("data-windows-titlebar")) frame.style.setProperty("--dsh-windows-sidebar-width", "0px");
				}
				return;
			}
			const snapshot = hostSidebarSnapshots.get(frame);
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			if (snapshot !== void 0) {
				frame.style.gridTemplateColumns = snapshot.grid;
				if (handle !== null) {
					if (snapshot.handleLeft === "") handle.style.removeProperty("left");
					else handle.style.left = snapshot.handleLeft;
				}
				if (snapshot.windowsWidth === "") frame.style.removeProperty("--dsh-windows-sidebar-width");
				else frame.style.setProperty("--dsh-windows-sidebar-width", snapshot.windowsWidth);
				return;
			}
			if (tracks?.sidebar === 264) {
				frame.style.gridTemplateColumns = `280px ${tracks.middle} ${tracks.details}`;
				if (handle !== null) handle.style.left = "280px";
			}
		}
		/** 解析宿主 AppFrame 的 grid-template-columns。 */
		function parseSidebarGrid(value) {
			const match = /^(\d+(?:\.\d+)?)px\s+(minmax\(\d+(?:px)?,\s*1fr\))\s+(minmax\(0(?:px)?,\s*\d+(?:\.\d+)?px\)|\d+(?:\.\d+)?px)$/.exec(value.trim());
			if (match === null) return void 0;
			return {
				sidebar: Number(match[1]),
				middle: match[2],
				details: match[3]
			};
		}
		function findSidebarFrame(root) {
			const marked = root.querySelector("[data-sidebar-collapsed]");
			if (marked !== null) return marked;
			for (const node of root.querySelectorAll("div")) if (parseSidebarGrid(node.style.gridTemplateColumns) !== void 0) return node;
		}
		/** Settings is portaled to body, so explicitly carry over the expanded width. */
		function settingsSidebarWidth(root) {
			const frame = findSidebarFrame(root);
			const expanded = Number.parseFloat(frame?.style.getPropertyValue("--dcu-sidebar-expanded-width") ?? "");
			if (Number.isFinite(expanded) && expanded >= 200) return expanded;
			const width = frame === void 0 ? void 0 : parseSidebarGrid(frame.style.gridTemplateColumns)?.sidebar;
			return width !== void 0 && width >= 200 ? width : 200;
		}
		/** 同步侧栏网格和拖拽柄，保证两者始终使用同一个可见宽度。 */
		function applySidebarWidth(frame, width) {
			const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
			if (tracks === void 0 || frame.hasAttribute("data-sidebar-collapsed")) return false;
			visibleSidebarWidths.set(frame, width);
			const next = `${width}px ${tracks.middle} ${tracks.details}`;
			const changed = frame.style.gridTemplateColumns !== next;
			if (changed) frame.style.gridTemplateColumns = next;
			const contentWidth = `${width}px`;
			if (frame.style.getPropertyValue("--dcu-sidebar-expanded-width") !== contentWidth) frame.style.setProperty("--dcu-sidebar-expanded-width", contentWidth);
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			if (handle !== null && handle.style.left !== contentWidth) handle.style.left = contentWidth;
			return changed;
		}
		/** 自动宽度调整与初始化过渡共用前置条件；手动拖拽不受此限制。 */
		function canApplySlimSidebar(frame) {
			return !frame.hasAttribute("data-dragging") && parseSidebarGrid(frame.style.gridTemplateColumns) !== void 0;
		}
		function applySlimSidebar(frame) {
			if (!canApplySlimSidebar(frame)) return false;
			if (frame.hasAttribute("data-sidebar-collapsed")) {
				const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
				const next = `56px ${tracks.middle} ${tracks.details}`;
				const changed = frame.style.gridTemplateColumns !== next;
				if (changed) frame.style.gridTemplateColumns = next;
				if (frame.ownerDocument.documentElement.hasAttribute("data-windows-titlebar") && frame.style.getPropertyValue("--dsh-windows-sidebar-width") !== `56px`) frame.style.setProperty("--dsh-windows-sidebar-width", `56px`);
				if (!frame.hasAttribute("data-dcu-codex-sidebar-initialized")) frame.setAttribute("data-dcu-codex-sidebar-initialized", "");
				return changed;
			}
			const initialized = frame.hasAttribute("data-dcu-codex-sidebar-initialized");
			const changed = applySidebarWidth(frame, initialized ? visibleSidebarWidths.get(frame) ?? 264 : 264);
			if (!initialized) frame.setAttribute("data-dcu-codex-sidebar-initialized", "");
			return changed;
		}
		/** 仅在首帧覆盖宿主默认宽度时关闭过渡，避免刷新出现收缩动画。 */
		function pauseInitialSidebarTransition(frame) {
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			const frameTransition = frame.style.transition;
			const handleTransition = handle?.style.transition;
			frame.style.transition = "none";
			if (handle !== null) handle.style.transition = "none";
			return () => {
				frame.style.transition = frameTransition;
				if (handle !== null && handleTransition !== void 0) handle.style.transition = handleTransition;
			};
		}
		/** 展开态要恢复到的宽度（拖拽改过的宽度优先，否则默认 240）。 */
		function targetExpandedWidth(frame) {
			return visibleSidebarWidths.get(frame) ?? 264;
		}
		function prefersReducedMotion(win) {
			return win.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
		}
		/** 读取「移动」档时长（令牌缺失时退回 180ms，与 ZCode 动效分档一致）。 */
		function readMoveDuration(frame) {
			const raw = getComputedStyle(frame).getPropertyValue("--dcu-motion-move-duration").trim();
			const match = /^(\d+(?:\.\d+)?)ms$/.exec(raw);
			return match === null ? 180 : Number(match[1]);
		}
		/** 帧上是否挂着会动画化 grid-template-columns 的过渡（宿主或伴随插件）。 */
		function transitionsTrackGrid(frame) {
			return getComputedStyle(frame).transitionProperty.includes("grid-template-columns");
		}
		/**
		* 带过渡暂停的轨道写入。宿主 `.frame[data-animating]`（以及 dsh-better-sidebar 的
		* 同类规则）会在离散开关时给 grid/left 挂过渡；不暂停就会把「修正宿主写回值」
		* 和「快照切轨」动画化，出现可见漂移。两次强制回流保证 none 先生效、写入被提交。
		*/
		function writeFrameTrackPaused(frame, next) {
			if (!transitionsTrackGrid(frame)) {
				frame.style.gridTemplateColumns = next;
				return;
			}
			const frameTransition = frame.style.transition;
			frame.style.transition = "none";
			frame.offsetWidth;
			frame.style.gridTemplateColumns = next;
			frame.offsetWidth;
			frame.style.transition = frameTransition;
		}
		/** 把宿主侧栏列与内容列打上标记（宿主重建 DOM 时重新标记）。 */
		function markColumns(frame) {
			const markedCenter = frame.querySelector(`[${CENTER_COLUMN_ATTRIBUTE}]`);
			const markedSidebar = frame.querySelector(`[${SIDEBAR_COLUMN_ATTRIBUTE}]`);
			if (markedCenter !== null && markedSidebar !== null && markedCenter.parentElement === frame && markedSidebar.parentElement === frame) return {
				sidebar: markedSidebar,
				center: markedCenter
			};
			const root = frame.querySelector(".dcu-root");
			if (root === null) return void 0;
			let sidebarColumn = root;
			while (sidebarColumn !== null && sidebarColumn.parentElement !== frame) sidebarColumn = sidebarColumn.parentElement;
			if (sidebarColumn === null) return void 0;
			let centerColumn;
			let seenSidebar = false;
			for (const child of Array.from(frame.children)) {
				if (child === sidebarColumn) {
					seenSidebar = true;
					continue;
				}
				if (!seenSidebar) continue;
				if (child.hasAttribute("data-side")) continue;
				if (child.hasAttribute("data-shell-bottom") || child.hasAttribute("data-shell-overlay") || child.hasAttribute("data-shell-leading")) continue;
				centerColumn = child;
				break;
			}
			if (centerColumn === void 0) return void 0;
			sidebarColumn.setAttribute(SIDEBAR_COLUMN_ATTRIBUTE, "");
			centerColumn.setAttribute(CENTER_COLUMN_ATTRIBUTE, "");
			return {
				sidebar: sidebarColumn,
				center: centerColumn
			};
		}
		function clearColumnMarkers(frame) {
			frame.querySelector(`[${SIDEBAR_COLUMN_ATTRIBUTE}]`)?.removeAttribute(SIDEBAR_COLUMN_ATTRIBUTE);
			frame.querySelector(`[${CENTER_COLUMN_ATTRIBUTE}]`)?.removeAttribute(CENTER_COLUMN_ATTRIBUTE);
		}
		/**
		* 动画期间把轨道钉回**目标几何**（2026-10-14 架构修正）。
		*
		* 宿主状态翻转后会写回它自己的列值（可能是 0px 而不是 56px），动画期间这会把轨道带偏。
		* 本函数在每个飞行帧把轨道重新钉成「本次动画的目标宽度」，于是宽度全程恒定，
		* 落定时无需再改宽度 → 落定零重排。
		*
		* 历史：旧实现钉的是「动画基准」（收起钉展开几何、展开钉收起几何），
		* 落定时才切到目标宽度，导致落定那一刻整列文本重排（8000 条实测 137ms）。
		*/
		function pinMotionBase(frame, kind) {
			const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
			if (tracks === void 0) return;
			const next = `${kind === "collapse" ? 56 : targetExpandedWidth(frame)}px ${tracks.middle} ${tracks.details}`;
			if (frame.style.gridTemplateColumns === next) return;
			writeFrameTrackPaused(frame, next);
		}
		/** 取消飞行中的动画样式（不落定——调用方自己决定轨道归谁）。 */
		function cancelMotionStyles(frame) {
			cancelSidebarMotion(frame);
			frame.removeAttribute(SIDEBAR_MOTION_ATTRIBUTE$1);
			clearCenterShift(frame);
		}
		/** 取消飞行中的动画（不落定——调用方自己决定落到哪）。 */
		function cancelSidebarMotion(frame) {
			const motion = motions.get(frame);
			if (motion === void 0) return;
			frame.ownerDocument.defaultView?.clearTimeout(motion.timer);
			motions.delete(frame);
		}
		/**
		* 落定到目标静止态：轨道、拖拽柄、动画标记在同一 flush 内写完（过渡暂停），
		* 视觉上与动画末帧完全一致，不产生跳变。
		*/
		function settleMotion(frame, collapsed) {
			cancelSidebarMotion(frame);
			const width = collapsed ? 56 : targetExpandedWidth(frame);
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			const center = frame.querySelector(`[${CENTER_COLUMN_ATTRIBUTE}]`);
			const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
			const frameTransition = frame.style.transition;
			const handleTransition = handle?.style.transition;
			const centerTransition = center?.style.transition;
			const pause = transitionsTrackGrid(frame);
			if (pause) {
				frame.style.transition = "none";
				if (handle !== null) handle.style.transition = "none";
				if (center !== null) center.style.transition = "none";
				frame.offsetWidth;
			}
			try {
				frame.removeAttribute(SIDEBAR_MOTION_ATTRIBUTE$1);
				clearCenterShift(frame);
				if (tracks !== void 0) frame.style.gridTemplateColumns = `${width}px ${tracks.middle} ${tracks.details}`;
				if (handle !== null) handle.style.left = `${width}px`;
				if (collapsed && frame.ownerDocument.documentElement.hasAttribute("data-windows-titlebar")) frame.style.setProperty("--dsh-windows-sidebar-width", `56px`);
				if (pause) frame.offsetWidth;
			} finally {
				if (pause) {
					frame.style.transition = frameTransition;
					if (handle !== null && handleTransition !== void 0) handle.style.transition = handleTransition;
					if (center !== null && centerTransition !== void 0) center.style.transition = centerTransition;
				}
			}
			restStates.set(frame, collapsed);
		}
		/**
		* 开始一次合成层开合动画。返回 false 表示条件不满足（调用方应立即落定）。
		*
		* 时序：先暂停过渡写「基准轨道 + 手柄位置」，再挂动画标记让 transform 过渡起跑——
		* 同一次任务里先 none 后恢复，保证 left/轨道的修正不过渡、transform 正常过渡。
		*/
		function beginSidebarMotion(frame, collapsed) {
			const win = frame.ownerDocument.defaultView;
			if (win === null || prefersReducedMotion(win)) return false;
			if (frame.hasAttribute("data-dragging")) return false;
			const columns = markColumns(frame);
			if (columns === void 0) return false;
			const expandedWidth = targetExpandedWidth(frame);
			const shift = expandedWidth - 56;
			if (!(shift > 0)) return false;
			const kind = collapsed ? "collapse" : "expand";
			const duration = readMoveDuration(frame);
			const motion = {
				kind,
				timer: 0
			};
			motions.set(frame, motion);
			const reflowStarted = win.performance.now();
			const handle = frame.querySelector("[data-side=\"sidebar\"]");
			const tracks = parseSidebarGrid(frame.style.gridTemplateColumns);
			const frameTransition = frame.style.transition;
			const handleTransition = handle?.style.transition;
			const pauseFrame = transitionsTrackGrid(frame);
			if (pauseFrame || handle !== null) {
				if (pauseFrame) frame.style.transition = "none";
				if (handle !== null) handle.style.transition = "none";
				frame.offsetWidth;
			}
			try {
				const target = collapsed ? 56 : expandedWidth;
				if (tracks !== void 0) frame.style.gridTemplateColumns = `${target}px ${tracks.middle} ${tracks.details}`;
				if (handle !== null) handle.style.left = `56px`;
				if (frame.ownerDocument.documentElement.hasAttribute("data-windows-titlebar")) frame.style.setProperty("--dsh-windows-sidebar-width", `${collapsed ? 56 : expandedWidth}px`);
				if (pauseFrame || handle !== null) frame.offsetWidth;
			} finally {
				if (pauseFrame) frame.style.transition = frameTransition;
				if (handle !== null && handleTransition !== void 0) handle.style.transition = handleTransition;
			}
			frame.offsetWidth;
			let done = false;
			const finish = () => {
				if (done) return;
				done = true;
				win.clearTimeout(motion.timer);
				settleMotion(frame, collapsed);
			};
			const beginAnimation = () => {
				if (!frame.isConnected || motions.get(frame) !== motion) return;
				const startX = collapsed ? shift / 2 : -shift / 2;
				const ownRail = frame.ownerDocument.querySelector(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`);
				if (ownRail !== null) ownRail.style.setProperty(TURN_LEFT_VAR, `${(collapsed ? 56 : expandedWidth) + 16}px`);
				const rails = collectRails(frame);
				const baseLefts = rails.map((rail) => rail.element.getBoundingClientRect().left);
				columns.center.style.transition = "none";
				columns.center.style.transform = `translateX(${startX}px)`;
				primeSidebarSlide(frame, collapsed, expandedWidth);
				columns.center.offsetWidth;
				const edgeTravel = collapsed ? shift : -shift;
				rails.forEach((rail, index) => {
					const naturalStart = rail.element.getBoundingClientRect().left;
					rail.compensation = edgeTravel - (naturalStart - baseLefts[index]);
				});
				frame.setAttribute(SIDEBAR_MOTION_ATTRIBUTE$1, kind);
				applyRailShifts(rails);
				runSidebarSlide(frame, collapsed, expandedWidth);
				columns.center.style.removeProperty("transition");
				columns.center.style.transform = "translateX(0px)";
				if (handle !== null && !collapsed) handle.style.left = `${expandedWidth}px`;
				columns.center.addEventListener("transitionend", (event) => {
					if (event.target === columns.center && event.propertyName === "transform") finish();
				}, { once: true });
			};
			const SKIP_ANIMATION_BLOCK_MS = duration * 2;
			win.requestAnimationFrame(() => {
				if (win.performance.now() - reflowStarted > SKIP_ANIMATION_BLOCK_MS) {
					finish();
					return;
				}
				beginAnimation();
			});
			motion.timer = win.setTimeout(finish, duration + 120);
			return true;
		}
		/**
		* 拖拽按下时调用：把飞行中的动画立即落定到当前静止态，
		* 避免拖拽基准读到动画中间值（展开动画中手柄已在 56px 视觉位）。
		*/
		function settleSidebarMotion(frame) {
			if (motions.get(frame) === void 0) return;
			settleMotion(frame, frame.hasAttribute("data-sidebar-collapsed"));
		}
		function observeSlimSidebar() {
			if (typeof document === "undefined" || document.body === null) return () => {};
			let applying = false;
			let frame;
			let pending;
			let frameObserver;
			const watchFrame = (next) => {
				if (frame === next) return;
				frameObserver?.disconnect();
				frame = next;
				if (frame === void 0) return;
				frameObserver = new MutationObserver(apply);
				frameObserver.observe(frame, {
					attributes: true,
					attributeFilter: [
						"style",
						"data-sidebar-collapsed",
						"data-dragging",
						"data-dcu-codex-sidebar-initialized"
					]
				});
			};
			const apply = () => {
				if (applying) return;
				applying = true;
				try {
					if (frame === void 0 || !frame.isConnected) watchFrame(findSidebarFrame(document));
					if (frame === void 0) return;
					rememberHostSidebar(frame);
					if (frame.hasAttribute("data-dragging")) {
						if (motions.get(frame) !== void 0) cancelMotionStyles(frame);
						return;
					}
					if (!canApplySlimSidebar(frame)) return;
					const collapsed = frame.hasAttribute("data-sidebar-collapsed");
					if (!frame.hasAttribute("data-dcu-codex-sidebar-initialized")) {
						const restoreTransition = collapsed ? void 0 : pauseInitialSidebarTransition(frame);
						const changed = applySlimSidebar(frame);
						if (restoreTransition !== void 0) {
							if (!changed) restoreTransition();
							else window.requestAnimationFrame(() => window.requestAnimationFrame(restoreTransition));
						}
						restStates.set(frame, collapsed);
						return;
					}
					const motion = motions.get(frame);
					if (motion !== void 0) {
						if (motion.kind === "collapse" === collapsed) {
							pinMotionBase(frame, motion.kind);
							return;
						}
						settleMotion(frame, collapsed);
						return;
					}
					if (collapsed === restStates.get(frame)) {
						applySlimSidebar(frame);
						return;
					}
					if (!beginSidebarMotion(frame, collapsed)) {
						applySlimSidebar(frame);
						restStates.set(frame, collapsed);
					}
				} finally {
					applying = false;
				}
			};
			const schedule = () => {
				if (pending !== void 0) return;
				pending = window.requestAnimationFrame(() => {
					pending = void 0;
					apply();
				});
			};
			apply();
			const observer = new MutationObserver(() => {
				if (frame === void 0 || !frame.isConnected) schedule();
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			return () => {
				observer.disconnect();
				frameObserver?.disconnect();
				if (pending !== void 0) window.cancelAnimationFrame(pending);
				if (frame !== void 0) restoreHostSidebar(frame);
			};
		}
		//#endregion
		//#region src/client/sidebar-drag.ts
		const SIDEBAR_MAX_PX = 420;
		/**
		* 越过最小宽度后，还要再左拖这么多像素才收起。
		*
		* 为什么不能再用「起始宽的一半」：
		*   旧判定 `startX - endX > startWidth / 2` 与「拖到 MIN」完全脱钩。
		*   实测（264 起拖，MIN=240）：宽度在左拖 32px 时就卡在 240 不动，
		*   却要拖到 136px 才收起 —— 中间 104px 的拖动**毫无视觉反馈**，这就是「手感不对」。
		*   且死区随起始宽漂移：300 起拖时 90px、420 时 30px，同一个手势在不同宽度下行为不一致。
		*
		* 现判定：以「越过 MIN 的超出量」为准，死区恒为 COLLAPSE_OVERSHOOT_PX，
		* 与起始宽度无关。取 32px 而非 0，是为了避免「拖到最低再抖 1px 就整栏收起」的误触。
		*/
		const COLLAPSE_OVERSHOOT_PX = 32;
		/** 左拖越过最小宽度、并再多拖 COLLAPSE_OVERSHOOT_PX 时收起侧栏。 */
		function shouldCollapseOnSidebarDrag(startWidth, startX, endX) {
			const shrink = startX - endX;
			const shrinkToMin = startWidth - 200;
			if (shrink > shrinkToMin) return shrink - shrinkToMin >= COLLAPSE_OVERSHOOT_PX;
			return false;
		}
		/** 直接按可见宽度计算拖拽结果，绕开宿主与 Codex 不一致的最小宽度。 */
		function sidebarWidthDuringDrag(startWidth, startX, currentX) {
			return Math.min(SIDEBAR_MAX_PX, Math.max(200, startWidth + currentX - startX));
		}
		function isSidebarDragHandle(target) {
			if (target === null || typeof target !== "object" || !("closest" in target)) return false;
			const handle = target.closest("[data-side=\"sidebar\"]");
			return handle !== null && String(handle.className).includes("handle");
		}
		//#endregion
		//#region src/client/automation-task-settings.ts
		const AUTOMATION_TASK_SETTINGS_EVENT = "dsh-automation:open-task-settings";
		const AUTOMATION_TASK_SETTINGS_STORAGE_KEY = "dsh-automation:pending-task-settings";
		function parseAutomationTaskSettingsRequest(value) {
			if (value === null || typeof value !== "object") return void 0;
			const record = value;
			if (typeof record.name !== "string" || record.name.trim() === "" || !Array.isArray(record.sessionIds) || record.sessionIds.some((id) => typeof id !== "string" || id === "")) return void 0;
			if (record.automationId !== void 0 && (typeof record.automationId !== "string" || record.automationId.trim() === "")) return void 0;
			return {
				...typeof record.automationId === "string" ? { automationId: record.automationId } : {},
				name: record.name,
				sessionIds: [...record.sessionIds]
			};
		}
		/** 定时设置页可能切换分区后才挂载：先保存一次性请求，再通知已挂载实例。 */
		function requestAutomationTaskSettings(request) {
			if (typeof window === "undefined") return;
			const validated = parseAutomationTaskSettingsRequest(request);
			if (validated === void 0) return;
			try {
				window.sessionStorage.setItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY, JSON.stringify(validated));
			} catch {}
			window.dispatchEvent(new CustomEvent(AUTOMATION_TASK_SETTINGS_EVENT, { detail: validated }));
		}
		function clearAutomationTaskSettingsRequest() {
			if (typeof window === "undefined") return;
			try {
				window.sessionStorage.removeItem(AUTOMATION_TASK_SETTINGS_STORAGE_KEY);
			} catch {}
		}
		//#endregion
		//#region src/client/new-conversation-style.ts
		/** 新建页底部输入布局；保留宿主节点、插槽与 active 会话底部信息。 */
		const NEW_CONVERSATION_STYLE = `
[data-phase=hero]:has([data-conversation-scroll]){container:dcu-new-conversation / inline-size}
[data-phase=hero] [data-conversation-scroll][class]{--dsh-composer-side-clearance:16px;justify-content:flex-start;scrollbar-gutter:stable both-edges}
[data-phase=hero] [data-composer-seat]{flex:1 0 auto;min-height:100%}
[data-phase=hero] [data-composer-seat]>:has([class*="_composerHero"]){display:flex;flex:1;flex-direction:column}
[data-phase=hero] [class*="_composerHero"]{box-sizing:border-box;flex:1;width:100%;max-width:none;min-width:0;margin-inline:auto;gap:0;padding-bottom:32px}
[data-phase=hero] [class*="_composerHero"]>:first-child{box-sizing:border-box;flex:1;width:100%;max-width:768px;align-self:center;height:auto;min-height:340px;align-items:center;padding:32px 28px}
[data-phase=hero] [class*="_composerHero"]>:first-child>[class$="_stack"]{width:100%;max-width:none;min-width:0;align-items:center;gap:32px}
[data-phase=hero] [class*="_composerHero"] [class$="_headline"]{grid-template-columns:46px auto auto;font-size:var(--dsw-font-size-display);line-height:calc(var(--dsw-font-size-display) + 10px)}
[data-phase=hero] [class*="_composerHero"] [class$="_fishHitbox"]{width:46px;height:46px}
[data-phase=hero] [class*="_composerHero"] [class$="_fishHitbox"]>svg{width:46px;height:auto}
[data-phase=hero] [class*="_heroWorkspaceRow"]{box-sizing:border-box;flex:none;width:min(calc(var(--dsh-composer-card-max-width) + 2 * var(--dsh-composer-side-clearance) - 56px),calc(100% - 56px));align-self:center;justify-content:flex-start;flex-wrap:wrap;gap:8px;min-height:48px;margin:0 28px -10px;padding:6px 12px 16px;border-radius:var(--dsw-radius-xl) 12px 0 0;background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,var(--dsw-alias-bg-base))}
[data-phase=hero] [class*="_heroWorkspaceRow"]>[class$="_workspace"]{min-width:0;max-width:100%;font-weight:400}
.dcu-home-suggestions{width:100%;color:var(--dsw-alias-label-primary);font:13px/20px var(--dsw-font-family)}
.dcu-home-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--dcu-space-2)}
/* 图标与标题同排、紧凑排布。原先是 column + space-between + gap:22px + min-height:106px，
   导致图标贴顶、文案贴底、中间留白约 50px（DSH 内实测反馈），窄窗口还会把标题折行。 */
.dcu-home-card{appearance:none;display:flex;flex-direction:row;align-items:center;gap:8px;min-width:0;min-height:42px;padding:var(--dcu-space-2) var(--dcu-space-3);border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);border-radius:var(--dsw-radius-xl);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),border-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
/* 标签允许两行：四个卡片在 1440px 下每张约 171px，单行必然截断（实测四个标签全部断在半词上）。 */
.dcu-home-card>span{min-width:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;white-space:normal;line-height:18px;text-wrap:pretty}
.dcu-home-card:hover,.dcu-home-card[aria-pressed=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent)}
.dcu-home-card svg{width:16px;height:16px;flex:none;color:var(--dcu-home-icon)}
.dcu-home-card:focus-visible,.dcu-home-task:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:3px}
.dcu-home-details,.dcu-home-status{display:grid}
.dcu-home-suggestions[data-has-draft=true]{visibility:hidden;pointer-events:none}
.dcu-home-tasks{grid-area:1/1;display:flex;flex-wrap:wrap;align-content:start;gap:8px;margin-top:16px}
.dcu-home-details>[data-active=false],.dcu-home-status>[data-active=false]{visibility:hidden;pointer-events:none}
.dcu-home-task{appearance:none;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);border-radius:var(--dsw-radius-lg);padding:8px 12px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-home-task:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent)}
.dcu-home-hint{grid-area:1/1;margin:12px 0 0;color:var(--dsw-alias-label-secondary)}
@container dcu-new-conversation (width < 640px){
  .dcu-home-cards{grid-template-columns:repeat(2,minmax(0,1fr))}
  [data-phase=hero] [class*="_composerHero"]>:first-child{padding:32px 24px;min-height:420px}
}
@media(prefers-reduced-motion:reduce){.dcu-home-card{transition:none}}
`;
		//#endregion
		//#region src/client/composer-tool-menus.ts
		/** 只适配由输入区工具触发的菜单；保留原条目、选择回调及目录创建流程。 */
		const TOOL = "[class*=\"_heroWorkspaceRow\"] button,[data-composer-card] button[aria-haspopup],[data-composer-card] button[aria-expanded]";
		const MENU = "[role=\"menu\"],[role=\"listbox\"]";
		const COMPOSER_TOOL_MENU_STYLE = `
[class*="_heroWorkspaceRow"] button{min-height:28px;border-radius:var(--dsw-radius-full);font-size:var(--dsw-font-size-caption);line-height:20px}
[class*="_heroWorkspaceRow"] button:hover,[class*="_heroWorkspaceRow"] button[aria-expanded=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
/* 底色与投影走语义令牌（2026-10-14 去硬编码）：原来底色是 background:#fff!important、
   投影是 box-shadow:0 8px 32px #0002,0 0 0 1px #0000000a!important，另有一条
   body[data-ds-dark-theme] …{background:#2b2b2b} 暗色补丁。
   菜单与 Git 弹窗是**会**跟着宿主切暗色的表面，硬编码 #fff 会让它在暗色主题下变成一块白板；
   而补丁与主规则各写一份，值容易漂移。
   同系令牌 --dcu-tip-bg / --dcu-tip-shadow 早已用在侧栏浮层上，这里接同一对令牌，
   让「浮层表面」在仓库里有**一个**定义而不是每处一份字面量。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]){box-sizing:border-box;max-height:var(--dcu-tool-menu-height,360px)!important;padding:4px!important;border-radius:var(--dsw-radius-lg)!important;background:var(--dsw-specific-menu,var(--dcu-tip-bg))!important;backdrop-filter:var(--dsw-menu-backdrop-filter,none)!important;color:var(--dsw-alias-label-primary);box-shadow:var(--dcu-tip-shadow)!important;display:flex;flex-direction:column;gap:2px;z-index:1100}
/* 原生菜单保留宿主宽度约束；Git 弹窗沿用独立尺寸，避免观察器标记前后跳变。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])[data-gitgraph-popover]{min-width:0!important;width:262px;max-width:calc(100vw - 24px)}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]))[data-gitgraph-popover]{width:320px}
[data-dcu-tool-menu=portal]{position:fixed!important;left:var(--dcu-tool-menu-x)!important;top:var(--dcu-tool-menu-y)!important;bottom:auto!important;right:auto!important}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal])){translate:var(--dcu-tool-menu-shift,0px) 0}
[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]){top:auto!important;bottom:calc(100% + 4px)!important}
/* 原先这里还有一条 body[data-ds-dark-theme] …{background:#2b2b2b!important;…} 的暗色补丁，
   现在由 --dcu-tip-bg / --dcu-tip-shadow 的暗色值统一承担（见文件头注释），补丁已删。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])>[class*="_viewport"]{min-height:0;max-height:none;overflow-y:auto;scrollbar-width:thin}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],[role=option]){box-sizing:border-box;min-height:28px;padding:4px 8px;gap:8px;border-radius:var(--dsw-radius-md);font-size:var(--dsw-font-size-caption);line-height:20px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=option]):hover:not(:disabled),:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_selected"],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-selected=true],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-checked=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_itemIcon"] svg{width:16px;height:16px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_footer"]{flex:none;margin-top:var(--dcu-space-1);padding-top:var(--dcu-space-1);border-top:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
[data-dcu-tool-filter]{box-sizing:border-box;flex:none;width:100%;height:32px;padding:4px var(--dcu-space-2);margin:0 0 1px;border:0;border-radius:var(--dsw-radius-lg);outline:none;background:transparent;color:inherit;font:13px/20px var(--dsw-font-family)}
/* 焦点环必须用**实色**：2026-10-14 前这里是
   「box-shadow:inset 0 0 0 1px color-mix(… label-primary 20%, transparent)」——
   一个 20% alpha 的 1px 内环，实测上限只有亮色 1.61:1 / 暗色 1.91:1，
   **数学上不可能达到 3:1**（无论基准色取多极端），WCAG 2.1 AA 2.4.7 焦点可见失效。
   改为与 settings-page-styles.ts 同款实色 outline，色值取宿主一等焦点令牌
   （亮 #0b7fff / 暗 #4099ff，在各自底色上 3.35:1 / 6.22:1）。 */
[data-dcu-tool-filter]:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px}
[data-dcu-tool-empty]{padding:var(--dcu-space-2);font-size:var(--dsw-font-size-caption);color:var(--dsw-alias-label-secondary)}
[data-dcu-tool-filtered]{display:none!important}
/* 建议菜单单独换肤：外框跟随宿主输入区，保留宿主定位和动态高度，不给内部列表套固定宽度。
   ⚠ 圆角必须是 lg(8px) 而不是 xl(12px)：宪章 §Menus 明文写了
   「Dropdown menus … use rounded-lg shells. This includes the main input's @ / \
   suggestion panel; it does not inherit the main-input exception」——
   建议菜单**明确不继承**主输入壳的 2xl 例外，此前沿用 12px 属违规，本轮按宪章收敛。 */
[data-conversation-scroll] [data-trigger-menu]{box-sizing:border-box;left:0;right:0;width:auto;min-width:0;max-width:none;padding:4px;border-radius:var(--dsw-radius-lg);background:var(--dcu-tip-bg);box-shadow:var(--dcu-tip-shadow)}

[data-conversation-scroll] [data-trigger-menu]>[role=listbox]{box-sizing:border-box;width:100%;min-width:0;align-self:stretch;scrollbar-width:thin}
[data-conversation-scroll] [data-trigger-menu] [role=option]{box-sizing:border-box;width:100%;min-width:0;min-height:28px;padding:4px 8px;gap:8px;border-radius:var(--dsw-radius-md);font-size:var(--dsw-font-size-caption);line-height:20px}
[data-conversation-scroll] [data-trigger-menu] [role=option][aria-selected=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
`;
		function observeComposerToolMenus(copy) {
			let anchor;
			let known = /* @__PURE__ */ new Set();
			let pendingUntil = 0;
			const mounted = /* @__PURE__ */ new Map();
			const now = () => Date.now();
			function capture(event) {
				const target = event.target instanceof Element ? event.target.closest(TOOL) : null;
				if (target === null || target.closest("[data-conversation-scroll]") === null) return;
				anchor = target;
				known = new Set(document.querySelectorAll(MENU));
				pendingUntil = now() + 1e3;
			}
			function mount(menu, trigger) {
				const portal = getComputedStyle(menu).position === "fixed";
				menu.setAttribute("data-dcu-tool-menu", portal ? "portal" : "inline");
				const isProject = trigger.matches("[class*=\"_heroWorkspaceRow\"]>button:first-child");
				const viewport = menu.querySelector(":scope>[class*=\"_viewport\"]");
				let input;
				let empty;
				if (isProject && viewport !== null && menu.querySelector("input") === null) {
					input = document.createElement("input");
					input.type = "search";
					input.placeholder = copy.search;
					input.setAttribute("aria-label", copy.search);
					input.setAttribute("data-dcu-tool-filter", "");
					empty = document.createElement("div");
					empty.setAttribute("data-dcu-tool-empty", "");
					empty.setAttribute("role", "status");
					empty.textContent = copy.empty;
					empty.hidden = true;
					menu.prepend(input);
					viewport.after(empty);
					input.addEventListener("input", () => {
						const query = input.value.trim().toLocaleLowerCase();
						let count = 0;
						for (const row of viewport.children) {
							const match = (row.textContent ?? "").toLocaleLowerCase().includes(query);
							row.toggleAttribute("data-dcu-tool-filtered", !match);
							if (match) count++;
						}
						empty.hidden = count > 0;
						place();
					});
					input.addEventListener("keydown", (event) => {
						if (event.key !== "ArrowDown" && event.key !== "Enter") return;
						const first = viewport.querySelector(":scope>:not([data-dcu-tool-filtered]) button:not(:disabled)");
						if (first !== null) {
							event.preventDefault();
							event.stopPropagation();
							first.focus();
							if (event.key === "Enter") first.click();
						}
					});
				}
				function place() {
					if (!trigger.isConnected || !menu.isConnected) return;
					const rect = trigger.getBoundingClientRect();
					const above = rect.top - 16;
					const below = window.innerHeight - rect.bottom - 16;
					const topSide = above >= Math.min(260, below);
					menu.style.setProperty("--dcu-tool-menu-height", `${Math.max(60, Math.min(360, topSide ? above : below))}px`);
					if (!portal) {
						const previous = parseFloat(menu.style.getPropertyValue("--dcu-tool-menu-shift")) || 0;
						const bounds = menu.getBoundingClientRect();
						const naturalLeft = bounds.left - previous;
						const left = Math.max(12, Math.min(naturalLeft, window.innerWidth - bounds.width - 12));
						menu.style.setProperty("--dcu-tool-menu-shift", `${left - naturalLeft}px`);
						return;
					}
					const bounds = menu.getBoundingClientRect();
					const viewportWidth = window.innerWidth;
					const maxWidth = Math.max(120, viewportWidth - 24);
					const width = Math.min(bounds.width, maxWidth);
					if (width < bounds.width) menu.style.setProperty("max-width", `${maxWidth}px`);
					const x = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
					const y = Math.max(12, topSide ? rect.top - bounds.height - 4 : rect.bottom + 4);
					menu.style.setProperty("--dcu-tool-menu-x", `${x}px`);
					menu.style.setProperty("--dcu-tool-menu-y", `${y}px`);
				}
				const resize = new ResizeObserver(place);
				resize.observe(menu);
				resize.observe(trigger);
				window.addEventListener("resize", place);
				window.addEventListener("scroll", place, true);
				place();
				mounted.set(menu, () => {
					resize.disconnect();
					window.removeEventListener("resize", place);
					window.removeEventListener("scroll", place, true);
					input?.remove();
					empty?.remove();
					menu.querySelectorAll("[data-dcu-tool-filtered]").forEach((row) => row.removeAttribute("data-dcu-tool-filtered"));
					menu.removeAttribute("data-dcu-tool-menu");
					for (const property of [
						"--dcu-tool-menu-x",
						"--dcu-tool-menu-y",
						"--dcu-tool-menu-height",
						"--dcu-tool-menu-shift"
					]) menu.style.removeProperty(property);
					menu.style.removeProperty("max-width");
				});
			}
			function sync() {
				for (const [menu, dispose] of mounted) if (!menu.isConnected) {
					dispose();
					mounted.delete(menu);
				}
				if (anchor === void 0 || now() > pendingUntil) return;
				for (const menu of document.querySelectorAll(MENU)) {
					if (menu.closest("[data-trigger-menu]") !== null) continue;
					if (known.has(menu) || mounted.has(menu) || menu.parentElement?.closest(MENU) !== null) continue;
					if (menu.getClientRects().length === 0) continue;
					mount(menu, anchor);
					pendingUntil = 0;
					break;
				}
			}
			const observer = new MutationObserver(sync);
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			document.addEventListener("pointerdown", capture, true);
			document.addEventListener("keydown", captureKey, true);
			function captureKey(event) {
				if ([
					"Enter",
					" ",
					"ArrowDown"
				].includes(event.key)) capture(event);
			}
			return () => {
				observer.disconnect();
				document.removeEventListener("pointerdown", capture, true);
				document.removeEventListener("keydown", captureKey, true);
				mounted.forEach((dispose) => dispose());
				mounted.clear();
			};
		}
		//#endregion
		//#region src/client/DesktopNavigationControls.tsx
		const DESKTOP_NAVIGATION_CONTROLS_STYLE = `
.dcu-desktop-navigation{display:none}
html[data-windows-titlebar] .dcu-desktop-navigation{display:flex;position:fixed;left:12px;top:calc((var(--dsh-windows-titlebar-height,40px) - 28px)/2);gap:8px;z-index:30;-webkit-app-region:no-drag}
.dcu-desktop-navigation button{appearance:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;-webkit-app-region:no-drag}
.dcu-desktop-navigation button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dcu-desktop-navigation button:disabled{opacity:.35;cursor:default}
.dcu-desktop-navigation button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px}
html[data-windows-titlebar]:not([data-fullscreen]):has(.dcu-desktop-navigation){--dsh-windows-menu-start:84px}
html[data-windows-titlebar][data-fullscreen] .dcu-desktop-navigation{display:none}
`;
		function DesktopNavigationControls({ history, t }) {
			const state = (0, react.useSyncExternalStore)(history.subscribe, history.getSnapshot, history.getSnapshot);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-desktop-navigation",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: DESKTOP_NAVIGATION_CONTROLS_STYLE }), ["back", "forward"].map((direction) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": t(`navigation.${direction}`),
					title: t(`navigation.${direction}`),
					disabled: direction === "back" ? !state.canBack : !state.canForward,
					onClick: history[direction],
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						width: "16",
						height: "16",
						viewBox: "0 0 16 16",
						fill: "none",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: direction === "back" ? "M13 8H3m0 0 4-4M3 8l4 4" : "M3 8h10m0 0-4-4m4 4-4 4",
							stroke: "currentColor",
							strokeWidth: "1.5",
							strokeLinecap: "round",
							strokeLinejoin: "round"
						})
					})
				}, direction))]
			});
		}
		//#endregion
		//#region src/client/sidebar-session.ts
		/** 先切回任务页签再创建，避免新建后仍停在频道或日程。 */
		function beginSidebarSession(setTab, startSession, workspaceId) {
			setTab("tasks");
			if (workspaceId === void 0) startSession();
			else startSession(workspaceId);
		}
		//#endregion
		//#region src/client/WorkspaceShortcutBridge.tsx
		function WorkspaceShortcutBridge({ source, openSearch, startSession, renderDirectoryFlow, t }) {
			const { searchRequest, addRequested, bindings } = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot, source.getSnapshot);
			const seenSearch = (0, react.useRef)(searchRequest);
			const openSearchRef = (0, react.useRef)(openSearch);
			openSearchRef.current = openSearch;
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const mounted = (0, react.useRef)(true);
			const pending = (0, react.useRef)(false);
			const pickedPath = (0, react.useRef)(void 0);
			const currentBindings = (0, react.useRef)(bindings);
			currentBindings.current = bindings;
			(0, react.useEffect)(() => {
				mounted.current = true;
				return () => {
					mounted.current = false;
				};
			}, []);
			(0, react.useEffect)(() => {
				pending.current = false;
				pickedPath.current = void 0;
				setBusy(false);
				setError(void 0);
			}, [bindings]);
			(0, react.useEffect)(() => {
				if (searchRequest === seenSearch.current) return;
				seenSearch.current = searchRequest;
				bindings?.closeAddWorkspace();
				openSearchRef.current();
			}, [searchRequest, bindings]);
			(0, react.useEffect)(() => {
				bindings?.setDirectoryBusy(addRequested || busy || error !== void 0);
				return () => {
					bindings?.setDirectoryBusy(false);
				};
			}, [
				bindings,
				addRequested,
				busy,
				error
			]);
			const fail = (message) => {
				bindings?.closeAddWorkspace();
				setError(message);
			};
			const isCurrent = () => mounted.current && source.getSnapshot().bindings === bindings && currentBindings.current === bindings;
			const pick = (path) => {
				if (!bindings || pending.current) return;
				pickedPath.current = path;
				pending.current = true;
				setError(void 0);
				setBusy(true);
				bindings.createWorkspace({ path }).then((workspace) => {
					if (!isCurrent()) return;
					bindings.closeAddWorkspace();
					startSession(workspace.workspaceId);
				}).catch((reason) => {
					if (isCurrent()) fail(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					if (isCurrent()) {
						pending.current = false;
						setBusy(false);
					}
				});
			};
			const chooseAgain = () => {
				setError(void 0);
				pickedPath.current = void 0;
				bindings?.setDirectoryBusy(false);
				bindings?.requestAddWorkspace?.();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [renderDirectoryFlow({
				open: addRequested,
				busy,
				onCancel: () => {
					bindings?.closeAddWorkspace();
				},
				onError: (message) => {
					pickedPath.current = void 0;
					fail(message);
				},
				onPicked: pick
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: error !== void 0,
				onClose: () => {
					setError(void 0);
				},
				title: t("workspace.addFailed"),
				closeLabel: t("sessions.close"),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					pickedPath.current !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						disabled: busy,
						onClick: () => {
							pick(pickedPath.current);
						},
						children: t("workspace.retry")
					}),
					bindings?.requestAddWorkspace && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						disabled: busy,
						onClick: chooseAgain,
						children: t("workspace.chooseAgain")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						onClick: () => {
							setError(void 0);
						},
						children: t("sessions.close")
					})
				] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					role: "alert",
					children: error
				})
			})] });
		}
		//#endregion
		//#region src/client/NewConversationSuggestions.tsx
		/**
		* 四个建议卡共用**唯一**图标色。
		*
		* 2026-10-18（设计审计 P0-1）：原先每张卡各带一个高饱和 hex
		* （蓝 `#27aaff` / 紫 `#a478e8` / 绿 `#44bd83` / 橙 `#f48235`），是从上游 Codex
		* 的建议卡 fork 时一起搬过来的。ZCode 的语言里颜色只有两种身份——**明度档** 与
		* **唯一语义色（橙，峰值状态）**；再引入四个装饰性色相等于造出第三种身份，
		* 直接稀释唯一语义色的信号强度。四张卡靠图标形状区分即可。
		*
		* 同时它是全仓亮色档唯一不达 3:1 的图标：实测蓝 2.54 / 紫 3.27 / 绿 2.37 /
		* 橙 2.60（on `#ffffff`），全部低于非文本对比度要求。收成单色顺带修掉这一点。
		*
		* ⚠ 这里必须用**宿主 `--dsw-alias-*` 令牌**，不能用 `--dcu-sidebar-icon`：
		* 本组件经 portal 挂到宿主 hero 区（`[data-phase=hero] …`, 见下方 useEffect），
		* 不在 `.dcu-root / .dcu-settings-page` 作用域内 —— 实测 `--dcu-sidebar-icon`
		* 在 hero 区未定义，`var()` 会解析失败回退成继承色（黑）。宿主令牌挂在
		* `:root:root`，作用域全覆盖，与同目录 `new-conversation-style.ts` 的既有写法一致。
		*/
		const ICON_COLOR = "var(--dsw-alias-menu-icon)";
		const categories = [
			{
				id: "explore",
				label: "home.explore",
				tasks: [{
					label: "home.explore.task1",
					prompt: "home.explore.prompt1"
				}, {
					label: "home.explore.task2",
					prompt: "home.explore.prompt2"
				}],
				Icon: ZIconTelescope
			},
			{
				id: "build",
				label: "home.build",
				tasks: [{
					label: "home.build.task1",
					prompt: "home.build.prompt1"
				}, {
					label: "home.build.task2",
					prompt: "home.build.prompt2"
				}],
				Icon: ZIconHammer
			},
			{
				id: "review",
				label: "home.review",
				tasks: [{
					label: "home.review.task1",
					prompt: "home.review.prompt1"
				}, {
					label: "home.review.task2",
					prompt: "home.review.prompt2"
				}],
				Icon: ZIconScanLine
			},
			{
				id: "fix",
				label: "home.fix",
				tasks: [{
					label: "home.fix.task1",
					prompt: "home.fix.prompt1"
				}, {
					label: "home.fix.task2",
					prompt: "home.fix.prompt2"
				}],
				Icon: ZIconBug
			}
		];
		const hints = {
			workspace: "home.workspace",
			draft: "home.draft",
			busy: "home.busy"
		};
		const emptyDraft = {
			getSnapshot: () => false,
			subscribe: () => () => {}
		};
		/** 只向宿主标题容器贡献自己的 React portal，不搬动标题、工具条或编辑器。 */
		function NewConversationSuggestions({ t, prefill, draftSource = emptyDraft }) {
			const hasDraft = (0, react.useSyncExternalStore)(draftSource.subscribe, draftSource.getSnapshot, emptyDraft.getSnapshot);
			const [target, setTarget] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const sync = () => setTarget(document.querySelector("[data-phase=hero] [class*=\"_composerHero\"]>:first-child>[class$=\"_stack\"]"));
				sync();
				const observer = new MutationObserver(sync);
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["data-phase"]
				});
				return () => observer.disconnect();
			}, []);
			return target === null ? null : (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SuggestionCards, {
				t,
				prefill,
				hasDraft
			}), target);
		}
		function SuggestionCards({ t, prefill, hasDraft = false }) {
			const [selected, setSelected] = (0, react.useState)();
			const [hint, setHint] = (0, react.useState)("ready");
			function fill(text) {
				const result = prefill?.(text) ?? "workspace";
				setHint(result);
				if (result === "ready") document.querySelector("[data-phase=hero] [data-lexical-editor=true]")?.focus();
				if (result === "workspace") document.querySelector("[data-phase=hero] [class*=\"_heroWorkspaceRow\"]>button")?.click();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-home-suggestions",
				"data-has-draft": hasDraft,
				"aria-hidden": hasDraft,
				"aria-label": t("home.suggestions"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-home-cards",
						children: categories.map(({ id, label, Icon }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: hasDraft,
							className: "dcu-home-card",
							style: { "--dcu-home-icon": ICON_COLOR },
							"aria-pressed": selected === id,
							onClick: () => {
								setSelected(selected === id ? void 0 : id);
								setHint("ready");
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { "aria-hidden": "true" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(label) })]
						}, id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-home-details",
						children: categories.map((category) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-home-tasks",
							"data-active": selected === category.id,
							"aria-hidden": selected !== category.id,
							children: category.tasks.map((task) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dcu-home-task",
								disabled: hasDraft || selected !== category.id,
								onClick: () => fill(t(task.prompt)),
								children: t(task.label)
							}, task.label))
						}, category.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-home-status",
						children: Object.keys(hints).map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dcu-home-hint",
							"data-active": hint === key,
							"aria-hidden": hint !== key,
							role: hint === key ? "status" : void 0,
							children: t(hints[key])
						}, key))
					})
				]
			});
		}
		//#endregion
		//#region src/client/CodexSidebar.tsx
		const subscribeEmptyCompanionTabs = () => () => {};
		const getEmptyCompanionTabs = () => EMPTY_COMPANION_TABS;
		const emptyFooterActions = [];
		const getEmptyFooterActions = () => emptyFooterActions;
		const SIDEBAR_COLLAPSE_SETTLE_MS = 500;
		const SIDEBAR_EXPANSION_STORAGE_KEY = "dsh-codex-ui.sidebar-expansion.v1";
		const EXTENSIONS_EXPANSION_KEY = "extensions";
		function readExtensionsOpen() {
			return readTreeExpansionState(browserStorage(), SIDEBAR_EXPANSION_STORAGE_KEY)[EXTENSIONS_EXPANSION_KEY] === true;
		}
		function writeExtensionsOpen(open) {
			const storage = browserStorage();
			const expanded = readTreeExpansionState(storage, SIDEBAR_EXPANSION_STORAGE_KEY);
			writeTreeExpansionState(storage, SIDEBAR_EXPANSION_STORAGE_KEY, {
				...expanded,
				[EXTENSIONS_EXPANSION_KEY]: open
			});
		}
		const emptyPanels = [];
		const getEmptyPanels = () => emptyPanels;
		const useLegacyPanelInfo = (selector) => selector({ activePanelId: null });
		const stylesheet$3 = `
.dcu-global-panel[aria-current=page]{background:var(--dcu-sidebar-selected);font-weight:500}

.dcu-root{width:100%;height:100%;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;background:var(--dcu-sidebar-background);color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family)}
/* 宿主侧栏列自带 40% 不透明的底色，而它上方整条链（html/body/#root/frame）都是
   rgba(0,0,0,0)。静止时 .dcu-root 铺满整列把 40% 盖住，看不出问题；
   但侧栏开合动画期间，中心列用 transform 压进侧栏区间（实测 cc.left 最小 186.8，
   而侧栏宽 264），这段既没有 .dcu-root 也没有不透明正文覆盖，
   于是直接透出桌面壁纸——用户看到的就是「拉动时露出的那点背景」。
   实测像素：侧栏 240 / 透出区 (245,245,248) 偏蓝 / 正文 248，
   且透出区的蓝偏移随纵向高度变化（100~1500px 间 B 高出 3~22），证明是壁纸而非纯色差。
   修法：给被标记的侧栏列补一层与侧栏同色的不透明底，切断穿透链。
   用 data-dcu-sidebar-column（sidebar-width.ts 自己打的标记）而非宿主 hash 类名。 */
/* 必须压过宿主这条（特异性 0,2,0，且它把侧栏刻意做成半透明渐变）：
     [data-platform="darwin"] ._6Qf49G_sidebarCol {
       background: linear-gradient(...), color-mix(... 侧栏专用填充色 40%, transparent) }
   即 macOS 下侧栏底色本身就是 40% 透明 + 蓝紫渐变 —— 用户看到的「背景虚化」就是它。
   用 0,3,0 压过并补成不透明同色，切断壁纸穿透。 */
html[data-platform] [data-dcu-sidebar-column][data-dcu-sidebar-column]{background:var(--dcu-sidebar-background,#f0f0f0)}
/* 侧栏开合动画期间，中心列用 transform 位移，中途会在「已收窄的侧栏列」与
   「还没到位的正文列」之间留下一段宽度（实测收起时 sidebarCol=56 而 cc.left=160，
   留下 104px）。这段区域下方从 frame 一直到 body/html 全是 rgba(0,0,0,0)，
   于是直接透出桌面壁纸——左侧（侧栏列，已修）与右侧同理，是同一个穿透链。
   注意：不能改 html 的底色。宿主在 macOS 下有意把 html 设成 transparent
   （html[data-platform="darwin"]{background:transparent}，且特异性 0,1,1 高于本文件），
   那是给原生毛玻璃让路的，覆盖它会破坏系统的背景材质。
   正确做法：只给 frame 补底，让动画期间任何未覆盖的缝隙都有兜底。 */
/* 加 !important 是必要的：宿主给 frame 挂了自己的底色规则，普通声明压不动
   （实测不加时 computed 仍是 rgba(0,0,0,0)）。这里只覆盖 background-color，
   不碰 backdrop-filter / background-image，原生毛玻璃与纹理不受影响。 */
/* ⚠ 2026-10-28 修复「深色下开合闪白缝」：原选择器是
     html[data-dcu-codex-sidebar-initialized] [data-dcu-codex-sidebar-initialized]
   但 data-dcu-codex-sidebar-initialized 只打在 frame 上（sidebar-width.ts 的
   frame.setAttribute），html 上从来没有 —— 选择器恒为 0 匹配（实测 querySelector 返回
   false、frame computed 一直是 rgba(0,0,0,0)）。于是链条根本没被切断：动画中露出的
   那 104px 直接透出桌面壁纸。浅色皮肤下壁纸是浅色，看不出来；深色皮肤下就是一道白缝。
   修法两点：① 去掉 html 前缀；② **只在 motion 期间上底色**（frame 在 runSidebarSlide 时
   带 data-dcu-sidebar-motion，结束后移除），静止态保留宿主壁纸/毛玻璃，不改变常驻观感。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]{background-color:var(--dsw-alias-bg-base,#f8f8f8) !important}
/* 滤镜只作用于背景，避免为设置和搜索等 fixed 后代创建侧栏包含块。 */
body[data-we-sidebar-glass] .dcu-root{position:relative;background:transparent}body[data-we-sidebar-glass] .dcu-root::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background-color:color-mix(in srgb,var(--we-sidebar-color,#fff) calc(var(--we-sidebar-alpha,.15)*.66*100%),transparent);background-image:linear-gradient(180deg,rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.14)),rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.04)) 38%,rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.01)));-webkit-backdrop-filter:blur(var(--we-sidebar-blur,16px)) saturate(var(--we-sidebar-saturate,1.8)) brightness(var(--we-glass-brightness,1.04)) contrast(1.01);backdrop-filter:blur(var(--we-sidebar-blur,16px)) saturate(var(--we-sidebar-saturate,1.8)) brightness(var(--we-glass-brightness,1.04)) contrast(1.01);box-shadow:inset 0 1px 0 rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.32)),inset 0 -1px 0 rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.08)),inset 0 0 0 .5px rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.06))}body[data-ds-dark-theme][data-we-sidebar-glass] .dcu-root::before{background-color:color-mix(in srgb,var(--we-sidebar-color,#fff) calc(var(--we-sidebar-alpha,.15)*.33*100%),transparent)}body[data-we-appwindow][data-we-sidebar-glass] .dcu-root::before{-webkit-backdrop-filter:none;backdrop-filter:none}@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){body[data-we-sidebar-glass] .dcu-root{background:#f0f0f0}body[data-ds-dark-theme][data-we-sidebar-glass] .dcu-root{background:#161616}body[data-we-sidebar-glass] .dcu-root::before{display:none}}
body[data-we-sidebar-glass] .dcu-expanded-shell,body[data-we-sidebar-glass] .dcu-compact-shell,body[data-we-sidebar-glass] .dcu-foot{position:relative}
.dcu-expanded-shell{display:flex;width:100%;min-height:0;flex:1 1 0;overflow:hidden;flex-direction:column;transform-origin:left center;transition:opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease);animation:dcu-sidebar-expanded-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}.dcu-compact-shell{display:none;width:56px}.dcu-root.dcu-collapsing .dcu-expanded-shell{opacity:0;transform:translateX(-6px);pointer-events:none;animation:none;visibility:hidden;transition:opacity var(--dcu-motion-exit-duration) var(--dcu-motion-exit-ease),transform var(--dcu-motion-exit-duration) var(--dcu-motion-exit-ease),visibility var(--dcu-motion-exit-duration) var(--dcu-motion-exit-ease)}.dcu-root.dcu-compact .dcu-expanded-shell{display:none}.dcu-root.dcu-compact .dcu-compact-shell{display:flex;min-height:0;flex:1;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}@keyframes dcu-sidebar-expanded-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}/* 收起时紧凑轨的淡入。**延迟一个 exit 时长再起跑**（2026-10-17）：
   此前它与展开态的 180ms 淡出同时开始，两者时长几乎相同 → 实测 8/17 帧
   「两套外壳都可见」（展开态 240px + 紧凑轨 56px 重叠），视觉上是糊在一起。
   改为「先出后进」：展开态按 exit 档 120ms 加速退场，紧凑轨延迟 120ms 再
   用 enter 档 160ms 淡入。实测重叠可见帧 8/17 → 0/16。
   animation-fill-mode:both 让延迟期间保持 from 态（opacity:0），否则会闪出一帧不透明。 */
@keyframes dcu-sidebar-compact-in{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
/* ZCode 几何：8px 圆角、32px 行高、px-2/py-3/gap-1 间距、150ms ease-out 过渡。 */
.dcu-root *{box-sizing:border-box}.dcu-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;flex:none;height:var(--dcu-header-height,48px);padding:calc((var(--dcu-header-height,48px) - 32px)/2) 8px calc((var(--dcu-header-height,48px) - 32px)/2) 12px}.dcu-brand{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;min-width:0;overflow:hidden}.dcu-brand svg{display:block;width:auto;max-width:100%;height:22px;min-width:0}.dcu-head-actions{display:grid;grid-auto-flow:column;grid-auto-columns:28px;align-items:center;column-gap:4px;height:28px}
.dcu-icon,.dcu-menu button,.dcu-footer-link{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:var(--dsw-radius-lg);color:var(--dcu-sidebar-icon)}.dcu-head .dcu-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0;padding:0;border-radius:var(--dsw-radius-lg);line-height:0}.dcu-head .dcu-icon svg{display:block;width:16px;height:16px}
.dcu-icon:hover,.dcu-footer-link:hover{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}
/* 2026-10-28 03k：ZCode 菜单项 hover 走全局「选中抬亮灰」tag 族（#363636/#e6e6e6），
   与图标钮的 5% hover 不同档——从共用规则里拆出。 */
.dcu-menu button:hover:not(:disabled){background:var(--dsw-alias-markdown-tag);color:var(--dcu-sidebar-primary)}
.dcu-menu{padding:0 8px 8px;display:grid;gap:4px}.dcu-menu button,.dcu-footer-link{display:grid;grid-template-columns:16px minmax(0,1fr) auto;column-gap:8px;align-items:center;width:100%;min-height:32px;padding:0 8px;border-radius:var(--dsw-radius-lg);color:var(--dcu-sidebar-primary);font-size:var(--dsw-font-size-base);line-height:20px;text-align:left;font-weight:400}
.dcu-menu-icon{display:grid;place-items:center start;width:16px;height:16px}.dcu-menu-kbd{display:inline-flex;align-items:center;justify-content:center;gap:1px;min-width:20px;height:20px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--dcu-surface);color:var(--dcu-kbd-foreground,var(--dcu-sidebar-secondary));font-family:var(--dsw-font-family);font-size:var(--dsw-font-size-xs);font-weight:500;line-height:1;letter-spacing:0;white-space:nowrap;pointer-events:none;font-variant-numeric:tabular-nums}.dcu-compact-nav .dcu-menu-kbd{display:none}.dcu-menu-icon svg,.dcu-footer-link svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-menu button:disabled{color:var(--dcu-sidebar-secondary);cursor:default;opacity:1}.dcu-menu button:disabled svg{color:var(--dcu-sidebar-secondary)}
.dcu-extensions-group{display:grid}.dcu-extension-leading{position:relative;display:block;width:16px;height:16px}.dcu-extension-leading svg{position:absolute;inset:0;transition:opacity var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-extension-default-icon{opacity:1}.dcu-extension-state-arrow{opacity:0;transform:rotate(0)}.dcu-extensions-group:hover .dcu-extension-default-icon,.dcu-extensions-toggle:focus-visible .dcu-extension-default-icon{opacity:0}.dcu-extensions-group:hover .dcu-extension-state-arrow,.dcu-extensions-toggle:focus-visible .dcu-extension-state-arrow{opacity:1}.dcu-extensions-toggle[aria-expanded=true] .dcu-extension-state-arrow{transform:rotate(90deg)}.dcu-extension-panel{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-extension-panel[data-open=false]{grid-template-rows:0fr;opacity:0;pointer-events:none}.dcu-extension-panel-inner{position:relative;min-height:0;overflow:hidden}.dcu-extension-items{position:relative;display:grid;gap:1px;margin:1px 0 4px 24px}.dcu-extension-items::before{content:"";position:absolute;left:-12px;top:0;bottom:4px;width:1px;background:var(--dcu-sidebar-border)}.dcu-extension-items button{grid-template-columns:16px minmax(0,1fr);min-height:28px;padding:0 8px;border-radius:var(--dsw-radius-lg);color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-caption);font-weight:400}
.dcu-workspaces{display:flex;min-height:0;flex:1;flex-direction:column;margin-top:8px;padding-top:4px}.dcu-workspaces.dcu-workspaces-tabs{padding-top:0}.dcu-im-tabs{display:flex;gap:2px;margin:0 8px 8px;padding:2px;background:var(--dcu-surface);border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg)}.dcu-im-tab{appearance:none;flex:1;min-width:0;height:24px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dcu-sidebar-secondary);font:500 12px/18px var(--dsw-font-family);cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-im-tab[data-on=true]{background:var(--dcu-sidebar-selected);color:var(--dcu-sidebar-primary);box-shadow:none}.dcu-native-workspaces{display:flex;min-height:0;flex:1}.dcu-native-workspaces>*{min-width:0;flex:1}.dcu-native-workspaces .ima-tabs,.dcu-native-workspaces [role=tablist]{display:none!important}.dcu-schedule-browser{display:flex;min-height:0;flex:1;flex-direction:column}.dcu-native-workspaces .dcu-schedule-views{display:flex!important;flex:none;min-height:30px;margin:0 8px 8px;padding:2px;border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg);background:var(--dcu-surface)}.dcu-schedule-views button{appearance:none;flex:1;min-width:0;height:24px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dcu-sidebar-secondary);font:500 12px/18px var(--dsw-font-family);cursor:pointer}.dcu-schedule-views button[aria-selected=true]{background:var(--dcu-sidebar-selected);color:var(--dcu-sidebar-primary);box-shadow:none}.dcu-schedule-pane{display:flex;min-height:0;flex:1}.dcu-schedule-pane>*{min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]{display:flex!important;width:100%;min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]>.dsh-st-rail{width:100%;min-width:0;padding-right:8px;scrollbar-gutter:auto}.dcu-schedule-pane .dsh-st-overview{padding-right:8px}/* 2026-10-18（设计审计 P0-6）：页脚给上方滚动区一个交代——内容在树容器边缘被硬切，
   看起来像渲染 bug。用**上投影**（不是 mask）：投影不创建合成层，与 KNOWN-ISSUES
   §27/§31 的合成层预算结论一致；-8px 偏移 + -8px 扩散让投影只贴在页脚上沿、
   不糊到页脚内容上。暗色档单独加深（亮 .10 / 暗 .18），因为暗底上同值投影几乎看不见。
   与树底部 padding-bottom:24px 配套使用（那边留空间，这边给视觉边界）。 */
.dcu-foot{display:grid;width:100%;gap:4px;padding:8px;box-shadow:0 -8px 12px -8px rgba(0,0,0,.10);transition:opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
body[data-ds-dark-theme] .dcu-foot{box-shadow:0 -8px 12px -8px rgba(0,0,0,.18)}
/* footer 插槽由各插件自绘（如 cost-meter 的余额卡片是块级卡片，记忆/任务/归档/设置是图标行），
   它们此前同处一个无样式容器里，视觉上粘成一片。这里补上容器内分隔与间距，
   让「插件卡片」与「工具行」自然分成两组。 */
.dcu-footer-actions{display:grid;gap:4px}
.dcu-settings-seat{margin-top:2px}
/* 外来内容契约的落地（契约正文见 foreign-content-contract.ts 与 docs/ZCODE-DESIGN.md §10）：
   只覆盖**契约锚点**（.cm-footer-stack / .cm-simple-summary / .cm-num / .cm-peak-classic），
   不匹配任意外来类名——覆盖范围必须可审查。锚点一旦被对方改名，覆盖会静默失效，
   由 foreign-content-contract.ts 的运行时哨兵报警。 */
.dcu-foot .cm-footer-stack{display:grid;gap:2px;padding:6px 8px 2px;border:0;border-radius:0;background:transparent;box-shadow:none}
.dcu-foot .cm-simple-summary,.dcu-foot .cm-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;background:transparent;font-size:var(--dsw-font-size-caption);font-weight:500;line-height:18px;color:var(--dcu-sidebar-secondary)}
.dcu-foot .cm-balance-name{color:var(--dcu-sidebar-secondary);font-weight:400}
/* 2026-10-18（设计审计 P1-3）：金额降视觉重量 —— 14/500/primary → 13/400/primary。
   事实：整条导航 100% 是 14px/400，只有这一处是 500 字重，于是页脚金额压过导航，
   与契约第 1 条的原意（「外来内容比导航更黑，导航就失去层级」）相反。
   保留 primary 色：契约第 1 条明确「只有承载数据本身的数值可以用 primary」——
   金额是数据，降级到 secondary 会让它读不出来。tabular-nums 保留（数字对齐不能丢）。 */
.dcu-foot .cm-num{font-size:var(--dsw-font-size-caption);font-weight:400;font-variant-numeric:tabular-nums;color:var(--dcu-sidebar-primary)}
.dcu-foot .cm-peak-classic{font-size:var(--dsw-font-size-sm);line-height:16px;color:var(--dcu-sidebar-tertiary)}
.dcu-foot .cm-peak-classic-chip{font-size:var(--dsw-font-size-sm);font-weight:400;color:var(--dcu-sidebar-secondary)}
/* 峰值条**文字**的语义色收敛（契约第 1 条 + 第 4 条，2026-10-16 实机抓到漏管）。
   外来插件在三个状态给文字上了语义色：
     .cm-peak-strip.peak .cm-peak-chip     → #ff9800（橙）
     .cm-peak-strip.weekend .cm-peak-chip  → #34a853（绿）
     .cm-peak-strip.off .cm-peak-chip      → var(--state-business-primary)
   契约第 4 条明确：语义色**只允许用于填充**（承载「是否峰值」的信息），
   「不得用于文字或卡片底」——文字归第 1 条管，只能用侧栏色阶。
   而 classic 分支的文字此前早已收敛，compact 分支是**漏网**（同一个「只登记了 classic 锚点」
   的根因，见 foreign-content-contract.ts 的锚点清单）。
   另外这三条都是**写死的颜色、不随明暗主题变化**：#ff9800 在浅色灰底上、
   #34a853 在深色底上的对比度都未经验证，收敛到色阶后自动跟随主题。
   填充保留：.cm-peak-high / .cm-peak-low / .cm-peak-marker 不动（第 4 条显式允许）。 */
/* ⚠ 特异性必须抬到 (0,3,0)：外来的状态规则是 .cm-peak-strip.weekend .cm-peak-chip
   （3 个类），单用 .dcu-foot .cm-peak-chip（2 个类）**会输**——实机实测覆盖不生效、
   chip 文字仍是 #34a853。这里改成 .dcu-root .dcu-foot .cm-peak-chip（3 个类，同特异性），
   靠源码顺序（插件样式在 skin 之后注入）确定性胜出。
   填充保留：.cm-peak-high / .cm-peak-low / .cm-peak-marker 不动（第 4 条显式允许）。 */
.dcu-root .dcu-foot .cm-peak-chip{color:var(--dcu-sidebar-secondary)}
.dcu-root .dcu-foot .cm-peak-rail-label,.dcu-root .dcu-foot .cm-peak-rail-classic-label{color:var(--dcu-sidebar-secondary)}
/* compact 峰值条（外来插件 peakStyle 的**默认**分支，契约见 foreign-content-contract.ts）。
   契约第 3 条要求「装不下就降级，不得横向溢出」，而外来内容给 .cm-peak-chip 写了
   white-space:nowrap 且无 min-width —— 它不肯收缩，把 .cm-peak-strip 顶到 237px（容器 208px），
   整条 .dcu-foot 因此溢出 13px、右侧文字被裁掉。这里补「可收缩 + 省略号」。
   实机验证（2026-10-16，隔离宿主真实页脚）：.dcu-foot 13px→0px、.cm-peak-strip 29px→0px。 */
.dcu-root .dcu-foot .cm-peak-strip{display:flex;align-items:center;gap:6px;margin-top:4px;min-width:0;font-size:var(--dsw-font-size-sm);line-height:16px;color:var(--dcu-sidebar-tertiary)}
.dcu-root .dcu-foot .cm-peak-chip{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:var(--dsw-font-size-sm);font-weight:400;color:var(--dcu-sidebar-secondary)}
/* 2026-10-28 收起跳步修复：cm-footer-stack 原本在「收起动画第一帧」就 display:none，
   「记忆/任务/归档」当场下坠 108px、头部图标排跟着跳 —— 用户看到的三段式跳动，
   第一下就是它。现在收起动画期间文字栈**原地保留**（不再提前卸载），页脚与头部
   整块随壳淡出；紧凑内容等动画结束、宽度落定的那一刻一次性出现（那一步与宽度
   变化同帧，读起来就是一次归位）。 */
.dcu-root.dcu-compact .cm-footer-stack{display:none}
.dcu-root.dcu-collapsing .dcu-foot,.dcu-root.dcu-collapsing .dcu-head{opacity:0;pointer-events:none;transition:opacity var(--dcu-motion-exit-duration) var(--dcu-motion-exit-ease)}
.dcu-settings-seat [data-slot="settings.trigger"]{color:var(--dcu-sidebar-primary)}
.dcu-settings-seat [data-slot="settings.trigger"]>svg{color:var(--dcu-sidebar-icon)}
/* 宿主列负责缩放，宽态内容保持展开宽度，避免中文竖排与工作区逐帧重排。 */
.dcu-expanded-shell,.dcu-root:not(.dcu-compact)>.dcu-foot{width:var(--dcu-sidebar-expanded-width,264px);flex-shrink:0}
/* 对齐 Codex 的半秒布局节奏；显式声明避免依赖宿主主题的动画 token。 */
.dcu-root{position:relative}
.dcu-root.dcu-collapsing .dcu-compact-shell{position:absolute;left:0;top:calc(var(--dcu-sidebar-top-clearance,0px) + (var(--dcu-header-height,40px) - 32px)/2);bottom:8px;display:flex;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease) var(--dcu-motion-exit-duration) both}
.dcu-root.dcu-collapsing .dcu-compact-shell .dcu-icon{width:32px;height:32px;flex:none}.dcu-root .dcu-compact-shell>.dcu-icon,.dcu-root.dcu-collapsing .dcu-compact-shell>.dcu-icon{width:28px;height:28px;flex:none;margin:0;padding:0;border-radius:var(--dsw-radius-lg)}
/* 收尾仅移除宽态层，窄轨不重复淡入，否则会在半秒处闪烁。 */
.dcu-root.dcu-compact .dcu-compact-shell{animation:none}
/* 原生交通灯覆盖网页顶部；宽态、窄轨和动画层共用宿主安全区，保持页脚在窗口内。 */
.dcu-root{--dcu-sidebar-top-clearance:0px}
html[data-platform=darwin]:not([data-fullscreen]) .dcu-root{--dcu-sidebar-top-clearance:var(--dsh-frame-top-clearance,48px);padding-top:var(--dcu-sidebar-top-clearance)}
html[data-platform=darwin]:not([data-fullscreen]) .dcu-root.dcu-compact{padding-top:calc(var(--dcu-sidebar-top-clearance,0px) + (var(--dcu-header-height,40px) - 32px)/2)}
/* 侧栏开合是合成层动画（1.3.0）：网格轨道在动画期间保持静止，内容列与拖拽柄用
   transform 位移。旧实现让 grid-template-columns 直接过渡，每帧全页重排、成本随
   会话内容增长（用户实测帧率随上下文长度劣化），轨道改由 JS 在动画两端一次性切换。
   dsh-better-sidebar 的 #root 规则会覆盖 transition 简写，这里显式保留它的
   padding-right，但不再把 grid-template-columns 挂进过渡。 */
#root [data-dcu-codex-sidebar-initialized]:not([data-dragging]){transition:padding-right var(--ds-transition-duration-slow,.3s) var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1))}
#root [data-dcu-codex-sidebar-initialized][data-dragging]{transition:none}
/* 2026-10-28 标题栏去重（用户裁决 A）：宿主标题栏左侧「打开侧边栏 + 新建会话」这对按钮
   （包在 _6Qf49G_leadingSeat 里，整体宽 64px、固定在 x≈88）与面包屑「打开所在项目」
   起始 x 完全重合，功能上又与插件自己的入口重复（展开态在 header、收起态在窄轨都有）。
   三条约束：
   ① 只在插件壳在场时隐藏（:has(.dcu-root)）——壳没挂上时宿主的入口必须留着；
   ② 用 :has(button[aria-label=打开侧边栏]) 限定，只吞掉「侧栏开关那对」所在的座位，
      不碰标题栏其它区域；
   ③ aria-label 随宿主语言变化 → 不匹配时按钮保留（安全降级，宁可重复也不丢入口）。 */
html[data-dsh-zcode-skin]:has(.dcu-root) [class*="_leadingSeat"]:has(button[aria-label="打开侧边栏"]){display:none}
/* 位移目标：JS 按「展开宽度 - 56」写 --dcu-sidebar-shift。**位移取 shift 的一半**。
 *
 * 几何推导（2026-10-14，用户在长对话下实测卡顿后重修）：
 * 会话内容带是**居中**的（宿主给聊天列 max-width 上限 920px）。内容列从「动画基准 1200」
 * 变为「落定后的 1384」时，居中带会自动右移一半：(1384-1200)/2 = **92 = shift/2**。
 * 因此「内容列的视觉位移」只需 shift/2 就与加宽 shift 的净效果完全等价。
 *
 * 旧写法是 width:calc(100% + shift) 配 translateX(-shift)：数学上等价，但有两个代价：
 *   1. **每一帧都在改宽度** → 整列文本重新换行排版，成本随对话长度线性增长。
 *      实测 8000 条消息（4 万节点）：动画被压成 **1 帧**、首帧 465ms（用户感知就是"卡死"）。
 *   2. 加宽瞬间内容带**先右跳 92px** 再左移回来（实测首帧带心 927 vs 应有 839），
 *      即动画开头有一次可见的突跳。
 * 去掉 width 后宽度全程恒定，浏览器无需重排：同一场景恢复到 **15~26 帧、平均 16.7ms**（60fps 基线），
 * 且首帧带心 837 约等于应有的 839、末帧精确落在收起静止位。
 *
 * 为什么取一半而不是整段：动画期间轨道钉在基准几何上（收起基准=展开列宽、展开基准=收起列宽），
 * 内容带在基准几何下的位置与「落定后的真实位置」恰好相差 shift/2，用 transform 补上这个差值即可，
 * 结束时轨道切换与 transform 归零同时发生 → 两端都不跳。
 *
 * ⚠️ 本块注释里**不得出现反引号**：它位于 CSS 模板字符串内部，一个反引号就会把模板提前截断
 * （2026-10-14 本轮就因此让 tsdown 构建失败、宿主报 failed to import）。 */
/* 位移规则（2026-10-16 性能修正）。
 *
 * JS 在动画开始就把轨道切到**目标几何**（见 sidebar-width.ts 的 beginSidebarMotion），
 * 于是内容带的天然位置**就是终点**；起点由 JS 先写死、再交回本规则过渡到 0。
 * 起点符号：收起时轨道已变窄 → 内容带天然已在收起位，要伪造展开位故起点=+shift/2；
 * 展开时相反，起点=-shift/2。
 *
 * 为什么改成了「JS 直接写 transform」而不再走 CSS 变量：
 * --dcu-sidebar-shift 是**未注册的继承型自定义属性**。写在 frame 上时，Chromium
 * 无法预知哪个后代会用 var() 消费它，只能**作废 frame 全部后代的样式**——
 * 而真实宿主里 frame 同时是会话区祖先，长对话下后代达 1.2 万个：
 *   实测单次写入：frame(1.2万后代) 44ms ／ 只含侧栏的子元素(445后代) 4ms
 * 一次开合要写多次，叠加动画期间每帧重算，就是用户报的「对话越长越卡」。
 * 改直接写 transform（非继承属性）只作废该元素自身：实测 0.3ms（快约 140 倍）；
 * 完整一次开合样式重算 172.6ms → 90.4ms，重算次数 17000 → 8000。
 * 另一处收益：@keyframes 里含 var() 会让动画无法交给合成器，去掉后重算次数直接减半。
 * 两种方案的完整对照见 docs/KNOWN-ISSUES.md §27。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-center-column]{transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease);will-change:transform}
/* 拖拽柄同曲线位移（它绝对定位于列边界，动画期间布局 left 从收起视觉位滑到展开位）。
   宿主只给展开态挂手柄，收起时它随宿主卸载，无需收起向位移。
   （2026-10-17 实测确认「可忽略」这个说法成立，不是未经验证的假设：
     left 动画期间 LayoutDuration +0.19ms / transform +0.04ms，绝对差 0.15ms，
     不值得为此引入 will-change 与层叠上下文。故保持 left 不变。） */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-side="sidebar"]{transition:left var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 位移中的内容列会盖住侧栏列（transform 生成层叠上下文）；动画期间把外壳抬到它之上。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) .dcu-root{z-index:1}
/* 侧栏面自身的滑动（2026-10-19）。JS 在飞行期间把 .dcu-root 宽度钉在展开宽度，右缘用
   clip-path 从旧宽度裁到目标宽度（见 sidebar-width.ts 的 primeSidebarSlide）。
   裁剪不触发布局，所以每帧零重排；时长与曲线必须与内容列、索引栏完全一致，
   否则三者会互相追赶。内联 transition:none 用于写起点，挂上 motion 标记后移除，
   这里这条规则才接手——顺序见 beginAnimation。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) .dcu-root{transition:clip-path var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 两个方向都要 overflow:visible：收起时外壳仍按展开宽度渲染（裁到 56），
   展开时外壳按展开宽度淡入——列本身只有 56px，不让溢出就等于一帧切完、没有滑动。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-sidebar-column]{overflow:visible}
[data-dcu-codex-sidebar-initialized][data-dragging] [data-dcu-center-column],[data-dcu-codex-sidebar-initialized][data-dragging] [data-dcu-sidebar-column],[data-dcu-codex-sidebar-initialized][data-dragging] [data-side="sidebar"]{transition:none;width:auto;transform:none}
@media (prefers-reduced-motion:reduce){[data-dcu-codex-sidebar-initialized],#root [data-dcu-codex-sidebar-initialized]:not([data-dragging]),[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-center-column],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-sidebar-column],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-side="sidebar"],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) .dcu-root,[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-official-turn-navigator]{transition:none}.dcu-root.dcu-collapsing .dcu-compact-shell{animation:none}}
.dcu-native-workspaces{flex-direction:column}.dcu-native-workspaces>[data-mcp-connector-top-mount=true]{flex:none}.dcu-root .mcpConnectorLauncher,.dcu-root [data-mcp-connector-top-mount=true]{display:none!important}
.dcu-dependency-notice{margin:0 8px 8px;border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg);padding:8px;color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-sm);line-height:18px}
/* ZCode 命令面板：rounded-2xl(16px) 壳、bg-menu、shadow-md、12px 分组标题 font-medium。 */
.dcu-search-scrim{position:fixed;z-index:10020;inset:0;display:flex;justify-content:center;align-items:flex-start;padding:72px 20px;background:color-mix(in srgb,#000 48%,transparent);animation:dcu-search-scrim-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}.dcu-search-dialog{width:min(512px,100%);max-height:min(640px,calc(100vh - 120px));overflow:auto;border:1px solid var(--dcu-tip-border);border-radius:var(--dsw-radius-2xl);padding:12px;background:var(--dcu-tip-bg);box-shadow:var(--dcu-tip-shadow);
/* 2026-10-28 03i：对齐 ZCode ⌘K 浮层——512 宽（实测）、无阴影（纯边框分隔，扁平）；
   圆角 2xl/bg/border 与 ZCode 逐值一致（card #2b2b2b/#fff + border 10%）维持原令牌。 */animation:dcu-search-dialog-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}@keyframes dcu-search-scrim-in{from{opacity:0}to{opacity:1}}@keyframes dcu-search-dialog-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1}}.dcu-search-input{margin-bottom:8px}.dcu-search-input input{height:32px;border-radius:9999px;border:1px solid var(--dsw-alias-border-l3);padding:0 10px;background:transparent}.dcu-search-section{padding:6px 0}.dcu-search-title{padding:0 8px 4px;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);font-weight:500}.dcu-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:35px;border:0;border-radius:var(--dsw-radius-xl);padding:6px 10px;background:transparent;color:var(--dcu-sidebar-primary);font:inherit;text-align:left;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-search-row:hover,.dcu-search-row[data-active=true]{background:var(--dsw-alias-markdown-tag)}.dcu-search-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 2026-10-18（设计审计 P1-4）：命中片段高亮 + 底部键位提示。
   高亮只加字重与 primary 色，不加背景：结果的 hover/active 底已经是 var(--dcu-sidebar-hover)，
   再叠一层底色会在选中行里变成两种底色打架。 */
.dcu-search-hit{background:transparent;color:var(--dcu-sidebar-primary);font-weight:600}
.dcu-search-results{display:block}
.dcu-search-hint{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;padding:8px 8px 2px;border-top:1px solid var(--dcu-sidebar-border);color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);line-height:16px}
.dcu-search-hint span{display:inline-flex;align-items:center;gap:2px}
.dcu-search-hint kbd{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 var(--dcu-space-1);border-radius:var(--dsw-radius-sm);background:var(--dcu-surface);color:var(--dcu-kbd-foreground,var(--dcu-sidebar-secondary));font-family:var(--dsw-font-family);font-size:var(--dsw-font-size-2xs);line-height:1}.dcu-search-detail{max-width:160px;overflow:hidden;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);text-overflow:ellipsis;white-space:nowrap}.dcu-search-empty{padding:var(--dcu-space-4) 8px;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-caption)}@media (prefers-reduced-motion:reduce){.dcu-expanded-shell,.dcu-root.dcu-compact .dcu-compact-shell,.dcu-foot,.dcu-search-scrim,.dcu-search-dialog,.dcu-extension-panel,.dcu-extension-leading svg{animation:none;transition:none}}
/* ZCode 输入壳：rounded-2xl(16px)、bg-input + border-input-border、发送键用 Zai primary 黑白。 */
/* 2026-10-28 二次对齐（用浅色活体把 ZCode 与 DSH 并排量了一遍）：
   ① 阴影：ZCode 输入卡**没有任何阴影**（类名里没有任何 shadow-* 工具类，computed 也是 none），
      插件此前给浅色挂了三层柔影（0 0 0 1px + 0 2px 8px + 0 4px 40px），整块卡片因此发飘、
      和 ZCode 的「平贴 + 硬边」完全不同 —— 这是用户说不好看的主因。
   ② 边框：ZCode 类名是 border-input-border = 10% 前景；插件写的是 .15（当时量到的是 hover 态）。
   ③ 宽度：ZCode 卡片宽 = 正文列 + 16（实测 800 vs 784）。DSH 这边 --dsh-chat-content-width
      还是宿主默认 640，卡片只有 672，比 784 的正文列窄 112px，看着就是"小一号"。
      这里把该变量在本作用域钉成 784，卡片随之为 800。
   ④ 宽度：ZCode 卡片宽 = 正文列 + 16（实测 800 vs 784）。DSH 这边 --dsh-chat-content-width
      是宿主默认 640、卡片 672，比 784 的正文列窄 112px。**本轮未改**：该变量同时被宿主的
      「输入框拖拽宽度」契约消费（verify-new-conversation 断言 savedWidth + 32），
      硬钉会破坏那个功能，需单独一轮设计后再动。 */
[data-conversation-scroll]{--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:24px;--dcu-composer-bg:var(--dsw-specific-input-major,#fff);
   --dcu-composer-shadow:none;--dcu-composer-border:rgba(13,13,13,.1)}
body[data-ds-dark-theme] [data-conversation-scroll]{--dcu-composer-bg:var(--dsw-alias-bg-layer-2,#242424);--dcu-composer-shadow:none;--dcu-composer-border:rgba(255,255,255,.1)}
/* C5/C6/C7（2026-10-27）：卡片内外尺寸对齐 ZCode（03d 对照矩阵）。
   - 边框 1px：ZCode 是 rgba(255,255,255,.15)；
   - 内边距 12px（原 padding-top:8px）：ZCode 四边 12px；
   - gap 12px（原 4px）：ZCode 是 12px。
   ⚠ 布局外扩补偿：卡片 box-sizing 是 border-box，**加 1px 边框不会外扩**（宽高含 border 内），
     所以不需要再减 padding。实测确认：改前 w=672 改后仍 w=672。
   padding 从 8px 加到 12px 会让内容变窄 8px、卡片变高 —— 这是对齐 ZCode 的必要代价，
   已用截图复核（见 04 执行记录）。 */
[data-conversation-scroll] [data-composer-card]{padding:12px;gap:12px;border:1px solid var(--dcu-composer-border);border-radius:var(--dsw-radius-2xl);background:var(--dcu-composer-bg);box-shadow:var(--dcu-composer-shadow)}
/* 附件轨道到正文的目标间距是官方 6px。
   宿主设计是 12px 行间距 + 元件本身 -6px 抵消；本皮肤曾把 gap 压到 4px，用 +2px 补回 6。
   C7（2026-10-27）把 gap 对齐 ZCode 提回 12px 后，补偿值必须回到 **-6px** ——
   否则间距变成 12+2=14px（实测就是 14，被 verify-upstream-style-regressions 抓到）。
   现在 12 + (-6) = 6px，与官方口径一致。 */
[data-conversation-scroll] [data-composer-card]>[data-slot="conversation.input.attachments"]>:is([class$="_rail"],[class*="_rail_"]){margin-bottom:-6px}
[data-conversation-scroll] [data-input-mirror]{min-height:40px}
[data-conversation-scroll] [data-composer-card] [data-input-scroll]{margin-right:0}
/* C8（2026-10-27）：编辑器行高 24px → 20px（ZCode 实测 14px/20px）。
   2026-10-28 二次对齐：ZCode 编辑器 min-h-10（40px）、左右**零内边距**（内缩全由卡片 12px padding
   提供），且没有额外左右 padding —— DSH 宿主自己加了 0 12px，占位符因此比 ZCode 右移 12px。
   原先钉 44px 是旧版契约（当时的空态高度断言按 12+44+12+28+2=110 写的）；ZCode 真值是
   12+40+12+28+2=106，两条断言同步改为 106。 */
[data-conversation-scroll] [data-input-scroll] [data-lexical-editor=true]{min-height:40px;padding:0;line-height:20px}
[data-conversation-scroll] [data-composer-placeholder]{inset:0 0 auto}
/* 2026-10-28：工具行容器原本自带 padding:0 8px 8px —— 那 8px 底衬让卡片比 ZCode 高 8
   （实测 114 vs 106；ZCode 的按钮行没有额外内边距，28px 就是 28px）。左右 8px 也一并归零，
   让「＋ / 权限 / 技能」与正文左缘对齐（ZCode 实测按钮行与文字同一起点）。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div{padding:0;gap:var(--dcu-space-1)}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div>div{gap:4px}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div>div>div{gap:4px}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):not([role]){min-height:28px;height:28px}
/* C9（2026-10-27）：圆角统一 8px。实测改前是四种混用：999px(yhfFVG_add) / 4px(wXeviG_trigger,cl2Rlq_trigger)
   / 8px(sk-chip) / 999px(yhfFVG_primary)。ZCode 输入区**全部按钮统一 8px**（第 9 轮评判已代为裁决）。
   注意排除 dsh-po-btn（另一个插件的提示词优化按钮，不属于本皮肤职责，
   实测它在 card 内但 class 前缀不是宿主的，误改会越界）。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):not([role]):not([class*=dsh-po-]){
  /* 用令牌而不是字面 8px（项目规定圆角必须走 --dsw-radius-*）。
     --dsw-radius-lg = 8px，正好命中 ZCode 的按钮圆角。 */
  border-radius:var(--dsw-radius-lg);
}
/* 「优化」按钮（.dsh-po-btn，来自 @y1x1n/dsh-prompt-optimizer）的胶囊圆角是**JS 内联样式**，
   实测 style 属性里直接写着胶囊圆角值 —— 内联优先级高于任何选择器，
   普通 CSS 改不动它，所以这里必须用 !important 才能统一到 8px。
   为什么该由本皮肤改：它挂在 [data-composer-card] 里、与宿主按钮同一排，
   胶囊与方形圆角混在一起视觉突兀；第 10 轮评判也要求统一。
   !important 只此一处、只针对这一颗外来按钮，不扩散。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]{
  border-radius:var(--dsw-radius-lg);
}
/* 外来「优化」按钮的内联 999px：只能靠 !important 盖掉。 */
[data-conversation-scroll] [data-composer-card] button.dsh-po-btn{
  border-radius:var(--dsw-radius-lg)!important;
}
/* Zai primary 发送键：浅色黑底白字、深色白底黑字，与 ZCode --color-primary 一致。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]{width:28px;transform:none;background:var(--dcu-primary);color:var(--dcu-primary-foreground);transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),transform var(--dcu-motion-press-duration) var(--dcu-motion-press-ease)}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]:hover:not(:disabled){background:color-mix(in srgb,var(--dcu-primary) 88%,transparent)}
/* 发送键反馈（2026-10-13 起，2026-10-28 修订）：按下时整键压到 .94 并立刻回弹
   （最短「按压」曲线 90ms）；悬停只走明度（背景混 88%），**不再位移**。
   原先悬停会把箭头 svg 右移 1px 当「前倾」手感，用户实测反馈是「按钮往右偏」——
   在一个每轮都要点的按钮上，任何悬停位移都会被读成布局不稳，删掉。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]:active:not(:disabled){transform:scale(.94)}
/* 2026-10-28：会话区左右两条「拖动改宽」手柄（宿主 ST7X_W_widthHandle，10px 宽、通高）在
   鼠标扫过时会亮出 2px 半透明竖线（::after，opacity 0→1）。用户反馈这条线在阅读时会
   突然出现、像内容分隔线，要求不要。只藏视觉提示，**保留 10px 拖动区与 col-resize 光标**——
   改宽能力本身没动（实测拖拽仍会改输入框宽度）。 */
[class*="widthHandle"]::after{display:none}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px}
/* 窄屏 composer 阴影加强：阈值与 InputHistoryDock 隐藏历史提示的 640px 共用一档。
   此前这里是 639px，与 640px 构成 1px 不一致窗口——那个窗口里阴影已加强、提示却还在。 */
@media(max-width:640px){[data-conversation-scroll]{--dcu-composer-shadow:none}}
@media(forced-colors:active){[data-conversation-scroll] [data-composer-card]{outline:1px solid CanvasText}}
html[data-dcu-official-turn-navigator-supported=true] .dcu-turn-navigator,html:has([data-dcu-official-turn-navigator]) .dcu-turn-navigator{display:none}
/* G11（2026-10-27）：宿主 marks「有高度但零刻度」时，自绘导航接管。
   实测场景：会话深度压缩后 .JXrxFq_marks 高 572px 但 children=0、innerHTML 空、
   3 秒内零 MutationObserver 事件 —— 宿主根本不渲染按钮，整条索引消失。
   宿主恢复（marks.children>0）后 JS 会移除 data-dcu-official-turn-empty，本规则立即失效。
   **优先级注意（实测踩过）**：上面那条「supported=true 就 display:none」在 supported=true 时
   同样命中，两者特异度接近，普通写法会被压住（navigator 仍 display:none、宽高 0、点击打空）。
   这里用 !important 明确表达「接管态必须赢过隐藏态」——
   它是有理由的强制优先级，不是随手加的（结构债预算已登记）。 */
html:has([data-dcu-official-turn-empty]) .dcu-turn-navigator.dcu-turn-navigator{display:block!important}
/* 2026-10-19：同一 profile 里可能同时装着 @michengai/dsh-codex-ui 与 dsh-zcode-ui（实测 desktop
   profile 两者并存）。两个包往同一个 slot 注册同一个 id 'turn-navigator'，slot 表按「包+id」
   区分，于是渲染出**两条**索引栏 —— 用户看到的就是「左右各一条、位置对不上」。
   这里做最后一道兜底：一旦出现两个自绘索引栏，只保留 DOM 中第一个（先注册者），
   后来者整体退场。用 nth-of-type 而非包名判断，避免依赖对方的类名/版本。 */
.dcu-root [data-dcu-turn-rail-stale]{display:none}
/* 多出一条索引栏时由 turn-rail-dedupe.ts 打标退场；单条时无标记，规则不生效。 */
/* 输入区把 clearance 设成 24px 后，旧镜像公式会变成 -28px，整条导航滑进侧栏。至少留 12px，贴在会话列内侧。 */
[data-dcu-official-turn-navigator]{right:auto!important;left:max(12px,calc(12px - (var(--dsh-composer-side-clearance) + 16px)))!important}
/* ===== 宿主轮次导航 → ZCode 3.16.3 索引规格（2026-10-26 CDP 实测）=====
   宿主自带 nav[aria-label="轮次导航"] 已经是「一问一轮」的索引，机制与 ZCode 相同
   （都靠 ::before 的 scaleX 做 hover），只是尺寸与数值不同。这里逐项对齐 ZCode：
     静息：刻度 12x2、opacity .58、pitch 10px
     宿主原值：刻度 20x2、opacity .6、pitch 10、scaleX .4（静息）/ .9（激活）
     ZCode 值：scaleX 1（静息）→ 2.6/1.7/1.25（hover 递进）
   ZCode 的 hover 递进需要 JS 逐条算距离，宿主只给当前条一个状态；
   因此这里先把**几何与静息态**对齐（12px 宽 / .58 透明 / 2px 高），
   hover 递进留给后续（需要接管它的指针逻辑）。
   实测规格见 优化UI插件区/ZCODE-INDEX-SPEC.md */
/* 宿主轮次导航的悬停提示框（.JXrxFq_preview）只有一条 top 0.14s 过渡：
   鼠标每换一条，它就从旧位置滑动到新位置，用 0.14 秒。快速上下扫动时实测
   落后最多 40px（≈4 条），表现为「提示框内容跟不上鼠标」（用户 2026-10-26 反馈）。
   做法：**取消位置过渡**，位置直接跳到当前条；改为只对 opacity 做短淡入，
   让内容切换是即时的。淡入用 90ms，短到不会造成新的滞后感。 */
/* 特异性 0,2,0（属性 + 类）已压过宿主单类规则，无需强制优先级。 */
/* 尊重系统的「减弱动效」：ZCode 的刻度带 motion-reduce:transition-none，
   我们之前只在自绘轨上做了，宿主轨漏了（2026-10-26 验收实测仍为 0.15s×3）。 */
@media (prefers-reduced-motion:reduce){
  /* 宿主规则挂在更深的类选择器上，实测 0,2,1 被压住，故提到 0,4,1。 */
  html[data-platform] [data-dcu-official-turn-navigator][data-dcu-official-turn-navigator] button::before,
  html[data-platform] [data-dcu-official-turn-navigator][data-dcu-official-turn-navigator] .JXrxFq_preview{transition:none}
}
[data-dcu-official-turn-navigator] .JXrxFq_preview{
  transition:opacity var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease);
  will-change:opacity;
  /* 宿主居中公式是 top = center - 50（固定 50，不是 height/2）——实测四条：
     center-top 恒为 50（含量 98 时正好≈半高，所以正常内容看不出问题）。
     但「只有提问、没有回答」的轮次框高只有 40px，此时 top 仍按 50 偏移，
     导致实际中心落在 center-30，肉眼看到提示框偏上 30px（用户点名的第 9 条）。
     补偿：把多出来的 (98 - 实际高)/2 用 translateY 推回去。
     98px 是宿主常规两段式高度（prompt + response），从 .JXrxFq_preview 的
     line-height 与 padding 反推得到的固定值，故写成常量并在此说明来源。 */
  /* 2026-10-26 起改为顶对齐（见下方规则），不再需要高度补偿，
     这里保留变量入口仅用于「宿主仍走居中模式」的兜底（当前已被上面的 top!important 覆盖）。 */
  translate: 0 var(--dcu-preview-shift, 0px);
}
@media (prefers-reduced-motion:reduce){
  [data-dcu-official-turn-navigator] .JXrxFq_preview{transition:none}
}
/* 特异性 0,2,1（属性+属性+伪元素）已高于宿主的 .JXrxFq_mark::before，
   除 left/right 需要压过内联定位外不必再叠强制优先级（结构债有预算）。 */
[data-dcu-official-turn-navigator] button::before{
  /* 宿主把 ::before 写成 position:absolute; left:24px; right:0，
     在 28px 宽的容器里只留下 4px 可见（实测物理 x=601..608，宽 8px ≈ 4 CSS px）。
     必须先归位 left:0 并放开 right，宽度 12px 才能真正生效。 */
  left:0;
  right:auto;
  width:12px;
  height:2px;
  border-radius:var(--dsw-radius-full,999px);
  transform-origin:0 50%;
  /* 颜色必须跟随主题，不能写死黑色——2026-10-26 实测：写死 rgba(13,13,13,.24)
     在深色主题（theme-zai-dark）下等于黑底黑线，整条索引完全看不见。
     改用主题令牌 --dsw-alias-label-dimmed：它本身就是「随主题翻转的中性前色」，
     两种主题下都能精确复现 ZCode 的对比度 33：
       深色 rgba(212,212,212,.3)：bg 22 → 刻度 55，差 33 ✓
       浅色 rgba(38,38,38,.3)  ：bg 248 → 刻度 215，差 33 ✓
     （推导：alpha .3 × 刻度 opacity .58 → 有效 17.4% 混合，正合 ZCode 实测的 14~17% 区间）
     opacity / transform 交给 JS 按 hover 距离逐条写内联样式（见 turn-rail-zcode.ts），
     这里不再写死 opacity/transform，否则会把宿主动效压死、也挡不住递进。 */
  background:var(--dcu-zcode-color,var(--dsw-alias-label-dimmed,rgba(128,128,128,.3)));
  /* hover 递进由 turn-rail-zcode.ts 逐条写这两个变量；CSS 只负责过渡。
     不能用固定 opacity / transform，否则会压死宿主动效也挡不住递进。 */
  opacity:var(--dcu-zcode-opacity,.58);
  transform:scaleX(var(--dcu-zcode-scale,1));
  transition:transform .15s cubic-bezier(0,0,.2,1),opacity .15s cubic-bezier(0,0,.2,1),background-color .15s cubic-bezier(0,0,.2,1);
}
/* 官方轮次导航与侧栏右缘的同步位移（2026-10-19）。它渲染在内容列内部，只会继承内容列
   那半段 transform，而侧栏右缘走的是整段——不补这一条，开合时它就与侧栏边缘越离越远
   （真宿主实测：收起时间距最大 107px，展开时最差 -25px，见 sidebar-width.ts 的判据注释）。
   用 translate 而不是 transform：宿主可能自己给 nav 挂 transform，独立属性可叠加不覆盖。
   时长与曲线必须与内容列、自绘索引栏完全一致，否则三者互相追赶。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-official-turn-navigator]{translate:var(--dcu-official-rail-shift,0px);transition:translate var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 左移后的预览朝聊天内容区展开。 */
/* ===== 浮层改为 ZCode 口径：320px 宽 / 左偏 56px / **顶对齐** =====
   2026-10-26 CDP 实测 ZCode（三条刻度，规律完全一致）：
     宽 320px、leftDelta 56px（相对导航左缘）、**topDelta = 0**（浮层顶 = 刻度顶）
   而宿主是「居中」：top = center − 50（固定 50），框高 98 时正好居中，
   但框高变化（如只有提问没有回答、框高 40px）就会偏 30px，
   且容器两端必须钳位、无法居中，产生 28~48px 偏差（四轮验收报告已确认这是居中设计的固有取舍）。

   改成顶对齐后，两端偏差**从根上消失**：浮层顶永远对齐刻度顶，不参与垂直居中，也就不需要钳位。
   同时宽 320 / 左偏 56 与 ZCode 一致。

   为什么必须强制优先级：宿主的 top 来自 JS 内联（由 --turn-preview-center 驱动），
   普通声明压不过内联样式。这里显式接管 top，并关掉之前的高度补偿 translate
   （顶对齐后不再需要补偿，留着反而会引入偏移）。 */
/* 同时用类名与 [role=tooltip] 两个锚点：真实 DOM 是 .JXrxFq_preview，
   而布局夹具（verify-upstream-style-regressions.mjs）用的是 [role=tooltip]，
   只写类名会让夹具测不到、断言报 -310。 */
/* 特异性 0,3,2（html+平台属性 + 两遍导航属性 + 角色）已高于宿主任何规则；
   只有 top 会被宿主 JS 写成内联样式，故仅 top 保留强制优先级。 */
/* 不用 html[data-platform] 前缀：布局夹具（verify-upstream-style-regressions.mjs）
   用 page.setContent 拼裸 HTML，没有 data-platform，加了前缀夹具就匹配不到、断言报 -310。
   两遍导航属性已给出 0,2,2 特异性，足够压过宿主。 */
[data-dcu-official-turn-navigator][data-dcu-official-turn-navigator] .JXrxFq_preview,
[data-dcu-official-turn-navigator][data-dcu-official-turn-navigator] [role=tooltip]{
  top:var(--dcu-preview-top,0px)!important;
  /* 左间距用「刻度左缘 → 浮层左缘」这个跨端可比口径，不看「距 nav 左缘」。
     五轮验收报告坑 1（我方量纲错误）：
       ZCode：navX=269，按钮内缩 12 → btnX=281，tipX=325
              → 距 nav 56，但**刻度左缘→浮层左缘 = 44**
       DSH  ：navX=277，按钮无内缩 → btnX=277，tipX=333
              → 距 nav 56，但刻度左缘→浮层左缘 = 56（比 ZCode 宽 12px）
     两端按钮内边距不同（ZCode 12px / DSH 0），照搬 56 就多出这 12px。
     left/right 是宿主定位属性，必须保留强制优先级。 */
  left:44px!important;
  /* ===== 浮层内容排版对齐 ZCode（2026-10-26 CDP 实测两端） =====
     ZCode：问句 P.line-clamp-2 / 14px / 500；回答 P.line-clamp-3 / 14px / 400；
            两段间距 8px（space-y-2）；总高 134px
     DSH 原：问句 13px / 500 / clamp 1；回答 12px / 400 / clamp 3；段间距 4px；总高 98px
     结构两边本来就都是「问句 + 回答」两段，只差字号、行数与间距三项，故纯 CSS 即可。
     行高按 14px × 1.45 ≈ 20px（ZCode 实测问句 h=40/clamp2、回答 h=60/clamp3，即每行 20px）。 */
  --dcu-preview-fs: 14px;
  --dcu-preview-lh: 20px;
  --dcu-preview-gap: 8px;
  /* 宿主给浮层设了 max-height（由 --turn-preview-height 驱动，常态 100px），
     会把回答从 3 行裁成 1 行。ZCode 的浮层高 134px = 10 + 40 + 8 + 60 + 10 +
     余量；这里放开到 160px，让 2 行问句 + 3 行回答能完整显示（实测 2×20 + 8 + 3×20 + 20 = 128）。 */
  /* max-height 由宿主按 --turn-preview-height 写死（常态 100px），必须强制覆盖；
     height 保持 auto 让内容自然撑开，不需要强制优先级。 */
  max-height:160px!important;
  height:auto;
  /* 宿主原规则是 width:min(300px, 100cqw - 120px)，ZCode 实测 320px。
     这两行在上一轮插排版规则时被误删过（导致宽度回落 300），已补回并加了回归断言。 */
  width:320px;
  max-width:320px;
}
/* G2（04-open-gaps）：键盘焦点环。
   ZCode：focus-visible 用 ring-2 + ring-input-border-focused + ring-offset-2，
   其中 --color-input-border-focused 映射到 var(--color-brand)，即**语义色令牌**而非写死颜色。
   DSH 侧对应物实测为 --dsw-focus-ring-color = #0b7fff（brand 语义），
   回退变量 --dcu-focus 与本文件其他 focus 规则保持同一写法。
   ring-2 ≈ 2px solid；ring-offset-2 ≈ outline-offset 2px。 */
/* 注意：宿主有 .JXrxFq_mark:focus-visible{outline:none}（特异性 0,2,0），
   单属性选择器 0,2,1 虽更高，但实测仍被其后加载的规则压住，
   故用两遍导航属性提到 0,3,1，与刻度 ::before 的写法保持一致。 */
[data-dcu-official-turn-navigator][data-dcu-official-turn-navigator] button:focus-visible{
  outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));
  outline-offset:2px;
}
/* 问句：ZCode 为 line-clamp-2 / 14px / 500 */
[data-dcu-official-turn-navigator] .JXrxFq_previewPrompt{
  font-size: var(--dcu-preview-fs);
  line-height: var(--dcu-preview-lh);
  font-weight: 500;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
/* 回答：ZCode 为 line-clamp-3 / 14px / 400，与问句间距 8px */
[data-dcu-official-turn-navigator] .JXrxFq_previewResponse{
  margin-top: var(--dcu-preview-gap);
  font-size: var(--dcu-preview-fs);
  line-height: var(--dcu-preview-lh);
  font-weight: 400;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
`;
		function MenuIcon({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-menu-icon",
				children
			});
		}
		/**
		* 菜单行的快捷键提示（ZCode `Kbd`/`KbdGroup` 的等价物）。
		*
		* 数据来自宿主命令目录的 `keys`（已按平台格式化），不自己拼键名——否则 macOS 的
		* ⌘ 与 Windows 的 Ctrl 会写死成一种。目录未就绪时 `keys` 为空，这里返回 null，
		* 行里就只显示图标与文字，不留空占位（与 ZCode 的「无提示即不渲染」一致）。
		*/
		function MenuKbd({ keys }) {
			if (keys.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dcu-menu-kbd",
				"aria-hidden": "true",
				children: keys.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: key }, key))
			});
		}
		/** 搜索面板结果总上限。 */
		const SEARCH_RESULT_LIMIT = 12;
		/**
		* 每组保底条数。三组必须都在结果里露头（审计「一个组不能吃满配额」的要求），
		* 但**不能**按 1/3 硬分——三组大小差异极大（见 SidebarSearch 里 results 的说明）。
		* 3 × 3 = 9 < 12，剩余 3 条按组顺序回填，单组命中多时仍能长到 7 条。
		*/
		const SEARCH_GROUP_FLOOR = 3;
		/**
		* 把 label 中命中 query 的片段包成 <mark>，供搜索面板高亮。
		*
		* 2026-10-18（设计审计 P1-4）：先前匹配串没有高亮，用户扫读结果时得逐行重读才知道
		* 命中在哪。这里只做**大小写不敏感的首个命中段**高亮：结果行本身短（会话标题 / 设置名），
		* 多处高亮会变成闪光噪声。query 为空时原样返回，不做任何包装。
		*/
		function highlightMatch(label, query) {
			const needle = query.trim();
			if (needle === "") return label;
			const at = label.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
			if (at < 0) return label;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				label.slice(0, at),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mark", {
					className: "dcu-search-hit",
					children: label.slice(at, at + needle.length)
				}),
				label.slice(at + needle.length)
			] });
		}
		/** 搜索状态与大侧栏隔离：输入、悬停和开关弹窗都不能让工作区树跟着重渲染。 */
		const SidebarSearch = (0, react.forwardRef)(function SidebarSearch({ imSettingsAvailable, openPlugins, openSession, startSession, t, useSessions, useWorkspaces, settingsSeat }, ref) {
			const [open, setOpen] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [activeIndex, setActiveIndex] = (0, react.useState)(0);
			const deferredQuery = (0, react.useDeferredValue)(query);
			const sessions = useSessions((state) => state);
			const workspaces = useWorkspaces((state) => state);
			const close = (0, react.useCallback)(() => {
				setOpen(false);
				setQuery("");
				setActiveIndex(0);
			}, []);
			(0, react.useImperativeHandle)(ref, () => ({ open: () => {
				setOpen(true);
			} }), []);
			const selectSection = (0, react.useCallback)((label) => {
				openSettingsSection(settingsSeat.current, label);
			}, [settingsSeat]);
			const selectExternalSection = (0, react.useCallback)((label) => {
				openSettingsSection(settingsSeat.current, label, () => {
					selectSection(t("about.nav"));
				});
			}, [
				selectSection,
				settingsSeat,
				t
			]);
			const openImSettings = (0, react.useCallback)(() => {
				routeOptionalSettingsSection(imSettingsAvailable, () => {
					selectExternalSection([t("sidebar.imSettings"), "IM助理"]);
				}, () => {
					selectSection(t("about.nav"));
				});
			}, [
				imSettingsAvailable,
				selectExternalSection,
				selectSection,
				t
			]);
			const openSettings = (0, react.useCallback)(() => {
				openSettingsRoot(settingsSeat.current);
			}, [settingsSeat]);
			const entries = (0, react.useMemo)(() => {
				const archived = new Set(workspaces.archivedSessionIds);
				const workspaceTitles = new Map(workspaces.items.flatMap((workspace) => workspace.sessionIds.map((sessionId) => [String(sessionId), workspace.title])));
				const sessionEntries = sessions.ids.map((id) => sessions.byId[id]).filter((session) => session !== void 0 && !archived.has(session.id) && isTaskSession(session)).sort((left, right) => right.updatedAt - left.updatedAt).map((session) => ({
					id: `session:${session.id}`,
					group: "sessions",
					label: session.displayTitle,
					keywords: `${session.cwd ?? ""} ${session.id}`,
					detail: workspaceTitles.get(String(session.id)) ?? session.cwd,
					run: () => {
						close();
						openSession(session.id);
					}
				}));
				const settingEntries = [
					{
						id: "settings:root",
						group: "settings",
						label: t("search.settings"),
						keywords: t("search.settings"),
						run: () => {
							close();
							openSettings();
						}
					},
					{
						id: "settings:experts",
						group: "settings",
						label: t("sidebar.experts"),
						keywords: t("search.settings"),
						run: () => {
							close();
							selectExternalSection(t("sidebar.experts"));
						}
					},
					{
						id: "settings:skills",
						group: "settings",
						label: t("sidebar.skills"),
						keywords: t("search.settings"),
						run: () => {
							close();
							selectExternalSection(t("sidebar.skills"));
						}
					},
					{
						id: "settings:plugins",
						group: "settings",
						label: t("sidebar.plugins"),
						keywords: t("search.settings"),
						run: () => {
							close();
							openPlugins();
						}
					},
					{
						id: "settings:plugin-config",
						group: "settings",
						label: t("settings.pluginConfig"),
						keywords: t("search.settings"),
						run: () => {
							close();
							openSettingsSection(settingsSeat.current, t("settings.pluginConfig"));
						}
					},
					{
						id: "settings:connectors",
						group: "settings",
						label: t("sidebar.connectors"),
						keywords: t("search.settings"),
						run: () => {
							close();
							selectSection(t("sidebar.connectors"));
						}
					},
					{
						id: "settings:schedule",
						group: "settings",
						label: t("sidebar.schedule"),
						keywords: t("search.settings"),
						run: () => {
							close();
							selectExternalSection(t("sidebar.schedule"));
						}
					},
					{
						id: "settings:assistant",
						group: "settings",
						label: t("sidebar.assistant"),
						keywords: t("search.settings"),
						run: () => {
							close();
							openImSettings();
						}
					},
					{
						id: "settings:about",
						group: "settings",
						label: t("about.nav"),
						keywords: t("search.settings"),
						run: () => {
							close();
							selectSection(t("about.nav"));
						}
					}
				];
				return [
					...sessionEntries,
					...settingEntries,
					{
						id: "action:new",
						group: "actions",
						label: t("sidebar.newTask"),
						keywords: t("search.actions"),
						run: () => {
							close();
							startSession();
						}
					}
				];
			}, [
				close,
				openImSettings,
				openPlugins,
				openSession,
				openSettings,
				selectExternalSection,
				selectSection,
				sessions.byId,
				sessions.ids,
				startSession,
				t,
				workspaces.archivedSessionIds,
				workspaces.items
			]);
			const results = (0, react.useMemo)(() => {
				const matched = filterSidebarSearchItems(entries, deferredQuery);
				return allocateSearchQuota([
					"sessions",
					"settings",
					"actions"
				].map((group) => matched.filter((entry) => entry.group === group)), SEARCH_RESULT_LIMIT, SEARCH_GROUP_FLOOR);
			}, [deferredQuery, entries]);
			(0, react.useEffect)(() => {
				setActiveIndex(0);
			}, [query, open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKeyDown = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						close();
						return;
					}
					if (event.key === "ArrowDown") {
						event.preventDefault();
						setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
						return;
					}
					if (event.key === "ArrowUp") {
						event.preventDefault();
						setActiveIndex((index) => Math.max(index - 1, 0));
						return;
					}
					if (event.key === "Enter") {
						const entry = results[activeIndex];
						if (entry !== void 0) {
							event.preventDefault();
							entry.run();
						}
					}
				};
				window.addEventListener("keydown", onKeyDown, true);
				return () => {
					window.removeEventListener("keydown", onKeyDown, true);
				};
			}, [
				activeIndex,
				close,
				open,
				results
			]);
			if (!open) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-search-scrim",
				onMouseDown: (event) => {
					if (event.target === event.currentTarget) close();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "dcu-search-dialog",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("sidebar.search"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-search-input",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								autoFocus: true,
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSearch, { size: 16 }),
								value: query,
								placeholder: t("search.placeholder"),
								onChange: (event) => {
									setQuery(event.target.value);
								}
							})
						}),
						results.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-search-results",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-search-empty",
								children: t("search.empty")
							})
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-search-results",
							children: [
								"sessions",
								"settings",
								"actions"
							].map((group) => {
								const grouped = results.filter((entry) => entry.group === group);
								if (grouped.length === 0) return null;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: "dcu-search-section",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dcu-search-title",
										children: t(`search.${group}`)
									}), grouped.map((entry) => {
										const index = results.indexOf(entry);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dcu-search-row",
											"data-active": index === activeIndex,
											onMouseEnter: () => {
												setActiveIndex(index);
											},
											onClick: entry.run,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dcu-search-main",
												children: highlightMatch(entry.label, deferredQuery)
											}), entry.detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dcu-search-detail",
												children: entry.detail
											})]
										}, entry.id);
									})]
								}, group);
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-search-hint",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", { children: "↑" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", { children: "↓" }),
									" ",
									t("search.hintMove")
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", { children: "↵" }),
									" ",
									t("search.hintOpen")
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", { children: "esc" }),
									" ",
									t("search.hintClose")
								] })
							]
						})
					]
				})
			});
		});
		/** Codex 风格的 DSH 侧栏，只替换导航外观，项目浏览和设置仍由 DSH 官方组件提供。 */
		function CodexSidebar({ workspaceShortcuts, navigationHistory, globalPanels, footerActions, selectPanel, usePanelInfo = useLegacyPanelInfo, collapsed, width, openSession, startSession, toggleSidebar, archiveSession, canDeleteSession, deleteSession, forkSession, moveSession, renameSession, openPath, companionSlots, renderSlot, t, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces, prefillNewConversation, newConversationDraft, shortcuts }) {
			const shortcutOf = useShortcutLookup(shortcuts);
			const panels = (0, react.useSyncExternalStore)(globalPanels?.subscribe ?? subscribeEmptyCompanionTabs, globalPanels?.getSnapshot ?? getEmptyPanels, globalPanels?.getSnapshot ?? getEmptyPanels);
			const extensionPanels = panels.filter((panel) => panel.id === "schedules");
			const topPanels = panels.filter((panel) => panel.id !== "schedules");
			const visibleFooterActions = (0, react.useSyncExternalStore)(footerActions?.subscribe ?? subscribeEmptyCompanionTabs, footerActions?.getSnapshot ?? getEmptyFooterActions, footerActions?.getSnapshot ?? getEmptyFooterActions);
			const activePanelId = usePanelInfo((info) => info.activePanelId);
			const panelActive = activePanelId !== null && activePanelId !== "";
			const panelButtons = (wide) => selectPanel === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GlobalPanelButtons, {
				panels: topPanels,
				activeId: activePanelId,
				wide,
				selectPanel,
				renderIcon: (id, active) => renderSlot("sidebar.panellist", {
					size: 16,
					active
				}, { only: id })
			});
			const compact = collapsed || width < 80;
			(0, react.useEffect)(() => {
				const footer = footRef.current;
				return footer === null ? void 0 : auditForeignFooterContent(footer);
			}, []);
			const [visualCompact, setVisualCompact] = (0, react.useState)(compact);
			const [collapsing, setCollapsing] = (0, react.useState)(false);
			const settingsSeat = (0, react.useRef)(null);
			const search = (0, react.useRef)(null);
			const footRef = (0, react.useRef)(null);
			const openSearch = () => {
				workspaceShortcuts?.getSnapshot().bindings?.closeAddWorkspace();
				search.current?.open();
			};
			const toggleSidebarRef = (0, react.useRef)(toggleSidebar);
			toggleSidebarRef.current = toggleSidebar;
			const expandSidebar = (0, react.useCallback)(() => {
				toggleSidebarRef.current();
			}, []);
			const [extensionsOpen, setExtensionsOpen] = (0, react.useState)(readExtensionsOpen);
			const [imTab, setImTab] = (0, react.useState)("tasks");
			const beginSession = (0, react.useCallback)((workspaceId) => {
				beginSidebarSession(setImTab, startSession, workspaceId);
			}, [startSession]);
			const companionTabs = (0, react.useSyncExternalStore)(companionSlots?.subscribe ?? subscribeEmptyCompanionTabs, companionSlots?.getSnapshot ?? getEmptyCompanionTabs, companionSlots?.getSnapshot ?? getEmptyCompanionTabs);
			const showChannels = companionTabs.channels;
			const showSchedule = companionTabs.schedule;
			const showCompanionTabs = showChannels || showSchedule;
			const selectSection = (label) => {
				openSettingsSection(settingsSeat.current, label);
			};
			const openPlugins = () => {
				openSettingsSection(settingsSeat.current, [t("sidebar.marketplace"), t("sidebar.builtinPlugins")]);
			};
			const selectExternalSection = (label) => {
				openSettingsSection(settingsSeat.current, label, () => {
					selectSection(t("about.nav"));
				});
			};
			const openImSettings = () => {
				routeOptionalSettingsSection(showChannels, () => {
					selectExternalSection([t("sidebar.imSettings"), "IM助理"]);
				}, () => {
					selectSection(t("about.nav"));
				});
			};
			(0, react.useEffect)(() => {
				if (imTab === "channels" && !showChannels) setImTab("tasks");
				if (imTab === "schedule" && !showSchedule) setImTab("tasks");
			}, [
				imTab,
				showChannels,
				showSchedule
			]);
			(0, react.useEffect)(() => {
				let startX = 0;
				let startWidth = 200;
				let dragging = false;
				let pointerId;
				let frame;
				let handle;
				const stopHostDrag = (event) => {
					event.preventDefault();
					event.stopPropagation();
				};
				const finishDrag = () => {
					frame?.removeAttribute("data-dragging");
					handle?.removeAttribute("data-dragging");
					if (handle !== void 0 && pointerId !== void 0 && handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
					dragging = false;
					pointerId = void 0;
					frame = void 0;
					handle = void 0;
				};
				const onDown = (event) => {
					if (dragging || !isSidebarDragHandle(event.target)) return;
					const nextFrame = findSidebarFrame(document);
					if (nextFrame === void 0) return;
					settleSidebarMotion(nextFrame);
					const tracks = parseSidebarGrid(nextFrame.style.gridTemplateColumns);
					const nextHandle = event.target instanceof Element ? event.target.closest("[data-side=\"sidebar\"]") ?? void 0 : void 0;
					if (tracks === void 0 || nextHandle === void 0) return;
					stopHostDrag(event);
					dragging = true;
					pointerId = event.pointerId;
					startX = event.clientX;
					startWidth = tracks.sidebar;
					frame = nextFrame;
					handle = nextHandle;
					frame.setAttribute("data-dragging", "");
					handle.setAttribute("data-dragging", "true");
					try {
						handle.setPointerCapture(event.pointerId);
					} catch {}
				};
				const onMove = (event) => {
					if (!dragging || event.pointerId !== pointerId || frame === void 0) return;
					stopHostDrag(event);
					applySidebarWidth(frame, sidebarWidthDuringDrag(startWidth, startX, event.clientX));
				};
				const onUp = (event) => {
					if (!dragging || event.pointerId !== pointerId) return;
					stopHostDrag(event);
					if (frame !== void 0) applySidebarWidth(frame, sidebarWidthDuringDrag(startWidth, startX, event.clientX));
					const collapse = shouldCollapseOnSidebarDrag(startWidth, startX, event.clientX);
					finishDrag();
					if (collapse) window.requestAnimationFrame(() => {
						window.requestAnimationFrame(() => {
							toggleSidebarRef.current();
						});
					});
				};
				const onCancel = (event) => {
					if (event.pointerId !== pointerId) return;
					stopHostDrag(event);
					finishDrag();
				};
				window.addEventListener("pointerdown", onDown, true);
				window.addEventListener("pointermove", onMove, true);
				window.addEventListener("pointerup", onUp, true);
				window.addEventListener("pointercancel", onCancel, true);
				return () => {
					finishDrag();
					window.removeEventListener("pointerdown", onDown, true);
					window.removeEventListener("pointermove", onMove, true);
					window.removeEventListener("pointerup", onUp, true);
					window.removeEventListener("pointercancel", onCancel, true);
				};
			}, []);
			(0, react.useLayoutEffect)(() => {
				if (!compact) {
					setCollapsing(false);
					setVisualCompact(false);
					return;
				}
				if (visualCompact) {
					setCollapsing(false);
					return;
				}
				if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true) {
					setCollapsing(false);
					setVisualCompact(true);
					return;
				}
				setCollapsing(true);
				const timer = window.setTimeout(() => {
					setVisualCompact(true);
					setCollapsing(false);
				}, SIDEBAR_COLLAPSE_SETTLE_MS);
				return () => {
					window.clearTimeout(timer);
				};
			}, [compact, visualCompact]);
			const workspaceSlot = (0, react.useMemo)(() => {
				return renderSlot("sidebar.workspaces", {
					wide: true,
					expandSidebar,
					panelActive
				});
			}, [
				expandSidebar,
				panelActive,
				renderSlot
			]);
			const scheduleOverviewSlot = (0, react.useMemo)(() => renderSlot("sidebar.schedule", {
				wide: true,
				expandSidebar,
				openSession,
				archiveSession,
				deleteSession,
				forkSession,
				moveSession,
				renameSession,
				openPath,
				useSessions,
				useWorkspaces,
				view: "overview",
				showViewSwitch: false
			}), [
				archiveSession,
				companionTabs.schedule,
				deleteSession,
				expandSidebar,
				forkSession,
				moveSession,
				openPath,
				openSession,
				renameSession,
				renderSlot,
				useSessions,
				useWorkspaces
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: `dcu-root${visualCompact ? " dcu-compact" : ""}${collapsing ? " dcu-collapsing" : ""}`,
				"aria-label": t("sidebar.label"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet$3 }),
					navigationHistory && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DesktopNavigationControls, {
						history: navigationHistory,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: NEW_CONVERSATION_STYLE }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: COMPOSER_TOOL_MENU_STYLE }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewConversationSuggestions, {
						t,
						prefill: prefillNewConversation,
						draftSource: newConversationDraft
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-expanded-shell",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: "dcu-head",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-brand",
									"aria-label": t("sidebar.newTask"),
									"aria-keyshortcuts": shortcutOf("session.new")?.aria,
									onClick: () => {
										beginSession();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.BrandWordmark, { size: 24 })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-head-actions",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dcu-icon",
										"aria-label": t("sidebar.collapse"),
										onClick: toggleSidebar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconCollapse, { size: 16 })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dcu-icon",
										"aria-label": t("sidebar.search"),
										"aria-keyshortcuts": shortcutOf("session.search")?.aria,
										onClick: openSearch,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSearch, { size: 16 })
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
								className: "dcu-menu",
								"aria-label": t("sidebar.mainMenu"),
								children: [
									panelButtons(true),
									panelActive && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dcu-back-to-session",
										onClick: () => {
											selectPanel?.(null);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconBack, { size: 16 }) }), t("sidebar.backToConversation")]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											beginSession();
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconNewTask, { size: 16 }) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("sidebar.newTask") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuKbd, { keys: shortcutOf("session.new")?.keys ?? [] })
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: openSearch,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSearch, { size: 16 }) }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("sidebar.search") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuKbd, { keys: shortcutOf("session.search")?.keys ?? [] })
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-extensions-group",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: "dcu-extensions-toggle",
											"aria-expanded": extensionsOpen,
											"aria-controls": "dcu-extension-items",
											onClick: () => {
												setExtensionsOpen((open) => {
													const next = !open;
													writeExtensionsOpen(next);
													return next;
												});
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dcu-extension-leading",
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconExtensions, {
													className: "dcu-extension-default-icon",
													size: 16
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconChevronRight, { className: "dcu-extension-state-arrow" })]
											}) }), t("sidebar.extensions")]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											id: "dcu-extension-items",
											className: "dcu-extension-panel",
											"data-open": extensionsOpen,
											"aria-hidden": !extensionsOpen,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dcu-extension-panel-inner",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "dcu-extension-items",
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															tabIndex: extensionsOpen ? 0 : -1,
															onClick: () => {
																selectExternalSection(t("sidebar.experts"));
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconExperts, { size: 16 }) }), t("sidebar.experts")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															tabIndex: extensionsOpen ? 0 : -1,
															onClick: () => {
																selectExternalSection(t("sidebar.skills"));
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSkills, { size: 16 }) }), t("sidebar.skills")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															tabIndex: extensionsOpen ? 0 : -1,
															onClick: () => {
																openPlugins();
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconPlugins, { size: 16 }) }), t("sidebar.plugins")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															tabIndex: extensionsOpen ? 0 : -1,
															onClick: () => {
																selectSection(t("sidebar.connectors"));
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconConnectors, { size: 16 }) }), t("sidebar.connectors")]
														}),
														extensionPanels.map((panel) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															tabIndex: extensionsOpen ? 0 : -1,
															"aria-current": activePanelId === panel.id ? "page" : void 0,
															onClick: () => {
																selectPanel?.(panel.id);
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: renderSlot("sidebar.panellist", {
																size: 16,
																active: activePanelId === panel.id
															}, { only: panel.id }) }), panel.label]
														}, panel.id)),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															tabIndex: extensionsOpen ? 0 : -1,
															onClick: () => {
																selectExternalSection(t("sidebar.schedule"));
															},
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSchedule, { size: 16 }) }), t("sidebar.schedule")]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
															type: "button",
															tabIndex: extensionsOpen ? 0 : -1,
															onClick: openImSettings,
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuIcon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconAssistant, { size: 16 }) }), t("sidebar.assistant")]
														})
													]
												})
											})
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: showCompanionTabs ? "dcu-workspaces dcu-workspaces-tabs" : "dcu-workspaces",
								children: [showCompanionTabs && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-im-tabs",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dcu-im-tab",
											"data-on": imTab === "tasks",
											onClick: () => {
												setImTab("tasks");
											},
											children: t("sidebar.tasksTab")
										}),
										showChannels && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dcu-im-tab",
											"data-on": imTab === "channels",
											onClick: () => {
												setImTab("channels");
											},
											children: t("sidebar.channelsTab")
										}),
										showSchedule && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dcu-im-tab",
											"data-on": imTab === "schedule",
											onClick: () => {
												setImTab("schedule");
											},
											children: t("sidebar.scheduleTab")
										})
									]
								}), imTab === "channels" && showChannels ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-native-workspaces",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelBrowser, {
										openSession,
										archiveSession,
										deleteSession,
										canDeleteSession,
										forkSession,
										moveSession,
										renameSession,
										useSessions,
										useSessionPendingInteraction,
										useSessionStatus,
										useWorkspaces,
										panelActive,
										t
									})
								}) : imTab === "schedule" && showSchedule ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-native-workspaces",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScheduleBrowser, {
										openSession,
										archiveSession,
										deleteSession,
										canDeleteSession,
										forkSession,
										moveSession,
										renameSession,
										useSessions,
										useSessionPendingInteraction,
										useSessionStatus,
										useWorkspaces,
										panelActive,
										t,
										overviewContent: scheduleOverviewSlot,
										openTaskSettings: (request) => {
											openSettingsSection(settingsSeat.current, t("sidebar.schedule"), () => {
												clearAutomationTaskSettingsRequest();
												selectSection(t("about.nav"));
											}, () => {
												requestAutomationTaskSettings(request);
											});
										}
									})
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-native-workspaces",
									children: workspaceSlot
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-compact-shell",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dcu-icon",
							"aria-label": t("sidebar.expand"),
							title: t("sidebar.expand"),
							onClick: toggleSidebar,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconCollapse, { size: 16 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
							className: "dcu-compact-nav",
							"aria-label": t("sidebar.mainMenu"),
							children: [
								panelButtons(false),
								panelActive && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.backToConversation"),
									title: t("sidebar.backToConversation"),
									onClick: () => {
										selectPanel?.(null);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconBack, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.newTask"),
									title: t("sidebar.newTask"),
									"aria-keyshortcuts": shortcutOf("session.new")?.aria,
									onClick: () => {
										beginSession();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconNewTask, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.search"),
									title: t("sidebar.search"),
									"aria-keyshortcuts": shortcutOf("session.search")?.aria,
									onClick: openSearch,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSearch, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.experts"),
									title: t("sidebar.experts"),
									onClick: () => {
										selectExternalSection(t("sidebar.experts"));
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconExperts, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.skills"),
									title: t("sidebar.skills"),
									onClick: () => {
										selectExternalSection(t("sidebar.skills"));
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSkills, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.plugins"),
									title: t("sidebar.plugins"),
									onClick: () => {
										openPlugins();
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconPlugins, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.connectors"),
									title: t("sidebar.connectors"),
									onClick: () => {
										selectSection(t("sidebar.connectors"));
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconConnectors, { size: 16 })
								}),
								extensionPanels.map((panel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": panel.label,
									title: panel.label,
									onClick: () => {
										selectPanel?.(panel.id);
									},
									children: renderSlot("sidebar.panellist", {
										size: 16,
										active: activePanelId === panel.id
									}, { only: panel.id })
								}, panel.id)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.schedule"),
									title: t("sidebar.schedule"),
									onClick: () => {
										selectExternalSection(t("sidebar.schedule"));
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSchedule, { size: 16 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-icon",
									"aria-label": t("sidebar.assistant"),
									title: t("sidebar.assistant"),
									onClick: openImSettings,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconAssistant, { size: 16 })
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						ref: footRef,
						className: "dcu-foot",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-footer-actions",
							children: footerActions === void 0 ? renderSlot("sidebar.footer.action", { wide: !visualCompact }) : visibleFooterActions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: renderSlot("sidebar.footer.action", { wide: !visualCompact }, { only: action.id }) }, action.id))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: settingsSeat,
							className: "dcu-settings-seat",
							children: renderSlot("sidebar.settings", { wide: !visualCompact })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarSearch, {
						ref: search,
						imSettingsAvailable: showChannels,
						openPlugins,
						settingsSeat,
						openSession,
						startSession: beginSession,
						t,
						useSessions,
						useWorkspaces
					}),
					workspaceShortcuts && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceShortcutBridge, {
						source: workspaceShortcuts,
						openSearch,
						startSession: (id) => {
							beginSession(id);
						},
						renderDirectoryFlow: (owner) => renderSlot("sidebar.codex.directoryFlow", owner),
						t
					})
				]
			});
		}
		CodexSidebar.displayName = "zcode-ui-for-dsh";
		//#endregion
		//#region src/dependencies.ts
		const MANAGED_DEPENDENCIES = [
			{
				id: "ui",
				packageName: "dsh-zcode-ui"
			},
			{
				id: "experts",
				packageName: "@michengai/dsh-agency-agents"
			},
			{
				id: "skills",
				packageName: "@michengai/dsh-skills-manager"
			},
			{
				id: "archive",
				packageName: "@michengai/dsh-archive-manager"
			},
			{
				id: "im",
				packageName: "@michengai/dsh-im-connect"
			},
			{
				id: "schedule",
				packageName: "@michengai/dsh-automation"
			},
			{
				id: "btw",
				packageName: "@michengai/dsh-btw"
			},
			{
				id: "simplify",
				packageName: "@michengai/dsh-simplify"
			},
			{
				id: "pua",
				packageName: "@michengai/dsh-pua"
			},
			{
				id: "review",
				packageName: "@michengai/dsh-code-review"
			},
			{
				id: "pet",
				packageName: "@michengai/dsh-codex-pet"
			},
			{
				id: "market",
				packageName: "dshmarket"
			}
		];
		//#endregion
		//#region src/client/AboutSection.tsx
		const PROJECT_HOMEPAGES = Object.fromEntries(MANAGED_DEPENDENCIES.map(({ id, packageName }) => [id, id === "market" ? "https://dshmarket.com" : `https://github.com/MichengAI/${packageName.split("/")[1]}`]));
		const PROGRESS_PHASES = /* @__PURE__ */ new Set([
			"resolving",
			"downloading",
			"linking",
			"building"
		]);
		const endpoint = CODEX_UI_API_ENDPOINTS.dependencies;
		const stylesheet$2 = `
.dcu-about{color:var(--dsw-alias-label-primary)}.dcu-about h2{margin:0;font-size:var(--dsw-font-size-title);line-height:calc(var(--dsw-font-size-title) + 8px)}.dcu-about-intro{margin:6px 0 var(--dcu-space-6);color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-caption);line-height:20px}.dcu-about h3{margin:24px 0 8px;font-size:var(--dsw-font-size-base);line-height:20px}.dcu-about-features{margin:0;padding-left:20px;color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-caption);line-height:24px}.dcu-about-dependencies-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px}.dcu-about-dependencies-heading h3{margin:0}.dcu-about-dependencies-heading+.dcu-about-intro{margin-bottom:var(--dcu-space-3)}.dcu-about-dependencies{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl)}.dcu-about-dependency{display:flex;align-items:center;gap:12px;min-height:64px;padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-about-dependency:last-child{border-bottom:0}.dcu-about-copy{min-width:0;flex:1}.dcu-about-name{font-size:var(--dsw-font-size-caption);line-height:20px;font-weight:600}.dcu-about-package{overflow:hidden;margin-top:2px;color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-size-sm);text-overflow:ellipsis;white-space:nowrap}.dcu-about-status{display:flex;align-items:center;gap:var(--dcu-space-1);font-size:var(--dsw-font-size-sm)}.dcu-about-status[data-installed=true]{color:var(--dcu-state-success-text)}.dcu-about-status[data-installed=false]{color:var(--dcu-state-error-text)}.dcu-about-status[data-update=true]{color:var(--dcu-state-warn-text)}.dcu-about-install{display:inline-flex;align-items:center;justify-content:center;gap:var(--dcu-space-1);min-height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);padding:6px var(--dcu-space-2);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:var(--dsw-font-size-sm);cursor:pointer}.dcu-about-install:hover:not(:disabled){background:var(--dsw-specific-menu-item-hover)}.dcu-about-install:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px}.dcu-about-install:disabled{cursor:wait;opacity:.65}.dcu-about-update-all{min-width:92px}.dcu-about-message{margin:var(--dcu-space-2) 0 0;border-radius:var(--dsw-radius-lg);padding:var(--dcu-space-2);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-sm);line-height:18px}.dcu-about-message[data-error=true]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dcu-state-error-text)}.dcu-about-progress{display:grid;grid-template-columns:auto 1fr auto;gap:var(--dcu-space-2);align-items:center;margin-top:var(--dcu-space-2);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);padding:var(--dcu-space-2)}.dcu-about-progress code{min-width:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-sm);line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-about-progress-pct{color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-size-sm);font-variant-numeric:tabular-nums}.dcu-about-progress-bar{grid-column:1/-1;height:4px;overflow:hidden;border-radius:var(--dsw-radius-full);background:var(--dsw-alias-border-l2)}.dcu-about-progress-fill{height:100%;background:var(--dsw-alias-state-business-primary);transition:width var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-about-progress-fill[data-wave=true]{width:28%;animation:dcu-about-progress-wave 1.2s ease-in-out infinite}@keyframes dcu-about-progress-wave{0%{transform:translateX(-60%)}100%{transform:translateX(280%)}}
.dcu-about-title-row{display:flex;align-items:center;gap:8px;min-width:0}.dcu-about-links{display:flex;align-items:center;gap:4px}.dcu-about-external-link{display:inline-flex;align-items:center;gap:var(--dcu-space-1);min-height:28px;padding:0 8px;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);font-size:var(--dsw-font-size-sm);font-weight:500;line-height:18px;text-decoration:none;white-space:nowrap}.dcu-about-external-link:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.dcu-about-external-link:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px}.dcu-about-external-link svg{flex:none}@media(max-width:720px){.dcu-about-title-row{flex-wrap:wrap}}
.dcu-about-version{margin-left:8px;color:var(--dsw-alias-label-tertiary);font-family:inherit;font-size:var(--dsw-font-size-sm);font-weight:500;line-height:18px;letter-spacing:0;white-space:nowrap;vertical-align:baseline}
.dcu-about-project-link{color:inherit;text-decoration:none}.dcu-about-project-link:hover{text-decoration:underline;text-underline-offset:3px}.dcu-about-project-link:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px;border-radius:var(--dsw-radius-xs)}
.dcu-about-name-row{display:flex;align-items:center;gap:var(--dcu-space-2);min-width:0}.dcu-about-name-row .dcu-about-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-about-downloads{display:inline-flex;align-items:center;gap:4px;flex:none;color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-sm);line-height:20px;font-weight:400;font-variant-numeric:tabular-nums;text-decoration:none;white-space:nowrap}.dcu-about-downloads svg{flex:none;opacity:.75}.dcu-about-downloads:hover{color:var(--dsw-alias-label-primary)}.dcu-about-downloads:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:3px;border-radius:var(--dsw-radius-xs)}@media(max-width:480px){.dcu-about-dependency{flex-wrap:wrap;gap:8px}.dcu-about-copy{flex-basis:100%}}
`;
		/** 宿主图标库不提供 GitHub 品牌标识，内联后可离线使用并继承当前文字颜色。 */
		function GithubMark16() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 16 16",
				width: 16,
				height: 16,
				"aria-hidden": "true",
				focusable: "false",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "currentColor",
					d: "M8 0a8 8 0 0 0-2.53 15.59c.4.074.547-.173.547-.385 0-.19-.007-.693-.01-1.36-2.226.484-2.695-1.073-2.695-1.073-.364-.924-.89-1.17-.89-1.17-.726-.496.055-.486.055-.486.803.056 1.225.824 1.225.824.714 1.223 1.872.87 2.328.665.072-.517.28-.87.508-1.07-1.777-.202-3.645-.888-3.645-3.956 0-.874.31-1.588.823-2.148-.083-.202-.357-1.017.078-2.12 0 0 .672-.215 2.2.82A7.65 7.65 0 0 1 8 4.8c.68.003 1.365.092 2.004.27 1.527-1.035 2.197-.82 2.197-.82.437 1.103.162 1.918.08 2.12.513.56.822 1.274.822 2.148 0 3.076-1.872 3.752-3.654 3.95.288.248.544.735.544 1.482 0 1.07-.01 1.932-.01 2.195 0 .214.144.463.55.384A8.001 8.001 0 0 0 8 0Z"
				})
			});
		}
		function isDependencyStatus(value) {
			if (value === null || typeof value !== "object") return false;
			const status = value;
			return MANAGED_DEPENDENCIES.some((dependency) => dependency.id === status.id) && typeof status.packageName === "string" && typeof status.installed === "boolean" && typeof status.updateAvailable === "boolean";
		}
		function isInstallProgress(value) {
			if (value === null || typeof value !== "object") return false;
			const progress = value;
			const phase = progress.phase;
			const total = progress.total;
			const percent = progress.percent;
			const currentPackage = progress.currentPackage;
			return typeof progress.active === "boolean" && typeof progress.target === "string" && typeof progress.seconds === "number" && Number.isInteger(progress.seconds) && progress.seconds >= 0 && typeof progress.lastLine === "string" && (phase === null || typeof phase === "string" && PROGRESS_PHASES.has(phase)) && typeof progress.done === "number" && Number.isInteger(progress.done) && progress.done >= 0 && (total === null || typeof total === "number" && Number.isInteger(total) && total >= 0) && (percent === null || typeof percent === "number" && Number.isFinite(percent) && percent >= 0 && percent <= 100) && (currentPackage === null || typeof currentPackage === "string");
		}
		function progressLabel(progress, t) {
			if (progress.phase !== null) {
				const current = progress.currentPackage === null || progress.currentPackage === "" ? "" : ` · ${progress.currentPackage}`;
				const done = progress.done > 0 ? ` · ${t("about.packagesDone").replace("{0}", String(progress.done))}` : "";
				return `${t(`about.progress.${progress.phase}`)}${current}${done}`;
			}
			if (progress.lastLine !== "") return `${progress.lastLine}  (${progress.seconds}s)`;
			return t("about.progressHint");
		}
		/** Codex UI 的功能说明、配套管理插件状态与受限安装入口。 */
		function AboutSection({ t }) {
			const [dependencies, setDependencies] = (0, react.useState)([]);
			const [state, setState] = (0, react.useState)("loading");
			const [installing, setInstalling] = (0, react.useState)();
			const [progress, setProgress] = (0, react.useState)();
			const [message, setMessage] = (0, react.useState)();
			const [refreshFailed, setRefreshFailed] = (0, react.useState)(false);
			const [loadFailure, setLoadFailure] = (0, react.useState)();
			const alive = (0, react.useRef)(true);
			const root = (0, react.useRef)(null);
			const stateRef = (0, react.useRef)("loading");
			const requestId = (0, react.useRef)(0);
			const installingRef = (0, react.useRef)();
			stateRef.current = state;
			(0, react.useEffect)(() => {
				alive.current = true;
				return () => {
					alive.current = false;
				};
			}, []);
			const load = (0, react.useCallback)(async (signal) => {
				const currentRequest = ++requestId.current;
				if (stateRef.current !== "ready") setState("loading");
				try {
					const response = await fetch(endpoint, {
						cache: "no-store",
						signal
					});
					if (!response.ok) throw new BusinessRequestError(response.status);
					const payload = await response.json();
					if (signal?.aborted || currentRequest !== requestId.current) return;
					if (!Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error();
					setDependencies(payload.dependencies);
					setState("ready");
					setRefreshFailed(false);
					setLoadFailure(void 0);
				} catch (error) {
					if (signal?.aborted || error instanceof DOMException && error.name === "AbortError" || currentRequest !== requestId.current) return;
					setLoadFailure(error);
					if (stateRef.current === "ready") setRefreshFailed(true);
					else setState("failed");
				}
			}, []);
			(0, react.useEffect)(() => {
				const node = root.current;
				const controller = new AbortController();
				const refresh = () => {
					load(controller.signal);
				};
				refresh();
				if (node === null || typeof IntersectionObserver === "undefined") return () => {
					controller.abort();
				};
				let initialized = false;
				let wasVisible = false;
				const observer = new IntersectionObserver((entries) => {
					const visible = entries.some((entry) => entry.isIntersecting);
					if (!initialized) {
						initialized = true;
						wasVisible = visible;
						return;
					}
					if (visible && !wasVisible) refresh();
					wasVisible = visible;
				}, { threshold: .2 });
				observer.observe(node);
				return () => {
					controller.abort();
					observer.disconnect();
				};
			}, [load]);
			(0, react.useEffect)(() => {
				if (installing === void 0) {
					setProgress(void 0);
					return;
				}
				let cancelled = false;
				const pull = async () => {
					try {
						const response = await fetch(`${endpoint}?action=progress`, { cache: "no-store" });
						const payload = await response.json();
						if (cancelled || !response.ok || !isInstallProgress(payload.progress)) return;
						setProgress(payload.progress);
					} catch {
						if (!cancelled) return;
					}
				};
				pull();
				const timer = window.setInterval(() => {
					pull();
				}, 800);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [installing]);
			const install = async (id) => {
				if (installingRef.current !== void 0) return;
				installingRef.current = id;
				setInstalling(id);
				setMessage(void 0);
				try {
					const response = await fetch(`${endpoint}?dependency=${encodeURIComponent(id)}`, { method: "POST" });
					if ([
						401,
						403,
						503
					].includes(response.status)) throw new BusinessRequestError(response.status);
					const payload = await response.json();
					if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error(typeof payload.error === "string" ? payload.error : t("about.installFailed"));
					if (!alive.current) return;
					setDependencies(payload.dependencies);
					setState("ready");
					setRefreshFailed(false);
					setMessage({
						error: false,
						text: payload.autoReload === false ? t("about.restartManually") : t("about.restartRequired")
					});
				} catch (error) {
					if (!alive.current) return;
					setMessage({
						error: true,
						text: installErrorText(error, t)
					});
				} finally {
					installingRef.current = void 0;
					if (alive.current) setInstalling(void 0);
				}
			};
			const updateAll = async () => {
				if (installingRef.current !== void 0) return;
				installingRef.current = "all";
				setInstalling("all");
				setMessage(void 0);
				try {
					const response = await fetch(`${endpoint}?action=update-all`, { method: "POST" });
					if ([
						401,
						403,
						503
					].includes(response.status)) throw new BusinessRequestError(response.status);
					const payload = await response.json();
					if (!response.ok || !Array.isArray(payload.dependencies) || !payload.dependencies.every(isDependencyStatus)) throw new Error(typeof payload.error === "string" ? payload.error : t("about.installFailed"));
					if (!alive.current) return;
					setDependencies(payload.dependencies);
					setState("ready");
					setRefreshFailed(false);
					setMessage({
						error: false,
						text: payload.restartRequired === false ? t("about.upToDate") : payload.autoReload === false ? t("about.restartManually") : t("about.restartRequired")
					});
				} catch (error) {
					if (!alive.current) return;
					setMessage({
						error: true,
						text: installErrorText(error, t)
					});
				} finally {
					installingRef.current = void 0;
					if (alive.current) setInstalling(void 0);
				}
			};
			const actionableCount = dependencies.filter((dependency) => !dependency.installed || dependency.updateAvailable).length;
			const selfVersion = dependencies.find((dependency) => dependency.id === "ui")?.version;
			const title = (id) => t(`about.dependency.${id}`);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: root,
				className: "dcu-about",
				"aria-label": t("about.nav"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet$2 }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-about-title-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", { children: [t("about.title"), selfVersion === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dcu-about-version",
							children: ["v", selfVersion]
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-about-links",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
								className: "dcu-about-external-link",
								href: "https://github.com/MichengAI/dsh-codex-ui",
								target: "_blank",
								rel: "noreferrer",
								"aria-label": t("about.viewProject"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GithubMark16, {}), t("about.viewProject")]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
								className: "dcu-about-external-link",
								href: "https://github.com/MichengAI/dsh-codex-ui/issues",
								target: "_blank",
								rel: "noreferrer",
								"aria-label": t("about.feedback"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconListPen, { size: 16 }), t("about.feedback")]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dcu-about-intro",
						children: t("about.description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("about.features") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: "dcu-about-features",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.sidebar") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.search") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.workspace") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.sessions") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.conversation") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("about.feature.navigator") })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-about-dependencies-heading",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("about.dependencies") }), state === "ready" && actionableCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							className: "dcu-about-install dcu-about-update-all",
							type: "button",
							"aria-busy": installing === "all",
							disabled: installing !== void 0,
							onClick: () => {
								updateAll();
							},
							children: [installing === "all" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconLoading, {
								size: 14,
								className: "dcu-spin"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconDownload, { size: 14 }), installing === "all" ? t("about.updatingAll") : t("about.updateAll")]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dcu-about-intro",
						children: t("about.dependenciesDescription")
					}),
					state === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-about-message",
						role: "status",
						children: t("about.loading")
					}) : state === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-about-message",
						"data-error": "true",
						role: "alert",
						children: t(businessRequestErrorKey(loadFailure) ?? "about.statusFailed")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-about-dependencies",
						"aria-busy": installing !== void 0,
						children: dependencies.map((dependency) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: "dcu-about-dependency",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-about-copy",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-about-name-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
											className: "dcu-about-name dcu-about-project-link",
											href: PROJECT_HOMEPAGES[dependency.id],
											target: "_blank",
											rel: "noreferrer",
											children: title(dependency.id)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
											className: "dcu-about-downloads",
											href: `https://www.npmjs.com/package/${dependency.packageName}`,
											target: "_blank",
											rel: "noreferrer",
											title: t("about.downloadsSource"),
											"aria-label": `${dependency.packageName} · ${t("about.totalDownloads")} · ${typeof dependency.totalDownloads === "number" && Number.isSafeInteger(dependency.totalDownloads) && dependency.totalDownloads >= 0 ? dependency.totalDownloads.toLocaleString() : t("about.downloadsUnavailable")}`,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconDownload, {
												size: 12,
												"aria-hidden": "true"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dcu-about-downloads-count",
												children: typeof dependency.totalDownloads === "number" && Number.isSafeInteger(dependency.totalDownloads) && dependency.totalDownloads >= 0 ? dependency.totalDownloads.toLocaleString() : "—"
											})]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dcu-about-package",
										title: dependency.packageName,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
												className: "dcu-about-project-link",
												href: PROJECT_HOMEPAGES[dependency.id],
												target: "_blank",
												rel: "noreferrer",
												children: dependency.packageName
											}),
											dependency.version === void 0 ? "" : ` · ${dependency.version}`,
											dependency.updateAvailable && dependency.latestVersion !== void 0 ? ` → ${dependency.latestVersion}` : ""
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dcu-about-status",
									"data-installed": dependency.installed,
									"data-update": dependency.updateAvailable,
									children: [dependency.installed && !dependency.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconCheck, { size: 14 }), dependency.updateAvailable ? t("about.updateAvailable") : dependency.installed ? t("about.installed") : t("about.missing")]
								}),
								(!dependency.installed || dependency.updateAvailable) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: "dcu-about-install",
									type: "button",
									disabled: installing !== void 0,
									onClick: () => {
										install(dependency.id);
									},
									children: [installing === dependency.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconLoading, {
										size: 14,
										className: "dcu-spin"
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconDownload, { size: 14 }), installing === dependency.id ? t("about.installing") : dependency.updateAvailable ? t("about.update") : t("about.install")]
								})
							]
						}, dependency.id))
					}),
					installing !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-about-progress",
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconLoading, {
								size: 14,
								className: "dcu-spin"
							}) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: progress === void 0 ? t("about.progressHint") : progressLabel(progress, t) }),
							progress?.percent !== null && progress?.percent !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dcu-about-progress-pct",
								children: [progress.percent, "%"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-about-progress-bar",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-about-progress-fill",
									"data-wave": progress?.percent === null || progress?.percent === void 0,
									style: progress?.percent === null || progress?.percent === void 0 ? void 0 : { width: `${progress.percent}%` }
								})
							})
						]
					}),
					refreshFailed && state === "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-about-message",
						"data-error": "true",
						role: "status",
						children: t(businessRequestErrorKey(loadFailure) ?? "about.refreshFailed")
					}),
					message !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-about-message",
						"data-error": message.error,
						role: message.error ? "alert" : "status",
						children: message.text
					})
				]
			});
		}
		//#endregion
		//#region src/client/ConnectorsSection.tsx
		const MCP_CONNECTOR_UI = "/mcp-connector/ui/";
		const PROMPT_REQUEST_TYPE = "mcp-connector:start-session";
		const PROMPT_RESULT_TYPE = "mcp-connector:start-session-result";
		const stylesheet$1 = `
.dcu-connectors{color:var(--dsw-alias-label-primary)}.dcu-connectors h2{margin:0;font-size:var(--dsw-font-size-xl)}.dcu-connectors p{margin:6px 0 var(--dcu-space-4);color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-sm)}.dcu-connector-frame{display:block;width:100%;height:clamp(420px,calc(100vh - 160px),700px);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-bg-base);color-scheme:light dark}.dcu-connector-list{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl)}.dcu-connector{padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-connector:last-child{border-bottom:0}.dcu-connector-head{display:flex;align-items:center;gap:8px;font-weight:600}.dcu-connector-meta{margin:var(--dcu-space-1) 0 var(--dcu-space-2);color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-size-sm)}.dcu-connector-tool{padding:var(--dcu-space-1) 0 0 24px;color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-sm)}.dcu-connector-tool span{display:block;margin-top:1px;color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-size-sm)}.dcu-connector-empty{padding:20px 8px;color:var(--dsw-alias-label-secondary);text-align:center}
`;
		/**
		* 连接器面板的宿主主题注入。
		*
		* ⚠ **这里必须写字面量，不能改写成 `var(--dcu-sidebar-*)`**（2026-10-18 设计审计 P0-3 复核）。
		* 这两段字符串不是页面样式，而是 `syncFrameTheme()` 塞进 iframe `<style>` 的内容
		* （见下方 `doc.head.append(style)`）。CSS 自定义属性**不跨 document 继承**——实测在父页
		* 设 `--dcu-sidebar-tertiary=#686868` 后，iframe 内 `color:var(--dcu-sidebar-tertiary)`
		* 的 computed 值是 `rgb(0, 0, 0)`（解析失败 → 回退继承色），而字面量正常生效。
		* 若按「有 hex 就换令牌」的直觉改，会把一处不达标的灰换成静默黑字，比现状更糟。
		* （同源旁证：docs/KNOWN-ISSUES.md 第 8 条已记录该 iframe「CSS 对宿主令牌引用 0 处」。）
		*
		* 因此此处只做**数值对齐**：让亮色档的二级/三级灰与侧栏色阶取同值，
		* 顺手修掉 `--muted` 的原值 `#777777`——它正是 zcode-theme 里已判死并删除的
		* 修复前旧值（on `#f8f8f8` 仅 4.22:1，低于 AA）。暗色档保持不动：现值在 `#161616`
		* 上是 5.60 / 5.10，已达标，而换成侧栏暗色档（`#828282`）反而会掉到 3.68。
		*/
		const frameLightTheme = `:root{color-scheme:light;--bg:#f8f8f8;--card:#ffffff;--line:rgba(13,13,13,.1);--text:#262626;--text-2:#5c5c5c;--muted:#686868;--accent:#000000;--accent-hover:#404040;--accent-light:rgba(13,13,13,.05);--dcu-action:#000000;--dcu-action-hover:#404040;--dcu-on-action:#ffffff;--ok:#1e8a3e;--ok-bg:#eaf7ee;--warn:#e07b00;--warn-bg:#fff4eb;--bad:#e03131;--bad-bg:#fdecec;--shadow:0 1px 3px rgba(13,13,13,.08),0 1px 2px rgba(13,13,13,.06);--shadow-lg:0 10px 25px rgba(13,13,13,.1)}`;
		const frameDarkTheme = `:root{color-scheme:dark;--bg:#161616;--card:#2b2b2b;--line:rgba(255,255,255,.1);--text:#d4d4d4;--text-2:#8f8f8f;--muted:#888888;--accent:#ffffff;--accent-hover:#d4d4d4;--accent-light:rgba(255,255,255,.05);--dcu-action:#ffffff;--dcu-action-hover:#d4d4d4;--dcu-on-action:#000000;--ok:#46bf72;--ok-bg:#12291b;--warn:#ff8a30;--warn-bg:#331d0d;--bad:#ff5c5c;--bad-bg:#3b1717;--shadow:0 1px 3px rgba(0,0,0,.35);--shadow-lg:0 16px 35px rgba(0,0,0,.45)}`;
		const frameSurfaceTheme = `
.card.featured{border-color:var(--line)}
.card:hover,.card.featured:hover{border-color:var(--muted)}
.btn:not(.ghost):not(.danger):not(.status-warning):not(.status-bad),.icon-btn.primary,.btn-primary,.prompt-item .send-btn{background:var(--dcu-action);border-color:var(--dcu-action);color:var(--dcu-on-action)}
.btn:not(.ghost):not(.danger):not(.status-warning):not(.status-bad):hover,.icon-btn.primary:hover,.btn-primary:hover,.prompt-item .send-btn:hover{background:var(--dcu-action-hover);border-color:var(--dcu-action-hover)}
`;
		function isConnector(value) {
			if (value === null || typeof value !== "object") return false;
			const item = value;
			return typeof item.name === "string" && Array.isArray(item.tools) && item.tools.every((tool) => tool !== null && typeof tool === "object" && typeof tool.name === "string" && typeof tool.description === "string");
		}
		function isPromptRequest(value) {
			if (value === null || typeof value !== "object") return false;
			const item = value;
			return item.type === PROMPT_REQUEST_TYPE && typeof item.requestId === "string" && item.requestId !== "" && typeof item.prompt === "string" && item.prompt.trim() !== "";
		}
		function syncFrameTheme(frame) {
			const doc = frame?.contentDocument;
			if (doc === null || doc === void 0) return;
			let style = doc.head.querySelector("style[data-michengai-host-theme]");
			if (style === null) {
				style = doc.createElement("style");
				style.dataset.michengaiHostTheme = "true";
				doc.head.append(style);
			}
			style.textContent = (document.body.hasAttribute("data-ds-dark-theme") ? frameDarkTheme : frameLightTheme) + frameSurfaceTheme;
		}
		function ConnectorMarket({ startPromptSession, t }) {
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const onMessage = (event) => {
					const frameWindow = frameRef.current?.contentWindow;
					if (event.origin !== window.location.origin || frameWindow === null || frameWindow === void 0 || event.source !== frameWindow) return;
					if (!isPromptRequest(event.data)) return;
					const { requestId, prompt } = event.data;
					const reply = (ok, message) => {
						frameWindow.postMessage({
							type: PROMPT_RESULT_TYPE,
							requestId,
							ok,
							message
						}, window.location.origin);
					};
					startPromptSession(prompt).then(() => {
						reply(true, t("connectors.promptReady"));
					}, (error) => {
						reply(false, userErrorText(error, t));
					});
				};
				const syncTheme = () => {
					syncFrameTheme(frameRef.current);
				};
				const observer = new MutationObserver(syncTheme);
				observer.observe(document.body, {
					attributes: true,
					attributeFilter: ["data-ds-dark-theme"]
				});
				window.addEventListener("message", onMessage);
				return () => {
					observer.disconnect();
					window.removeEventListener("message", onMessage);
				};
			}, [startPromptSession, t]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
				ref: frameRef,
				className: "dcu-connector-frame",
				src: MCP_CONNECTOR_UI,
				title: t("connectors.title"),
				onLoad: () => {
					syncFrameTheme(frameRef.current);
				}
			});
		}
		function NativeConnectorList({ sessionStore, t }) {
			const sessionId = (0, react.useSyncExternalStore)(sessionStore.subscribe, () => currentSessionId(sessionStore.getSnapshot()));
			const [connectors, setConnectors] = (0, react.useState)([]);
			const [state, setState] = (0, react.useState)("loading");
			const [failure, setFailure] = (0, react.useState)();
			(0, react.useEffect)(() => {
				if (sessionId === void 0) {
					setConnectors([]);
					setState("ready");
					return;
				}
				const controller = new AbortController();
				setState("loading");
				fetch(`${CODEX_UI_API_ENDPOINTS.connectors}?sessionId=${encodeURIComponent(sessionId)}`, { signal: controller.signal }).then(async (response) => {
					if (!response.ok) throw new BusinessRequestError(response.status);
					const payload = await response.json();
					if (!Array.isArray(payload.connectors) || !payload.connectors.every(isConnector)) throw new Error("连接器目录返回格式无效。");
					if (!controller.signal.aborted) setConnectors(payload.connectors);
				}).then(() => {
					if (!controller.signal.aborted) setState("ready");
				}).catch((error) => {
					if (!controller.signal.aborted) {
						setFailure(error);
						setState("failed");
					}
				});
				return () => {
					controller.abort();
				};
			}, [sessionId]);
			if (sessionId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-connector-empty",
				children: t("connectors.openSession")
			});
			if (state === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-connector-empty",
				children: t("connectors.loading")
			});
			if (state === "failed") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dcu-connector-empty",
				role: "alert",
				children: t(businessRequestErrorKey(failure) ?? "connectors.failed")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-connector-list",
				children: [connectors.map((connector) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
					className: "dcu-connector",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-connector-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconConnectors, { size: 16 }), connector.name]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-connector-meta",
							children: t("connectors.toolCount", { count: connector.tools.length })
						}),
						connector.tools.map((tool) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-connector-tool",
							children: [tool.name, tool.description !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tool.description })]
						}, tool.name))
					]
				}, connector.name)), connectors.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-connector-empty",
					children: t("connectors.empty")
				})]
			});
		}
		/** 安装 dsh-mcp-connector 时显示完整市场，否则回退到当前会话的 MCP 工具目录。 */
		function ConnectorsSection({ sessionStore, startPromptSession, t }) {
			const [marketAvailable, setMarketAvailable] = (0, react.useState)();
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				fetch(MCP_CONNECTOR_UI, {
					method: "GET",
					cache: "no-store",
					signal: controller.signal
				}).then((response) => {
					response.body?.cancel().catch(() => {});
					if (!controller.signal.aborted) setMarketAvailable(response.ok);
				}).catch(() => {
					if (!controller.signal.aborted) setMarketAvailable(false);
				});
				return () => {
					controller.abort();
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-connectors",
				"aria-label": t("connectors.title"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet$1 }), marketAvailable === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-connector-empty",
					children: t("connectors.loading")
				}) : marketAvailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConnectorMarket, {
					startPromptSession,
					t
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("connectors.title") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("connectors.description") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NativeConnectorList, {
						sessionStore,
						t
					})
				] })]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** 本插件独占的界面文案命名空间。 */
		const NS = "zcode.ui";
		const zh = {
			"workspace.addFailed": "无法添加工作区",
			"workspace.add": "添加工作区",
			"settings.developerTools.title": "显示代码工作视图",
			"settings.developerTools.description": "开启后，显示轨迹、本轮代码差异，可选择完整的 Agent 预设切换",
			"settings.developerTools.error": "保存失败，请重试",
			"workspace.retry": "重试",
			"workspace.chooseAgain": "重新选择",
			"navigation.back": "后退",
			"navigation.forward": "前进",
			"home.resizeInput": "拖动调整输入区宽度",
			"home.projectSearch": "搜索项目",
			"home.projectEmpty": "没有匹配的项目",
			"home.suggestions": "开始一项任务",
			"home.workspace": "请先选择工作区，再选择任务。",
			"home.draft": "已保留当前草稿和附件；清空输入后可填入任务建议。",
			"home.busy": "当前输入正在处理中，请稍后再试。",
			"home.explore": "探索并理解代码",
			"home.build": "构建新功能、应用或工具",
			"home.review": "审查代码并提出修改建议",
			"home.fix": "修复问题和失败",
			"home.explore.task1": "了解项目结构",
			"home.explore.prompt1": "请探索当前工作区的代码，解释项目结构、主要入口和模块之间的关系。",
			"home.explore.task2": "理解一项功能",
			"home.explore.prompt2": "我想了解一项功能的实现。先问我具体是哪项功能，再沿调用关系解释。",
			"home.build.task1": "实现一项新功能",
			"home.build.prompt1": "我想在当前项目中实现一项新功能。先和我确认需求与验收标准，再实施。",
			"home.build.task2": "构建一个小工具",
			"home.build.prompt2": "我想构建一个小工具。先问我目标、输入和输出，再结合当前项目提出方案。",
			"home.review.task1": "评审当前改动",
			"home.review.prompt1": "请评审当前工作区的未提交改动，优先指出真实缺陷、回归风险和缺少的测试；先不要修改。",
			"home.review.task2": "检查代码质量",
			"home.review.prompt2": "请检查当前项目的代码质量，给出有源码依据的改进建议，先评估不改动。",
			"home.fix.task1": "排查一个问题",
			"home.fix.prompt1": "我遇到了一个问题。先问我复现步骤、预期和实际表现，再定位根因并修复。",
			"home.fix.task2": "修复失败的测试",
			"home.fix.prompt2": "请运行当前项目适用的测试，定位失败根因并做最小修复，保留有效的回归覆盖。",
			"settings.title": "设置",
			"settings.back": "返回应用",
			"settings.openDocument": "打开配置文件",
			"settings.advanced": "高级",
			"settings.documentTitle": "配置文件",
			"settings.documentDescription": "在外部编辑器中查看和编辑配置",
			"settings.documentOpen": "打开",
			"settings.documentOpening": "打开中…",
			"settings.openDocumentError": "无法打开配置文件",
			"settings.search": "搜索设置…",
			"settings.personal": "个人",
			"settings.integrations": "集成",
			"settings.pluginConfig": "插件配置",
			"settings.records": "记录与应用",
			"settings.general": "常规",
			"settings.permissions": "权限",
			"settings.editor": "编辑器",
			"settings.noResults": "没有匹配的设置分类，换个关键词试试。",
			"settings.filterHint": "仅筛选导航，选择分类后切换当前页面。",
			"settings.disconnected": "连接异常",
			"settings.reconnect": "立即重连",
			"settings.connecting": "连接中",
			"settings.recovered": "连接成功",
			"input.historyHint": "↑↓ 翻历史",
			"sidebar.label": "DSH 导航",
			"sidebar.expand": "展开侧边栏",
			"sidebar.collapse": "收缩侧边栏",
			"sidebar.newTask": "新建任务",
			"sidebar.search": "搜索会话",
			"sidebar.mainMenu": "主菜单",
			"sidebar.backToConversation": "返回会话",
			"sidebar.extensions": "扩展管理",
			"sidebar.experts": "专家",
			"sidebar.skills": "技能",
			"sidebar.plugins": "插件",
			"sidebar.marketplace": "插件市场",
			"sidebar.builtinPlugins": "内置插件",
			"sidebar.connectors": "连接器",
			"sidebar.schedule": "定时任务",
			"sidebar.assistant": "IM助理",
			"sidebar.imSettings": "IM助理",
			"sidebar.tasksTab": "任务",
			"sidebar.channelsTab": "频道",
			"sidebar.scheduleTab": "定时",
			"sidebar.runsTab": "执行记录",
			"sidebar.overviewTab": "任务总览",
			"channels.empty": "还没有频道会话。先在设置 → IM助理 里连接渠道。",
			"channels.loadError": "无法读取频道会话。",
			"channel.dingtalk": "钉钉",
			"channel.feishu": "飞书",
			"channel.lark": "Lark",
			"channel.weixin": "微信",
			"channel.wecom": "企业微信",
			"channel.qq": "QQ",
			"channel.telegram": "Telegram",
			"channel.unknown": "频道",
			"schedule.empty": "还没有定时任务运行记录。",
			"schedule.groupActions": "{name} 的任务操作",
			"schedule.taskSettings": "任务设置",
			"schedule.archiveGroup": "归档整组会话",
			"schedule.archiveGroupConfirm": "确认归档",
			"schedule.archiveGroupDescription": "将归档“{name}”下的 {count} 个会话。归档后可以在“设置 → 已归档”中恢复。",
			"schedule.archiveGroupPending": "正在归档整组会话…",
			"schedule.archiveGroupPartial": "已归档 {archived} 个会话，另有 {failed} 个失败。可以重试剩余会话。",
			"search.placeholder": "搜索会话、设置和操作",
			"search.empty": "没有匹配的会话。",
			"search.hintMove": "选择",
			"search.hintOpen": "打开",
			"search.hintClose": "关闭",
			"search.sessions": "会话",
			"search.settings": "设置",
			"search.actions": "快捷操作",
			"workspace.label": "工作区会话",
			"workspace.pinned": "置顶",
			"workspace.pinnedEmpty": "拖动项目到此处置顶",
			"workspace.projects": "项目",
			"workspace.ungrouped": "未分组",
			"workspace.createGroup": "新建分组",
			"workspace.createGroupDescription": "输入分组名称，项目不会自动移动。",
			"workspace.groupName": "分组名称",
			"workspace.moveToGroup": "移动到分组",
			"workspace.removeFromGroup": "移至未分组",
			"workspace.deleteGroup": "删除分组“{name}”",
			"workspace.deleteGroupAction": "删除分组",
			"workspace.deleteGroupDescription": "删除分组只会将其中项目移至未分组，不会删除项目或会话。",
			"workspace.groupActions": "分组“{name}”的操作",
			"workspace.renameGroup": "重命名分组",
			"workspace.recent": "最近",
			"workspace.recentEmpty": "最近打开过的会话会出现在这里。",
			"workspace.noChat": "暂无聊天",
			"workspace.showMore": "展开显示",
			"workspace.empty": "还没有项目。添加一个工作区目录即可开始。",
			"workspace.newSession": "新建会话",
			"workspace.rename": "重命名项目",
			"workspace.pin": "置顶项目",
			"workspace.unpin": "取消置顶",
			"workspace.archive": "归档所有会话",
			"workspace.archiveTitle": "归档 {count} 个会话？",
			"workspace.archiveDescription": "这会归档“{name}”中的全部会话，项目和文件夹仍会保留。",
			"workspace.archiveConfirm": "全部归档",
			"workspace.archivePending": "正在归档会话…",
			"workspace.openPath": "在资源管理器中打开",
			"workspace.delete": "移除项目",
			"workspace.deleteDescription": "将把“{name}”从项目列表中移除。文件夹和会话记录会保留。",
			"workspace.deletePending": "正在移除项目…",
			"workspace.actions": "{name} 的项目操作",
			"workspace.taskCount": "{count} 个任务",
			"workspace.taskSummary": "{count} 个任务 · {unreadCount} 条未读",
			"workspace.edit": "重命名项目",
			"sessions.close": "关闭",
			"sessions.cancel": "取消",
			"sessions.confirm": "确认",
			"sessions.save": "保存",
			"sessions.previous": "上一个会话",
			"sessions.next": "下一个会话",
			"sessions.noTarget": "没有可切换的会话。",
			"sessions.pin": "置顶会话",
			"sessions.unpin": "取消置顶",
			"sessions.pinFailed": "暂时无法更新置顶状态，请稍后重试。",
			"sessions.failed": "操作失败：{message}",
			"sessions.unknown": "找不到该会话。",
			"sessions.actions": "{name} 的会话操作",
			"sessions.markUnread": "标记为未读",
			"sessions.markRead": "标记为已读",
			"sessions.unread": "未读",
			"sessions.running": "运行中",
			"sessions.waitingAnswer": "等待回答",
			"sessions.waitingApproval": "等待审批",
			"sessions.planReview": "计划待审",
			"sessions.rename": "重命名会话",
			"sessions.renameDescription": "保持简短且易于识别",
			"sessions.renameInvalid": "会话名称无效，请修改后重试。",
			"sessions.renameFailed": "暂时无法重命名该会话，请稍后重试。",
			"sessions.archive": "归档会话",
			"sessions.archiveFailed": "暂时无法归档该会话，请稍后重试。",
			"sessions.delete": "删除会话",
			"sessions.deleteDescription": "将永久删除会话“{name}”及其全部记录，此操作不可恢复。",
			"sessions.deletePending": "正在删除会话…",
			"sessions.deleteUnavailable": "未安装或无法连接归档管理插件。",
			"sessions.deleteFailed": "暂时无法删除该会话，请稍后重试。",
			"sessions.fork": "在新会话中继续",
			"sessions.forkUnavailable": "当前会话暂时无法在新会话中继续，请等待本轮结束后重试。",
			"sessions.forkFailed": "暂时无法创建新会话，请稍后重试。",
			"sessions.openPath": "在资源管理器中打开",
			"sessions.moveWorkspace": "项目",
			"sessions.moveUnavailable": "会话移动服务暂不可用，请重启 DSH 后重试。",
			"sessions.moveUnauthorized": "登录状态已失效，请刷新页面并重新登录。",
			"sessions.moveForbidden": "当前访问地址不受信任，或请求来源已被拒绝。",
			"sessions.moveNotFound": "会话或目标项目已不存在，请刷新后重试。",
			"sessions.moveSubagent": "子代理会话不能移动到其他项目。",
			"sessions.moveBusy": "该会话正在移动，请稍后重试。",
			"sessions.moveRollbackFailed": "会话移动失败，自动恢复未完整完成，请查看 DSH 服务端日志。",
			"sessions.moveFailed": "暂时无法移动该会话，原会话已保留。",
			"sessions.moveConfirmTitle": "将会话移至“{project}”？",
			"sessions.moveConfirmDescription": "“{name}”将移动到此项目，工作目录也会随之更改。",
			"sessions.moveConfirmAction": "移动",
			"sessions.movePending": "正在移动会话…",
			"sessions.copyPath": "复制工作目录",
			"sessions.copyTitle": "复制会话标题",
			"sessions.copyId": "复制会话 ID",
			"connectors.title": "连接器",
			"connectors.description": "显示当前会话可用的 MCP 连接器及其工具，不显示地址、命令或凭证。",
			"connectors.openSession": "请先打开一个会话以读取连接器。",
			"connectors.loading": "正在读取连接器…",
			"connectors.failed": "连接器目录暂不可用，请稍后重试。",
			"connectors.toolCount": "{count} 个工具",
			"connectors.empty": "当前会话没有可用的 MCP 连接器。",
			"connectors.promptReady": "已带入新会话",
			"connectors.promptRequired": "Prompt 不能为空。",
			"connectors.workspacesLoading": "DSH 工作区数据尚未就绪，请稍后重试。",
			"connectors.workspaceRequired": "请先选择一个工作区，再使用示例 Prompt。",
			"connectors.workspaceUnavailable": "DSH 工作区服务尚未就绪，请稍后重试。",
			"connectors.conversationUnavailable": "DSH 对话服务尚未就绪，请稍后重试。",
			"connectors.sessionPending": "新会话尚未就绪，请稍后重试。",
			"about.nav": "Codex UI",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "问题反馈",
			"about.description": "为 DSH 提供 ZCode 风格的侧栏、工作区会话管理、搜索与会话轮次导航。",
			"about.features": "基本功能",
			"about.feature.sidebar": "ZCode 风格侧栏、全局会话搜索与设置入口",
			"about.feature.search": "通过顶部搜索快速定位会话、设置页面和新建任务等快捷操作",
			"about.feature.workspace": "项目文件夹可展开、折叠、拖拽排序和置顶，并保留原生工作区能力",
			"about.feature.sessions": "会话支持重命名、置顶、未读标记、归档、删除及右键快捷操作",
			"about.feature.conversation": "保留原生消息、工具调用、输入、权限和模型选择，仅调整容器视觉",
			"about.feature.navigator": "当前会话提供轮次缩略导航，可快速跳转至每一次用户提问",
			"about.dependencies": "配套管理插件",
			"about.dependenciesDescription": "每个配套插件都可单独安装和更新，也可一键安装缺失项并更新旧版本。可分别检查 Codex UI、专家、技能、归档、IM、定时任务、BTW、Simplify、PUA、代码审查、宠物和应用市场。",
			"about.loading": "正在读取依赖安装状态…",
			"about.statusFailed": "暂时无法读取依赖安装状态。",
			"about.refreshFailed": "依赖状态刷新失败，当前显示上次成功读取的结果。",
			"about.installed": "已安装",
			"about.missing": "未安装",
			"about.updateAvailable": "可更新",
			"about.install": "安装",
			"about.update": "更新",
			"about.installing": "安装中",
			"about.updateAll": "全部安装/更新",
			"about.updatingAll": "安装/更新中",
			"about.upToDate": "所有配套插件均已安装并为最新版本。",
			"about.installFailed": "依赖安装失败，请稍后重试。",
			"about.installUnchanged": "安装命令已结束，但插件没有进入当前 Profile。请重试。",
			"about.installExitDesktop": "请先完全退出 DSH Desktop，再重新打开后更新。",
			"about.installStoreMismatch": "插件目录与 pnpm 仓库不一致。请完全退出 DSH Desktop 后再更新。",
			"about.installExitWeb": "无法覆盖正在运行的插件文件。请停止当前 DSH Web 后，在终端更新插件，再重新启动 DSH Web。",
			"about.installStoreMismatchWeb": "插件目录与 pnpm 仓库不一致。请停止当前 DSH Web 后重试；仍失败时重新安装该 Profile 的依赖。",
			"about.installWebFailed": "插件更新失败。请查看 DSH Web 终端输出后重试。",
			"about.installBuildPolicy": "插件依赖的 pnpm 构建脚本策略尚未确认，请更新 Profile 配置后重试。",
			"about.installPnpmMissing": "当前环境找不到 pnpm，请安装 pnpm 并重启 DSH 后重试。",
			"about.installTimeout": "插件安装超时，请检查网络后重试。",
			"about.installServiceUnavailable": "DSH Desktop 依赖管理服务尚未就绪，请重启后重试。",
			"about.restartRequired": "正在热更新插件，窗口会自动刷新。",
			"about.restartManually": "安装完成。当前 Web 无法自动重启，请重启 DSH Web 后刷新页面。",
			"about.progressHint": "正在安装插件…",
			"about.packagesDone": "已完成 {0} 个包",
			"about.progress.resolving": "解析依赖",
			"about.progress.downloading": "下载中",
			"about.progress.linking": "写入文件",
			"about.progress.building": "构建中",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.suite": "Codex 套件",
			"about.dependency.ui": "Codex UI",
			"about.dependency.experts": "专家管理",
			"about.dependency.skills": "技能管理",
			"about.dependency.archive": "归档会话",
			"about.dependency.im": "IM助理",
			"about.dependency.schedule": "定时任务",
			"about.dependency.pet": "Codex 宠物",
			"about.dependency.btw": "BTW 旁问",
			"about.dependency.simplify": "Simplify",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "代码审查",
			"about.dependency.market": "应用市场",
			"about.totalDownloads": "npm 累计下载",
			"about.downloadsUnavailable": "暂不可用",
			"about.downloadsSource": "npm 官方统计：自包创建日至昨日的累计下载次数，点击查看 npm 包",
			"turns.label": "当前会话轮次导航",
			"turns.untitled": "未命名提问",
			"turns.jump": "跳转到第 {index} 轮：{summary}",
			"time.justNow": "刚刚",
			"time.justNowShort": "刚刚",
			"time.minutes": "{count}分",
			"time.hours": "{count}小时",
			"time.days": "{count}天",
			"time.weeks": "{count}周",
			"time.months": "{count}个月",
			"time.years": "{count}年",
			"errors.unauthorized": "请先登录 DSH，再重试。",
			"errors.forbidden": "请求被安全检查拒绝，请从可信的 DSH 地址重试。",
			"errors.serviceUnavailable": "服务暂不可用，请稍后重试。",
			"workspace.preferencesLocalOnly": "项目偏好尚未同步，当前使用本地缓存。",
			"errors.generic": "操作未完成，请重试。",
			"errors.groupInvalid": "分组信息无效。",
			"errors.workspaceInvalid": "项目标识无效。",
			"errors.groupMissing": "目标分组不存在。",
			"errors.orderAnchorMissing": "排序位置已失效，请重试。",
			"sessionTitle.system": "为编程助手会话生成标题。\n只输出一行，恰好两段：类型｜主题\n类型必须是其中一个：{types}\n主题必须是具体事项，不能重复类型，不要写类型名或空主题。不要写日期或表情，不要引号、前缀、解释或 Markdown。\n主题使用用户消息的语言。",
			"sessionTitle.userFrame": "根据这条用户消息生成会话标题。只返回“类型｜主题”一行，不要第三段，不要重复主题。",
			"sessionTitle.type.feature": "功能",
			"sessionTitle.type.design": "设计",
			"sessionTitle.type.fix": "修复",
			"sessionTitle.type.optimize": "优化",
			"sessionTitle.type.release": "发布",
			"sessionTitle.type.explore": "探索",
			"sessionTitle.type.docs": "文档",
			"sessionTitle.type.research": "研究",
			"meta.locale": "zh-CN"
		};
		const en = {
			"workspace.addFailed": "Could not add workspace",
			"workspace.add": "Add workspace",
			"settings.developerTools.title": "Show coding view",
			"settings.developerTools.description": "Shows trajectory, code diffs, and all Agent presets",
			"settings.developerTools.error": "Could not save. Please try again.",
			"workspace.retry": "Retry",
			"workspace.chooseAgain": "Choose again",
			"navigation.back": "Back",
			"navigation.forward": "Forward",
			"home.resizeInput": "Drag to resize the input area",
			"home.projectSearch": "Search projects",
			"home.projectEmpty": "No matching projects",
			"home.suggestions": "Start a task",
			"home.workspace": "Choose a workspace first, then select a task.",
			"home.draft": "Your draft and attachments are preserved. Clear the input to use a suggestion.",
			"home.busy": "The input is busy. Please try again shortly.",
			"home.explore": "Explore and understand code",
			"home.build": "Build features, apps, or tools",
			"home.review": "Review code and suggest changes",
			"home.fix": "Fix bugs and failures",
			"home.explore.task1": "Explain the project structure",
			"home.explore.prompt1": "Explore this workspace and explain its structure, main entry points, and module relationships.",
			"home.explore.task2": "Understand a feature",
			"home.explore.prompt2": "Help me understand a feature. First ask which feature, then explain its implementation and call flow.",
			"home.build.task1": "Implement a feature",
			"home.build.prompt1": "Help me implement a feature in this project. First clarify requirements and acceptance criteria.",
			"home.build.task2": "Build a small tool",
			"home.build.prompt2": "Help me build a small tool. First ask about its goal, inputs, and outputs, then propose an approach.",
			"home.review.task1": "Review current changes",
			"home.review.prompt1": "Review uncommitted changes for bugs, regressions, and missing tests. Do not modify files yet.",
			"home.review.task2": "Inspect code quality",
			"home.review.prompt2": "Inspect code quality in this project and suggest improvements grounded in the source. Assess only; do not edit.",
			"home.fix.task1": "Investigate a bug",
			"home.fix.prompt1": "Help me fix a bug. First ask for reproduction steps, expected behavior, and actual behavior.",
			"home.fix.task2": "Fix failing tests",
			"home.fix.prompt2": "Run the applicable project tests, identify failure causes, and make minimal fixes with meaningful regression coverage.",
			"settings.title": "Settings",
			"settings.back": "Back to app",
			"settings.openDocument": "Open configuration file",
			"settings.advanced": "Advanced",
			"settings.documentTitle": "Configuration file",
			"settings.documentDescription": "View and edit configuration in an external editor",
			"settings.documentOpen": "Open",
			"settings.documentOpening": "Opening…",
			"settings.openDocumentError": "Could not open configuration file",
			"settings.search": "Search settings…",
			"settings.personal": "Personal",
			"settings.integrations": "Integrations",
			"settings.pluginConfig": "Plugin configuration",
			"settings.records": "Records and app",
			"settings.general": "General",
			"settings.permissions": "Permissions",
			"settings.editor": "Editor",
			"settings.noResults": "No matching settings categories — try another keyword.",
			"settings.filterHint": "Navigation is filtered. Select a category to switch pages.",
			"settings.disconnected": "Disconnected",
			"settings.reconnect": "Reconnect now",
			"settings.connecting": "Connecting",
			"settings.recovered": "Connected",
			"input.historyHint": "↑↓ History",
			"sidebar.label": "DSH navigation",
			"sidebar.expand": "Expand sidebar",
			"sidebar.collapse": "Collapse sidebar",
			"sidebar.newTask": "New task",
			"sidebar.search": "Search conversations",
			"sidebar.mainMenu": "Main menu",
			"sidebar.backToConversation": "Back to conversation",
			"sidebar.extensions": "Extensions",
			"sidebar.experts": "Experts",
			"sidebar.skills": "Skills",
			"sidebar.plugins": "Plugins",
			"sidebar.marketplace": "Plugin Market",
			"sidebar.builtinPlugins": "Built-in plugins",
			"sidebar.connectors": "Connectors",
			"sidebar.schedule": "Scheduled tasks",
			"sidebar.assistant": "IM Assistant",
			"sidebar.imSettings": "IM Assistant",
			"sidebar.tasksTab": "Tasks",
			"sidebar.channelsTab": "Channels",
			"sidebar.scheduleTab": "Schedule",
			"sidebar.runsTab": "Run history",
			"sidebar.overviewTab": "Task overview",
			"channels.empty": "No channel conversations yet. Connect a channel in Settings → IM Assistant.",
			"channels.loadError": "Could not load channel conversations.",
			"channel.dingtalk": "DingTalk",
			"channel.feishu": "Feishu",
			"channel.lark": "Lark",
			"channel.weixin": "WeChat",
			"channel.wecom": "WeCom",
			"channel.qq": "QQ",
			"channel.telegram": "Telegram",
			"channel.unknown": "Channel",
			"schedule.empty": "No scheduled-task runs yet.",
			"schedule.groupActions": "Task actions for {name}",
			"schedule.taskSettings": "Task settings",
			"schedule.archiveGroup": "Archive all conversations",
			"schedule.archiveGroupConfirm": "Archive all",
			"schedule.archiveGroupDescription": "Archive all {count} conversations for “{name}”. You can restore them later in Settings → Archived.",
			"schedule.archiveGroupPending": "Archiving conversations…",
			"schedule.archiveGroupPartial": "Archived {archived} conversations; {failed} failed. You can retry the remaining conversations.",
			"search.placeholder": "Search conversations, settings, and actions",
			"search.empty": "No matching conversations.",
			"search.hintMove": "select",
			"search.hintOpen": "open",
			"search.hintClose": "close",
			"search.sessions": "Conversations",
			"search.settings": "Settings",
			"search.actions": "Quick actions",
			"workspace.label": "Workspace conversations",
			"workspace.projects": "Projects",
			"workspace.ungrouped": "Ungrouped",
			"workspace.createGroup": "Create group",
			"workspace.createGroupDescription": "Enter a group name. Projects will not move automatically.",
			"workspace.groupName": "Group name",
			"workspace.moveToGroup": "Move to group",
			"workspace.removeFromGroup": "Move to ungrouped",
			"workspace.deleteGroup": "Delete group {name}",
			"workspace.deleteGroupAction": "Delete group",
			"workspace.deleteGroupDescription": "Deleting this group moves its projects to Ungrouped. It does not delete projects or conversations.",
			"workspace.groupActions": "Actions for group {name}",
			"workspace.renameGroup": "Rename group",
			"workspace.recent": "Recents",
			"workspace.recentEmpty": "Conversations you open will show up here.",
			"workspace.noChat": "No chats",
			"workspace.showMore": "Show more",
			"workspace.empty": "No projects yet. Add a workspace folder to get started.",
			"workspace.newSession": "New conversation",
			"workspace.rename": "Rename project",
			"workspace.pin": "Pin project",
			"workspace.unpin": "Unpin",
			"workspace.archive": "Archive all conversations",
			"workspace.archiveTitle": "Archive {count} conversations?",
			"workspace.archiveDescription": "This archives every conversation in “{name}”. The project and folder remain available.",
			"workspace.archiveConfirm": "Archive all",
			"workspace.archivePending": "Archiving conversations…",
			"workspace.pinned": "Pinned",
			"workspace.pinnedEmpty": "Drag a project here to pin it",
			"workspace.openPath": "Open in file explorer",
			"workspace.delete": "Remove project",
			"workspace.deleteDescription": "This removes “{name}” from the project list. The folder and conversation records remain.",
			"workspace.deletePending": "Removing project…",
			"workspace.actions": "Project actions for {name}",
			"workspace.taskCount": "{count} tasks",
			"workspace.taskSummary": "{count} tasks · {unreadCount} unread",
			"workspace.edit": "Rename project",
			"sessions.close": "Close",
			"sessions.cancel": "Cancel",
			"sessions.confirm": "Confirm",
			"sessions.save": "Save",
			"sessions.previous": "Previous conversation",
			"sessions.next": "Next conversation",
			"sessions.noTarget": "No conversation to switch to.",
			"sessions.pin": "Pin conversation",
			"sessions.unpin": "Unpin conversation",
			"sessions.pinFailed": "Could not update the pin right now, please try again later.",
			"sessions.failed": "Action failed: {message}",
			"sessions.unknown": "Conversation not found.",
			"sessions.actions": "Conversation actions for {name}",
			"sessions.markUnread": "Mark as unread",
			"sessions.markRead": "Mark as read",
			"sessions.unread": "Unread",
			"sessions.running": "Running",
			"sessions.waitingAnswer": "Waiting for answer",
			"sessions.waitingApproval": "Waiting for approval",
			"sessions.planReview": "Plan awaiting review",
			"sessions.rename": "Rename conversation",
			"sessions.renameDescription": "Keep it short and easy to recognize.",
			"sessions.renameInvalid": "The conversation name is invalid. Change it and try again.",
			"sessions.renameFailed": "The conversation could not be renamed. Try again later.",
			"sessions.archive": "Archive conversation",
			"sessions.archiveFailed": "The conversation could not be archived. Try again later.",
			"sessions.delete": "Delete conversation",
			"sessions.deleteDescription": "This permanently deletes “{name}” and all of its records. This cannot be undone.",
			"sessions.deletePending": "Deleting conversation…",
			"sessions.deleteUnavailable": "The archive manager plugin is not installed or unavailable.",
			"sessions.deleteFailed": "The conversation could not be deleted. Try again later.",
			"sessions.fork": "Continue in new conversation",
			"sessions.forkUnavailable": "This conversation cannot be continued in a new conversation right now. Try again after the current turn finishes.",
			"sessions.forkFailed": "A new conversation could not be created. Try again later.",
			"sessions.openPath": "Open in file explorer",
			"sessions.moveWorkspace": "Project",
			"sessions.moveUnavailable": "Conversation moving is unavailable. Restart DSH and try again.",
			"sessions.moveUnauthorized": "Your login session has expired. Refresh the page and sign in again.",
			"sessions.moveForbidden": "The current address is not trusted, or the request origin was rejected.",
			"sessions.moveNotFound": "The conversation or target project no longer exists. Refresh and try again.",
			"sessions.moveSubagent": "Subagent conversations cannot be moved to another project.",
			"sessions.moveBusy": "This conversation is already being moved. Try again shortly.",
			"sessions.moveRollbackFailed": "The conversation could not be moved, and automatic recovery did not complete. Check the DSH server logs.",
			"sessions.moveFailed": "The conversation could not be moved. The original conversation was preserved.",
			"sessions.moveConfirmTitle": "Move conversation to “{project}”?",
			"sessions.moveConfirmDescription": "“{name}” will move to this project, and its working directory will change with it.",
			"sessions.moveConfirmAction": "Move",
			"sessions.movePending": "Moving conversation…",
			"sessions.copyPath": "Copy working directory",
			"sessions.copyTitle": "Copy conversation title",
			"sessions.copyId": "Copy conversation ID",
			"connectors.title": "Connectors",
			"connectors.description": "Shows MCP connectors and tools available to this session without exposing addresses, commands, or credentials.",
			"connectors.openSession": "Open a conversation to load connectors.",
			"connectors.loading": "Loading connectors…",
			"connectors.failed": "Connectors are unavailable. Try again shortly.",
			"connectors.toolCount": "{count} tools",
			"connectors.empty": "This conversation has no available MCP connectors.",
			"connectors.promptReady": "Added to a new conversation",
			"connectors.promptRequired": "The prompt cannot be empty.",
			"connectors.workspacesLoading": "DSH workspace data is still loading. Try again shortly.",
			"connectors.workspaceRequired": "Select a workspace before using an example prompt.",
			"connectors.workspaceUnavailable": "The DSH workspace service is not ready. Try again shortly.",
			"connectors.conversationUnavailable": "The DSH conversation service is not ready. Try again shortly.",
			"connectors.sessionPending": "The new conversation is not ready yet. Try again shortly.",
			"about.nav": "Codex UI",
			"about.title": "Codex UI",
			"about.viewProject": "GitHub",
			"about.feedback": "Issues",
			"about.description": "Adds a ZCode-style sidebar, workspace conversation management, search, and turn navigation to DSH.",
			"about.features": "Core features",
			"about.feature.sidebar": "ZCode-style sidebar, global conversation search, and settings entry points",
			"about.feature.search": "Find conversations, settings pages, and quick actions from the top search panel",
			"about.feature.workspace": "Expand, collapse, reorder, and pin workspace folders while retaining native workspace behavior",
			"about.feature.sessions": "Rename, pin, mark unread, archive, delete, or use context actions for conversations",
			"about.feature.conversation": "Keeps native messages, tool calls, composer, permissions, and model selection while refining the container visuals",
			"about.feature.navigator": "Navigate directly to each user prompt with the current conversation turn navigator",
			"about.dependencies": "Companion management plugins",
			"about.dependenciesDescription": "Install or update each companion separately, or install missing plugins and update old versions in one action. Check Codex UI, expert, skill, archive, IM, scheduled-task, BTW, Simplify, PUA, code review, pet, and marketplace plugins on their own.",
			"about.loading": "Loading dependency status…",
			"about.statusFailed": "Dependency status is temporarily unavailable.",
			"about.refreshFailed": "Dependency status refresh failed. Showing the last successful result.",
			"about.installed": "Installed",
			"about.missing": "Not installed",
			"about.updateAvailable": "Update available",
			"about.install": "Install",
			"about.update": "Update",
			"about.installing": "Installing",
			"about.updateAll": "Install/update all",
			"about.updatingAll": "Installing/updating",
			"about.upToDate": "All companion plugins are installed and up to date.",
			"about.installFailed": "Dependency installation failed. Try again later.",
			"about.installUnchanged": "The install command finished, but the plugin did not enter this profile. Try again.",
			"about.installExitDesktop": "Quit DSH Desktop completely, reopen it, and try the update again.",
			"about.installStoreMismatch": "The plugin directory and pnpm store do not match. Quit DSH Desktop completely and try again.",
			"about.installExitWeb": "Running plugin files cannot be replaced. Stop the current DSH Web host, update the plugin from a terminal, then restart DSH Web.",
			"about.installStoreMismatchWeb": "The plugin directory and pnpm store do not match. Stop the current DSH Web host and try again; if it persists, reinstall this Profile's dependencies.",
			"about.installWebFailed": "Plugin update failed. Check the DSH Web terminal output and try again.",
			"about.installBuildPolicy": "The pnpm build-script policy for this plugin is not configured. Update the Profile configuration and try again.",
			"about.installPnpmMissing": "pnpm is not available. Install pnpm, restart DSH, and try again.",
			"about.installTimeout": "Plugin installation timed out. Check the network and try again.",
			"about.installServiceUnavailable": "The DSH Desktop dependency service is not ready. Restart DSH Desktop and try again.",
			"about.restartRequired": "Updating plugins now. The window will refresh automatically.",
			"about.restartManually": "Installation complete. This Web host cannot restart itself; restart DSH Web, then refresh the page.",
			"about.progressHint": "Installing plugin…",
			"about.packagesDone": "{0} packages done",
			"about.progress.resolving": "Resolving",
			"about.progress.downloading": "Downloading",
			"about.progress.linking": "Writing files",
			"about.progress.building": "Building",
			"about.dependency.dsh": "DeepSeek Harness",
			"about.dependency.suite": "Codex suite",
			"about.dependency.ui": "Codex UI",
			"about.dependency.experts": "Expert management",
			"about.dependency.skills": "Skill management",
			"about.dependency.archive": "Archived conversations",
			"about.dependency.im": "IM Assistant",
			"about.dependency.schedule": "Scheduled tasks",
			"about.dependency.pet": "Codex Pet",
			"about.dependency.btw": "BTW",
			"about.dependency.simplify": "Simplify",
			"about.dependency.pua": "PUA",
			"about.dependency.review": "Code Review",
			"about.dependency.market": "App Market",
			"about.totalDownloads": "npm total downloads",
			"about.downloadsUnavailable": "Unavailable",
			"about.downloadsSource": "Cumulative npm downloads from package creation through yesterday. View package on npm.",
			"turns.label": "Conversation turn navigation",
			"turns.untitled": "Untitled prompt",
			"turns.jump": "Jump to turn {index}: {summary}",
			"time.justNow": "Just now",
			"time.justNowShort": "now",
			"time.minutes": "{count}m",
			"time.hours": "{count}h",
			"time.days": "{count}d",
			"time.weeks": "{count}w",
			"time.months": "{count}mo",
			"time.years": "{count}y",
			"errors.unauthorized": "Sign in to DSH, then try again.",
			"errors.forbidden": "The security check rejected this request. Try again from a trusted DSH address.",
			"errors.serviceUnavailable": "The service is unavailable. Try again later.",
			"workspace.preferencesLocalOnly": "Workspace preferences are not synced. Using the local cache.",
			"errors.generic": "The action could not be completed. Try again.",
			"errors.groupInvalid": "The group information is invalid.",
			"errors.workspaceInvalid": "The project identifier is invalid.",
			"errors.groupMissing": "The target group no longer exists.",
			"errors.orderAnchorMissing": "The target position is no longer available. Try again.",
			"sessionTitle.system": "Generate a title for a coding-assistant conversation.\nOutput exactly one line with two parts: Type｜Theme\nType must be one of: {types}\nThe theme must be a concrete subject and must not repeat the type. Do not write dates, emoji, quotes, prefixes, explanations, or Markdown.\nWrite the theme in the language of the user message.",
			"sessionTitle.userFrame": "Generate a conversation title from this user message. Return only one Type｜Theme line. Do not add a third part or repeat the theme.",
			"sessionTitle.type.feature": "Feature",
			"sessionTitle.type.design": "Design",
			"sessionTitle.type.fix": "Fix",
			"sessionTitle.type.optimize": "Optimize",
			"sessionTitle.type.release": "Release",
			"sessionTitle.type.explore": "Explore",
			"sessionTitle.type.docs": "Docs",
			"sessionTitle.type.research": "Research",
			"meta.locale": "en-US"
		};
		const HIDDEN_FOOTER_ACTION_IDS = /* @__PURE__ */ new Set(["context-overview"]);
		function visibleFooterActions(slots) {
			return slots.entriesOfSlot("sidebar.footer.action").flatMap(({ options }) => {
				const id = options.id;
				if (id === void 0 || HIDDEN_FOOTER_ACTION_IDS.has(id)) return [];
				return [{
					id,
					order: options.order ?? 0
				}];
			}).sort((left, right) => left.order - right.order);
		}
		function sameFooterActions(left, right) {
			return left.length === right.length && left.every((action, index) => {
				const previous = right[index];
				return previous !== void 0 && action.id === previous.id && action.order === previous.order;
			});
		}
		/** 给 React useSyncExternalStore 用的底部动作快照；按 slot id 过滤，不靠 DOM class。 */
		function createFooterActionSource(slots) {
			let cached = [];
			return {
				getSnapshot() {
					const next = visibleFooterActions(slots);
					if (sameFooterActions(next, cached)) return cached;
					cached = next;
					return cached;
				},
				subscribe(listener) {
					return slots.subscribe("sidebar.footer.action", listener);
				}
			};
		}
		//#endregion
		//#region src/client/slot-mirror.tsx
		const bridges = /* @__PURE__ */ new WeakMap();
		const wrappers = /* @__PURE__ */ new WeakMap();
		/** Keep a real React component boundary and its hooks; translate only renderer-owned bindings. */
		function withSlotAliases(Component, aliases) {
			const pairs = Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b));
			const signature = JSON.stringify(pairs);
			let cached = wrappers.get(Component);
			if (!cached) wrappers.set(Component, cached = /* @__PURE__ */ new Map());
			const previous = cached.get(signature);
			if (previous) return previous;
			const map = new Map(pairs);
			function SlotAliases(props) {
				const face = props;
				const renderSlot = (0, react.useMemo)(() => face.renderSlot && ((key, ...args) => face.renderSlot(map.get(key) ?? key, ...args)), [face.renderSlot]);
				const renderSlotChain = (0, react.useMemo)(() => face.renderSlotChain && ((key, ...args) => face.renderSlotChain(map.get(key) ?? key, ...args)), [face.renderSlotChain]);
				return (0, react.createElement)(Component, {
					...props,
					...renderSlot && { renderSlot },
					...renderSlotChain && { renderSlotChain }
				});
			}
			cached.set(signature, SlotAliases);
			return SlotAliases;
		}
		/**
		* Mirror effective contributions into a predeclared, exclusive root-scope alias.
		* Supports single/list/keyed; chain and session scopes are deliberately rejected.
		* The parent owns the top-level alias declaration and must call the returned disposer
		* on unmount. Source declarations/entries are never changed. Children get new declarations.
		*/
		function mirrorSlot(ctx, source, target) {
			const slots = ctx.slots;
			const readSpec = slots.spec.bind(slots);
			const register = slots.register.bind(slots);
			const validate = (spec) => {
				if (spec.scope !== "root" || ![
					"single",
					"list",
					"keyed"
				].includes(spec.kind)) throw new Error("slot mirror supports only root single/list/keyed slots");
			};
			const install = (from, to, ancestors) => {
				if (from === to || ancestors.has(from)) throw new Error("recursive slot mirror");
				let graph = bridges.get(ctx);
				if (!graph) bridges.set(ctx, graph = /* @__PURE__ */ new Map());
				let cursor = from;
				while (cursor !== void 0) {
					if (cursor === to) throw new Error("recursive slot mirror");
					cursor = graph.get(cursor);
				}
				if (graph.has(to)) throw new Error(`mirror target '${to}' already has a bridge`);
				const targetSpec = readSpec(to);
				if (!targetSpec) throw new Error(`mirror target '${to}' must be declared by its parent`);
				validate(targetSpec);
				const branch = new Set(ancestors).add(from);
				const active = /* @__PURE__ */ new Map();
				let stopped = false;
				const clear = () => {
					for (const remove of active.values()) remove();
					active.clear();
				};
				graph.set(to, from);
				const stop = () => {
					if (stopped) return;
					stopped = true;
					unsubSource();
					unsubTarget();
					graph.delete(to);
					clear();
				};
				const sync = () => {
					if (stopped) return;
					if (!readSpec(to)) {
						stop();
						return;
					}
					const spec = readSpec(from);
					if (spec) {
						validate(spec);
						if (spec.kind !== targetSpec.kind) throw new Error("slot mirror kind mismatch");
					}
					const entries = slots.entriesOfSlot(from);
					for (const [entry, remove] of active) if (!entries.includes(entry)) {
						remove();
						active.delete(entry);
					}
					for (const entry of entries) {
						if (active.has(entry)) continue;
						const aliases = Object.create(null);
						const children = Object.create(null);
						for (const [child, childSpec] of Object.entries(entry.children ?? {})) {
							validate(childSpec);
							if (branch.has(child)) throw new Error("recursive slot mirror");
							const alias = `${to}.${encodeURIComponent(child)}`;
							if (readSpec(alias)) throw new Error(`mirror child alias '${alias}' is already declared`);
							aliases[child] = alias;
							children[alias] = childSpec;
						}
						const removes = [];
						try {
							removes.push(register({
								name: to,
								...entry.options,
								inject: entry.inject,
								store: entry.store,
								locale: entry.locale,
								registrant: entry.registrant,
								...entry.children && { children }
							}, withSlotAliases(entry.component, aliases)));
							for (const [child, alias] of Object.entries(aliases)) removes.push(install(child, alias, branch));
							active.set(entry, () => {
								for (const remove of removes.reverse()) remove();
							});
						} catch (error) {
							for (const remove of removes.reverse()) remove();
							throw error;
						}
					}
				};
				const safeSync = () => {
					try {
						sync();
					} catch (error) {
						console.warn(`[zcode-ui-for-dsh] slot-mirror sync error on '${from}' -> '${to}':`, error);
						stop();
					}
				};
				const unsubSource = slots.subscribe(from, safeSync);
				const unsubTarget = slots.subscribe(to, safeSync);
				try {
					sync();
				} catch (error) {
					stop();
					throw error;
				}
				return stop;
			};
			const start = () => install(source, target, /* @__PURE__ */ new Set());
			return ctx.effect ? ctx.effect(start) : start();
		}
		//#endregion
		//#region src/client/host-open-path.ts
		const OPEN_IN_EXPLORER_ENDPOINT = CODEX_UI_API_ENDPOINTS.openInExplorer;
		/** “在资源管理器中打开”属于明确的系统动作，不应被侧边栏文件预览器接管。 */
		async function openPathInHost(connection, path, fetcher = fetch) {
			let foregroundResponse;
			try {
				foregroundResponse = await fetcher(OPEN_IN_EXPLORER_ENDPOINT, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path })
				});
			} catch {}
			if (foregroundResponse?.ok) return;
			if (foregroundResponse !== void 0 && [
				401,
				403,
				503
			].includes(foregroundResponse.status)) throw new BusinessRequestError(foregroundResponse.status);
			if (foregroundResponse !== void 0 && foregroundResponse.status !== 404 && foregroundResponse.status !== 501) {
				const payload = await foregroundResponse.json().catch(() => ({}));
				throw new Error(typeof payload.error === "string" ? payload.error : "无法在前台打开资源管理器。");
			}
			const response = await connection.api.host.openPath({ path });
			if (!response.result.ok) throw new Error(`path open failed: ${response.result.error.message}`);
		}
		//#endregion
		//#region src/client/settings-nav-icons.ts
		const ABOUT_SETTINGS_NAV_ORDER = "2147483647";
		const SETTINGS_NAV_ICON_HTML = {
			experts: "<path fill=\"currentColor\" d=\"M11.0307 5.46369C11.0305 3.78995 9.6734 2.43357 7.99961 2.43357C6.32601 2.43379 4.96972 3.79009 4.96949 5.46369C4.96949 7.13748 6.32587 8.49455 7.99961 8.49477C9.67354 8.49477 11.0307 7.13762 11.0307 5.46369ZM12.3163 5.46369C12.3163 7.84777 10.3837 9.78042 7.99961 9.78042C5.61572 9.7802 3.68288 7.84763 3.68288 5.46369C3.6831 3.07993 5.61586 1.14718 7.99961 1.14695C10.3836 1.14695 12.3161 3.0798 12.3163 5.46369Z\"/><path fill=\"currentColor\" d=\"M8.00002 10.3316C11.7343 10.3316 14.1864 11.8997 15.0387 14.4445L14.4292 14.6483L13.8197 14.8531C13.1955 12.9893 11.3673 11.6182 8.00002 11.6182C4.63277 11.6182 2.80455 12.9893 2.18031 14.8531L1.5708 14.6483L0.961304 14.4445C1.81368 11.8997 4.26579 10.3316 8.00002 10.3316Z\"/>",
			skills: "<path fill=\"currentColor\" d=\"M12.5113 15.4067C12.4395 15.6249 12.1308 15.6249 12.059 15.4067L11.643 14.1416C11.454 13.567 11.0033 13.1164 10.4288 12.9274L9.16369 12.5113C8.94544 12.4395 8.94544 12.1308 9.16369 12.059L10.4288 11.643C11.0033 11.454 11.454 11.0033 11.643 10.4288L12.059 9.16369C12.1308 8.94544 12.4395 8.94544 12.5113 9.16369L12.9274 10.4288C13.1164 11.0033 13.567 11.454 14.1416 11.643L15.4067 12.059C15.6249 12.1308 15.6249 12.4395 15.4067 12.5113L14.1416 12.9274C13.567 13.1164 13.1164 13.567 12.9274 14.1416L12.5113 15.4067Z\"/><path fill=\"currentColor\" d=\"M9.02246 0.546878C9.9822 0.546878 10.7564 0.545403 11.374 0.612307C12.0042 0.680586 12.5515 0.826244 13.0273 1.17188C13.3052 1.37376 13.5501 1.61868 13.752 1.89649C14.0975 2.37225 14.2432 2.91984 14.3115 3.54981C14.3784 4.16727 14.377 4.94206 14.377 5.90137V8.51367C13.9611 8.29533 13.5071 8.13985 13.0273 8.06055V5.90137C13.0273 4.9121 13.0259 4.22322 12.9688 3.69532C12.9129 3.18044 12.8098 2.89782 12.6592 2.69043C12.5406 2.52724 12.3966 2.38326 12.2334 2.26465C12.026 2.11404 11.7437 2.0109 11.2285 1.95508C10.7005 1.89789 10.0122 1.89649 9.02246 1.89649H6.55371C5.56395 1.89649 4.87569 1.89787 4.34766 1.95508C3.83242 2.01092 3.55022 2.11398 3.34278 2.26465C3.17953 2.38329 3.03564 2.52719 2.91699 2.69043C2.76642 2.89782 2.66325 3.18042 2.60742 3.69532C2.55027 4.22322 2.54883 4.9121 2.54883 5.90137V10.0986C2.54883 11.0878 2.55031 11.7768 2.60742 12.3047C2.66326 12.8196 2.76642 13.1032 2.91699 13.3105C3.03558 13.4736 3.17966 13.6178 3.34278 13.7363C3.5502 13.8869 3.83265 13.9901 4.34766 14.0459C4.87568 14.1031 5.56398 14.1035 6.55371 14.1035H8.08399C8.27443 14.6025 8.55077 15.0585 8.89551 15.4541H6.55371C5.59402 15.4541 4.81976 15.4546 4.20215 15.3877C3.57204 15.3194 3.02468 15.1738 2.54883 14.8281C2.27111 14.6263 2.02606 14.3813 1.82422 14.1035C1.47883 13.6278 1.33293 13.08 1.26465 12.4502C1.19783 11.8327 1.19922 11.0579 1.19922 10.0986V5.90137C1.19922 4.94206 1.1978 4.16727 1.26465 3.54981C1.33295 2.91984 1.47867 2.37225 1.82422 1.89649C2.02613 1.61864 2.27098 1.37379 2.54883 1.17188C3.02472 0.826181 3.57197 0.6806 4.20215 0.612307C4.81976 0.545393 5.594 0.546877 6.55371 0.546878H9.02246ZM9.19629 9.14649H4.5459V7.84571H9.19629V9.14649ZM11.0303 6.10645H4.5459V4.80567H11.0303V6.10645Z\"/>",
			plugins: "<path transform=\"translate(1.292 1.3)\" fill=\"currentColor\" d=\"M10.3232 9.18164C11.2868 9.18164 12.0985 9.82833 12.3506 10.7109L13.415 10.7109L13.415 11.8711L12.3496 11.8711C12.0971 12.7532 11.2864 13.3994 10.3232 13.3994C9.36031 13.3992 8.55012 12.7531 8.29785 11.8711L0 11.8711L0 10.7109L8.29688 10.7109C8.54876 9.82845 9.35988 9.18186 10.3232 9.18164ZM10.3232 10.3418C9.7999 10.3421 9.37534 10.7667 9.375 11.29C9.375 11.8137 9.79969 12.239 10.3232 12.2393C10.847 12.2393 11.2725 11.8138 11.2725 11.29C11.2721 10.7666 10.8468 10.3418 10.3232 10.3418ZM12.4326 11.291C12.4326 11.3549 12.4284 11.418 12.4229 11.4805C12.4287 11.4181 12.4326 11.355 12.4326 11.291ZM8.21484 11.2832C8.21484 11.2856 8.21484 11.2886 8.21484 11.291L8.21484 11.29C8.21484 11.2878 8.21484 11.2855 8.21484 11.2832ZM3.08301 4.59082C4.04605 4.59095 4.85696 5.23717 5.10938 6.11914L13.415 6.11914L13.415 7.2793L5.11035 7.2793C4.85833 8.16202 4.04648 8.80846 3.08301 8.80859C2.11972 8.80843 1.30963 8.16179 1.05762 7.2793L0 7.2793L0 6.11914L1.05762 6.11914C1.30994 5.23728 2.12006 4.59098 3.08301 4.59082ZM3.08301 5.75098C2.55962 5.75117 2.13512 6.17587 2.13477 6.69922C2.13477 7.22287 2.5594 7.64824 3.08301 7.64844C3.60665 7.64828 4.03223 7.2229 4.03223 6.69922C4.03187 6.17585 3.60643 5.75113 3.08301 5.75098ZM5.19238 6.69922C5.19238 6.763 5.18816 6.82633 5.18262 6.88867C5.18846 6.82629 5.19238 6.76313 5.19238 6.69922C5.19236 6.63495 5.18853 6.57152 5.18262 6.50879C5.18826 6.57154 5.19236 6.635 5.19238 6.69922ZM0.982422 6.52344C0.977382 6.58136 0.97463 6.63999 0.974609 6.69922C0.974609 6.75775 0.977496 6.81579 0.982422 6.87305C0.977758 6.81579 0.974609 6.75767 0.974609 6.69922C0.974628 6.64 0.977618 6.58142 0.982422 6.52344ZM10.3232 0C11.2869 0 12.0986 0.646596 12.3506 1.5293L13.415 1.5293L13.415 2.68945L12.3496 2.68945C12.363 2.64266 12.3754 2.59488 12.3857 2.54688C12.1838 3.50118 11.3376 4.21777 10.3232 4.21777C9.36037 4.21756 8.55018 3.57139 8.29785 2.68945L0 2.68945L0 1.5293L8.29688 1.5293C8.5487 0.646717 9.35981 0.00021854 10.3232 0ZM10.3232 1.16016C9.79984 1.16042 9.37524 1.58499 9.375 2.1084C9.375 2.63201 9.79969 3.05735 10.3232 3.05762C10.847 3.05762 11.2725 2.63217 11.2725 2.1084C11.2722 1.58483 10.8469 1.16016 10.3232 1.16016ZM12.4229 2.29883C12.4287 2.23641 12.4326 2.17331 12.4326 2.10938C12.4326 2.17327 12.4284 2.23638 12.4229 2.29883ZM8.21484 2.10938L8.21484 2.1084L8.21484 2.10938ZM8.22266 1.93359C8.21785 1.98897 8.21506 2.04499 8.21484 2.10156C8.21503 2.04501 8.2181 1.98902 8.22266 1.93359ZM8.22266 11.1162C8.2179 11.1713 8.21507 11.227 8.21484 11.2832C8.21504 11.227 8.21814 11.1713 8.22266 11.1162Z\"/>",
			connectors: "<path fill=\"currentColor\" d=\"M9.94133 6.50173C11.3218 7.99603 11.3218 10.3011 9.94128 11.7954C9.88691 11.8542 9.82125 11.9196 9.72099 12.0198L7.75707 13.9838C7.65709 14.0838 7.592 14.1491 7.53334 14.2034C6.03906 15.5843 3.7327 15.5854 2.23827 14.2048C2.17933 14.1503 2.11374 14.0844 2.01315 13.9838C1.91318 13.8839 1.84922 13.8188 1.79495 13.7601C0.413857 12.2657 0.413909 9.95948 1.795 8.46503C1.84923 8.4064 1.91335 8.34115 2.01321 8.24129L3.79275 6.46313C3.71814 7.08101 3.75236 7.71445 3.90115 8.33518L3.00344 9.23151C2.89398 9.34097 2.8535 9.38307 2.82251 9.41658C1.93771 10.3744 1.93704 11.8514 2.82179 12.8092C2.85279 12.8427 2.89383 12.884 3.0034 12.9936C3.11272 13.1029 3.15429 13.1442 3.18777 13.1752C4.14561 14.0603 5.62381 14.0608 6.58178 13.1758C6.61532 13.1448 6.65722 13.1032 6.76685 12.9935L8.73077 11.0296C8.83999 10.9204 8.88142 10.8787 8.91238 10.8452C9.79744 9.88728 9.7969 8.40911 8.91173 7.45124C8.88074 7.41775 8.83944 7.3762 8.73011 7.26687C8.62082 7.15757 8.58061 7.11623 8.54712 7.08526C8.37347 6.92477 8.18243 6.79361 7.98088 6.69165L9.00289 5.66964C9.17506 5.78373 9.34035 5.91265 9.49663 6.05703C9.55538 6.11135 9.62026 6.17652 9.72036 6.27662C9.82094 6.3772 9.88686 6.4428 9.94133 6.50173Z\"/><path fill=\"currentColor\" d=\"M6.06816 9.49196C4.68626 7.99724 4.68667 5.68942 6.06885 4.19487C6.12268 4.13671 6.18789 4.07306 6.28706 3.9739L8.24541 2.01416C8.34478 1.91479 8.41018 1.85055 8.46845 1.79665C9.96301 0.414902 12.2689 0.414922 13.7635 1.79665C13.8217 1.85051 13.8866 1.91559 13.9858 2.01486C14.0849 2.11394 14.1502 2.17769 14.204 2.23583C15.5861 3.7304 15.5866 6.03823 14.2047 7.53291C14.1508 7.59125 14.0854 7.65638 13.9858 7.75595L12.1994 9.54098C12.2614 8.92982 12.2185 8.30587 12.0634 7.69657L12.9956 6.76573C13.1044 6.65692 13.1458 6.61529 13.1765 6.58205C14.0621 5.62404 14.0621 4.1454 13.1765 3.18738C13.1458 3.15419 13.104 3.1135 12.9956 3.00508C12.8877 2.89716 12.8471 2.85551 12.814 2.82485C11.8559 1.9389 10.376 1.93886 9.41794 2.82485C9.38479 2.85554 9.34381 2.89622 9.23564 3.00439L7.27728 4.96413C7.16875 5.07265 7.12708 5.11322 7.09636 5.14643C6.21074 6.10441 6.21153 7.58236 7.09705 8.5404C7.12775 8.57357 7.16826 8.61575 7.27659 8.72408C7.38456 8.83205 7.42647 8.87227 7.45958 8.90293C7.62849 9.0591 7.81309 9.1881 8.00856 9.28894L6.98795 10.3095C6.82111 10.1978 6.66052 10.0715 6.50872 9.93114C6.45057 9.87733 6.38547 9.81341 6.28637 9.71431C6.1871 9.61504 6.12202 9.55018 6.06816 9.49196Z\"/>",
			schedule: "<path fill=\"currentColor\" d=\"M8 1.15A6.85 6.85 0 1 0 8 14.85 6.85 6.85 0 0 0 8 1.15Zm0 1.4a5.45 5.45 0 1 1 0 10.9 5.45 5.45 0 0 1 0-10.9Z\"/><path fill=\"currentColor\" d=\"M8.62 4.35H7.28v4.2l3.02 1.78.67-1.13-2.35-1.39V4.35Z\"/>",
			assistant: "<path fill=\"currentColor\" d=\"M2.15 2.9h11.7v8.2H6.42L2.15 13.85V2.9Zm1.4 1.4v6.62l1.78-1.12h7.12V4.3H3.55Z\"/>",
			archive: "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" fill=\"currentColor\" d=\"M15.8659 2.05975C17.2603 2.05995 18.3913 3.19096 18.3914 4.58527V5.4874C18.3914 6.02747 18.2192 6.52672 17.9303 6.93735C17.9336 6.96524 17.9388 6.99318 17.9388 7.02195V12.8884C17.9388 13.6345 17.9395 14.2379 17.8996 14.7254C17.8642 15.1593 17.7936 15.5499 17.6373 15.9141L17.5654 16.0685C17.278 16.6328 16.8405 17.1046 16.3038 17.434L16.0679 17.5661C15.66 17.7739 15.2196 17.8598 14.7237 17.9003C14.2362 17.9401 13.6327 17.9405 12.8867 17.9405H7.11122C6.36511 17.9405 5.76171 17.9401 5.27418 17.9003C4.84051 17.8649 4.44949 17.7952 4.08545 17.6391L3.93104 17.5661C3.36673 17.2785 2.89392 16.8414 2.56465 16.3044L2.43245 16.0685C2.22473 15.6608 2.13878 15.2211 2.09825 14.7254C2.05841 14.2379 2.05912 13.6345 2.05912 12.8884V7.02195C2.05912 6.99284 2.06422 6.96449 2.06758 6.93629C1.77931 6.52592 1.60858 6.02687 1.60858 5.4874V4.58527C1.60876 3.19084 2.73962 2.05975 4.1341 2.05975H15.8659ZM16.4984 7.92936C16.296 7.98169 16.0847 8.01288 15.8659 8.01291H4.1341C3.91478 8.01291 3.70246 7.98194 3.49955 7.92936V12.8884C3.49955 13.6582 3.50053 14.1927 3.53445 14.608C3.56769 15.0146 3.62923 15.244 3.71635 15.415L3.7925 15.5514C3.98339 15.8627 4.25749 16.1165 4.58464 16.2833L4.72529 16.3435C4.88095 16.3993 5.08638 16.4402 5.39158 16.4651C5.80685 16.4991 6.34138 16.5001 7.11122 16.5001H12.8867C13.6564 16.5001 14.1911 16.499 14.6063 16.4651C15.0128 16.432 15.2423 16.3703 15.4133 16.2833L15.5508 16.2061C15.8618 16.0152 16.116 15.7419 16.2827 15.415L16.3429 15.2732C16.3985 15.1177 16.4396 14.9128 16.4645 14.608C16.4985 14.1927 16.4984 13.6583 16.4984 12.8884V7.92936ZM4.1341 3.50019C3.53511 3.50019 3.0492 3.98631 3.04902 4.58527V5.4874C3.04902 6.08649 3.535 6.57248 4.1341 6.57248H15.8659C16.4648 6.57228 16.951 6.08638 16.951 5.4874V4.58527C16.9509 3.98644 16.4647 3.50038 15.8659 3.50019H4.1341Z\"/><path fill=\"currentColor\" d=\"M12.7962 12.5661V11.0832H7.20548V12.5661L12.7962 12.5661Z\"/>",
			about: "<path fill=\"currentColor\" d=\"M12.5757 7.00012C12.5757 3.92085 10.0794 1.42463 7.00012 1.42456C3.9208 1.42456 1.42456 3.9208 1.42456 7.00012C1.42463 10.0794 3.92085 12.5757 7.00012 12.5757C10.0793 12.5756 12.5756 10.0793 12.5757 7.00012ZM13.8002 7.00012C13.8001 10.7559 10.7559 13.8001 7.00012 13.8002C3.2443 13.8002 0.199291 10.7559 0.199219 7.00012C0.199219 3.24426 3.24426 0.199219 7.00012 0.199219C10.7559 0.199291 13.8002 3.2443 13.8002 7.00012Z\"/><path fill=\"currentColor\" d=\"M6.18042 8.68184C6.18043 8.09153 6.32893 7.34655 6.92127 6.8481C7.28566 6.54148 7.76104 6.27318 8.0022 6.10811C8.28964 5.91137 8.42234 5.76562 8.48328 5.58944C8.57774 5.31609 8.53121 5.00904 8.34912 4.76741C8.17409 4.53522 7.83879 4.32222 7.28186 4.32222C5.99668 4.32225 5.46969 5.11832 5.46949 5.78939H4.24414C4.24436 4.39942 5.36327 3.09691 7.28186 3.09688C8.17773 3.09688 8.89489 3.45606 9.32752 4.02999C9.75287 4.59438 9.86938 5.32775 9.64026 5.99019C9.44847 6.5444 9.04722 6.87743 8.69434 7.11898C8.29506 7.39226 8.02318 7.52192 7.70996 7.78548C7.51943 7.94582 7.40577 8.24899 7.40577 8.68184V8.75533H6.18042V8.68184Z\"/><path fill=\"currentColor\" d=\"M7.39455 9.44026V10.8109H6.16921V9.44026H7.39455Z\"/>"
		};
		const LABEL_ALIASES = [
			[["插件市场", "Plugin Market"], "plugins"],
			[["内置插件", "Built-in plugins"], "plugins"],
			[["插件配置", "Plugin configuration"], "plugins"],
			[["专家", "Experts"], "experts"],
			[["技能", "Skills"], "skills"],
			[["插件", "Plugins"], "plugins"],
			[["连接器", "Connectors"], "connectors"],
			[["定时任务", "Scheduled tasks"], "schedule"],
			[["IM助理", "IM Assistant"], "assistant"],
			[[
				"已归档",
				"归档会话",
				"Archived",
				"Archived sessions"
			], "archive"],
			[["Codex UI"], "about"]
		];
		/** 按设置导航可见文案解析侧栏同款图标；插件市场复用插件图标。 */
		function settingsNavIconId(label) {
			const text = label.trim();
			for (const [aliases, id] of LABEL_ALIASES) if (aliases.includes(text)) return id;
		}
		function applySettingsNavIcon(button) {
			const id = settingsNavIconId(button.textContent ?? "");
			if (id === void 0) return false;
			let changed = false;
			if (id === "about") {
				if (!button.hasAttribute("data-dcu-settings-about-last")) {
					button.setAttribute("data-dcu-settings-about-last", "");
					changed = true;
				}
				if (button.style.getPropertyValue("order") !== "2147483647" || button.style.getPropertyPriority("order") !== "important") {
					button.style.setProperty("order", ABOUT_SETTINGS_NAV_ORDER, "important");
					changed = true;
				}
			}
			const svg = button.querySelector("svg");
			if (svg === null) return changed;
			if (svg.getAttribute("data-dcu-nav-icon") === id) return changed;
			svg.setAttribute("data-dcu-nav-icon", id);
			svg.setAttribute("viewBox", id === "archive" ? "0 0 20 20" : id === "about" ? "0 0 14 14" : "0 0 16 16");
			svg.setAttribute("fill", "none");
			svg.innerHTML = SETTINGS_NAV_ICON_HTML[id];
			return true;
		}
		function applySettingsNavIcons(root) {
			let changed = 0;
			for (const button of root.querySelectorAll("[role=\"dialog\"] nav button")) if (applySettingsNavIcon(button)) changed += 1;
			return changed;
		}
		/** 设置壳只给少数分区画专用图标，这里把已安装插件的导航改成侧栏同款。 */
		function observeSettingsNavIcons() {
			if (typeof document === "undefined" || document.body === null) return () => {};
			let applying = false;
			let frame;
			const pendingRoots = /* @__PURE__ */ new Set([document]);
			const apply = () => {
				if (applying) return;
				applying = true;
				const roots = [...pendingRoots];
				pendingRoots.clear();
				try {
					for (const root of roots) applySettingsNavIcons(root);
				} finally {
					applying = false;
				}
			};
			const schedule = () => {
				if (frame !== void 0) return;
				frame = window.requestAnimationFrame(() => {
					frame = void 0;
					apply();
				});
			};
			apply();
			const observer = new MutationObserver((records) => {
				for (const record of records) {
					const button = (record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest("[role=\"dialog\"] nav button");
					if (button !== null && button !== void 0) pendingRoots.add(button.closest("[role=\"dialog\"]") ?? document);
					for (const node of record.addedNodes) {
						if (!(node instanceof Element)) continue;
						if (node.matches("[role=\"dialog\"] nav button")) pendingRoots.add(node.closest("[role=\"dialog\"]") ?? document);
						else if (node.querySelector("[role=\"dialog\"] nav button") !== null) pendingRoots.add(node);
					}
				}
				if (pendingRoots.size > 0) schedule();
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			return () => {
				observer.disconnect();
				if (frame !== void 0) window.cancelAnimationFrame(frame);
			};
		}
		//#endregion
		//#region src/client/PluginConfigSection.tsx
		function bindPluginConfigLocale(bind) {
			const cache = /* @__PURE__ */ new Map();
			return (ns) => {
				const existing = cache.get(ns);
				if (existing !== void 0) return existing;
				const translate = bind(ns);
				cache.set(ns, translate);
				return translate;
			};
		}
		const FORWARDED_CONFIG_SLOTS = /* @__PURE__ */ new Set([
			"plugins.item",
			"plugins.bundle.activation",
			"plugins.bundle.config",
			"plugins.row.config",
			"plugins.detail.actions",
			"plugins.detail.badge",
			"plugins.detail.section"
		]);
		var SlotEntryBoundary = class extends react.Component {
			state = { failed: false };
			static getDerivedStateFromError() {
				return { failed: true };
			}
			render() {
				return this.state.failed ? this.props.fallback : this.props.children;
			}
		};
		function isSnapshotSource(value) {
			return typeof value === "object" && value !== null && typeof value.getSnapshot === "function" && typeof value.subscribe === "function";
		}
		function hookPropName(name) {
			return `use${name[0]?.toUpperCase() ?? ""}${name.slice(1)}`;
		}
		function bindSnapshotSelector(source) {
			const subscribe = (listener) => source.subscribe(listener);
			const getSnapshot = () => source.getSnapshot();
			return function useSelected(selector = (value) => value) {
				return (0, react.useSyncExternalStore)(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));
			};
		}
		function bindHookSources(hooks, bound) {
			for (const [name, source] of Object.entries(hooks ?? {})) if (isSnapshotSource(source)) bound[hookPropName(name)] = bindSnapshotSelector(source);
		}
		function bindInjectFace(inject) {
			try {
				if (typeof inject !== "function") return {};
				const face = inject();
				if (typeof face !== "object" || face === null) return {};
				const { hooks, keyedHooks, ...rest } = face;
				const bound = { ...rest };
				if (keyedHooks !== void 0) bound.keyedHooks = keyedHooks;
				bindHookSources(hooks, bound);
				bindHookSources(keyedHooks, bound);
				return bound;
			} catch {
				return {};
			}
		}
		function DelegatedOfficialSlot({ slots, name, owner, opts, bindLocale }) {
			(0, react.useSyncExternalStore)((listener) => slots.subscribe(name, listener), () => slots.getVersion(name));
			const nodes = slots.entriesOfSlot(name).filter((entry) => opts?.entryKey !== void 0 ? entry.options.key === opts.entryKey : opts?.only === void 0 || entry.options.id === opts.only).flatMap((entry, index) => {
				if (typeof entry.component !== "function") return [];
				const t = entry.locale !== void 0 && bindLocale !== void 0 ? bindLocale(entry.locale) : void 0;
				return [(0, react.createElement)(SlotEntryBoundary, {
					key: entry.options.key ?? entry.options.id ?? String(index),
					fallback: opts?.fallback ?? null,
					children: (0, react.createElement)(entry.component, {
						...owner,
						...bindInjectFace(entry.inject),
						...t === void 0 ? {} : { t }
					})
				})];
			});
			return nodes.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": name,
				style: { display: "contents" },
				children: nodes
			}) : opts?.fallback ?? null;
		}
		function wrapRenderSlot(slots, bindLocale) {
			return (name, owner = {}, opts) => {
				if (slots === void 0 || !FORWARDED_CONFIG_SLOTS.has(name)) return opts?.fallback ?? null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DelegatedOfficialSlot, {
					slots,
					name,
					owner,
					opts,
					bindLocale
				});
			};
		}
		/** 设置里的官方插件管理页副本。官方卡片要 inject 和文案；单卡崩溃不得拆掉整页。 */
		function PluginConfigSection({ Official, officialLabel, slots, bindLocale, ...official }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: "dcu-plugin-config",
				"aria-label": officialLabel,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SlotEntryBoundary, {
					fallback: null,
					children: (0, react.createElement)(Official, {
						...official,
						renderSlot: wrapRenderSlot(slots, bindLocale)
					})
				})
			});
		}
		function createPluginConfigSection(Official, officialLabel, slots, bindLocale) {
			return function PluginConfigSectionBound(props) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginConfigSection, {
					Official,
					officialLabel: officialLabel(),
					slots,
					bindLocale,
					...props
				});
			};
		}
		//#endregion
		//#region src/client/plugin-config.ts
		const PLUGIN_CONFIG_SECTION_ID = "plugin-config";
		const OFFICIAL_PLUGIN_MANAGER_NS = "pluginManager";
		function officialPluginsPage(entry) {
			if (entry === void 0 || entry.options.key !== "plugins") return void 0;
			if (typeof entry.component !== "function" || typeof entry.inject !== "function" || entry.locale !== OFFICIAL_PLUGIN_MANAGER_NS) return void 0;
			return entry.component;
		}
		function registerPluginConfigSection(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => {
				let current;
				let remove;
				const refresh = () => {
					const entry = ctx.slots.entriesOfSlot("main").find((item) => item.options.key === OFFICIAL_PLUGINS_PANEL_ID);
					if (entry === current) return;
					remove?.();
					remove = void 0;
					current = entry;
					const Official = officialPluginsPage(entry);
					if (Official === void 0 || entry?.inject === void 0 || entry.locale !== OFFICIAL_PLUGIN_MANAGER_NS) return;
					remove = ctx.slots.register({
						name: "settings.section",
						id: PLUGIN_CONFIG_SECTION_ID,
						order: 16,
						label: () => t("settings.pluginConfig"),
						locale: entry.locale,
						inject: entry.inject,
						...entry.store === void 0 ? {} : { store: entry.store }
					}, createPluginConfigSection(Official, () => t("settings.pluginConfig"), ctx.slots, bindPluginConfigLocale((ns) => {
						const translate = ctx.locale.bind(ns);
						return (key, params) => translate(key, params);
					})));
				};
				const unsubscribe = ctx.slots.subscribe("main", refresh);
				refresh();
				return () => {
					unsubscribe();
					remove?.();
				};
			});
		}
		//#endregion
		//#region src/client/settings-page-model.ts
		function settingsGroup(id) {
			if (/archive|about/.test(id)) return "records";
			if (/^(general|appearance|theme|language|shortcuts|voice|account)$/.test(id)) return "personal";
			return "integrations";
		}
		function filterSettingsRows(rows, query) {
			const needle = query.trim().toLocaleLowerCase();
			return needle === "" ? rows : rows.filter((row) => `${row.label} ${row.id}`.toLocaleLowerCase().includes(needle));
		}
		function generalItemGroup(id) {
			if (/permission|approval|sandbox/.test(id)) return "permissions";
			if (/composer|font|conversation|chat|enter/.test(id)) return "editor";
			return "general";
		}
		//#endregion
		//#region src/client/settings-page-styles.ts
		/**
		* Codex 设置页的局部 tokens 与布局，不覆盖宿主其他弹窗。
		*
		* ── -sp-* 令牌收归（2026-10-14）──────────────────────────────────────────────
		* 背景：KNOWN-ISSUES §22.3 登记的「两套并行命名空间」。逐项核对后确认，
		* 其中 6 个在明暗两套下的**计算值都与宿主语义令牌逐一相等**（用真实 Chromium 比对过
		* computed value，见交付说明），即它们只是宿主令牌的复制品。复制品会漂移——
		* 改宿主色板时设置页不会跟着变。现改为引用宿主令牌，零视觉变更、单一真源：
		*   -sp-bg        -> --dsw-alias-bg-base
		*   -sp-card      -> --dsw-alias-settings-card-fill
		*   -sp-border    -> --dsw-alias-border-l2
		*   -sp-text      -> --dsw-alias-label-primary
		*   -sp-hover     -> --dsw-alias-interactive-bg-hover
		*   -sp-active    -> --dcu-sidebar-selected
		*
		* 两个例外保留为字面量，并注明**为什么令牌化不了**（而不是「暂时懒得改」）：
		*   -sp-muted：亮色要 #6b6b6b（等于 static-400），但暗色要 #8f8f8f，
		*     而 #8f8f8f 在暗色主题下**没有任何令牌等于它**——静态色阶在明暗之间是**反向**的
		*     （static-500 亮色是 #8f8f8f、暗色却是 #5c5c5c），按档位号引用会拿到相反的值。
		*   -sp-muted-on-card：亮色同样 #6b6b6b；暗色 #9a9a9a 等于暗色下的 static-300，
		*     但亮色下 static-300 是 #545454，一个令牌覆盖不了两套。
		* 强行令牌化必然改变暗色外观，故保留字面量。这两档的对比度取值理由见下。
		*
		* --sp-muted 与 --sp-muted-on-card 必须分开（2026-10-14）：同一处文字落在两种底色上，
		* 而「色阶必须按实际所在底色取值」是本仓的既定制度（docs/ZCODE-DESIGN.md §9.3）。
		* 此前搜索框的图标与占位符直接用 --sp-muted，而它的底是 --sp-card——
		* 暗色下 #8f8f8f on #2b2b2b 实测 4.38:1，低于 WCAG AA 的 4.5:1。
		* 卡片档：亮 #6b6b6b（5.33:1 on #fff）/ 暗 #9a9a9a（5.03:1 on #2b2b2b）。
		*
		* var(--dcu-*) 的回退值是**兜底**，必须与 zcode-theme.ts 的真值一致——
		* 曾经这里留着修复前的 #777777（3.93:1，§9.2 已判定不达标），一旦变量作用域缺失
		* 就会静默退回不达标状态，且没有任何报错。
		*
		* ⚠️ 本文件头注释里**不得出现反引号**：多个布局脚本用 indexOf 定位第一个反引号
		* 来切样式表（另一些改用变量名正则）。文件头一旦有反引号，切片会从注释开始，
		* 把 CSS 切碎——2026-10-14 已因此让 verify-settings-backdrop /
		* verify-settings-geometry 量到错误宽度而假失败。
		*/
		const settingsPageStyles = `
.dcu-settings-page{/* TA1 分层（03g，2026-10-27）：设置页整页背景用 ZCode 的**内容画布层** rgb(250)
   = --color-background oklch(98.5% 0 0)，宿主 --dsw-alias-bg-base 是 rgb(248)。
   注意：整页底色来自 --sp-bg（不是 --dcu-sidebar-background，后者只驱动导航栏）。
   写法：在设置页作用域内**覆盖宿主令牌本身**，--sp-bg 仍直接引用它（满足断言）。 */
--dsw-alias-bg-base:var(--dcu-settings-page-bg,#fafafa);
--sp-bg:var(--dsw-alias-bg-base);--sp-nav:var(--dcu-sidebar-background,#f0f0f0);/* S2（03f）：ZCode 分区卡片底色 #161616（深）/ #fbfbfb（浅），
   宿主 --dsw-alias-settings-card-fill 是 #2b2b2b（深）。
   在设置页作用域内覆盖宿主令牌本身，--sp-card 仍直接引用它（满足断言），
   但本页内取值改由 --dcu-settings-card-fill 决定（主题层定义深色 #161616）。 */
--dsw-alias-settings-card-fill:var(--dcu-settings-card-fill,#fbfbfb);
--sp-card:var(--dsw-alias-settings-card-fill);--sp-border:var(--dsw-alias-border-l2);--sp-text:var(--dsw-alias-label-primary);--sp-muted:#6b6b6b;--sp-muted-on-card:#6b6b6b;--sp-hover:var(--dsw-alias-interactive-bg-hover);--sp-active:var(--dcu-sidebar-selected);position:fixed;inset:0;z-index:1000;display:grid;grid-template-columns:clamp(240px,var(--dcu-sidebar-expanded-width,240px),min(520px,calc(100vw - 320px))) minmax(0,1fr);background:var(--sp-bg);color:var(--sp-text);font:14px/1.5 var(--dsw-font-family);text-align:left;isolation:isolate}
/* TA1：深色设置页底必须显式回落，否则会继承浅色定义里的 #fafafa → 亮底深色页。
   ⚠ 不能写 var(--dsw-alias-bg-base)：上面已把 --dsw-alias-bg-base 定义成
   var(--dcu-settings-page-bg, …)，两者互引会形成循环 → 解析为空 → 底色变透明（实测踩过）。
   深色画布取 ZCode --color-background dark = #161616。 */
body[data-ds-dark-theme] .dcu-settings-page{--sp-muted:#8f8f8f;--sp-muted-on-card:#9a9a9a;color-scheme:dark;
  --dcu-settings-page-bg:var(--dcu-settings-page-bg-dark);
  --dsw-alias-bg-base:var(--dcu-settings-page-bg-dark);}
.dcu-settings-page *{box-sizing:border-box}
.dcu-settings-page button,.dcu-settings-page input{font:inherit}
.dcu-settings-page button{cursor:pointer}
.dcu-settings-page :focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:3px}
.dcu-settings-nav{--sp-text:var(--dcu-sidebar-navigation,#262626);--sp-muted:var(--dcu-sidebar-secondary,#5c5c5c);--sp-hover:var(--dcu-sidebar-hover,rgba(13,13,13,.05));--sp-active:var(--dcu-sidebar-selected,rgba(13,13,13,.05));--sp-border:var(--dcu-sidebar-border,rgba(13,13,13,.1));display:flex;flex-direction:column;min-height:0;padding:18px 8px;background:var(--sp-nav);box-shadow:inset -1px 0 var(--sp-border);overflow-y:auto}
/* macOS 普通窗口的原生按钮覆盖 Web 内容；沿用宿主标题栏安全区，仅抬高设置导航。 */
html[data-platform=darwin]:not([data-fullscreen]) .dcu-settings-nav{padding-top:calc(var(--dsh-frame-top-clearance,48px) + 8px)}
body[data-ds-dark-theme] .dcu-settings-nav{--sp-text:var(--dcu-sidebar-navigation,#d4d4d4);--sp-muted:var(--dcu-sidebar-secondary,#888888);--sp-hover:var(--dcu-sidebar-hover,rgba(255,255,255,.05));--sp-active:var(--dcu-sidebar-selected,rgba(255,255,255,.1));--sp-border:var(--dcu-sidebar-border,rgba(255,255,255,.1))}
.dcu-settings-back{display:flex;align-items:center;flex-shrink:0;gap:8px;width:100%;height:32px;padding:0 8px;border:0;border-radius:var(--dsw-radius-lg);background:transparent;color:var(--sp-text);text-align:left;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-settings-back:hover,.dcu-settings-link:hover{background:var(--sp-hover)}
.dcu-settings-search{display:flex;align-items:center;gap:8px;padding:var(--dcu-space-2);margin:var(--dcu-space-3) 0 var(--dcu-space-4);background:var(--sp-card,#fff);border:1px solid var(--sp-border);border-radius:var(--dsw-radius-lg);color:var(--sp-muted-on-card)}
.dcu-settings-search:focus-within{border-color:var(--dcu-focus,#0b7fff)}
.dcu-settings-search input{width:100%;min-width:0;border:0;background:transparent;color:var(--sp-text);outline:none;font-size:var(--dsw-font-size-caption)}
.dcu-settings-search input[type=search]{appearance:none;padding:0;border-radius:0;box-shadow:none;line-height:20px}
.dcu-settings-search input:focus,.dcu-settings-search input:focus-visible{outline:none;box-shadow:none}
.dcu-settings-search input::placeholder{color:var(--sp-muted-on-card)}
.dcu-settings-group{flex-shrink:0;margin:0 0 16px}
.dcu-settings-group-label{margin:0 8px 4px;color:var(--sp-muted);font-size:var(--dsw-font-size-sm);font-weight:500}
.dcu-settings-link{display:flex;align-items:center;gap:8px;height:32px;min-height:32px;min-width:0;width:100%;padding:0 8px;border:0;border-radius:var(--dsw-radius-xl);overflow:hidden;background:transparent;color:var(--sp-text);text-align:left;font-size:var(--dcu-settings-nav-size,var(--dsw-font-size-base))!important;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
/* Codex Desktop SidebarItem / SidebarSection：30px 行高、1px 行距、内收焦点圈。 */
.dcu-settings-link+.dcu-settings-link{margin-top:1px}
.dcu-settings-back:focus-visible,.dcu-settings-link:focus-visible{outline-offset:-2px}
.dcu-settings-link[aria-current=page]{background:var(--sp-active)}
.dcu-settings-link svg{flex:none;color:var(--dcu-sidebar-icon,var(--sp-text));opacity:1}
.dcu-settings-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-settings-empty{padding:8px;color:var(--sp-muted);font-size:var(--dsw-font-size-caption)}
.dcu-settings-main{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;background:var(--sp-bg);scrollbar-width:thin;scrollbar-color:var(--sp-border) transparent}
.dcu-settings-inner{width:min(100%,864px);margin:0 auto;padding:48px 48px}
/* 模型 Pro 的多列表格按主栏宽度伸展；其他设置页仍保持易读的常规宽度。 */
.dcu-settings-inner[data-settings-section=dsh-model-pro]{width:100%}
.dcu-settings-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}
.dcu-settings-heading h1,.dcu-settings-inner:is([data-settings-section=models],[data-settings-section=plugins],[data-settings-section=agent-presets]) [class$="_section"]>h2:is([class$="_title"],[class$="_heading"]){margin:0;font-size:var(--dsw-font-size-xl);line-height:26px;font-weight:600;letter-spacing:-.2px}
.dcu-settings-inner:is([data-settings-section=models],[data-settings-section=plugins],[data-settings-section=agent-presets]) [class$="_section"]>p[class$="_intro"]{margin:0;font-size:var(--dsw-font-size-base);line-height:22px}
.dcu-settings-heading[data-own-title=false]{justify-content:flex-end;margin-bottom:16px}
.dcu-settings-heading:not(:has(h1,button,a,[role=button])){display:none}
.dcu-settings-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;color:var(--sp-muted)}
.dcu-settings-actions button{font-size:var(--dsw-font-size-sm)}
.dcu-settings-general-group{margin-bottom:44px}
.dcu-settings-general-group h2{margin:0 0 16px;font-size:var(--dsw-font-size-base);font-weight:600;color:var(--sp-text)}
.dcu-settings-card{border:1px solid var(--sp-border);border-radius:var(--dsw-radius-xl);background:var(--sp-card);padding:0 16px;overflow:hidden}
/* S3（03f 设置页）：下拉控件对齐 ZCode 的 h32 / r8 / fs14。
   宿主下拉实测 h36 / r8 / fs13（类名 Mka9mW_selector / AsDdya_selector / _28qALa_selector 等，
   都是 CSS Modules 哈希前缀，无法枚举全）。改用结构判据：设置页内所有 selector 类。
   注意排除主题选择块（-I09Na_themeCube，它 h81 是有意的大块，不该压成 32）。
   字号走令牌 --dsw-font-size-base（14px），写死会被 design-system 断言拦截。 */
.dcu-settings-page [class*=selector]:not([class*=themeCube]){
  box-sizing:border-box;
  height:32px;
  min-height:32px;
  font-size:var(--dsw-font-size-base);
}

.dcu-settings-row+.dcu-settings-row{border-top:1px solid var(--sp-border)}
.dcu-settings-row>[data-slot]{display:contents}
.dcu-settings-row>[data-slot]>*{padding:12px 0!important;border-bottom:0!important;margin:0!important;min-width:0}
.dcu-settings-row button{font-size:var(--dsw-font-size-caption);border-radius:var(--dsw-radius-lg)}
.dcu-settings-row input{max-width:100%}
.dcu-settings-document{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;font-size:var(--dsw-font-size-base);line-height:20px}
.dcu-settings-developer-tools{display:flex;align-items:center;justify-content:space-between;gap:24px;width:100%;padding:12px 0;font-size:var(--dsw-font-size-base);line-height:20px}
.dcu-settings-developer-tools-copy{min-width:0}
.dcu-settings-developer-tools-title{font-size:var(--dsw-font-size-base);line-height:20px;font-weight:400;color:var(--sp-text)}
.dcu-settings-developer-tools-description{margin-top:4px;font-size:var(--dsw-font-size-caption);line-height:18px;color:var(--sp-muted)}
/* 2026-10-18（设计审计 P0-3）：原为字面量 #f87171 —— 亮色档 on #f8f8f8 只有 2.60:1
   （AA 需 4.5），且是全仓唯一没走令牌的错误文字色。改为语义令牌后亮 6.15:1 / 暗 5.98:1。
   令牌挂在 :root（不是侧栏作用域），设置页 portal 到 body 也能取到 —— 同 zcode-theme.ts 的说明。 */
.dcu-settings-developer-tools-error{margin-top:4px;font-size:var(--dsw-font-size-caption);line-height:18px;color:var(--dcu-state-error-text)}
.dcu-settings-switch{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;background:color-mix(in srgb,var(--dcu-primary,#000) 30%,transparent);cursor:pointer;outline:none}
.dcu-settings-switch:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px}
.dcu-settings-switch[aria-checked=true]{background:var(--dsw-alias-brand-primary,#000)}
.dcu-settings-switch:disabled{cursor:default;opacity:.5}
.dcu-settings-switch-thumb{display:block;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-switch-thumb,#fff);box-shadow:0 1px 2px rgba(0,0,0,.15);transition:transform var(--dcu-motion-feedback-duration) ease;pointer-events:none}
.dcu-settings-switch[aria-checked=true] .dcu-settings-switch-thumb{background:var(--dsw-alias-label-primary-foreground,#fff);transform:translateX(16px)}
.dcu-settings-document-copy{min-width:0}
.dcu-settings-document p{margin:4px 0 0;font-size:var(--dsw-font-size-sm);color:var(--sp-muted);overflow-wrap:anywhere}
.dcu-settings-document button{flex:none;min-height:32px;padding:6px var(--dcu-space-3);border:0;border-radius:var(--dsw-radius-lg);background:var(--sp-hover);color:var(--sp-text);font:inherit;font-size:var(--dsw-font-size-caption);cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-settings-document button:hover:not(:disabled){background:color-mix(in srgb,var(--sp-text) 14%,transparent)}
.dcu-settings-document button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:3px}
.dcu-settings-document button:disabled{opacity:.55;cursor:wait}
.dcu-settings-trigger{appearance:none;box-sizing:border-box;display:flex;align-items:center;border:0;border-radius:var(--dsw-radius-lg);background:transparent;color:var(--dcu-sidebar-navigation,inherit);height:36px;min-height:36px;padding:0 4px;width:100%;font:400 14px/20px var(--dsw-font-family);text-align:left;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
.dcu-settings-trigger-content{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:8px;align-items:center;width:100%;min-width:0}
.dcu-settings-trigger-content svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon,currentColor);transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
.dcu-settings-trigger:hover{background:var(--dcu-sidebar-hover,rgba(127,127,127,.12));color:var(--dcu-sidebar-primary,inherit)}
.dcu-settings-trigger:hover svg{transform:rotate(18deg)}
.dcu-settings-trigger:active{transform:scale(.98)}
.dcu-settings-trigger:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px;background:var(--dcu-sidebar-hover,rgba(127,127,127,.12))}
.dcu-settings-trigger[data-wide=false]{justify-content:center;width:36px;padding:0!important}
.dcu-settings-trigger[data-wide=false] .dcu-settings-trigger-content{grid-template-columns:16px;justify-content:center}
.dcu-settings-page{animation:dcu-settings-enter var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
.dcu-settings-nav{animation:dcu-settings-nav-enter var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
.dcu-settings-inner{animation:dcu-settings-content-enter var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
.dcu-settings-back,.dcu-settings-link{transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
@keyframes dcu-settings-enter{from{opacity:0}to{opacity:1}}
@keyframes dcu-settings-nav-enter{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes dcu-settings-content-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* 只有 Desktop 明确提供系统背景材质时才贯通透明层，普通浏览器保持实色。 */
html[data-dsh-native-backdrop=mica]:has(.dcu-root),html[data-dsh-native-backdrop=mica]:has(.dcu-root) body,html[data-dsh-native-backdrop=mica] #root,html[data-dsh-native-backdrop=mica] #root>[data-slot=root],html[data-dsh-native-backdrop=mica] #root>[data-slot=root]>div{background:transparent!important}
html[data-dsh-native-backdrop=mica] #root>[data-slot=root]>div>div:has(>[data-slot=sidebar]){background:transparent!important}
html[data-dsh-native-backdrop=mica] #root :is([class$="_centerCol"],[class$="_detailsCol"]){background:var(--dsw-alias-bg-base,#fff)}
html[data-dsh-native-backdrop=mica] :is(.dcu-root,.dcu-settings-nav){background:rgba(255,255,255,.18)}
html[data-dsh-native-backdrop=mica] body[data-ds-dark-theme] :is(.dcu-root,.dcu-settings-nav){background:rgba(20,23,22,.18)}
/* 会话折叠容器显式设了 visible，必须同时隐藏隔离分支的后代，避免穿透透明设置页。 */
html[data-dsh-native-backdrop=mica] body:has(.dcu-settings-page) .dcu-root :is([inert],[inert] *){visibility:hidden!important}
/* 同步隐藏本设置页隔离的外部 portal，保留引导模态及其他组件自己的 inert 语义。 */
body:has(.dcu-settings-page) :is([data-dcu-settings-isolated],[data-dcu-settings-isolated] *){visibility:hidden!important}
body:has(.dcu-settings-page) > [role=alert]{visibility:visible!important}
html[data-dsh-native-backdrop=mica] .dcu-settings-page,html[data-dsh-native-backdrop=mica] body:has(.dcu-settings-page) .dcu-root{background:transparent}

.dcu-plugin-config [data-plugin-panel]{height:auto;padding:0;overflow:visible;align-items:stretch;gap:24px}
.dcu-plugin-config [data-plugin-panel]>*{max-width:none}
.dcu-plugin-config [data-plugin-panel]>header :is(h1,p){display:none}
.dcu-plugin-config [data-plugin-panel]>header{justify-content:flex-end}
@media(prefers-reduced-motion:reduce){.dcu-settings-trigger,.dcu-settings-trigger-content svg,.dcu-settings-back,.dcu-settings-link{transition:none}.dcu-settings-trigger:hover svg,.dcu-settings-trigger:active{transform:none}.dcu-settings-page,.dcu-settings-nav,.dcu-settings-inner{animation:none}}
.dcu-settings-page [data-slot="settings.section"]{min-width:0}
.dcu-settings-inner:has(.dcu-connector-frame){height:100%;display:flex;flex-direction:column}
.dcu-settings-inner:has(.dcu-connector-frame)>.dcu-settings-heading{flex:none}
.dcu-settings-page .dcu-connectors:has(>.dcu-connector-frame){display:flex;flex-direction:column;flex:1 1 0;min-height:0}
.dcu-settings-page .dcu-connector-frame{flex:1 1 0;min-height:0;height:100%}

@media(max-width:900px){.dcu-settings-inner{padding:32px 28px}.dcu-settings-heading{align-items:flex-start;flex-direction:column;gap:12px}}
@media(max-width:600px){.dcu-settings-page{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.dcu-settings-nav{padding:8px 12px;max-height:220px;border-right:0;border-bottom:1px solid var(--sp-border)}.dcu-settings-search{margin:6px 0}.dcu-settings-groups{display:flex;gap:8px;overflow-x:auto;flex:none}.dcu-settings-group{display:flex;gap:4px;margin:0;flex:none}.dcu-settings-group-label{display:none}.dcu-settings-link{width:auto;min-height:40px;flex:none}.dcu-settings-link+.dcu-settings-link{margin-top:0}.dcu-settings-inner{padding:32px 16px}.dcu-settings-heading{margin-bottom:28px}.dcu-settings-heading h1,.dcu-settings-inner:is([data-settings-section=models],[data-settings-section=plugins],[data-settings-section=agent-presets]) [class$="_section"]>h2:is([class$="_title"],[class$="_heading"]){font-size:var(--dsw-font-size-headline)}.dcu-settings-card{padding:0 12px}.dcu-settings-row>[data-slot]>*{flex-wrap:wrap;gap:12px!important}.dcu-settings-general-group{margin-bottom:32px}}
`;
		//#endregion
		//#region src/client/settings-focus.ts
		/** 设置页与宿主浮层共享的可交互判断，忽略隐藏及已被隔离的对话框。 */
		function settingsElementAvailable(element) {
			for (let node = element; node !== null; node = node.parentElement) {
				const style = getComputedStyle(node);
				if (node.inert || node.hidden || node.getAttribute("aria-hidden") === "true" || style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
			}
			return true;
		}
		function settingsOverlays(selector = "[role=\"dialog\"],[role=\"alertdialog\"],[role=\"menu\"],[role=\"listbox\"]") {
			return [...document.querySelectorAll(selector)].filter(settingsElementAvailable);
		}
		//#endregion
		//#region src/client/CodexSettingsPage.tsx
		const groupLabels = {
			personal: "settings.personal",
			integrations: "settings.integrations",
			records: "settings.records",
			permissions: "settings.permissions",
			general: "settings.general",
			editor: "settings.editor"
		};
		function sectionIcon(id) {
			if (id === "market" || id === "plugin-marketplace") return ZIconPlugins;
			if (id === "better-sidebar" || id === "sidebar-cards") return ZIconPanelRight;
			if (/model/.test(id)) return ZIconCpu;
			if (/archive/.test(id)) return ZIconArchive;
			if (/about/.test(id)) return ZIconHelp;
			if (/expert|agency/.test(id)) return ZIconUser;
			if (/skill/.test(id)) return ZIconSkills;
			if (/connector|mcp/.test(id)) return ZIconLink;
			if (/schedule|automation/.test(id)) return ZIconClock;
			if (/im|assistant/.test(id)) return ZIconMessageSquare;
			if (id === "general") return ZIconSettings;
			if (/plugin/.test(id)) return ZIconPersonalization;
			return ZIconBox;
		}
		/** 独立设置视图复用原始 section/close 合约，退出时保留底层会话与输入状态。 */
		const noShortcuts = [];
		const emptyShortcuts = {
			subscribe: () => () => {},
			getSnapshot: () => noShortcuts
		};
		function CodexSettingsPage({ wide, sections, onboarding, connectionState, reconnect, accountLauncher, shortcuts = emptyShortcuts, useSessions, renderSlot, t }) {
			const rows = (0, react.useSyncExternalStore)(sections.subscribe, sections.getSnapshot);
			const steps = (0, react.useSyncExternalStore)(onboarding.subscribe, onboarding.getSnapshot);
			const connection = (0, react.useSyncExternalStore)(connectionState.subscribe, connectionState.getSnapshot);
			const hostAccountLauncher = (0, react.useSyncExternalStore)(accountLauncher?.subscribe ?? (() => () => {}), accountLauncher?.getSnapshot ?? (() => false));
			const settingsShortcut = (0, react.useSyncExternalStore)(shortcuts.subscribe, shortcuts.getSnapshot).find((row) => row.id === "settings.open");
			const onboardingActive = useSessions((state) => isBlankOnboardingSession(state));
			const [completed, setCompleted] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [open, setOpen] = (0, react.useState)(false);
			const [activeId, setActiveId] = (0, react.useState)("general");
			const [query, setQuery] = (0, react.useState)("");
			const [recovered, setRecovered] = (0, react.useState)(false);
			const previousConnection = (0, react.useRef)(connection);
			const trigger = (0, react.useRef)(null);
			const launcherRoot = (0, react.useRef)(null);
			const returnFocus = (0, react.useRef)(null);
			const page = (0, react.useRef)(null);
			const back = (0, react.useRef)(null);
			const onboardingRoot = (0, react.useRef)(null);
			const main = (0, react.useRef)(null);
			const wasOpen = (0, react.useRef)(false);
			const exitAnimation = (0, react.useRef)(null);
			const active = rows.find((row) => row.id === activeId) ?? rows[0];
			const step = onboardingActive ? steps.find((item) => item.id !== "welcome-notice" && !completed.has(item.id)) : void 0;
			const close = (0, react.useCallback)(() => {
				if (exitAnimation.current !== null) return;
				const finish = () => {
					exitAnimation.current = null;
					setOpen(false);
					setQuery("");
				};
				const element = page.current;
				if (element?.animate === void 0 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
					finish();
					return;
				}
				const animation = element.animate([{ opacity: getComputedStyle(element).opacity }, { opacity: 0 }], {
					duration: 140,
					easing: "ease-out",
					fill: "forwards"
				});
				exitAnimation.current = animation;
				animation.onfinish = finish;
			}, []);
			const openSection = (0, react.useCallback)((id) => {
				if (page.current === null) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
				exitAnimation.current?.cancel();
				exitAnimation.current = null;
				setActiveId(id);
				setOpen(true);
			}, []);
			(0, react.useLayoutEffect)(() => {
				const element = launcherRoot.current ?? trigger.current;
				const openRoot = (event) => {
					event.preventDefault();
					openSection("general");
				};
				const navigate = (event) => {
					const detail = event.detail;
					const labels = detail?.labels;
					if (!Array.isArray(labels)) return;
					const row = labels.flatMap((label) => rows.filter((item) => (item.id === "general" ? t("settings.general") : item.label) === label))[0];
					if (!row) {
						if (element === launcherRoot.current) {
							event.preventDefault();
							detail.result = "missing";
						}
						return;
					}
					event.preventDefault();
					detail.result = "selected";
					setQuery("");
					openSection(row.id);
				};
				element?.addEventListener(SETTINGS_OPEN_SECTION_EVENT, navigate);
				element?.addEventListener(SETTINGS_OPEN_ROOT_EVENT, openRoot);
				return () => {
					element?.removeEventListener(SETTINGS_OPEN_SECTION_EVENT, navigate);
					element?.removeEventListener(SETTINGS_OPEN_ROOT_EVENT, openRoot);
				};
			}, [
				rows,
				t,
				openSection,
				hostAccountLauncher
			]);
			(0, react.useEffect)(() => () => {
				exitAnimation.current?.cancel();
			}, []);
			(0, react.useLayoutEffect)(() => {
				if (open && page.current !== null) page.current.style.setProperty("--dcu-sidebar-expanded-width", `${settingsSidebarWidth(document)}px`);
			}, [open]);
			(0, react.useEffect)(() => {
				if (!onboardingActive) setCompleted(/* @__PURE__ */ new Set());
			}, [onboardingActive]);
			(0, react.useEffect)(() => {
				const previous = previousConnection.current;
				previousConnection.current = connection;
				setRecovered(connection === "connected" && (previous === "disconnected" || previous === "connecting"));
				if (connection !== "connected") return;
				const timer = window.setTimeout(() => {
					setRecovered(false);
				}, 3e3);
				return () => {
					window.clearTimeout(timer);
				};
			}, [connection]);
			(0, react.useEffect)(() => {
				if (wasOpen.current && !open) {
					const previous = returnFocus.current;
					(hostAccountLauncher ? previous?.isConnected && previous !== document.body ? previous : launcherRoot.current?.querySelector("button,a[href],[tabindex=\"0\"]") : trigger.current)?.focus();
				}
				wasOpen.current = open;
				if (!open || page.current === null) return;
				if (settingsElementAvailable(page.current) && settingsOverlays().length === 0) back.current?.focus();
				const hidden = /* @__PURE__ */ new Map();
				const guideModals = step === void 0 ? [] : settingsOverlays("[role=\"dialog\"][aria-modal=\"true\"],[role=\"alertdialog\"][aria-modal=\"true\"]");
				const isolate = (element) => {
					if (element.parentElement === document.body && element.hasAttribute("data-dsh-pet-overlay")) return;
					if (element.parentElement === document.body && element.getAttribute("role") === "alert") return;
					if (element === onboardingRoot.current || guideModals.includes(element)) return;
					if (guideModals.some((modal) => element.contains(modal))) {
						for (const child of element.children) if (child instanceof HTMLElement && !/^(STYLE|SCRIPT|LINK)$/.test(child.tagName)) isolate(child);
						return;
					}
					hidden.set(element, {
						inert: element.inert,
						marker: element.getAttribute("data-dcu-settings-isolated")
					});
					element.inert = true;
					element.setAttribute("data-dcu-settings-isolated", "");
				};
				let branch = page.current;
				while (branch.parentElement !== null) {
					for (const sibling of branch.parentElement.children) {
						if (!(sibling instanceof HTMLElement) || sibling === branch || /^(STYLE|SCRIPT|LINK)$/.test(sibling.tagName)) continue;
						isolate(sibling);
					}
					branch = branch.parentElement;
					if (branch === document.body) break;
				}
				const onKeyDown = (event) => {
					if (event.key === "Escape" && !event.defaultPrevented && settingsOverlays().length === 0) {
						event.preventDefault();
						close();
					}
				};
				const keepFocus = (event) => {
					const target = event.target;
					if (!(target instanceof Node) || page.current === null || !settingsElementAvailable(page.current)) return;
					if (page.current.contains(target) || onboardingRoot.current?.contains(target) || [...document.querySelectorAll("body > [data-dsh-pet-overlay], body > [role=alert]")].some((root) => root.contains(target)) || settingsOverlays().some((overlay) => overlay.contains(target))) return;
					back.current?.focus();
				};
				const wrapFocus = (event) => {
					if (event.key !== "Tab" || event.defaultPrevented || page.current === null || !settingsElementAvailable(page.current) || settingsOverlays().length > 0) return;
					const items = [
						page.current,
						onboardingRoot.current,
						...document.querySelectorAll("body > [data-dsh-pet-overlay], body > [role=alert]")
					].filter((root) => root !== null).flatMap((root) => [...root.querySelectorAll("button,input,select,textarea,a[href],[tabindex]")]).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && settingsElementAvailable(element));
					const next = event.shiftKey ? items.at(-1) : items[0];
					if (document.activeElement === (event.shiftKey ? items[0] : items.at(-1))) {
						event.preventDefault();
						next?.focus();
					}
				};
				document.addEventListener("keydown", onKeyDown, true);
				document.addEventListener("keydown", wrapFocus);
				document.addEventListener("focusin", keepFocus);
				return () => {
					document.removeEventListener("keydown", onKeyDown, true);
					document.removeEventListener("keydown", wrapFocus);
					document.removeEventListener("focusin", keepFocus);
					for (const [element, previous] of hidden) {
						element.inert = previous.inert;
						if (previous.marker === null) element.removeAttribute("data-dcu-settings-isolated");
						else element.setAttribute("data-dcu-settings-isolated", previous.marker);
					}
				};
			}, [
				open,
				close,
				step?.id,
				hostAccountLauncher
			]);
			(0, react.useEffect)(() => {
				if (main.current !== null) main.current.scrollTop = 0;
			}, [active?.id]);
			const visible = filterSettingsRows(rows, query);
			const ownTitle = active?.id === "general" ? t("settings.general") : active?.id === "plugin-config" ? t("settings.pluginConfig") : void 0;
			const connectionIndicator = connection === "disconnected" ? "disconnected" : connection === "connecting" ? "connecting" : recovered ? "recovered" : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: settingsPageStyles }),
				hostAccountLauncher ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: launcherRoot,
					"data-dcu-settings-owner": true,
					style: { display: "contents" },
					children: renderSlot("settings.launcher", {
						wide,
						settingsOpen: open,
						...settingsShortcut?.keys.length ? { settingsShortcut: {
							keys: settingsShortcut.keys,
							aria: settingsShortcut.aria
						} } : {},
						openSettings: () => {
							openSection("general");
						},
						openOnboarding: (id) => {
							openSection(id);
						}
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					ref: trigger,
					type: "button",
					className: "dcu-settings-trigger",
					"data-dcu-settings-trigger": true,
					"data-wide": wide,
					"aria-expanded": open,
					"aria-label": t("settings.title"),
					onClick: () => {
						openSection("general");
					},
					children: renderSlot("settings.trigger", { wide })
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ConnectionIndicator, {
					state: wide ? connectionIndicator : void 0,
					disconnectedLabel: t("settings.disconnected"),
					connectingLabel: t("settings.connecting"),
					recoveredLabel: t("settings.recovered"),
					reconnectActionLabel: t("settings.reconnect"),
					restartActionLabel: t("settings.reconnect"),
					onReconnect: reconnect
				}),
				(0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: page,
					className: "dcu-settings-page",
					"data-dcu-settings-page": true,
					role: "region",
					"aria-label": t("settings.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
						className: "dcu-settings-nav",
						"aria-label": t("settings.title"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								ref: back,
								type: "button",
								className: "dcu-settings-back",
								onClick: close,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconArrowLeft, { size: 16 }), renderSlot("settings.close", {}) ?? t("settings.back")]
							}),
							renderSlot("settings.header", {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dcu-settings-search",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZIconSearch, {
									size: 15,
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "search",
									value: query,
									"aria-label": t("settings.search"),
									placeholder: t("settings.search"),
									onChange: (event) => {
										setQuery(event.target.value);
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-settings-groups",
								children: [
									"personal",
									"integrations",
									"records"
								].map((group) => {
									const entries = visible.filter((row) => settingsGroup(row.id) === group);
									return entries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										className: "dcu-settings-group",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
											className: "dcu-settings-group-label",
											children: t(groupLabels[group])
										}), entries.map((row) => {
											const Icon = sectionIcon(row.id);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: "dcu-settings-link",
												"aria-current": row.id === active?.id ? "page" : void 0,
												onClick: () => {
													setActiveId(row.id);
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
													size: 16,
													strokeWidth: 1.6,
													"aria-hidden": "true"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: row.id === "general" ? t("settings.general") : row.label })]
											}, row.id);
										})]
									}, group);
								})
							}),
							visible.length > 0 && !visible.some((row) => row.id === active?.id) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-settings-empty",
								role: "status",
								children: t("settings.filterHint")
							}),
							visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dcu-settings-empty",
								role: "status",
								children: t("settings.noResults")
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: main,
						className: "dcu-settings-main",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-settings-inner",
							"data-settings-section": active?.id,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: "dcu-settings-heading",
								"data-own-title": ownTitle !== void 0,
								children: [ownTitle !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: ownTitle }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dcu-settings-actions",
									children: renderSlot("settings.action", {})
								})]
							}), active !== void 0 && renderSlot("settings.section", { close }, { only: active.id })]
						})
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: onboardingRoot,
					style: { display: "contents" },
					children: step !== void 0 && renderSlot("settings.onboarding", {
						stepId: step.id,
						complete: () => {
							setCompleted((previous) => /* @__PURE__ */ new Set([...previous, step.id]));
						},
						openSection
					}, { only: step.id })
				})] }), document.body)
			] });
		}
		/** 每条偏好仍由原插件渲染和保存，只为公共条目添加可扩展的分组容器。 */
		function CodexGeneralSettings({ items, renderSlot, t }) {
			const rows = (0, react.useSyncExternalStore)(items.subscribe, items.getSnapshot);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-settings-general",
				children: [[
					"permissions",
					"general",
					"editor"
				].map((group) => {
					const entries = rows.filter((row) => generalItemGroup(row.id) === group);
					return entries.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: "dcu-settings-general-group",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t(groupLabels[group]) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-settings-card",
							children: entries.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dcu-settings-row",
								"data-dcu-settings-item": row.id,
								children: renderSlot("settings.general.item", {}, { only: row.id })
							}, row.id))
						})]
					}, group);
				}), renderSlot("settings.general.footer", {})]
			});
		}
		//#endregion
		//#region src/client/SettingsDocumentAction.tsx
		/** 通过宿主公开接口打开配置文件，沿用共享元数据和路径无关的操作。 */
		function SettingsDocumentAction({ describe, openDocument, t }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => describe.subscribe(listener), () => describe.getSnapshot());
			const busy = (0, react.useRef)(false);
			const [opening, setOpening] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let active = true;
				setError(false);
				describe.ensure().catch(() => {
					if (active) setError(true);
				});
				return () => {
					active = false;
				};
			}, [describe]);
			if (!snapshot.view?.hasDocument) return error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				role: "alert",
				children: t("settings.openDocumentError")
			}) : null;
			const open = async () => {
				if (busy.current) return;
				busy.current = true;
				setOpening(true);
				setError(false);
				try {
					setError(!(await openDocument()).ok);
				} catch {
					setError(true);
				} finally {
					busy.current = false;
					setOpening(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "dcu-settings-general-group",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("settings.advanced") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dcu-settings-card",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dcu-settings-document",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dcu-settings-document-copy",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("settings.documentTitle") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("settings.documentDescription") }),
								error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									role: "alert",
									children: t("settings.openDocumentError")
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": t("settings.openDocument"),
							"aria-busy": opening,
							disabled: opening,
							onClick: () => {
								open();
							},
							children: t(opening ? "settings.documentOpening" : "settings.documentOpen")
						})]
					})
				})]
			});
		}
		//#endregion
		//#region src/client/DeveloperToolsRow.tsx
		function DeveloperToolsRow({ developerTools, t }) {
			const enabled = (0, react.useSyncExternalStore)(developerTools.enabled.subscribe, developerTools.enabled.getSnapshot);
			const [busy, setBusy] = (0, react.useState)(false);
			const [failed, setFailed] = (0, react.useState)(false);
			const toggle = (next) => {
				setFailed(false);
				setBusy(true);
				developerTools.setEnabled(next).catch(() => {
					setFailed(true);
				}).finally(() => {
					setBusy(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dcu-settings-developer-tools",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dcu-settings-developer-tools-copy",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-settings-developer-tools-title",
							children: t("settings.developerTools.title")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-settings-developer-tools-description",
							children: t("settings.developerTools.description")
						}),
						failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dcu-settings-developer-tools-error",
							role: "alert",
							children: t("settings.developerTools.error")
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					role: "switch",
					"aria-checked": enabled,
					"aria-label": t("settings.developerTools.title"),
					disabled: busy,
					className: "dcu-settings-switch",
					onClick: () => {
						toggle(!enabled);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dcu-settings-switch-thumb" })
				})]
			});
		}
		//#endregion
		//#region src/client/settings-page-registration.ts
		/** 1.1.37 起官方壳始终登记共享子插槽：本插件把共享名镜像进自有 settings.codex.* 命名空间，
		* 渲染时经 withSlotAliases 读回自有命名空间——与官方壳共存，停用后官方行原样回来。 */
		const shellAliases = {
			"settings.launcher": "settings.codex.launcher",
			"settings.trigger": "settings.codex.trigger",
			"settings.header": "settings.codex.header",
			"settings.action": "settings.codex.action",
			"settings.close": "settings.codex.close",
			"settings.section": "settings.codex.section",
			"settings.onboarding": "settings.codex.onboarding"
		};
		const shellAliasChildren = {
			"settings.codex.launcher": {
				kind: "single",
				scope: "root"
			},
			"settings.codex.trigger": {
				kind: "single",
				scope: "root"
			},
			"settings.codex.header": {
				kind: "single",
				scope: "root"
			},
			"settings.codex.action": {
				kind: "list",
				scope: "root"
			},
			"settings.codex.close": {
				kind: "single",
				scope: "root"
			},
			"settings.codex.section": {
				kind: "list",
				scope: "root"
			},
			"settings.codex.onboarding": {
				kind: "list",
				scope: "root"
			}
		};
		const generalAliases = {
			"settings.general.item": "settings.codex.general.item",
			"settings.general.footer": "settings.codex.general.footer"
		};
		const generalAliasChildren = {
			"settings.codex.general.item": {
				kind: "list",
				scope: "root"
			},
			"settings.codex.general.footer": {
				kind: "list",
				scope: "root"
			}
		};
		const AliasedCodexSettingsPage = withSlotAliases(CodexSettingsPage, shellAliases);
		const AliasedCodexGeneralSettings = withSlotAliases(CodexGeneralSettings, generalAliases);
		function registerMirrors(ctx, aliases, register) {
			const unregister = register();
			const mirrors = [];
			const getSpec = ctx.slots.spec;
			try {
				for (const [source, target] of Object.entries(aliases)) if (typeof getSpec === "function") mirrors.push(ctx.slots.inject(source, () => mirrorSlot({ slots: ctx.slots }, source, target)));
			} catch (error) {
				for (const dispose of mirrors.reverse()) dispose();
				unregister();
				throw error;
			}
			return () => {
				for (const dispose of mirrors.reverse()) dispose();
				unregister();
			};
		}
		function accountLauncherPresence(slots) {
			const read = () => {
				try {
					return slots.entriesOfSlot("settings.launcher").length > 0;
				} catch {
					return false;
				}
			};
			return {
				getSnapshot: read,
				subscribe: (listener) => {
					try {
						return slots.subscribe("settings.launcher", listener);
					} catch {
						return () => {};
					}
				}
			};
		}
		function registerSettingsPage(ctx, shortcutCatalog) {
			const t = ctx.locale.bind(NS);
			const declared = (name) => {
				const spec = ctx.slots.spec;
				return typeof spec === "function" && spec.call(ctx.slots, name) !== void 0;
			};
			const officialSettingsReady = () => declared("settings.launcher");
			const connection = ctx.get("connection");
			const shortcuts = shortcutCatalog ?? liveShortcutCatalog(ctx);
			const source = (name) => {
				let revision = "";
				let cached = [];
				return {
					getSnapshot: () => {
						const next = `${ctx.slots.getVersion(name)}:${ctx.locale.getSnapshot().revision}`;
						if (revision !== next) {
							revision = next;
							cached = ctx.slots.entriesOfSlot(name).map((entry) => ({
								id: entry.options.id ?? "",
								order: entry.options.order ?? 0,
								label: (typeof entry.options.label === "function" ? entry.options.label() : entry.options.label) ?? ""
							})).sort((a, b) => a.order - b.order);
						}
						return cached;
					},
					subscribe: (listener) => {
						const offSlots = ctx.slots.subscribe(name, listener);
						const offLocale = ctx.locale.subscribe(listener);
						return () => {
							offSlots();
							offLocale();
						};
					}
				};
			};
			const sections = source("settings.section");
			const onboarding = source("settings.onboarding");
			const items = source("settings.general.item");
			ctx.slots.inject("settings.trigger", () => ctx.slots.register({
				name: "settings.trigger",
				priority: -1,
				locale: NS
			}, ({ wide }) => (0, react.createElement)("span", { className: "dcu-settings-trigger-content" }, (0, react.createElement)(ZIconSettings, {
				size: 16,
				strokeWidth: 1.6
			}), wide ? (0, react.createElement)("span", null, t("settings.title")) : null)));
			ctx.slots.inject("settings.header", () => ctx.slots.register({
				name: "settings.header",
				priority: -1,
				locale: NS
			}, () => null));
			ctx.slots.inject("settings.close", () => ctx.slots.register({
				name: "settings.close",
				priority: -1,
				locale: NS
			}, () => t("settings.back")));
			let documentBound = false;
			const bindSettingsDocument = (settingsCtx, forms) => {
				if (documentBound) return;
				const remote = settingsCtx.get("remote");
				if (!remote.$host.isLoopback) return;
				documentBound = true;
				const describe = forms.describe();
				const remove = settingsCtx.slots.inject("settings.general.footer", () => settingsCtx.slots.register({
					name: "settings.general.footer",
					id: "open-document",
					priority: -1,
					locale: NS,
					inject: () => ({
						describe,
						openDocument: () => remote.settings.openSettingsDocument()
					})
				}, SettingsDocumentAction));
				return () => {
					documentBound = false;
					remove();
				};
			};
			ctx.inject(["configForms", "remote.settings"], (settingsCtx) => {
				return bindSettingsDocument(settingsCtx, settingsCtx.configForms);
			});
			ctx.inject(["settingsScope", "remote.settings"], (settingsCtx) => {
				return bindSettingsDocument(settingsCtx, settingsCtx.settingsScope);
			});
			ctx.inject(["configForms"], (configFormsCtx) => {
				const configForms = configFormsCtx.configForms;
				if (!configForms?.developerTools) return;
				const developerTools = configForms.developerTools;
				return configFormsCtx.slots.inject("settings.general.item", () => configFormsCtx.slots.register({
					name: "settings.general.item",
					id: "developer-tools",
					priority: -1,
					order: 15,
					locale: NS,
					inject: () => ({ developerTools })
				}, DeveloperToolsRow));
			});
			ctx.slots.inject("sidebar.settings", () => registerAfterOfficialWave(ctx.slots, "sidebar.settings", officialSettingsReady, () => {
				return registerMirrors(ctx, shellAliases, () => ctx.slots.register({
					name: "sidebar.settings",
					priority: -1,
					locale: NS,
					children: shellAliasChildren,
					inject: () => ({
						sections,
						onboarding,
						connectionState: connection.state,
						reconnect: () => {
							connection.reconnect();
						},
						accountLauncher: accountLauncherPresence(ctx.slots),
						shortcuts
					})
				}, AliasedCodexSettingsPage));
			}, true));
			ctx.slots.inject("settings.section", () => registerAfterOfficialWave(ctx.slots, "settings.section", () => declared("settings.general.item"), () => {
				return registerMirrors(ctx, generalAliases, () => ctx.slots.register({
					name: "settings.section",
					id: "general",
					priority: -1,
					order: 0,
					locale: NS,
					label: () => t("settings.general"),
					children: generalAliasChildren,
					inject: () => ({ items })
				}, AliasedCodexGeneralSettings));
			}, true));
		}
		//#endregion
		//#region src/client/official-turn-navigator.ts
		const OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE = "data-dcu-official-turn-navigator";
		const OFFICIAL_TURN_MARK_ATTRIBUTE = "data-dcu-official-turn-mark";
		const OFFICIAL_TURN_TOOLTIP_ATTRIBUTE = "data-dcu-official-turn-tooltip";
		const OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE = "data-dcu-official-turn-navigator-supported";
		/** G11：宿主 marks 有高度但零刻度时标记，交由自绘导航接管。 */
		const OFFICIAL_TURN_EMPTY_ATTRIBUTE = "data-dcu-official-turn-empty";
		/** 侧栏开合动画期间打在同 frame 上的标记（sidebar-width.ts 写入），用于暂停布局读取。 */
		const SIDEBAR_MOTION_ATTRIBUTE = "data-dcu-sidebar-motion";
		const CAPABILITIES_ENDPOINT = `${CODEX_UI_API_ENDPOINTS.dependencies}?action=capabilities`;
		function isOfficialTurnNavigator(element) {
			if (!(element instanceof HTMLElement) || element.tagName !== "NAV") return false;
			if (element.querySelector(".JXrxFq_marks") !== null) return true;
			if (element.querySelector("button[type=\"button\"][aria-label]") === null) return false;
			return element.style.getPropertyValue("--turn-natural-height") !== "" || element.querySelector("button[type=\"button\"][data-index][aria-label]") !== null;
		}
		/** 标记实际挂载的官方轮次导航，避免依赖宿主样式文件名或会话 DOM 层级。 */
		function markOfficialTurnNavigators(root = document) {
			for (const element of root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)) {
				if (isOfficialTurnNavigator(element)) continue;
				element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE);
				for (const part of element.querySelectorAll(`[${OFFICIAL_TURN_MARK_ATTRIBUTE}],[${OFFICIAL_TURN_TOOLTIP_ATTRIBUTE}]`)) {
					part.removeAttribute(OFFICIAL_TURN_MARK_ATTRIBUTE);
					part.removeAttribute(OFFICIAL_TURN_TOOLTIP_ATTRIBUTE);
				}
			}
			for (const element of root.querySelectorAll("nav")) {
				if (!isOfficialTurnNavigator(element)) continue;
				element.setAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE, "true");
				markEmptyMarks(element);
			}
			return root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`).length;
		}
		/**
		* G11：宿主 marks 容器「有高度但零刻度」时打标记，让自绘导航接管。
		*
		* 背景（2026-10-27 实测）：会话深度压缩后，宿主 `.JXrxFq_marks` 会同时满足
		*   ① 高度正常（572px，说明宿主知道轮次数）
		*   ② 子元素 = 0，innerHTML 空串，3 秒 MutationObserver 零事件（宿主根本不渲染按钮）
		* 整条索引就在视觉上消失了。ZCode 靠目录水合保证压缩下索引仍完整，这是真实能力差。
		*
		* 插件侧本来就有完整自绘导航（TurnNavigator.tsx，239 行，数据源是会话锚点、
		* 与宿主 marks 无关），只是被一条 CSS 在「宿主支持」时隐藏了。
		* 这里只负责「让 CSS 知道现在该接管」，不改宿主 DOM、不写会话数据。
		*
		* 交还条件：marks.children > 0 时立刻移除该属性，自绘退回 display:none。
		*/
		function markEmptyMarks(nav) {
			const marks = nav.querySelector(".JXrxFq_marks");
			if (marks === null) {
				nav.removeAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE);
				return;
			}
			const hasBox = marks.getBoundingClientRect().height > 0;
			const isEmpty = marks.children.length === 0;
			if (hasBox && isEmpty) nav.setAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE, "true");
			else nav.removeAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE);
		}
		function nodeTouchesTurnNavigator(node) {
			return node instanceof Element && (node.matches(`nav,[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) || node.closest(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null || node.querySelector(`nav,[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null);
		}
		function nodeInsideTurnNavigator(node) {
			return node instanceof Element && (node.matches(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) || node.closest(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null);
		}
		function turnNavigatorMutationRelevant(records) {
			return records.some((record) => record.type === "attributes" ? record.target instanceof Element && record.target.matches("nav") : nodeInsideTurnNavigator(record.target) || [...record.addedNodes].some(nodeTouchesTurnNavigator) || [...record.removedNodes].some(nodeTouchesTurnNavigator));
		}
		async function runtimeSupportsOfficialTurnNavigator(fetchImpl) {
			try {
				const response = await fetchImpl(CAPABILITIES_ENDPOINT, { cache: "no-store" });
				if (!response.ok) return false;
				const payload = await response.json();
				if (payload === null || typeof payload !== "object") return false;
				const capabilities = payload.capabilities;
				return capabilities !== null && typeof capabilities === "object" && capabilities.officialTurnNavigator === true;
			} catch {
				return false;
			}
		}
		/** 官方导航可能在会话切换后异步挂载；仅对相关变更按帧检测，并在停用时清理标记。 */
		function observeOfficialTurnNavigators(doc = document, fetchImpl = fetch) {
			if (doc.body === null || doc.documentElement === null) return () => {};
			let active = true;
			let frame;
			let pending = false;
			const run = () => {
				frame = void 0;
				if (doc.querySelector(`[${SIDEBAR_MOTION_ATTRIBUTE}]`) !== null) {
					pending = true;
					window.setTimeout(() => {
						if (pending && doc.querySelector(`[${SIDEBAR_MOTION_ATTRIBUTE}]`) === null) schedule();
					}, 400);
					return;
				}
				pending = false;
				markOfficialTurnNavigators(doc);
			};
			const schedule = () => {
				if (frame !== void 0) return;
				frame = window.requestAnimationFrame(run);
			};
			const observer = new MutationObserver((records) => {
				if (records.some((record) => record.type === "attributes" && record.attributeName === SIDEBAR_MOTION_ATTRIBUTE)) {
					if (doc.querySelector(`[${SIDEBAR_MOTION_ATTRIBUTE}]`) === null) schedule();
					return;
				}
				if (records.some((record) => record.type === "childList") || turnNavigatorMutationRelevant(records)) schedule();
			});
			observer.observe(doc.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["style", SIDEBAR_MOTION_ATTRIBUTE]
			});
			schedule();
			runtimeSupportsOfficialTurnNavigator(fetchImpl).then((supported) => {
				if (!active) return;
				if (supported) doc.documentElement.setAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE, "true");
				else doc.documentElement.removeAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE);
				schedule();
			});
			return () => {
				active = false;
				observer.disconnect();
				if (frame !== void 0) window.cancelAnimationFrame(frame);
				doc.documentElement.removeAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE);
				for (const element of doc.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}],[${OFFICIAL_TURN_MARK_ATTRIBUTE}],[${OFFICIAL_TURN_TOOLTIP_ATTRIBUTE}]`)) {
					element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE);
					element.removeAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE);
					element.removeAttribute(OFFICIAL_TURN_MARK_ATTRIBUTE);
					element.removeAttribute(OFFICIAL_TURN_TOOLTIP_ATTRIBUTE);
				}
			};
		}
		const SCROLL_MAX_MS = 2200;
		const SCROLL_PX_PER_MS = 3.2;
		const SLIDE_TAIL_RATIO = .6;
		/** 触发「瞬移 + 滑入」的最小距离（px）。短于此距离直接滑，无需瞬移。 */
		const INSTANT_JUMP_MIN = 1200;
		function scrollDurationFor(distance) {
			const raw = Math.abs(distance) / SCROLL_PX_PER_MS;
			return Math.min(SCROLL_MAX_MS, Math.max(320, raw));
		}
		/**
		* 缓动曲线：Chrome 原生 scroll smooth 的**实测采样**（不是猜的 easeInOutCubic）。
		*
		* 2026-10-26 从 ZCode 容器采到 Chrome 原生 smooth 的 21 点归一化曲线：
		*   [0, .011, .061, .204, .471, .652, .761, .834, .885, .923, .950, .970, .984, .993, .998, 1, 1, ...]
		* 形态是**非对称 ease-out**：前 20% 时间走完 47%，后 40% 时间只走最后 1.6%。
		* 而我原来的 easeInOutCubic 是对称的（t=.2 时只走到 .03），所以起步偏慢、后段偏快，
		* 主观上"不够顺"。
		*
		* 实现：查表 + 线性插值，误差 <0.005（远小于 21 点采样间隔带来的不确定度）。
		*/
		const CHROME_SMOOTH_CURVE = [
			0,
			.011,
			.061,
			.204,
			.471,
			.652,
			.761,
			.834,
			.885,
			.923,
			.95,
			.97,
			.984,
			.993,
			.998,
			1,
			1
		];
		function chromeSmoothEase(t) {
			if (t <= 0) return 0;
			if (t >= 1) return 1;
			const scale = t * (CHROME_SMOOTH_CURVE.length - 1);
			const index = Math.floor(scale);
			const frac = scale - index;
			const a = CHROME_SMOOTH_CURVE[index] ?? 0;
			return a + ((CHROME_SMOOTH_CURVE[index + 1] ?? 1) - a) * frac;
		}
		const scrollAnims = /* @__PURE__ */ new WeakMap();
		function conversationScroller() {
			return document.querySelector("[data-conversation-scroll]");
		}
		function animateScroll(scroller, to) {
			const running = scrollAnims.get(scroller);
			if (running !== void 0) cancelAnimationFrame(running.frame);
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				scroller.scrollTop = to;
				scrollAnims.delete(scroller);
				return;
			}
			const needsJump = Math.abs(to - scroller.scrollTop) > INSTANT_JUMP_MIN;
			/** 瞬移后应有的位置，作为「等待窗口内是否被别人改过」的基线。 */
			let jumpBase = scroller.scrollTop;
			if (needsJump) {
				const tail = Math.max(320 * SCROLL_PX_PER_MS, scroller.clientHeight * SLIDE_TAIL_RATIO);
				scroller.scrollTop = to - Math.sign(to - scroller.scrollTop) * tail;
				jumpBase = scroller.scrollTop;
			}
			if (needsJump) {
				const anim = { frame: 0 };
				scrollAnims.set(scroller, anim);
				anim.frame = requestAnimationFrame(() => {
					anim.frame = requestAnimationFrame(() => {
						slideTail(scroller, to, anim, jumpBase);
					});
				});
				return;
			}
			const anim = { frame: 0 };
			scrollAnims.set(scroller, anim);
			slideTail(scroller, to, anim, jumpBase);
		}
		/** 从当前 scrollTop 平滑滑到 to（尾段滑入 / 短距离直接滑共用）。 */
		function slideTail(scroller, to, anim, jumpBase) {
			if (Math.abs(scroller.scrollTop - jumpBase) > 2) {
				scrollAnims.delete(scroller);
				return;
			}
			const from = scroller.scrollTop;
			const duration = scrollDurationFor(to - from);
			const start = performance.now();
			/** 上一帧我们写进去的值，用于分辨「这一帧的 scrollTop 是不是别人改的」。 */
			let expected = from;
			const step = () => {
				if (Math.abs(scroller.scrollTop - expected) > 2) {
					scrollAnims.delete(scroller);
					return;
				}
				const progress = Math.min(1, (performance.now() - start) / duration);
				expected = from + (to - from) * chromeSmoothEase(progress);
				scroller.scrollTop = expected;
				if (progress < 1) anim.frame = requestAnimationFrame(step);
				else {
					scroller.scrollTop = to;
					scrollAnims.delete(scroller);
				}
			};
			anim.frame = requestAnimationFrame(step);
		}
		//#endregion
		//#region src/client/turn-rail-zcode.ts
		/**
		* 宿主轮次导航 → ZCode 3.16.3 索引 hover 递进。
		*
		* 背景：宿主 nav[aria-label="轮次导航"] 的动效只做「当前条」：
		*   静息 scaleX(.4) → hover 条 scaleX(.9)，邻居完全不动（2026-10-26 CDP 实测）。
		* ZCode 的动效是**递进波**：hover 第 N 条时，±2 条一起胀开：
		*   距离 0 → 12px × 2.6 = 31.2px，opacity 1
		*   距离 1 → 12px × 1.7 = 20.4px，opacity .86
		*   距离 2 → 12px × 1.25 = 15px，opacity .72
		*   距离 ≥3 → 12px × 1，opacity .58
		* 全部过渡 .15s cubic-bezier(0, 0, .2, 1)。
		*
		* 宿主只给一个状态位，无法从 CSS 表达「按距离递进」，所以这里接管指针：
		* 监听 nav 上的 pointermove，按 clientY 反算命中的第几条，再给每条按钮的
		* ::before 写内联 --dcu-zcode-* 变量。
		*
		* 规格来源：优化UI插件区/ZCODE-INDEX-SPEC.md（CDP 实测，非推测）。
		*/
		const NAV_SELECTOR = "nav[data-dcu-official-turn-navigator]";
		const BUTTON_SELECTOR = "button";
		const IDLE_OPACITY = "0.58";
		/**
		* 距离 → [缩放, 透明度, 是否用全前景色]。
		*
		* 前两列来自 CDP 实测；第三列来自 ZCode bundle 源码 + 实测：
		* hover d0 时 `colorTone: 'focus'` → `bg-foreground`（全前景色），
		* 而静息与 d1/d2 都是 `oklab(0.87 0 0 / 0.3)`（30% 半透明）。
		* 只调 opacity 不变色会让峰值一眼看出不是 ZCode（2026-10-26 对照报告坑 2）。
		*/
		const WAVE = [
			[
				2.6,
				1,
				true
			],
			[
				1.7,
				.86,
				false
			],
			[
				1.25,
				.72,
				false
			]
		];
		/** 当前轮（滚动所在位置）的静息强调：ZCode 实测 opacity .9 + 全前景色。 */
		const ACTIVE_OPACITY = "0.9";
		const rails = /* @__PURE__ */ new WeakMap();
		let observer;
		let bound = false;
		function applyHover(rail, hoverIndex) {
			const state = rails.get(rail);
			if (state === void 0) return;
			if (state.activeIndex === hoverIndex && hoverIndex !== null) return;
			if (state.activeIndex === hoverIndex && state.applied === true) return;
			state.activeIndex = hoverIndex;
			state.applied = true;
			const activeButton = rail.querySelector("button[aria-current]");
			state.buttons.forEach((button, index) => {
				const distance = hoverIndex === null ? Number.POSITIVE_INFINITY : Math.abs(index - hoverIndex);
				const wave = WAVE[distance];
				const scale = wave === void 0 ? 1 : wave[0];
				const isActive = button === activeButton;
				const opacity = wave === void 0 ? hoverIndex === null && isActive ? ACTIVE_OPACITY : IDLE_OPACITY : String(wave[1]);
				const full = wave !== void 0 && wave[2];
				button.style.setProperty("--dcu-zcode-scale", String(scale));
				button.style.setProperty("--dcu-zcode-opacity", opacity);
				if (full || hoverIndex === null && isActive) button.style.setProperty("--dcu-zcode-color", "var(--dsw-alias-label-primary)");
				else button.style.removeProperty("--dcu-zcode-color");
			});
			if (hoverIndex !== null) requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setTimeout(() => {
						fixPreviewOffset(rail);
					}, 0);
				});
			});
		}
		function indexFromPoint(rail, clientY) {
			const state = rails.get(rail);
			if (state === void 0 || state.buttons.length === 0) return null;
			for (let index = 0; index < state.buttons.length; index += 1) {
				const rect = state.buttons[index].getBoundingClientRect();
				if (rect.height > 0 && clientY >= rect.top && clientY < rect.bottom) return index;
			}
			const first = state.buttons[0].getBoundingClientRect();
			const span = state.buttons[state.buttons.length - 1].getBoundingClientRect().bottom - first.top;
			if (span <= 0) return null;
			const ratio = (clientY - first.top) / span;
			if (ratio < 0 || ratio >= 1) return null;
			return Math.min(state.buttons.length - 1, Math.floor(ratio * state.buttons.length));
		}
		/**
		* G5（04-open-gaps）：补齐读屏用的次级 aria 属性。
		*
		* ZCode：每个刻度带 aria-posinset（第几条）/ aria-setsize（共几条），
		* nav 在水合期间带 aria-busy="true"。
		*
		* 近似说明（按要求写明近似）：
		* 宿主没有暴露「是否已水合完成」的状态，这里用「未加载刻度占比」近似 ——
		* 仍有 markUnloaded 的条目时视为仍在加载，给 nav 挂 aria-busy="true"。
		* 这是近似，不是宿主的真实水合信号。
		*/
		function applyAriaMetadata(rail, buttons) {
			const size = buttons.length;
			let unloaded = 0;
			buttons.forEach((button, index) => {
				button.setAttribute("aria-posinset", String(index + 1));
				button.setAttribute("aria-setsize", String(size));
				if (button.className.includes("Unloaded")) unloaded += 1;
			});
			if (unloaded > 0) {
				rail.setAttribute("aria-busy", "true");
				rail.setAttribute("data-dcu-rail-unloaded", String(unloaded));
			} else {
				rail.removeAttribute("aria-busy");
				rail.removeAttribute("data-dcu-rail-unloaded");
			}
		}
		function syncButtonCount(rail) {
			const buttons = Array.from(rail.querySelectorAll(BUTTON_SELECTOR));
			applyAriaMetadata(rail, buttons);
			const state = rails.get(rail);
			if (state === void 0 || state.buttons.length !== buttons.length) {
				rails.set(rail, {
					buttons,
					activeIndex: null,
					applied: false
				});
				buttons.forEach((button) => {
					button.style.setProperty("--dcu-zcode-scale", "1");
					button.style.setProperty("--dcu-zcode-opacity", IDLE_OPACITY);
				});
				return;
			}
			state.buttons = buttons;
		}
		function bindRail(rail) {
			if (rails.has(rail) && rail.__dcuZcodeBound === true) {
				syncButtonCount(rail);
				return;
			}
			rail.__dcuZcodeBound = true;
			installClickSmooth(rail);
			syncButtonCount(rail);
			applyHover(rail, null);
			rail.addEventListener("scroll", () => {
				applyHover(rail, rails.get(rail)?.activeIndex ?? null);
			}, true);
			rail.addEventListener("pointermove", (event) => {
				applyHover(rail, indexFromPoint(rail, event.clientY));
			});
			rail.addEventListener("pointerleave", () => {
				applyHover(rail, null);
			});
			rail.addEventListener("focusin", (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const index = rails.get(rail)?.buttons.indexOf(target) ?? -1;
				if (index >= 0) applyHover(rail, index);
			});
			rail.addEventListener("focusout", (event) => {
				const next = event.relatedTarget;
				if (next instanceof Node && rail.contains(next)) return;
				applyHover(rail, null);
			});
		}
		/**
		* G3（04-open-gaps）：让当前条始终留在 rail 视野内。
		*
		* ZCode：aria-current 变化时 `scrollToIndex(active, align:'auto')`，
		* 当前条永不被滚出导航区。
		* DSH 之前完全没有这个机制：rail 可滚（如 45 条 = 450px > 420px）时，
		* 用户滚会话到中段，当前条可能在 rail 视口外，rail 永远停在原位。
		*
		* 注意：只滚 **rail 内部 scroller**，不要用 scrollIntoView 的默认行为
		* ——它会连带滚动所有可滚祖先，把会话区（[data-conversation-scroll]）也拽走。
		* 这里手算偏移，直接改 rail scroller 的 scrollTop。
		*/
		function keepActiveVisible(rail) {
			const active = rail.querySelector("button[aria-current]");
			if (active === null) return;
			let scroller = null;
			for (const el of Array.from(rail.querySelectorAll("*"))) {
				const overflowY = window.getComputedStyle(el).overflowY;
				if (overflowY === "auto" || overflowY === "scroll") {
					scroller = el;
					break;
				}
			}
			if (scroller === null) return;
			const box = scroller.getBoundingClientRect();
			const rect = active.getBoundingClientRect();
			if (rect.height <= 0 || box.height <= 0) return;
			if (rect.top < box.top) scroller.scrollTop -= box.top - rect.top;
			else if (rect.bottom > box.bottom) scroller.scrollTop += rect.bottom - box.bottom;
		}
		function scan() {
			document.querySelectorAll(NAV_SELECTOR).forEach((rail) => {
				bindRail(rail);
				const state = rails.get(rail);
				if (state !== void 0) {
					state.applied = false;
					applyHover(rail, state.activeIndex);
				}
			});
		}
		/**
		* 浮层垂直补偿（只在宿主**未钳制**时生效）。
		*
		* 宿主定位：`top = --turn-preview-center - 50`（固定 50，不是 height/2），
		* 且两端会被钳制：顶部 `top >= 0`、底部 `top <= 容器高 - 框高 - 2`。
		* 框高常态 98px，此时 `-50` 恰好≈半高，看不出问题；
		* 但「只有提问、没有回答」的轮次框高只有 40px，按 50 偏移就偏上 30px。
		*
		* 2026-10-26 验收补充：均匀补偿 `(98px - 100%)/2` 在**钳制区**会变成双重位移
		* （宿主先钳 top，我再 translate，实测 idx3 偏差 35px、idx42 偏差 -35px）。
		* 所以必须判断「理想 top 是否越界」：越界说明宿主已经钳过，不能再补偿。
		*/
		const PREVIEW_SELECTOR = ".JXrxFq_preview";
		function fixPreviewOffset(rail) {
			const preview = rail.querySelector(PREVIEW_SELECTOR);
			if (preview === null) return;
			const railRect = rail.getBoundingClientRect();
			if (preview.getBoundingClientRect().height <= 0) return;
			const target = Number.parseFloat(preview.style.getPropertyValue("--turn-preview-center"));
			if (!Number.isFinite(target)) return;
			const state = rails.get(rail);
			const hoverIndex = state?.activeIndex;
			const activeButton = hoverIndex !== null && hoverIndex !== void 0 ? state?.buttons[hoverIndex] : null;
			if (activeButton !== void 0 && activeButton !== null) {
				const btnRect = activeButton.getBoundingClientRect();
				preview.style.setProperty("--dcu-preview-top", `${btnRect.top - railRect.top}px`);
			}
			preview.style.setProperty("--dcu-preview-shift", "0px");
		}
		/**
		* 点击刻度的平滑滚动。
		*
		* 宿主点击后是**瞬跳**（实测 scrollTop 7796 → 5231，只有 2 个不同值，bigJump=true）。
		* ZCode 是 `behavior:'smooth'` 的缓动动画，这是用户「一比一复刻」口径里最明显的一项。
		*
		* 做法（不逆向宿主内部映射，零猜测）：
		*   capture 阶段拦下 click → 记 scrollTop₀ → 放行宿主完成跳转
		*   → 下一帧读 scrollTop₁ → 回写 scrollTop₀ → 自己缓动到 scrollTop₁。
		*
		* 为什么不用容器上的 `scroll-behavior:smooth`：
		* 宿主「跟随底部」会在每次流式 tick 赋值 scrollTop，那条 CSS 会把那些赋值
		* 也变成动画，导致滚动永远追不上新消息（报告二已把这个陷阱拦下）。
		* 这里只在点击时临时接管，动画结束立刻释放，不影响跟随底部。
		*/
		/**
		* 点击后的即时反馈（解决「点了没反应」）。
		*
		* 实测（五轮验收报告坑 2）：点击远距离刻度时，宿主跨数万像素挂载内容需要 ~1 秒，
		* 这段期间 scrollTop 完全不动、界面上没有任何变化——用户会以为点击没生效而重复点。
		* 这段等待是宿主侧成本，插件无法缩短，但可以**把「无响应」变成「已受理」**：
		* 让被点击的刻度立刻进入 peak 态（scaleX 2.6 / 全前景色），停留 ~260ms 再交还给正常 hover 逻辑。
		*
		* 纯视觉、不改滚动、无副作用；即使后续宿主跳转失败，用户也只会看到刻度闪了一下。
		*/
		const CLICK_FEEDBACK_MS = 260;
		function flashClickedTick(rail, button) {
			button.style.setProperty("--dcu-zcode-scale", "2.6");
			button.style.setProperty("--dcu-zcode-opacity", "1");
			button.style.setProperty("--dcu-zcode-color", "var(--dsw-alias-label-primary)");
			window.setTimeout(() => {
				const state = rails.get(rail);
				if (state !== void 0) {
					state.applied = false;
					applyHover(rail, state.activeIndex);
				}
			}, CLICK_FEEDBACK_MS);
		}
		function installClickSmooth(rail) {
			if (rail.__dcuSmoothBound === true) return;
			rail.__dcuSmoothBound = true;
			rail.addEventListener("click", (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				const button = target.closest("button");
				if (button === null || !rail.contains(button)) return;
				const scroller = conversationScroller();
				if (scroller === null) return;
				if (button.className.includes("Unloaded")) return;
				const from = scroller.scrollTop;
				flashClickedTick(rail, button);
				let hijacked = false;
				const onScroll = () => {
					if (hijacked) return;
					const now = scroller.scrollTop;
					if (Math.abs(now - from) < 4) return;
					hijacked = true;
					scroller.scrollTop = from;
					scroller.removeEventListener("scroll", onScroll, true);
					animateScroll(scroller, now);
				};
				scroller.addEventListener("scroll", onScroll, true);
				requestAnimationFrame(() => {
					if (!hijacked) scroller.removeEventListener("scroll", onScroll, true);
				});
			}, true);
		}
		/** 启动：宿主导航是懒挂载的，用 MutationObserver 等它出现。 */
		function observeZcodeTurnRail() {
			if (bound || typeof document === "undefined") return;
			bound = true;
			scan();
			observer = new MutationObserver((records) => {
				if (records.some((record) => record.type === "attributes")) {
					document.querySelectorAll(NAV_SELECTOR).forEach((rail) => {
						const state = rails.get(rail);
						if (state === void 0) return;
						state.applied = false;
						applyHover(rail, state.activeIndex);
						keepActiveVisible(rail);
					});
					return;
				}
				scan();
			});
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["aria-current"]
			});
		}
		function stopZcodeTurnRail() {
			observer?.disconnect();
			observer = void 0;
			bound = false;
		}
		//#endregion
		//#region src/client/turn-rail-dedupe.ts
		/**
		* 同 id 索引栏去重。
		*
		* 背景（2026-10-19 实测）：`dsh-zcode-ui` 是 `@michengai/dsh-codex-ui` 的 fork，两个包
		* 可能同时装进同一个 DSH profile（本机 desktop profile 就是如此）。两者都往
		* `conversation.session.header.utilities` 注册 `id: 'turn-navigator'`，而 slot 注册表按
		* 「包 + id」区分，于是同一个 id 会被渲染成**两条并排的索引栏**——用户看到的现象是
		* 「左右各一条、位置互相错开」，并且滚动/折叠时两条不同步，看起来就是「漂移」。
		*
		* 与其依赖对方的包名或类名，这里只做一个最小判断：页面里若有多个自绘索引栏，
		* 只保留**最先出现在文档顺序里的那一条**，其余打上 `data-dcu-turn-rail-stale` 退场。
		* 之所以保留第一条而不是「保留自己的」：先挂载者通常是用户当前实际在用的那套皮肤，
		* 贸然抢占会让正在生效的皮肤突然消失。
		*/
		const RAIL = ".dcu-turn-navigator";
		const KEEP = "data-dcu-turn-rail-primary";
		const STALE = "data-dcu-turn-rail-stale";
		function reconcile(doc) {
			const rails = [...doc.querySelectorAll(RAIL)];
			if (rails.length <= 1) {
				if (rails.length === 1) {
					rails[0].removeAttribute(STALE);
					rails[0].setAttribute(KEEP, "");
				}
				return;
			}
			const [primary, ...rest] = rails;
			primary.setAttribute(KEEP, "");
			primary.removeAttribute(STALE);
			for (const rail of rest) {
				rail.setAttribute(STALE, "");
				rail.removeAttribute(KEEP);
			}
		}
		/** 观察索引栏的增删；返回停止函数。 */
		function dedupeTurnRails(doc = document) {
			if (doc.body === null) return () => {};
			let frame;
			const schedule = () => {
				if (frame !== void 0) return;
				frame = window.requestAnimationFrame(() => {
					frame = void 0;
					reconcile(doc);
				});
			};
			const observer = new MutationObserver(() => schedule());
			observer.observe(doc.body, {
				childList: true,
				subtree: true
			});
			schedule();
			return () => {
				observer.disconnect();
				if (frame !== void 0) window.cancelAnimationFrame(frame);
				for (const rail of doc.querySelectorAll(`[${KEEP}],[${STALE}]`)) {
					rail.removeAttribute(KEEP);
					rail.removeAttribute(STALE);
				}
			};
		}
		//#endregion
		//#region src/client/conversation-dom.ts
		/**
		* DSH 尚未公开会话滚动容器和消息锚点服务；把兼容读取集中在这里，方便
		* 宿主提供正式 API 后只替换这一处。所有调用均可失败，不改写会话数据。
		*/
		function conversationScrollRoot() {
			return document.querySelector("[data-conversation-scroll]");
		}
		function conversationAnchor(root, key) {
			return conversationAnchors(root).get(key) ?? null;
		}
		/** 一次扫描生成锚点索引，滚动帧内不得为每个轮次重复遍历 DOM。 */
		function conversationAnchors(root) {
			const anchors = /* @__PURE__ */ new Map();
			for (const anchor of root.querySelectorAll("[data-chat-anchor-key]")) {
				const key = anchor.dataset.chatAnchorKey;
				if (key !== void 0 && !anchors.has(key)) anchors.set(key, anchor);
			}
			return anchors;
		}
		//#endregion
		//#region src/client/TurnNavigator.tsx
		const stylesheet = `
.dcu-turn-navigator{position:fixed;z-index:20;top:50%;left:var(--dcu-turn-left,288px);transform:translateY(-50%);width:16px;max-height:calc(100vh - 120px);overflow:visible;pointer-events:none}
/* 侧栏开合期间与内容列同步位移（2026-10-19）。
   背景：内容列的滑动是「伪造」的——轨道宽度一帧就切到目标，视觉位移由内容列自己的
   transform 补齐。本索引栏是 position:fixed，按 .dcu-root 的真实几何定位，不吃那段
   transform，于是开合期间它一帧到位、内容列还在路上（实测最大偏差 74px），
   用户看到的就是「索引不跟着侧栏走、漂移」。
   修复：sidebar-width.ts 把同一段位移发布成 --dcu-rail-sync-shift（写起点、过渡到 0），
   这里用与内容列**完全相同**的时长与曲线消费它。三者时间轴必须一致，否则会互相追赶。
   translateY(-50%) 是垂直居中，必须保留，不能被位移覆盖。 */
.dcu-turn-navigator[data-dcu-rail-sync]{transform:translateY(-50%) translateX(var(--dcu-rail-sync-shift,0px));transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
@media (prefers-reduced-motion:reduce){.dcu-turn-navigator[data-dcu-rail-sync]{transition:none}}
.dcu-turn-scroll{width:16px;max-height:inherit;overflow-x:hidden;overflow-y:auto;scrollbar-width:none;pointer-events:none}
.dcu-turn-scroll::-webkit-scrollbar{display:none}
.dcu-turn-list{display:grid;gap:0;margin:0;padding:4px 0;list-style:none;width:16px;pointer-events:none}
.dcu-turn-link{pointer-events:auto;position:relative;display:flex;align-items:center;justify-content:flex-start;width:36px;height:10px;overflow:visible;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:13px/18px var(--dsw-font-family);text-align:left;cursor:pointer;transition:color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-turn-link::before{width:var(--dcu-tick-w,12px);height:var(--dcu-tick-h,2px);flex:0 0 var(--dcu-tick-w,12px);border-radius:var(--dsw-radius-full,999px);background:currentcolor;content:'';transform-origin:0 50%;opacity:var(--dcu-tick-op,.58);transition:width var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),height var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),flex-basis var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-turn-summary{position:absolute;left:16px;top:var(--dcu-summary-top,50%);transform:translateY(-50%);box-sizing:border-box;width:max-content;max-width:240px;height:32px;padding:0 12px;border-radius:var(--dsw-radius-2xl);background:#3a3d3c;color:#e8ebe9;box-shadow:0 8px 24px rgba(0,0,0,.28);pointer-events:none;z-index:2;display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:32px}
.dcu-turn-link[data-active=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link[aria-current=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link[aria-current=true]::before{width:var(--dcu-tick-w,5px);flex-basis:var(--dcu-tick-w,5px);height:var(--dcu-tick-h,1px)}
.dcu-turn-navigator[data-hovering=true] .dcu-turn-link[aria-current=true]{color:var(--dsw-alias-label-tertiary)}
.dcu-turn-navigator[data-hovering=true] .dcu-turn-link[data-active=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link:focus-visible{outline:0;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dcu-focus))}
@media (prefers-reduced-motion:reduce){.dcu-turn-link,.dcu-turn-link::before{transition:none}}
@media (max-width:760px){.dcu-turn-summary{max-width:200px}}
`;
		/**
		* 刻度尺寸：按 ZCode 3.16.3 的**离散缩放表**复刻（2026-10-26 CDP 实测）。
		*
		* ZCode 的 hover 不是连续高斯曲线，而是一张只有四档的表，且只影响 ±2 条：
		*   距离 0 → scaleX 2.6 / opacity 1.00   （12px × 2.6 = 31.2px）
		*   距离 1 → scaleX 1.7 / opacity 0.86   （20.4px）
		*   距离 2 → scaleX 1.25 / opacity 0.72  （15px）
		*   距离 ≥3 → scaleX 1   / opacity 0.58  （静息 12px）
		* 静息态：12 × 2px，圆角 full，transform-origin 左侧。
		* 实测数据见 优化UI插件区/ZCODE-INDEX-SPEC.md。
		*/
		const ZCODE_TICK_BASE_W = 12;
		const ZCODE_TICK_BASE_H = 2;
		const ZCODE_HOVER_SCALE = [
			2.6,
			1.7,
			1.25
		];
		const ZCODE_HOVER_OPACITY = [
			1,
			.86,
			.72
		];
		const ZCODE_IDLE_OPACITY = .58;
		function tickMarkSize(index, hoverAt, _isCurrent) {
			if (hoverAt === null) return {
				width: ZCODE_TICK_BASE_W,
				height: ZCODE_TICK_BASE_H,
				opacity: ZCODE_IDLE_OPACITY
			};
			const distance = Math.abs(index - hoverAt);
			const scale = ZCODE_HOVER_SCALE[distance] ?? 1;
			const opacity = ZCODE_HOVER_OPACITY[distance] ?? ZCODE_IDLE_OPACITY;
			return {
				width: Number((ZCODE_TICK_BASE_W * scale).toFixed(1)),
				height: ZCODE_TICK_BASE_H,
				opacity
			};
		}
		function hoverIndexFromPoint(list, clientY, count) {
			const box = list.getBoundingClientRect();
			if (count <= 0 || box.height <= 0) return 0;
			return Math.min(Math.max(clientY - box.top, 0), box.height) / box.height * count - .5;
		}
		/** 轮目摘要上限：整段长文本会同时进入 title、aria-label 与 DOM 文本，必须截断。 */
		const TURN_SUMMARY_LIMIT = 72;
		function textSummary(content, fallback) {
			const text = content.flatMap((block) => {
				if (typeof block !== "object" || block === null) return [];
				const value = block;
				return value.type === "text" && typeof value.text === "string" ? [value.text] : [];
			}).join(" ").replace(/\s+/g, " ").trim();
			const summary = text === "" ? fallback : text;
			return summary.length > TURN_SUMMARY_LIMIT ? `${summary.slice(0, TURN_SUMMARY_LIMIT)}…` : summary;
		}
		function userContent(data) {
			if (typeof data !== "object" || data === null) return [];
			const content = data.content;
			return Array.isArray(content) ? content : [];
		}
		function turnLinks(snapshot, fallback) {
			const links = [];
			for (const key of snapshot.order) {
				const node = snapshot.nodes.get(key);
				if (node?.kind !== "user") continue;
				links.push({
					key: node.key,
					summary: textSummary(userContent(node.data), fallback)
				});
			}
			return links;
		}
		function equalTurns(left, right) {
			return left.length === right.length && left.every((turn, index) => turn.key === right[index]?.key && turn.summary === right[index]?.summary);
		}
		function legacyTurnLinks(useSession, fallback) {
			return useSession((snapshot) => {
				const chat = "chat" in snapshot ? snapshot.chat : void 0;
				return chat === void 0 ? [] : turnLinks(chat, fallback);
			}, equalTurns);
		}
		/** 帧元素缓存：拖拽时 `.dcu-root` 持续 resize，每次重扫 DOM 会在长会话下掉帧。 */
		let railFrameCache;
		function railFrame() {
			if (railFrameCache !== void 0 && railFrameCache.isConnected) return railFrameCache;
			railFrameCache = findSidebarFrame(document);
			return railFrameCache;
		}
		function railLeftFromSidebar() {
			const frame = railFrame();
			const tracks = frame === void 0 ? void 0 : parseSidebarGrid(frame.style.gridTemplateColumns);
			if (tracks !== void 0) return Math.round(tracks.sidebar) + 16;
			const sidebar = document.querySelector(".dcu-root");
			if (sidebar === null) return 288;
			return Math.round(sidebar.getBoundingClientRect().right) + 16;
		}
		/** 当前会话的轮次导航；只读取原生聊天锚点并滚动，不改写会话数据或消息视图。 */
		function TurnNavigator({ useChat, useSession, t }) {
			const fallback = t("turns.untitled");
			const turns = useChat === void 0 ? legacyTurnLinks(useSession, fallback) : useChat((snapshot) => turnLinks(snapshot, fallback), equalTurns);
			const [current, setCurrent] = (0, react.useState)(turns[0]?.key ?? null);
			const [hoverAt, setHoverAt] = (0, react.useState)(null);
			const [railLeft, setRailLeft] = (0, react.useState)(288);
			const [summaryTop, setSummaryTop] = (0, react.useState)(0);
			const navRef = (0, react.useRef)(null);
			const listRef = (0, react.useRef)(null);
			const turnKeys = (0, react.useMemo)(() => turns.map((turn) => turn.key).join("|"), [turns]);
			const activeIndex = hoverAt === null ? -1 : Math.max(0, Math.min(turns.length - 1, Math.round(hoverAt)));
			const activeTurn = activeIndex >= 0 ? turns[activeIndex] : void 0;
			(0, react.useEffect)(() => {
				const sidebar = document.querySelector(".dcu-root");
				const update = () => {
					const next = railLeftFromSidebar();
					setRailLeft((previous) => previous === next ? previous : next);
				};
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(update);
				if (sidebar !== null) observer?.observe(sidebar);
				window.addEventListener("resize", update);
				update();
				return () => {
					observer?.disconnect();
					window.removeEventListener("resize", update);
				};
			}, []);
			(0, react.useEffect)(() => {
				if (turns.length === 0) return;
				let host = null;
				let frame = null;
				const update = () => {
					frame = null;
					if (host === null) return;
					const threshold = host.getBoundingClientRect().top + Math.min(180, host.clientHeight * .35);
					const anchors = conversationAnchors(host);
					let next = turns[0]?.key ?? null;
					for (const turn of turns) {
						const anchor = anchors.get(turn.key);
						if (anchor !== void 0 && anchor.getBoundingClientRect().top <= threshold) next = turn.key;
					}
					setCurrent((previous) => previous === next ? previous : next);
				};
				const schedule = () => {
					if (frame === null) frame = window.requestAnimationFrame(update);
				};
				const bindHost = () => {
					const next = conversationScrollRoot();
					if (next === host) return;
					host?.removeEventListener("scroll", schedule);
					host = next;
					host?.addEventListener("scroll", schedule, { passive: true });
					schedule();
				};
				const observer = new MutationObserver(() => {
					if (host === null || !host.isConnected) bindHost();
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
				window.addEventListener("resize", schedule);
				bindHost();
				return () => {
					observer.disconnect();
					host?.removeEventListener("scroll", schedule);
					window.removeEventListener("resize", schedule);
					if (frame !== null) window.cancelAnimationFrame(frame);
				};
			}, [turnKeys, turns]);
			(0, react.useEffect)(() => {
				const nav = navRef.current;
				const list = listRef.current;
				if (nav === null || list === null || activeIndex < 0) return;
				const button = list.querySelectorAll(".dcu-turn-link")[activeIndex];
				if (button === void 0) return;
				const next = Math.round(button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2 - nav.getBoundingClientRect().top);
				setSummaryTop((previous) => previous === next ? previous : next);
			}, [activeIndex, turns.length]);
			if (turns.length === 0) return null;
			const moveHover = (event) => {
				setHoverAt(hoverIndexFromPoint(event.currentTarget, event.clientY, turns.length));
			};
			const style = {
				"--dcu-turn-left": `${railLeft}px`,
				"--dcu-summary-top": `${summaryTop}px`
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				ref: navRef,
				className: "dcu-turn-navigator",
				"data-hovering": hoverAt !== null || void 0,
				"data-dcu-rail-sync": "",
				"aria-label": t("turns.label"),
				style,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: stylesheet }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dcu-turn-scroll",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
							ref: listRef,
							className: "dcu-turn-list",
							onMouseMove: moveHover,
							onMouseLeave: () => {
								setHoverAt(null);
							},
							children: turns.map((turn, index) => {
								const mark = tickMarkSize(index, hoverAt, current === turn.key);
								const active = hoverAt !== null && index === activeIndex;
								const tickStyle = {
									"--dcu-tick-w": `${mark.width}px`,
									"--dcu-tick-h": `${mark.height}px`,
									"--dcu-tick-op": `${mark.opacity}`
								};
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dcu-turn-link",
									"data-active": active || void 0,
									"aria-current": current === turn.key || void 0,
									"aria-label": t("turns.jump", {
										index: index + 1,
										summary: turn.summary
									}),
									style: tickStyle,
									onFocus: () => {
										setHoverAt(index);
									},
									onBlur: () => {
										setHoverAt(null);
									},
									onClick: () => {
										const host = conversationScrollRoot();
										const anchor = host === null ? null : conversationAnchor(host, turn.key);
										if (host === null || anchor === null) return;
										host.scrollTop = host.scrollTop + anchor.getBoundingClientRect().top - host.getBoundingClientRect().top - 12;
									}
								}) }, turn.key);
							})
						})
					}),
					activeTurn !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dcu-turn-summary",
						children: activeTurn.summary
					})
				]
			});
		}
		//#endregion
		//#region src/client/input-history.ts
		const HISTORY_KEY = "michengai.codex-ui.input-history.v1";
		const LEGACY_HISTORY_KEY = "michengai.btw.history.v1";
		const MAX_STORAGE_LENGTH = 1e6;
		/** 只保存已发送文本；浏览器存储失败时仍保留本次内存历史。 */
		var InputHistory = class {
			storage;
			limit;
			warn;
			scopes = /* @__PURE__ */ new Map();
			constructor(storage, limit = 200, warn = console.warn) {
				this.storage = storage;
				this.limit = limit;
				this.warn = warn;
				try {
					const current = storage?.getItem(HISTORY_KEY);
					const raw = current ?? storage?.getItem(LEGACY_HISTORY_KEY);
					if (!raw) return;
					if (raw.length > MAX_STORAGE_LENGTH) throw new Error("历史数据过大");
					const data = JSON.parse(raw);
					if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("历史格式无效");
					for (const [key, value] of Object.entries(data).slice(-20)) if (Array.isArray(value)) this.scopes.set(key, value.filter((item) => typeof item === "string" && item.length <= 8e3).slice(-limit));
					if (current === null || current === void 0) storage?.setItem(HISTORY_KEY, JSON.stringify(Object.fromEntries(this.scopes)));
				} catch {
					warn("输入历史读取失败，本次使用内存历史。");
				}
			}
			list(scope) {
				return this.scopes.get(scope) ?? [];
			}
			add(scope, text) {
				if (!text.trim() || text.length > 8e3) return;
				const previous = this.scopes.get(scope) ?? [];
				if (previous.at(-1) === text) return;
				this.scopes.delete(scope);
				this.scopes.set(scope, [...previous, text].slice(-this.limit));
				while (this.scopes.size > 20) this.scopes.delete(this.scopes.keys().next().value);
				let serialized = JSON.stringify(Object.fromEntries(this.scopes));
				while (serialized.length > MAX_STORAGE_LENGTH && this.scopes.size) {
					const oldest = this.scopes.keys().next().value;
					const entries = this.scopes.get(oldest);
					entries.shift();
					if (!entries.length) this.scopes.delete(oldest);
					serialized = JSON.stringify(Object.fromEntries(this.scopes));
				}
				try {
					this.storage?.setItem(HISTORY_KEY, serialized);
				} catch {
					this.warn("输入历史无法保存到浏览器，本次仍可使用。");
				}
			}
		};
		/** 从空输入进入，编辑历史即退出，避免覆盖用户的新草稿。 */
		var HistoryCursor = class {
			index;
			original = "";
			displayed = "";
			entries = [];
			reset() {
				this.index = void 0;
				this.entries = [];
			}
			move(direction, draft, entries) {
				if (this.index !== void 0 && draft !== this.displayed) this.reset();
				if (this.index === void 0) {
					if (direction !== -1 || draft !== "" || entries.length === 0) return void 0;
					this.original = draft;
					this.entries = [...entries];
					this.index = this.entries.length;
				}
				this.index = Math.max(0, Math.min(this.entries.length, this.index + direction));
				if (this.index === this.entries.length) {
					const restored = this.original;
					this.reset();
					return restored;
				}
				this.displayed = this.entries[this.index] ?? "";
				return this.displayed;
			}
		};
		//#endregion
		//#region src/client/draft-attachments.ts
		/** 统一旧版图片草稿与 0.1.5 的通用附件草稿，保护已有附件不被历史召回覆盖。 */
		function hasDraftAttachments(state) {
			return (state.attachmentIds?.length ?? 0) > 0 || (state.imageIds?.length ?? 0) > 0;
		}
		//#endregion
		//#region src/client/input-history-keyboard.ts
		/** 只处理当前输入框的历史按键，保持 IME、菜单和富内容的原有行为。 */
		function bindHistoryKeys(editor, adapter) {
			const cursor = new HistoryCursor();
			let composing = false;
			let writingHistory = false;
			const begin = () => {
				composing = true;
			};
			const end = () => {
				composing = false;
			};
			const changed = () => {
				if (!writingHistory) cursor.reset();
			};
			const keydown = (event) => {
				if (event.target !== editor && !editor.contains(event.target)) return;
				if (event.defaultPrevented || composing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || adapter.blocked()) return;
				if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
				const draft = adapter.draft();
				if (draft !== "" && !atHistoryBoundary(editor)) return;
				const next = cursor.move(event.key === "ArrowUp" ? -1 : 1, draft, adapter.entries());
				if (next === void 0) return;
				event.preventDefault();
				event.stopImmediatePropagation();
				writingHistory = true;
				try {
					adapter.setDraft(next);
				} finally {
					writingHistory = false;
				}
			};
			editor.addEventListener("compositionstart", begin);
			editor.addEventListener("compositionend", end);
			editor.addEventListener("input", changed);
			editor.addEventListener("keydown", keydown, true);
			return () => {
				editor.removeEventListener("compositionstart", begin);
				editor.removeEventListener("compositionend", end);
				editor.removeEventListener("input", changed);
				editor.removeEventListener("keydown", keydown, true);
			};
		}
		/** 召回文本中间或存在选区时，保留宿主编辑器的垂直光标移动。 */
		function atHistoryBoundary(editor) {
			if (editor instanceof HTMLTextAreaElement) return editor.selectionStart === editor.selectionEnd && (editor.selectionStart === 0 || editor.selectionEnd === editor.value.length);
			const selection = editor.ownerDocument.getSelection();
			if (!selection?.isCollapsed || !selection.rangeCount || !editor.contains(selection.anchorNode)) return false;
			const caret = selection.getRangeAt(0);
			const before = editor.ownerDocument.createRange();
			before.selectNodeContents(editor);
			before.setEnd(caret.startContainer, caret.startOffset);
			const after = editor.ownerDocument.createRange();
			after.selectNodeContents(editor);
			after.setStart(caret.endContainer, caret.endOffset);
			return before.toString() === "" || after.toString() === "";
		}
		/** 从本 slot 向上寻找唯一输入框，避免绑定侧栏、搜索或其他会话。 */
		function findComposer(anchor) {
			let parent = anchor.parentElement;
			while (parent && parent !== document.body) {
				const editors = parent.querySelectorAll("textarea:not([disabled]), [data-lexical-editor=\"true\"][contenteditable=\"true\"]");
				if (editors.length === 1) return editors[0];
				if (editors.length > 1) return void 0;
				parent = parent.parentElement;
			}
		}
		//#endregion
		//#region src/client/InputHistoryDock.tsx
		function InputHistoryHint({ t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `
    [data-composer-card] [data-input-scroll]{container:dcu-composer-input / inline-size}
    [data-composer-card] [data-composer-placeholder]{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
    [data-composer-card] [data-composer-placeholder]::after{
      content:${JSON.stringify(t("input.historyHint"))};
      color:var(--dsw-alias-label-caption);font-size:var(--dsw-font-size-sm);line-height:18px;
      white-space:nowrap;flex:0 0 auto;margin-right:8px;
    }
    @container dcu-composer-input (max-width:560px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
    @media(max-width:640px){
      [data-composer-card] [data-composer-placeholder]::after{display:none}
    }
  ` });
		}
		/** 隐形输入扩展：使用宿主状态和编辑动作，不替换编辑器或创建旁问界面。 */
		function InputHistoryDock({ ctx, sessionId, history, seen }) {
			const anchor = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const binding = ctx.sessions.binding(sessionId);
				if (binding === void 0) return;
				const scope = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd ?? sessionId;
				const input = ctx.conversation.input.for(binding.ctx);
				const menu = ctx.inputTriggers.sessionOf(binding.ctx).menu;
				seen.set(binding, binding.eventSource.getSnapshot().revision);
				const collect = () => {
					const snapshot = binding.eventSource.getSnapshot();
					if (snapshot.change.kind !== "replace" && snapshot.revision <= (seen.get(binding) ?? -1)) return;
					seen.set(binding, snapshot.revision);
					if (snapshot.change.kind !== "append") return;
					for (const entry of snapshot.change.entries) {
						if (entry.event.type !== "user/message" || entry.event.data.source?.kind !== "user") continue;
						const text = entry.event.data.content.filter((block) => block.type === "text").map((block) => block.text).join("");
						history.add(scope, text);
					}
				};
				const offEvents = binding.eventSource.subscribe(collect);
				let previous = input.state.getSnapshot();
				const offInput = input.state.subscribe(() => {
					const next = input.state.getSnapshot();
					if (previous.phase === "submitting" && next.phase === "plain" && next.draft === "" && !hasDraftAttachments(previous) && previous.occurrences.length === 0) history.add(scope, previous.draft);
					previous = next;
				});
				let editor;
				let offKeys = () => {};
				const connect = () => {
					const next = anchor.current === null ? void 0 : findComposer(anchor.current);
					if (next === editor) return;
					offKeys();
					editor = next;
					if (editor === void 0) return;
					offKeys = bindHistoryKeys(editor, {
						draft: () => input.state.getSnapshot().draft,
						entries: () => history.list(scope),
						setDraft: (text) => input.setDraft(text),
						blocked: () => {
							const state = input.state.getSnapshot();
							return state.phase === "adjudicating" || state.phase === "submitting" || hasDraftAttachments(state) || state.occurrences.length > 0 || menu.getSnapshot().open;
						}
					});
				};
				connect();
				const parent = anchor.current?.parentElement?.parentElement;
				const observer = new MutationObserver(connect);
				if (parent !== null && parent !== void 0) observer.observe(parent, {
					childList: true,
					subtree: true
				});
				return () => {
					observer.disconnect();
					offKeys();
					offInput();
					offEvents();
				};
			}, [
				ctx,
				sessionId,
				history,
				seen
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				ref: anchor,
				hidden: true
			});
		}
		function registerInputHistory(ctx) {
			let storage;
			try {
				storage = window.localStorage;
			} catch {
				console.warn("[dsh-zcode-ui] 浏览器存储不可用，使用内存输入历史。");
			}
			const history = new InputHistory(storage);
			const seen = /* @__PURE__ */ new WeakMap();
			function Dock(props) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputHistoryDock, {
					ctx,
					sessionId: props.session.sessionId,
					history,
					seen
				});
			}
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "codex-ui-input-history",
				order: -100
			}, Dock));
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "codex-ui-input-history-hint",
				order: -100,
				locale: NS
			}, InputHistoryHint));
		}
		//#endregion
		//#region src/client/new-conversation-draft.ts
		/** 跟随当前会话的原草稿状态，覆盖输入、粘贴、历史召回和任务预填。 */
		function createDraftPresenceSource(selection, resolve) {
			return {
				getSnapshot: () => (resolve()?.getSnapshot().draft.length ?? 0) > 0,
				subscribe: (listener) => {
					let current;
					let offInput = () => {};
					const bind = () => {
						const next = resolve();
						if (next !== current) {
							offInput();
							current = next;
							offInput = next?.subscribe(listener) ?? (() => {});
						}
						listener();
					};
					const offSelection = selection.subscribe(bind);
					bind();
					return () => {
						offSelection();
						offInput();
					};
				}
			};
		}
		/** 任务建议只能填入空闲且空白的草稿，不覆盖附件、提及或正在提交的内容。 */
		function prefillNewConversation(input, text) {
			if (input === void 0) return "workspace";
			const state = input.state.getSnapshot();
			if (state.phase !== "plain") return "busy";
			if (state.draft.trim() !== "" || hasDraftAttachments(state) || state.occurrences.length > 0) return "draft";
			input.setDraft(text);
			return "ready";
		}
		//#endregion
		//#region src/client/composer-visuals.ts
		/**
		* 输入区两处静态视觉修正（与 ZCode 对齐）。
		*
		* 1. **左下角加号**：宿主 `.yhfFVG_add` 的静止态底色是
		*    `--dsw-specific-selector`（一个常驻的灰色圆），看起来像一圈永远亮着的阴影。
		*    ZCode 只在指针悬停 / 键盘聚焦时才给圆形底，静止态保持裸图标。
		*    宿主本身已有 `:hover:not(:disabled)` 的语义令牌底色，这里只把静止态清零，
		*    并把 hover 的令牌重新声明一次（覆盖宿主的选择器特异性）。
		*
		* 2. **回到底部按钮**：宿主 `.icaHSq_toBottomSlot` 用 `justify-content:flex-end`
		*    把 34px 的圆形按钮贴在会话区右缘；ZCode 里它居中。这里只改对齐方式，
		*    按钮尺寸、sticky 的 `bottom` 偏移与点击行为都不动。
		*
		* 两处都只写属性、不加节点，不改变宿主任何行为。
		*/
		const COMPOSER_VISUALS_STYLE_ID = "dcu-composer-visuals-style";
		const COMPOSER_VISUALS_CSS = `
/* 加号：静止态不画圆；悬停/键盘聚焦时才出现圆形底。 */
[data-conversation-scroll] [data-composer-card] button[class*="_add"]{
  transition:background-color var(--dcu-motion-feedback-duration,120ms) var(--dcu-motion-feedback-ease,ease-out);
}
[data-conversation-scroll] [data-composer-card] button[class*="_add"]:not(:hover):not(:focus-visible){
  background:transparent;
}
[data-conversation-scroll] [data-composer-card] button[class*="_add"]:hover:not(:disabled),
[data-conversation-scroll] [data-composer-card] button[class*="_add"]:focus-visible{
  background:var(--dsw-alias-interactive-bg-hover-solid);
}

/* 回到底部：宿主靠右（flex-end），改为会话区居中。
   宿主还给这个槽留了 195px 右内边距（给右侧面板/滚动条预留），
   只在内容盒里居中会偏左 ~97px；这里把内边距一并清零，按整个会话区居中。 */
[data-conversation-scroll] [class*="_toBottomSlot"]{
  justify-content:center;
  padding-right:0;
}
`;
		/** 安装样式；返回卸载函数。幂等（同 id 的 style 只会有一份）。 */
		function installComposerVisuals() {
			if (typeof document === "undefined") return () => {};
			if (document.getElementById("dcu-composer-visuals-style") !== null) return () => {};
			const style = document.createElement("style");
			style.id = COMPOSER_VISUALS_STYLE_ID;
			style.textContent = COMPOSER_VISUALS_CSS;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		const CONVERSATION_LAYOUT_STYLE = `
/* ── X1 会话区禁止横向滚动（2026-10-28）────────────────────────────
   ZCode 的会话滚动容器显式设置 overflow-x-hidden（纵向 auto）——横向永不出滚动条；
   需要横滚的内容自己滚：代码块 pre 与表格 _tableScroll 各自带 overflow-x:auto（已实测）。
   DSH 宿主是 overflow-x:auto，任何一次内容变宽（宽表格/长 URL/临时态）都会在会话底部
   冒出横向滚动条——与 ZCode 不符，且与「会话只需上下滚」的直觉冲突。 */
[data-conversation-scroll]{overflow-x:hidden}

/* ── C1 内容列宽 640 → 924 ──────────────────────────────────────────
   宿主用 .icaHSq_column{max-width:640px} 限宽，宽度由 max-width 决定、
   两侧留白是 margin auto 的结果。所以这里改 max-width，不动 margin。
   特异性 0,2,0（[data-conversation-scroll] + 类）已高于宿主的单类 0,1,0。 */
[data-conversation-scroll] .icaHSq_column{max-width:784px}

/* ── C2 轮组间距 6px → 20px ───────────────────────────────────────
   ⚠ 三次尝试的血泪史（2026-10-27）：
   ① 第一版用 [data-conversation-scroll] .icaHSq_flowItem:has(...)：规则进了样式表、
      querySelectorAll 也能匹配，但**计算值仍是 6px** —— 特异性输给宿主。
   ② 第二版照抄宿主的直接子代组合符：仍然输。因为宿主真实选择器是
        :is(.icaHSq_column,[data-slot=...]) > :not([hidden]):not(...) ~ :not([hidden]):not(...)
      用的是兄弟组合符（波浪号）+ 4 个 :not()，特异性(0,5,x)远高于我的。
   ③ 最终方案：**用宿主提供的变量入口**。它的 margin-top 走
        var(--dsh-chat-flow-gap, 6px)
      而这个变量在全站从未定义（实测 computed 为空），所以一直在吃回退值 6px。
      我们只需在 column 上定义它 —— 这是宿主自己留的口子，不需要比特异性。
      实测：设 20px 后，4 条用户轮全部变 20px；原本走别的规则的 16/0/12 不受影响。
   注意：变量会作用于**所有**走该 var 的 flowItem（实测 13 条），
   所以额外保留一条「非用户轮清零」规则，把轮组内部行压回 0 —— 那条仍会和宿主抢，
   但因为它只影响「非首行」且宿主兄弟规则对首行不生效，实测可让轮组内间距归零。 */
[data-conversation-scroll] .icaHSq_column{--dsh-chat-flow-gap:20px}
[data-conversation-scroll] .icaHSq_column > .icaHSq_flowItem:not(:has(.IzP3Va_userRow)){margin-top:0}

/* ── C3 正文行高 22 → 24.5 ─────────────────────────────────────────
   只作用于消息正文段落。限定在 .icaHSq_column 内，不污染侧栏与设置页。
   行高用 24.5px 而非倍数：ZCode 实测就是 24.5px 定值。 */
[data-conversation-scroll] .icaHSq_column p{line-height:24.5px}

/* ── C4 代码字体 11/19 → 12/21 ─────────────────────────────────────
   ZCode 等宽实测 12px / 21px（03c 矩阵 B3/D2）。DSH 宿主是 11px / 19px。
   21/12 = 1.75，与正文 24.5/14 = 1.75 同比例 —— 不是随手取整。
   同时覆盖 pre 与其中的 code：宿主把 font-size 写在 pre 上、code 继承，
   但 code 有自己的 computed 值，两处都写才稳。 */
[data-conversation-scroll] .icaHSq_column pre,
[data-conversation-scroll] .icaHSq_column pre code{
  /* 用令牌而不是字面 12px（项目规定界面字号必须走 --dsw-font-size-*）。
     --dsw-font-size-sm = calc(14px - 2px) = 12px，正好命中 ZCode 的等宽字号。
     行高 21px 与 12px 的比值 = 1.75，与正文 24.5/14 同比例。 */
  font-size:var(--dsw-font-size-sm,12px);
  line-height:21px;
}

/* 复制钮颜色对齐 ZCode 的「30% 系」。
   宿主现在是 rgba(212,212,212,.5)（50% 前景）；ZCode 工具/代码的次要元素用 30% 边框色。
   用 --dsw-alias-label-dimmed（= 前景 30%）而不是写死 rgba：
   它随主题翻转，符合「中性色不用死值」的设计逻辑。 */
[data-conversation-scroll] .icaHSq_column .ppByMG_action{
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
}

/* ── G17 用户轮 = 右侧气泡（2026-10-28 二次实测，推翻上一轮的「扁平化」）──
   ⚠ 上一轮把用户轮改成透明全宽左对齐是**错的**：那套规格是 ZCode 的 assistant 行，
   不是 user 行。ZCode 活页  .history-message > .group/user-row （CDP 实测，2026-10-28）：
     容器   display:flex / flex-direction:column / align-items:flex-end（右对齐）
     气泡   [data-v4-user-input-bubble]
              bg       --color-surface → 深色 #ffffff0d（白 5%）/ 浅色 #0d0d0d08（黑 3%）
              border   1px solid --color-border（10% 前景：#ffffff1a / #0d0d0d1a）
              radius   12px 2px 12px 12px（rounded-xl + rounded-tr-xs，右上 2px 是「尾巴」角）
              padding  12px 16px（px-4 py-3）
              max-w    576px（@min-[624px]/conversation:max-w-xl）
              文字     14px / 21px（text-ui-base，1.5 倍），white-space:pre-wrap
     动作行   气泡下方、右对齐，间距 4px（mt-1），默认 opacity:0、hover/focus 才现
   宿主默认已接近（右对齐 / radius 12 / pad 10px 16px / lh 22px），只差：
     无边框、无尾巴角、限宽 550.4（=784×0.702）、内边距少 2px、行高多 1px。
   气泡底色读宿主令牌 --dsw-specific-bubble，值已在 zcode-tokens.ts 换成 ZCode surface。 */
[data-conversation-scroll] .icaHSq_column .IzP3Va_userRow,
[data-conversation-scroll] .icaHSq_column .IzP3Va_userStack{align-items:flex-end}
[data-conversation-scroll] .icaHSq_column .IzP3Va_userRow{gap:4px}
[data-conversation-scroll] .icaHSq_column .IzP3Va_userStack{max-width:576px}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble{
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  /* 右上角 2px = ZCode 的 rounded-tr-xs（气泡「尾巴」），其余 12px = rounded-xl */
  border-radius:var(--dsw-radius-xl) var(--dsw-radius-xs) var(--dsw-radius-xl) var(--dsw-radius-xl);
  padding:12px 16px;
  /* 21px = ZCode text-ui-base 的 1.5 倍行高；+ delta 保住宿主正文字号缩放 */
  line-height:calc(21px + var(--dsh-content-font-delta,0px));
}

/* ── G18 用户气泡长文本折叠（2026-10-28，ZCode asar + 9224 实测）──────
   ZCode 真实参数：内容 max-height 120（溢出阈 121）；展开 max(scrollHeight,120)；
   过渡走 move 档令牌（300ms / 0,0,.2,1）；溢出未展开时内容底部 30% 渐隐；
   reduced-motion 由主题令牌层统一归零，这里不单独写 transition:none。
   宿主根节点是 display:contents，没有盒子可限高 —— 这里只把它换成块盒（纯属性），
   inline max-height / 折叠钮 / data 状态由 user-bubble-collapse.ts 维护。
   位置（DSH 适配）：宿生气泡内自带常驻动作行（28px，图标左对齐）。折叠态把钮放在
   该行右侧空位，避免像 ZCode 那样压在渐隐的正文上（实测三种压字位置都会挡字）；
   展开态独占一行居中。ZCode 无此动作行，故此项与 ZCode 有意不同。 */
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble{position:relative}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble > :first-child{display:block}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble[data-dcu-bubble-overflow] > :first-child{
  overflow:hidden;
  transition:max-height var(--dcu-motion-move-duration) var(--dcu-motion-move-ease);
}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble[data-dcu-bubble-overflow][data-dcu-bubble-state="collapsed"] > :first-child{
  -webkit-mask-image:linear-gradient(to bottom,black 0%,black 70%,transparent 100%);
  mask-image:linear-gradient(to bottom,black 0%,black 70%,transparent 100%);
}
.dcu-bubble-toggle{
  display:inline-flex;align-items:center;justify-content:center;
  width:40px;height:32px;padding:0;
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  border-radius:var(--dsw-radius-full,999px);
  background:var(--dsw-alias-bg-base,#161616);
  color:var(--dsw-alias-label-secondary,rgba(212,212,212,.6));
  box-shadow:var(--dsw-shadow-lv1,0 1px 2px 0 rgba(0,0,0,.05));
  backdrop-filter:blur(4px);
  cursor:pointer;
  z-index:1;
  transition:color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease);
}
.dcu-bubble-toggle:hover{color:var(--dsw-alias-label-primary,#d4d4d4)}
.dcu-bubble-toggle svg{display:block;transition:transform var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
[data-dcu-bubble-state="expanded"] > .dcu-bubble-toggle{display:flex;position:static;margin:8px auto 0}
[data-dcu-bubble-state="collapsed"] > .dcu-bubble-toggle{position:absolute;left:50%;bottom:8px;transform:translateX(-50%)}
[data-dcu-bubble-state="expanded"] > .dcu-bubble-toggle svg{transform:rotate(180deg)}

/* ── D1 围栏代码块（2026-10-28，ZCode asar 静态提取定案）────────────
   ZCode 聊天码卡解剖（MessageResponse → ob/rb + streamdown code-block-body）：
     外层   my-4 + border border-border + bg-card —— 无圆角、1px --color-border、--color-card
     头部   无独立底色条（rb: pl-3 pr-2 pt-2，语言名 lowercase mono，与卡同底）
     码体   rounded-md + border border-border，底/字 = shiki 主题 editor.bg/fg
            （默认 github-dark #24292e/#e1e4e8、github-light #ffffff/#24292e），内边距 8/8/0/12
     行内码 rounded-md + bg-markdown-inline-code/50 + px-1.5 py-0.5，无边框
   DSH 现状（CDP 实测）：卡 #202020/radius 8/无边框；banner #161616 独立条；
     pre 透明 pad 6/22/20；行内码 #2b2b2b 实底 + 0.5px 边 + radius 4。
   宿主消费 --dsw-alias-markdown-code-block/-inline-code（底色不动，令牌值已在
   zcode-tokens.ts 改齐）；这里只补结构差：边框/圆角/条带/码体/内边距。 */
[data-conversation-scroll] .md-code-block{
  border:1px solid var(--dsw-alias-border-l2);
  border-radius:0;
  background:var(--dsw-alias-markdown-code-block);
}
[data-conversation-scroll] .md-code-block [class*="_bannerWrap"]{
  background:transparent;
  border-radius:0;
  padding:8px 8px 8px 12px;
}
[data-conversation-scroll] .md-code-block pre{
  /* shiki 会给部分 pre 盖内联 style（var(--shiki-background/foreground)），
     内联优先级高于本规则——在这里重定义这两个变量，让内联引用也落到 ZCode 值上。 */
  --shiki-background:var(--dsw-alias-markdown-code-editor-bg);
  --shiki-foreground:var(--dsw-alias-markdown-code-editor-fg);
  background:var(--dsw-alias-markdown-code-editor-bg);
  color:var(--dsw-alias-markdown-code-editor-fg);
  border:1px solid var(--dsw-alias-border-l2);
  border-radius:var(--dsw-radius-md);
  padding:6px 8px 12px;
}
[data-conversation-scroll] .icaHSq_column :not(pre) > code{
  background:var(--dsw-alias-markdown-inline-code);
  border:0;
  border-radius:var(--dsw-radius-md);
  padding:2px 6px;
  font-size:var(--dsw-font-size-sm,12px);
}

/* ── T1 排版节奏（2026-10-28，用户反馈「像毛坯房」；ZCode 真值逐项对齐）──
   ZCode 的「工整感」来自四件事，缺一项就散：
     ① 字距 tracking-wide 0.025em（14px→0.35px，实测）；
     ② 标题克制：h1 18 / h2 16 / h3~h6 全部 14px（=正文字号，靠字重分层），
        semibold(600)，上下 24/16（源码 zMt 映射 + 实测 h2 16px/28px mt24 mb16）；
     ③ 列表有呼吸：ul/ol 上下 12（my-3）、左缩进 20（pl-5）、项间距 6（space-y-1.5）、
        li 左内衬 4（pl-1）、marker 30% 前景（foreground-subtlest）；
     ④ 列表内 p 归零且行内（[&>p]:my-0 inline），避免 p 的 mb-16 把列表撑散。
   DSH 现状（实测）：字距 normal、h2 19px/700 mt0、h3 18px/700 mt32、li 项间距 0 且无内衬
   —— 字号大 3~4px + 权重高 100 + 标题顶距 0 + 列表挤成一片，四因叠加=「毛坯」。 */

/* ① 字距：只作用于会话列；pre/code/kbd 显式归零（等宽代码加字距会破坏对齐，见预检 🐯1）。 */
/* ZCode 实测 0.35px（@14px 的 0.025em）；但 em 会随子元素字号放大（16px 标题变 0.4px），
   而 ZCode 的 tracking-wide 同样按 em 走——实测其 16px 标题也是 0.4px，故保留 em 形态，
   仅把「正文 14px」这一档钉成绝对值 0.35px 以对齐实测。 */
[data-conversation-scroll] .icaHSq_column{letter-spacing:0.025em}
[data-conversation-scroll] .icaHSq_column p{letter-spacing:0.35px}
[data-conversation-scroll] .icaHSq_column pre,
[data-conversation-scroll] .icaHSq_column code,
[data-conversation-scroll] .icaHSq_column kbd{letter-spacing:normal}

/* ② 标题层级：h3 起与正文同字号，克制靠字重。 */
[data-conversation-scroll] .icaHSq_column h1{font-size:var(--dsw-font-size-xl,18px);line-height:31.5px;font-weight:600;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h2{font-size:var(--dsw-font-size-lg,16px);line-height:28px;font-weight:600;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h3,
[data-conversation-scroll] .icaHSq_column h4{font-size:var(--dsw-font-size-base,14px);line-height:24.5px;font-weight:600;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h5{font-size:var(--dsw-font-size-base,14px);line-height:24.5px;font-weight:500;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h6{font-size:var(--dsw-font-size-base,14px);line-height:24.5px;font-weight:400;margin:24px 0 16px}

/* ③ 列表节奏 */
[data-conversation-scroll] .icaHSq_column ul,
[data-conversation-scroll] .icaHSq_column ol{margin:12px 0;padding-left:20px}
[data-conversation-scroll] .icaHSq_column li{padding-left:4px;line-height:24.5px}
[data-conversation-scroll] .icaHSq_column li + li{margin-top:6px}
[data-conversation-scroll] .icaHSq_column li::marker{color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3))}
[data-conversation-scroll] .icaHSq_column ul ul,
[data-conversation-scroll] .icaHSq_column ul ol,
[data-conversation-scroll] .icaHSq_column ol ul,
[data-conversation-scroll] .icaHSq_column ol ol{margin:6px 0}

/* ④ 列表内段落归零 */
[data-conversation-scroll] .icaHSq_column li > p{margin:0;display:inline}

/* ⑤ 分隔线与尾行（2026-10-28 实测对照）：
   ZCode 全文档 0 个可见 hr——章节之间只靠留白与标题分层（实测 hrs=0）；
   DSH 的 markdown 分隔线渲染成 1px 10% 白线 + 上下 32px，等于给文档画格子，是「毛坯感」主因之一。
   这里保留 32px 间距、抹掉线条本身。
   尾行口径：ZCode 时间戳 = 12px / 前景 30%（text-ui-sm text-foreground-subtlest）；
   DSH 现为 13px/12px、50%——统一到 12px/30%。 */
[data-conversation-scroll] .icaHSq_column hr{
  border:0;
  height:0;
  background:transparent;
  margin:24px 0;
}
[data-conversation-scroll] .icaHSq_column .ppByMG_timeStart,
[data-conversation-scroll] .icaHSq_column .ppByMG_timeEnd{
  font-size:var(--dsw-font-size-sm,12px);
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
}
[data-conversation-scroll] .icaHSq_column .cm-note summary,
[data-conversation-scroll] .icaHSq_column .IzP3Va_retryRow summary{
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
}

/* ⑥ 工具行弱化（2026-10-28 实测对照）：
   ZCode「已运行命令 / 思考 · 持续了 N 秒」= 14px / lh21 / 前景 30% / 字重 500；
   DSH 现为 14px / 50% / 400 —— 偏亮偏细，读起来像正文的碎片。
   用宿主自带的稳定锚点 data-process-activity（按钮上，非哈希类名）。 */
[data-conversation-scroll] [data-process-activity]{
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
  font-weight:500;
}
/* 内层 label 自带 50% 声明，需显式继承外层 30%。 */
[data-conversation-scroll] [data-process-activity] *{color:inherit}

/* ── ⑦ 表格 / 引用块 / 图片（2026-10-28，双端实测 + ZCode 自带 CSS 原文）──
   ZCode 表格（9224 活体，浅色）：table 14px/24.5；th、td 都是 px-3 py-2 = 8px 12px，
   各自带 border-b（1px --color-border）；th 用 foreground-subtlest(40% 浅/30% 深)+400 字重，
   td 用全文前景。DSH 现状：13px/22、padding 10px 16px 10px 0（左侧无留白）、0 边框、表头与正文同色
   —— 于是表格和正文糊成一片，也没有横向引导。
   ZCode 引用块取自其自带 prose CSS 原文：
     border-inline-start-width:.25rem（4px）、padding-inline-start:1em（14px）、
     margin-block 1.6em（22px）、font-style:italic、font-weight:500，边框色 = 10% 前景。
   ZCode 内容图 = rounded-xl + border border-border + bg-background + object-contain + shadow-2xl
   （asar 类名原文）；这里先落到用户附件的缩略图（会话区唯一会出现的 img 路径），
   阴影暂不加——原证据来自正文插图，缩略图未单独采过，避免把重阴影套到小图上。 */
[data-conversation-scroll] .icaHSq_column table{
  border-collapse:separate;
  border-spacing:0;
  font-size:var(--dsh-content-font-size,14px);
  line-height:calc(24.5px + var(--dsh-content-font-delta,0px));
}
[data-conversation-scroll] .icaHSq_column th,
[data-conversation-scroll] .icaHSq_column td{
  padding:8px 12px;
  border:0;
  border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  font-size:var(--dsh-content-font-size,14px);
  line-height:calc(24.5px + var(--dsh-content-font-delta,0px));
  vertical-align:top;
}
[data-conversation-scroll] .icaHSq_column th{
  font-weight:400;
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
}
[data-conversation-scroll] .icaHSq_column td{color:var(--dsw-alias-label-primary)}
[data-conversation-scroll] .icaHSq_column blockquote{
  /* 1.6em 是 ZCode 自带 prose CSS 的原值（14px 下 = 22.4px）；写 em 而非 px，
     既忠于原式又随字号缩放，不占 4px 标度的字面量额度。 */
  margin:1.6em 0;
  padding:0 0 0 14px;
  border:0;
  border-left:4px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  font-style:italic;
  font-weight:500;
}
[data-conversation-scroll] .icaHSq_column .IzP3Va_attachmentRow img{
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  border-radius:var(--dsw-radius-xl);
}
`;
		const STYLE_ID$1 = "dcu-conversation-layout";
		/** 安装会话区布局样式；返回卸载函数。幂等（同 id 只保留一份）。 */
		function installConversationLayout() {
			if (typeof document === "undefined") return () => {};
			if (document.getElementById(STYLE_ID$1) !== null) return () => {};
			const style = document.createElement("style");
			style.id = STYLE_ID$1;
			style.textContent = CONVERSATION_LAYOUT_STYLE;
			document.head.appendChild(style);
			return () => {
				style.remove();
			};
		}
		//#endregion
		//#region src/client/user-bubble-collapse.ts
		/**
		* G18 用户气泡长文本折叠 —— 对齐 ZCode（asar 静态提取 + 9224 活页实测，2026-10-28）。
		*
		* ZCode 真实参数（MessageResponse 的 O4t 组件）：
		*   折叠高度 120px；溢出判定 scrollHeight > 120 + 1；
		*   展开高度 max(scrollHeight, 120)px；过渡走 move 档令牌（300ms / 0,0,.2,1）；
		*   溢出且未展开时内容底部渐隐（mask 70% → 100%）；prefers-reduced-motion 关闭过渡；
		*   展开钮仅在溢出时出现，aria-expanded / aria-label=展开|收起，图标 16px；
		*   正文变化后回到折叠态。
		*
		* 宿主结构（9223 实测 9/9 一致）：
		*   .IzP3Va_userStack > .IzP3Va_bubble > span.B0oWoG_root(display:contents) > 正文
		* 根节点是 display:contents，没有盒子可限高 —— 由 conversation-layout 的 CSS 把它
		* 变成块盒（只改属性）。本模块只写 inline max-height、注入一个按钮、维护
		* data-dcu-bubble-* 状态；不隐藏、不搬移、不拆分宿主任何节点。
		*
		* 历史教训：旧版「用户卡片 + 长文本展开」因改写气泡结构、且把 data 标记误打到
		* 应答尾部而被撤回（见 conversation-bubbles.ts 与 tests/conversation-bubbles.assert.ts）。
		* 因此这里只认 .IzP3Va_userStack 内的气泡，且不碰附件/引用节点。
		*/
		const BUBBLE_SELECTOR = "[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble";
		const USER_STACK_SELECTOR = ".IzP3Va_userStack";
		const TOGGLE_CLASS = "dcu-bubble-toggle";
		const OVERFLOW_ATTR = "data-dcu-bubble-overflow";
		const STATE_ATTR = "data-dcu-bubble-state";
		/** ZCode 折叠高度（内容区，不含气泡 padding）。 */
		const COLLAPSED_PX = 120;
		const CHEVRON = "<svg viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 6.5 8 10l4-3.5\"/></svg>";
		const states = /* @__PURE__ */ new WeakMap();
		function toggleLabel(expanded) {
			const zh = (document.documentElement.lang || navigator.language || "zh").toLowerCase().startsWith("zh");
			if (expanded) return zh ? "收起" : "Collapse";
			return zh ? "展开" : "Expand";
		}
		function findToggle(bubble) {
			for (const child of bubble.children) if (child instanceof HTMLButtonElement && child.classList.contains(TOGGLE_CLASS)) return child;
			return null;
		}
		function ensureToggle(bubble) {
			const existing = findToggle(bubble);
			if (existing !== null) return existing;
			const button = document.createElement("button");
			button.type = "button";
			button.className = TOGGLE_CLASS;
			button.innerHTML = CHEVRON;
			button.addEventListener("click", () => {
				const state = states.get(bubble);
				if (state === void 0) return;
				state.expanded = !state.expanded;
				apply$1(bubble, state);
			});
			bubble.append(button);
			return button;
		}
		function contentOf(bubble) {
			for (const child of bubble.children) {
				if (child.classList.contains(TOGGLE_CLASS)) continue;
				return child instanceof HTMLElement ? child : null;
			}
			return null;
		}
		function apply$1(bubble, state) {
			const content = contentOf(bubble);
			if (content === null) return;
			const fullHeight = content.scrollHeight;
			if (!(fullHeight > 121)) {
				content.style.maxHeight = "";
				bubble.removeAttribute(OVERFLOW_ATTR);
				bubble.removeAttribute(STATE_ATTR);
				findToggle(bubble)?.remove();
				state.expanded = false;
				return;
			}
			const collapsed = !state.expanded;
			bubble.setAttribute(OVERFLOW_ATTR, "");
			bubble.setAttribute(STATE_ATTR, collapsed ? "collapsed" : "expanded");
			content.style.maxHeight = `${collapsed ? COLLAPSED_PX : Math.max(fullHeight, COLLAPSED_PX)}px`;
			const button = ensureToggle(bubble);
			button.setAttribute("aria-expanded", String(state.expanded));
			button.setAttribute("aria-label", toggleLabel(state.expanded));
			button.title = toggleLabel(state.expanded);
		}
		/**
		* 同步单个气泡的折叠状态。只处理用户轮（.IzP3Va_userStack 内），
		* 避免旧版那样把应答尾部误判成用户提问。
		*/
		function syncUserBubble(bubble) {
			if (bubble.closest(USER_STACK_SELECTOR) === null) return;
			const content = contentOf(bubble);
			if (content === null) return;
			const text = content.textContent ?? "";
			let state = states.get(bubble);
			if (state === void 0) {
				state = {
					text,
					expanded: false
				};
				states.set(bubble, state);
			} else if (state.text !== text) {
				state.text = text;
				state.expanded = false;
			}
			apply$1(bubble, state);
		}
		function cleanup() {
			for (const bubble of document.querySelectorAll(BUBBLE_SELECTOR)) {
				findToggle(bubble)?.remove();
				bubble.removeAttribute(OVERFLOW_ATTR);
				bubble.removeAttribute(STATE_ATTR);
				const content = contentOf(bubble);
				if (content !== null) content.style.maxHeight = "";
			}
		}
		/**
		* 安装折叠控制器：首次扫描 + MutationObserver（新增节点/正文变化）+ 窗口缩放重算。
		* 返回卸载函数，行为与 installConversationLayout 等模块一致。
		*/
		function installUserBubbleCollapse() {
			if (typeof document === "undefined" || typeof window === "undefined") return () => {};
			let frame = 0;
			let pending = /* @__PURE__ */ new Set();
			const flush = () => {
				frame = 0;
				const batch = pending;
				pending = /* @__PURE__ */ new Set();
				for (const bubble of batch) syncUserBubble(bubble);
			};
			const queue = (bubble) => {
				pending.add(bubble);
				if (frame === 0) frame = window.requestAnimationFrame(flush);
			};
			const queueFrom = (node) => {
				if (!(node instanceof HTMLElement)) return;
				const owner = node.closest(BUBBLE_SELECTOR);
				if (owner !== null) queue(owner);
				if (node.matches(BUBBLE_SELECTOR)) queue(node);
				for (const inner of node.querySelectorAll(BUBBLE_SELECTOR)) queue(inner);
			};
			const observer = new MutationObserver((records) => {
				for (const record of records) {
					if (record.type === "characterData") {
						const bubble = record.target.parentElement?.closest(BUBBLE_SELECTOR);
						if (bubble) queue(bubble);
						continue;
					}
					for (const node of record.addedNodes) queueFrom(node);
				}
			});
			observer.observe(document.body, {
				childList: true,
				characterData: true,
				subtree: true
			});
			const onResize = () => {
				for (const bubble of document.querySelectorAll(BUBBLE_SELECTOR)) queue(bubble);
			};
			window.addEventListener("resize", onResize);
			for (const bubble of document.querySelectorAll(BUBBLE_SELECTOR)) syncUserBubble(bubble);
			return () => {
				observer.disconnect();
				window.removeEventListener("resize", onResize);
				if (frame !== 0) window.cancelAnimationFrame(frame);
				frame = 0;
				pending = /* @__PURE__ */ new Set();
				cleanup();
			};
		}
		//#endregion
		//#region src/client/archive-session-delete.ts
		/** 永久删除会话由归档管理插件通过 remote.workspaceRegistry.deleteSession 提供。 */
		function hasArchiveSessionDelete(value) {
			return value !== null && typeof value === "object" && typeof value.deleteSession === "function";
		}
		//#endregion
		//#region src/client/zcode-tokens.ts
		/**
		* ZCode Zai Light 的语义色，按 DSH 令牌名归类。
		*
		* 取值口径：ZCode `--color-background` 等语义变量在 Zai Light 下的最终值。
		* 半透明值刻意保留 alpha 形式，因为 DSH 会把同一令牌叠在多种底色上。
		*/
		const ZCODE_LIGHT = {
			"--dsw-static-neutral-bluish-950": "#f8f8f8",
			"--dsw-static-neutral-bluish-875": "#f0f0f0",
			"--dsw-static-neutral-bluish-850": "#f0f0f0",
			"--dsw-static-neutral-bluish-800": "#e6e6e6",
			"--dsw-static-neutral-bluish-750": "#dcdcdc",
			"--dsw-static-neutral-bluish-700": "#cfcfcf",
			"--dsw-static-neutral-bluish-600": "#b8b8b8",
			"--dsw-static-neutral-bluish-500": "#8f8f8f",
			"--dsw-static-neutral-bluish-400": "#6b6b6b",
			"--dsw-static-neutral-bluish-300": "#545454",
			"--dsw-static-neutral-bluish-200": "#3a3a3a",
			"--dsw-static-neutral-bluish-150": "#f0f0f0",
			"--dsw-static-neutral-bluish-100": "#e6e6e6",
			"--dsw-static-neutral-bluish-75": "#f0f0f0",
			"--dsw-static-neutral-bluish-60": "#f0f0f0",
			"--dsw-static-neutral-bluish-50": "#f8f8f8",
			"--dsw-static-neutral-bluish-00": "#0d0d0d",
			"--dsw-static-neutral-bluish-1000": "#0d0d0d",
			"--dsw-alias-bg-base": "#f8f8f8",
			"--dsw-alias-bg-layer-1": "#ffffff",
			"--dsw-alias-bg-layer-2": "#ffffff",
			"--dsw-alias-bg-layer-3": "#ffffff",
			"--dsw-alias-bg-layer-4": "#f0f0f0",
			"--dsw-alias-bg-overlay": "#ffffff",
			"--dsw-alias-bg-module-platform": "#efefef",
			"--dsw-alias-bg-multi-select": "#f0f0f0",
			"--dsw-alias-bg-l1": "#ffffff",
			"--dsw-alias-bg-l2": "#ffffff",
			"--dsw-alias-background-secondary": "#ffffff",
			"--dsw-alias-bg-document-preview": "#f5f5f5",
			"--dsw-alias-bg-document-selection": "rgba(11, 127, 255, 0.4)",
			"--dsw-alias-bg-skeleton": "rgba(13, 13, 13, 0.04)",
			"--dsw-alias-bg-mask-1": "rgba(13, 13, 13, 0.24)",
			"--dsw-alias-bg-mask-2": "rgba(13, 13, 13, 0.12)",
			"--dsw-alias-bg-mask-3": "rgba(13, 13, 13, 0.48)",
			"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
			"--dsw-alias-bg-mask-drop": "rgba(255, 255, 255, 0.7)",
			"--dsw-alias-border-l1": "rgba(13, 13, 13, 0.06)",
			"--dsw-alias-border-l2": "rgba(13, 13, 13, 0.1)",
			"--dsw-alias-border-subtle": "rgba(13, 13, 13, 0.1)",
			"--dsw-alias-border-l2-darkmode-thin": "rgba(13, 13, 13, 0.1)",
			"--dsw-alias-border-l3": "rgba(13, 13, 13, 0.12)",
			"--dsw-alias-border-l4": "rgba(13, 13, 13, 0.16)",
			"--dsw-alias-border-inverted": "rgba(13, 13, 13, 0.06)",
			"--dsw-alias-border-inverted2": "rgba(13, 13, 13, 0.1)",
			"--dsw-alias-separator-primary": "rgba(13, 13, 13, 0.1)",
			"--dsw-alias-label-primary": "#262626",
			"--dsw-alias-label-primary-foreground": "#ffffff",
			"--dsw-alias-label-primary-inverted": "#ffffff",
			"--dsw-alias-label-primary-dimmed": "rgba(38, 38, 38, 0.6)",
			"--dsw-alias-label-primary-bluish": "#262626",
			"--dsw-alias-label-secondary": "rgba(38, 38, 38, 0.6)",
			"--dsw-alias-label-tertiary": "rgba(38, 38, 38, 0.5)",
			"--dsw-alias-label-caption": "rgba(38, 38, 38, 0.4)",
			"--dsw-alias-label-dimmed": "rgba(38, 38, 38, 0.4)",
			"--dsw-alias-label-quaternary": "rgba(38, 38, 38, 0.35)",
			"--dsw-alias-label-error": "#e03131",
			"--dsw-alias-label-shimmer": "rgba(13, 13, 13, 0.3)",
			"--dsw-alias-label-document-preview": "#5c5c5c",
			"--dsw-alias-menu-icon": "rgba(38, 38, 38, 0.6)",
			"--dsw-alias-brand-primary": "#000000",
			"--dsw-alias-brand-primary-invert": "#ffffff",
			"--dsw-alias-brand-text": "#000000",
			"--dsw-alias-brand-primary-new-colorprimary-new-color": "#000000",
			"--dsw-alias-state-business-primary": "#000000",
			"--dsw-alias-state-business-tertiary": "#f0f0f0",
			"--dsw-alias-button-primary-fill": "#000000",
			"--dsw-alias-button-primary-hover": "#262626",
			"--dsw-alias-button-primary-dimmed": "rgba(0, 0, 0, 0.08)",
			"--dsw-alias-button-contrast-fill": "#262626",
			"--dsw-alias-button-elevated-fill": "#ffffff",
			"--dsw-alias-button-floating-fill": "#ffffff",
			"--dsw-alias-button-floating-hover": "#f0f0f0",
			"--dsw-alias-button-ghost-active-fill": "#f0f0f0",
			"--dsw-alias-button-ghost-active-hover": "#e6e6e6",
			"--dsw-alias-button-ghost-active-border": "rgba(13, 13, 13, 0.15)",
			"--dsw-alias-button-info-fill": "#000000",
			"--dsw-alias-button-info-hover": "#262626",
			"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
			"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
			"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
			"--dsw-alias-interactive-bg-hover": "rgba(13, 13, 13, 0.05)",
			"--dsw-alias-interactive-bg-hover-solid": "#f0f0f0",
			"--dsw-alias-interactive-bg-active": "rgba(13, 13, 13, 0.08)",
			"--dsw-alias-interactive-bg-hover-accent": "rgba(11, 127, 255, 0.12)",
			"--dsw-alias-interactive-bg-hover-danger": "rgba(224, 49, 49, 0.05)",
			"--dsw-alias-fill-l1": "rgba(13, 13, 13, 0.03)",
			"--dsw-alias-fill-l2": "rgba(13, 13, 13, 0.05)",
			"--dsw-alias-fill-tertiary": "rgba(13, 13, 13, 0.05)",
			"--dsw-alias-fill-tsp-secondary": "rgba(13, 13, 13, 0.03)",
			"--dsw-static-green-500": "#1e8a3e",
			"--dsw-static-green-400": "#1e8a3e",
			"--dsw-static-green-100": "rgba(30, 138, 62, 0.12)",
			"--dsw-static-green-900": "rgba(30, 138, 62, 0.12)",
			"--dsw-static-green-500-a08": "rgba(30, 138, 62, 0.08)",
			"--dsw-static-green-500-a12": "rgba(30, 138, 62, 0.12)",
			"--dsw-static-red-600": "#e03131",
			"--dsw-static-red-500": "#e03131",
			"--dsw-static-red-400": "#e03131",
			"--dsw-static-red-100": "rgba(224, 49, 49, 0.12)",
			"--dsw-static-red-900": "rgba(224, 49, 49, 0.12)",
			"--dsw-static-red-400-a12": "rgba(224, 49, 49, 0.12)",
			"--dsw-static-red-600-a08": "rgba(224, 49, 49, 0.08)",
			"--dsw-static-amber-500": "#e07b00",
			"--dsw-static-amber-400": "#e07b00",
			"--dsw-static-amber-600": "#e07b00",
			"--dsw-static-amber-100": "rgba(224, 123, 0, 0.12)",
			"--dsw-static-amber-900": "rgba(224, 123, 0, 0.12)",
			"--dsw-alias-state-success-primary": "#1e8a3e",
			"--dsw-alias-state-success-secondary": "#1e8a3e",
			"--dsw-alias-state-success-tertiary": "rgba(30, 138, 62, 0.12)",
			"--dsw-alias-state-error-primary": "#e03131",
			"--dsw-alias-state-error-secondary": "#e03131",
			"--dsw-alias-state-warn-primary": "#e07b00",
			"--dsw-alias-state-warning-primary": "#e07b00",
			"--dsw-alias-state-warn-secondary": "#e07b00",
			"--dsw-alias-state-warn-label": "#e07b00",
			"--dsw-alias-state-warn-tertiary": "rgba(224, 123, 0, 0.12)",
			"--dsw-alias-state-idle-primary": "#a2a2a2",
			"--dsw-static-deepseek-500": "#0b7fff",
			"--dsw-static-deepseek-450": "#0b7fff",
			"--dsw-static-deepseek-400": "#0b7fff",
			"--dsw-static-deepseek-600": "#0066dd",
			"--dsw-static-deepseek-800": "rgba(11, 127, 255, 0.12)",
			"--dsw-static-deepseek-100": "rgba(11, 127, 255, 0.12)",
			"--dsw-static-deepseek-50": "rgba(11, 127, 255, 0.06)",
			"--dsw-static-deepseek-200": "rgba(11, 127, 255, 0.16)",
			"--dsw-static-deepseek-300": "rgba(11, 127, 255, 0.24)",
			"--dsw-alias-link": "#0b7fff",
			"--dsw-alias-label-deep-diving": "#0b7fff",
			"--dsw-alias-label-deep-diving-shimmer": "rgba(11, 127, 255, 0.3)",
			"--dsw-static-blue-500": "#0b7fff",
			"--dsw-static-blue-450": "#0b7fff",
			"--dsw-static-blue-400": "#0b7fff",
			"--dsw-static-blue-300": "#5ca7ff",
			"--dsw-static-blue-100": "rgba(11, 127, 255, 0.12)",
			"--dsw-alias-markdown-code-block": "#ffffff",
			"--dsw-alias-markdown-code-block-banner": "#ffffff",
			"--dsw-alias-markdown-inline-code": "rgba(230, 230, 230, 0.5)",
			"--dsw-alias-markdown-code-editor-bg": "#ffffff",
			"--dsw-alias-markdown-code-editor-fg": "#24292e",
			"--dsw-alias-markdown-tag": "#e6e6e6",
			"--dsw-alias-markdown-citation": "#f0f0f0",
			"--dsw-alias-markdown-placeholder": "#f5f5f5",
			"--dsw-alias-markdown-code-segment-selected": "#ffffff",
			"--dsw-alias-markdown-code-segment-unselected": "#f0f0f0",
			"--dsw-alias-turn-trigger-bg": "#f5f5f5",
			"--dsw-alias-turn-trigger-bg-hover": "rgba(13, 13, 13, 0.05)",
			"--dsw-alias-code-diff-added": "rgba(30, 138, 62, 0.08)",
			"--dsw-alias-code-diff-deleted": "rgba(224, 49, 49, 0.08)",
			"--dsw-alias-file-diff-added-bg": "#eaf7ee",
			"--dsw-alias-file-diff-added-gutter": "#f0faf3",
			"--dsw-alias-file-diff-added-marker": "#1e8a3e",
			"--dsw-alias-file-diff-deleted-bg": "#fcece9",
			"--dsw-alias-file-diff-deleted-gutter": "#fdf2f0",
			"--dsw-alias-file-diff-deleted-marker": "#e03131",
			"--dsw-alias-scrollbar-bg-l1": "rgba(13, 13, 13, 0.15)",
			"--dsw-alias-scrollbar-bg-l2": "rgba(13, 13, 13, 0.15)",
			"--dsw-alias-scrollbar-hover-l1": "rgba(13, 13, 13, 0.25)",
			"--dsw-alias-scrollbar-hover-l2": "rgba(13, 13, 13, 0.25)",
			"--dsw-alias-toast-bg": "#2b2b2b",
			"--dsw-alias-toast-label": "#ffffff",
			"--dsw-alias-tooltip-bg": "#f0f0f0",
			"--dsw-alias-tooltip-label": "#0d0d0d",
			"--dsw-alias-tooltip-key-bg": "#e6e6e6",
			"--dsw-alias-menu-group-header-fill": "rgba(248, 248, 248, 0.94)",
			"--dsw-alias-switch-thumb": "#ffffff",
			"--dsw-alias-settings-card-fill": "#ffffff",
			"--dsw-alias-settings-card-stroke": "rgba(13, 13, 13, 0.1)",
			"--dsw-alias-onboarding-accent": "#000000",
			"--dsw-alias-onboarding-card-fill": "#ffffff",
			"--dsw-alias-onboarding-secondary-fill": "#f0f0f0",
			"--dsw-alias-onboarding-checkbox-border": "rgba(13, 13, 13, 0.15)",
			"--dsw-focus-ring-color": "#0b7fff",
			"--dsw-specific-input-major": "#ffffff",
			"--dsw-specific-menu-item-hover": "#f0f0f0",
			"--dsw-specific-bubble": "rgba(13, 13, 13, 0.03)"
		};
		/**
		* ZCode Zai Dark 的语义色，按 DSH 令牌名归类。
		*
		* 与 light 一一对应，取值口径为 ZCode `--color-*` 在 Zai Dark 下的最终值。
		*/
		const ZCODE_DARK = {
			"--dsw-static-neutral-bluish-950": "#161616",
			"--dsw-static-neutral-bluish-875": "#202020",
			"--dsw-static-neutral-bluish-850": "#202020",
			"--dsw-static-neutral-bluish-800": "#2b2b2b",
			"--dsw-static-neutral-bluish-750": "#363636",
			"--dsw-static-neutral-bluish-700": "#3f3f3f",
			"--dsw-static-neutral-bluish-600": "#4a4a4a",
			"--dsw-static-neutral-bluish-500": "#5c5c5c",
			"--dsw-static-neutral-bluish-400": "#747474",
			"--dsw-static-neutral-bluish-300": "#9a9a9a",
			"--dsw-static-neutral-bluish-200": "#b8b8b8",
			"--dsw-static-neutral-bluish-150": "#363636",
			"--dsw-static-neutral-bluish-100": "#3f3f3f",
			"--dsw-static-neutral-bluish-75": "#2b2b2b",
			"--dsw-static-neutral-bluish-60": "#2b2b2b",
			"--dsw-static-neutral-bluish-50": "#d4d4d4",
			"--dsw-static-neutral-bluish-00": "#f8f8f8",
			"--dsw-static-neutral-bluish-1000": "#161616",
			"--dsw-alias-bg-base": "#161616",
			"--dsw-alias-bg-layer-1": "#202020",
			"--dsw-alias-bg-layer-2": "#2b2b2b",
			"--dsw-alias-bg-layer-3": "#2b2b2b",
			"--dsw-alias-bg-layer-4": "#363636",
			"--dsw-alias-bg-overlay": "#2b2b2b",
			"--dsw-alias-bg-module-platform": "#3a3a3a",
			"--dsw-alias-bg-multi-select": "#363636",
			"--dsw-alias-bg-l1": "#202020",
			"--dsw-alias-bg-l2": "#2b2b2b",
			"--dsw-alias-background-secondary": "#2b2b2b",
			"--dsw-alias-bg-document-preview": "#161616",
			"--dsw-alias-bg-document-selection": "rgba(64, 153, 255, 0.4)",
			"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.08)",
			"--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.5)",
			"--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.2)",
			"--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.48)",
			"--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
			"--dsw-alias-bg-mask-drop": "rgba(43, 43, 43, 0.7)",
			"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
			"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.1)",
			"--dsw-alias-border-subtle": "rgba(255, 255, 255, 0.1)",
			"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.06)",
			"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.16)",
			"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.2)",
			"--dsw-alias-border-inverted": "rgba(255, 255, 255, 0.06)",
			"--dsw-alias-border-inverted2": "rgba(255, 255, 255, 0.1)",
			"--dsw-alias-separator-primary": "rgba(255, 255, 255, 0.1)",
			"--dsw-alias-label-primary": "#d4d4d4",
			"--dsw-alias-label-primary-foreground": "#000000",
			"--dsw-alias-label-primary-inverted": "#262626",
			"--dsw-alias-label-primary-dimmed": "rgba(212, 212, 212, 0.6)",
			"--dsw-alias-label-primary-bluish": "#d4d4d4",
			"--dsw-alias-label-secondary": "rgba(212, 212, 212, 0.6)",
			"--dsw-alias-label-tertiary": "rgba(212, 212, 212, 0.5)",
			"--dsw-alias-label-caption": "rgba(212, 212, 212, 0.4)",
			"--dsw-alias-label-dimmed": "rgba(212, 212, 212, 0.3)",
			"--dsw-alias-label-quaternary": "rgba(212, 212, 212, 0.35)",
			"--dsw-alias-label-error": "#ff5c5c",
			"--dsw-alias-label-shimmer": "rgba(255, 255, 255, 0.45)",
			"--dsw-alias-label-document-preview": "#adadad",
			"--dsw-alias-menu-icon": "rgba(212, 212, 212, 0.6)",
			"--dsw-alias-brand-primary": "#ffffff",
			"--dsw-alias-brand-primary-invert": "#000000",
			"--dsw-alias-brand-text": "#ffffff",
			"--dsw-alias-brand-primary-new-colorprimary-new-color": "#ffffff",
			"--dsw-alias-state-business-primary": "#ffffff",
			"--dsw-alias-state-business-tertiary": "#2b2b2b",
			"--dsw-alias-button-primary-fill": "#ffffff",
			"--dsw-alias-button-primary-hover": "#e5e5e5",
			"--dsw-alias-button-primary-dimmed": "rgba(255, 255, 255, 0.16)",
			"--dsw-alias-button-contrast-fill": "#fafafa",
			"--dsw-alias-button-elevated-fill": "#2b2b2b",
			"--dsw-alias-button-floating-fill": "#2b2b2b",
			"--dsw-alias-button-floating-hover": "#363636",
			"--dsw-alias-button-ghost-active-fill": "#363636",
			"--dsw-alias-button-ghost-active-hover": "#3f3f3f",
			"--dsw-alias-button-ghost-active-border": "rgba(255, 255, 255, 0.2)",
			"--dsw-alias-button-info-fill": "#ffffff",
			"--dsw-alias-button-info-hover": "#e5e5e5",
			"--dsw-alias-button-tool-bar-fill": "rgba(84, 85, 87, 0.5)",
			"--dsw-alias-button-tool-bar-fill-invisible": "rgba(31, 31, 31, 0.36)",
			"--dsw-alias-button-tool-bar-hover": "rgba(84, 85, 87, 0.6)",
			"--dsw-alias-interactive-bg-hover": "rgba(255, 255, 255, 0.05)",
			"--dsw-alias-interactive-bg-hover-solid": "#2b2b2b",
			"--dsw-alias-interactive-bg-active": "rgba(255, 255, 255, 0.1)",
			"--dsw-alias-interactive-bg-hover-accent": "rgba(64, 153, 255, 0.16)",
			"--dsw-alias-interactive-bg-hover-danger": "rgba(255, 92, 92, 0.12)",
			"--dsw-alias-fill-l1": "rgba(255, 255, 255, 0.05)",
			"--dsw-alias-fill-l2": "rgba(255, 255, 255, 0.08)",
			"--dsw-alias-fill-tertiary": "rgba(255, 255, 255, 0.08)",
			"--dsw-alias-fill-tsp-secondary": "rgba(255, 255, 255, 0.05)",
			"--dsw-static-green-500": "#46bf72",
			"--dsw-static-green-400": "#46bf72",
			"--dsw-static-green-100": "rgba(70, 191, 114, 0.16)",
			"--dsw-static-green-900": "rgba(70, 191, 114, 0.16)",
			"--dsw-static-green-500-a08": "rgba(70, 191, 114, 0.08)",
			"--dsw-static-green-500-a12": "rgba(70, 191, 114, 0.12)",
			"--dsw-static-red-600": "#ff5c5c",
			"--dsw-static-red-500": "#ff5c5c",
			"--dsw-static-red-400": "#ff5c5c",
			"--dsw-static-red-100": "rgba(255, 92, 92, 0.16)",
			"--dsw-static-red-900": "rgba(255, 92, 92, 0.16)",
			"--dsw-static-red-400-a12": "rgba(255, 92, 92, 0.12)",
			"--dsw-static-red-600-a08": "rgba(255, 92, 92, 0.08)",
			"--dsw-static-amber-500": "#ff8a30",
			"--dsw-static-amber-400": "#ff8a30",
			"--dsw-static-amber-600": "#ff8a30",
			"--dsw-static-amber-100": "rgba(255, 138, 48, 0.16)",
			"--dsw-static-amber-900": "rgba(255, 138, 48, 0.16)",
			"--dsw-alias-state-success-primary": "#46bf72",
			"--dsw-alias-state-success-secondary": "#46bf72",
			"--dsw-alias-state-success-tertiary": "rgba(70, 191, 114, 0.16)",
			"--dsw-alias-state-error-primary": "#ff5c5c",
			"--dsw-alias-state-error-secondary": "#ff5c5c",
			"--dsw-alias-state-warn-primary": "#ff8a30",
			"--dsw-alias-state-warning-primary": "#ff8a30",
			"--dsw-alias-state-warn-secondary": "#ff8a30",
			"--dsw-alias-state-warn-label": "#ff8a30",
			"--dsw-alias-state-warn-tertiary": "rgba(255, 138, 48, 0.16)",
			"--dsw-alias-state-idle-primary": "#5c5c5c",
			"--dsw-static-deepseek-500": "#4099ff",
			"--dsw-static-deepseek-450": "#4099ff",
			"--dsw-static-deepseek-400": "#4099ff",
			"--dsw-static-deepseek-600": "#80beff",
			"--dsw-static-deepseek-800": "rgba(64, 153, 255, 0.16)",
			"--dsw-static-deepseek-100": "rgba(64, 153, 255, 0.16)",
			"--dsw-static-deepseek-50": "rgba(64, 153, 255, 0.08)",
			"--dsw-static-deepseek-200": "rgba(64, 153, 255, 0.2)",
			"--dsw-static-deepseek-300": "rgba(64, 153, 255, 0.3)",
			"--dsw-alias-link": "#4099ff",
			"--dsw-alias-label-deep-diving": "#4099ff",
			"--dsw-alias-label-deep-diving-shimmer": "rgba(64, 153, 255, 0.3)",
			"--dsw-static-blue-500": "#4099ff",
			"--dsw-static-blue-450": "#4099ff",
			"--dsw-static-blue-400": "#4099ff",
			"--dsw-static-blue-300": "#80beff",
			"--dsw-static-blue-100": "rgba(64, 153, 255, 0.16)",
			"--dsw-alias-markdown-code-block": "#2b2b2b",
			"--dsw-alias-markdown-code-block-banner": "#2b2b2b",
			"--dsw-alias-markdown-inline-code": "rgba(54, 54, 54, 0.5)",
			"--dsw-alias-markdown-code-editor-bg": "#24292e",
			"--dsw-alias-markdown-code-editor-fg": "#e1e4e8",
			"--dsw-alias-markdown-tag": "#363636",
			"--dsw-alias-markdown-citation": "#2b2b2b",
			"--dsw-alias-markdown-placeholder": "#2b2b2b",
			"--dsw-alias-markdown-code-segment-selected": "#2b2b2b",
			"--dsw-alias-markdown-code-segment-unselected": "#202020",
			"--dsw-alias-turn-trigger-bg": "#2b2b2b",
			"--dsw-alias-turn-trigger-bg-hover": "rgba(255, 255, 255, 0.05)",
			"--dsw-alias-code-diff-added": "rgba(70, 191, 114, 0.12)",
			"--dsw-alias-code-diff-deleted": "rgba(255, 92, 92, 0.12)",
			"--dsw-alias-file-diff-added-bg": "#1f3124",
			"--dsw-alias-file-diff-added-gutter": "#132016",
			"--dsw-alias-file-diff-added-marker": "#46bf72",
			"--dsw-alias-file-diff-deleted-bg": "#3c1f1b",
			"--dsw-alias-file-diff-deleted-gutter": "#28130e",
			"--dsw-alias-file-diff-deleted-marker": "#ff5c5c",
			"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.15)",
			"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.15)",
			"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.25)",
			"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.25)",
			"--dsw-alias-toast-bg": "#2b2b2b",
			"--dsw-alias-toast-label": "#f8f8f8",
			"--dsw-alias-tooltip-bg": "#2b2b2b",
			"--dsw-alias-tooltip-label": "#f8f8f8",
			"--dsw-alias-tooltip-key-bg": "#363636",
			"--dsw-alias-menu-group-header-fill": "rgba(32, 32, 32, 0.94)",
			"--dsw-alias-switch-thumb": "#f8f8f8",
			"--dsw-alias-settings-card-fill": "#2b2b2b",
			"--dsw-alias-settings-card-stroke": "rgba(255, 255, 255, 0.1)",
			"--dsw-alias-onboarding-accent": "#ffffff",
			"--dsw-alias-onboarding-card-fill": "#2b2b2b",
			"--dsw-alias-onboarding-secondary-fill": "#363636",
			"--dsw-alias-onboarding-checkbox-border": "rgba(255, 255, 255, 0.2)",
			"--dsw-focus-ring-color": "#4099ff",
			"--dsw-specific-input-major": "#2b2b2b",
			"--dsw-specific-menu-item-hover": "#363636",
			"--dsw-specific-bubble": "rgba(255, 255, 255, 0.05)"
		};
		/**
		* 与主题无关的 ZCode 结构令牌：圆角、阴影、字体栈、滚动条几何。
		*
		* ZCode 走 Tailwind v4 标度（sm 4px / md 6px / lg 8px / xl 12px），
		* 字体栈刻意在等宽栈里前置 CJK 无衬线族——见 ZCode `@theme` 块中
		* 「Consolas 不含中文字形」那条修复注释。
		*/
		const ZCODE_STRUCTURAL = {
			"--dsw-radius-xs": "2px",
			"--dsw-radius-sm": "4px",
			"--dsw-radius-md": "6px",
			"--dsw-radius-lg": "8px",
			"--dsw-radius-xl": "12px",
			"--dsw-radius-panel": "16px",
			"--dsw-radius-2xl": "16px",
			"--dsw-radius-full": "999px",
			"--dsw-shadow-lv1": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
			"--dsw-shadow-lv1-blur": "0 2px 6px 0 rgba(0, 0, 0, 0.03)",
			"--dsw-shadow-lv2": "0 2px 8px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.06)",
			"--dsw-shadow-lv3": "0 0 1px 0 rgba(0, 0, 0, 0.2), 0 8px 24px 0 rgba(0, 0, 0, 0.08)",
			"--dsh-font-family-code-default": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", \"Microsoft YaHei UI\", \"Microsoft YaHei\", \"PingFang SC\", \"Noto Sans CJK SC\", monospace",
			"--dsw-font-family": "system-ui, -apple-system, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif",
			"--dsw-font-size-display": "calc(var(--dsw-font-size-base) + 20px)",
			"--dsw-font-size-headline": "calc(var(--dsw-font-size-base) + 8px)",
			"--dsw-font-size-title": "calc(var(--dsw-font-size-base) + 6px)",
			"--dsw-font-size-base": "14px",
			"--dsw-font-size-xl": "calc(var(--dsw-font-size-base) + 4px)",
			"--dsw-font-size-lg": "calc(var(--dsw-font-size-base) + 2px)",
			"--dsw-font-size-caption": "calc(var(--dsw-font-size-base) - 1px)",
			"--dsw-font-size-sm": "calc(var(--dsw-font-size-base) - 2px)",
			"--dsw-font-size-xs": "calc(var(--dsw-font-size-base) - 4px)",
			"--dsw-font-size-2xs": "calc(var(--dsw-font-size-base) - 5px)",
			"--dsh-scrollbar-width": "8px",
			"--dsh-scrollbar-thumb-border": "2px"
		};
		/**
		* 渲染一个 CSS 变量块。
		* @param selector - 目标选择器。
		* @param tokens - 令牌映射。
		* @returns 形如 `selector{--a:b;--c:d}` 的 CSS 文本。
		*/
		function renderTokenBlock(selector, tokens) {
			return `${selector}{${Object.entries(tokens).map(([name, value]) => `${name}:${value}`).join(";")}}`;
		}
		//#endregion
		//#region src/client/zcode-skin.ts
		/**
		* ZCode 皮肤注入层（host 全局令牌覆盖）。
		*
		* 职责：把 {@link ./zcode-tokens.ts} 的令牌映射渲染成一张样式表，挂到
		* `document.head` 末尾，并在文档根上打一个可观测标记。
		*
		* 为什么不用 shadow DOM / 组件级样式：DSH Web 的整套视觉由
		* `--dsw-alias-*` 变量在 `body` 上驱动，任何组件都只消费这些变量。
		* 在变量层替换，等于在不触碰任何业务组件的前提下换掉全站外观——
		* 这也是「不复制 ZCode 的 Zustand/RPC/services」能成立的原因：
		* 我们只搬设计值，不搬任何运行时。
		*
		* 本插件在 dsh-codex-ui 脚手架上还接管了侧栏/工作区树/设置页的布局层
		* （见 `CodexSidebar.tsx` 等），那里的 `--dcu-*` 变量与这里的 host 令牌
		* 同源于 Zai 色板：host 令牌负责官方区域（标题栏、会话列、按钮、菜单），
		* `--dcu-*` 负责插件自有的侧栏外壳，两层互不冲突。
		*
		* 选择器优先级说明（这是本模块最容易出错的地方）：
		* DSH 官方主题插件用三档选择器下发调色板，特异性递增：
		*   body                                    → (0,0,1)
		*   body[data-ds-dark-theme]                → (0,1,1)
		*   html[data-platform=darwin] body         → (0,1,2)
		*   html[data-platform=darwin] body[dark]   → (0,2,2)
		* 因此这里统一使用 `:root:root` 前缀（`:root` 是伪类，每次出现计一个
		* b 分量），把特异性抬到 (0,2,1) / (0,3,1)，在不依赖样式表加载顺序的
		* 前提下确定性胜出——否则 macOS 上会因为 darwin 变体而局部漏改。
		*/
		/**
		* 皮肤版本；**改动令牌口径时递增**，便于排查线上残留。
		*
		* 与 package.json 的版本是**两条独立序列**，不要试图对齐：
		* 包版本跟着功能/移植走（如 1.13.0），皮肤版本只在「令牌口径或样式表内容发生变化」时递增。
		* 历史：1.0.0（初版）→ 1.2.0（收敛离标度几何）→ 1.3.0（见下）。
		* 2026-10-14 → 1.3.0：圆角字面量全部收归令牌、设置页 `--sp-*` 收归宿主语义令牌、
		* 菜单/浮层密度按宪章 §Menus 对齐（壳 lg + 项 md + p-1 + gap-0.5）。
		* 这三项都改变了样式表产出的声明，实机若仍挂着旧版可从 `data-dsh-zcode-skin` 一眼看出。
		* 2026-10-21 → 1.5.1：归档图标定位回到 right:8px，另含侧栏面的 clip-path 滑动规则。
		*/
		const SKIN_VERSION = "1.5.1";
		/** 注入到 `<html>` 上的标记属性，用于确认皮肤已激活。 */
		const SKIN_ATTRIBUTE = "data-dsh-zcode-skin";
		/** 样式标签的稳定标识，重复注入时用于去重。 */
		const STYLE_TAG_ID = "dsh-zcode-ui/skin.css";
		/** 亮色令牌选择器：特异性 (0,2,1)，压过 DSH 全部 light 变体。 */
		const LIGHT_SELECTOR = ":root:root body";
		/** 暗色令牌选择器：特异性 (0,3,1)，压过 DSH 全部 dark 变体。 */
		const DARK_SELECTOR = ":root:root body[data-ds-dark-theme]";
		/**
		* 令牌之外的少量结构修正。
		*
		* 刻意只做一件事：`color-scheme`。原因是**本皮肤层**走令牌优先策略，
		* 不针对 DSH 的类名写规则——DSH 的组件样式是 CSS Module 哈希名
		* （形如 `._8HJdBW_group`），任何按类名写的覆盖都会在下次上游构建时
		* 静默失效，属于典型的「看着能用、升级即坏」。
		*
		* **边界说明（避免误读）**：这条纪律约束的是**皮肤层**（本文件）。插件的
		* **宿主集成层**无法回避哈希类名——要把新建会话页的排版、输入壳的发送键、
		* 工作区行接上去，只能按上游的块名定位（`[class*="_composerHero"]` 等 18 处）。
		* 那些锚点由 `host-anchor-contract.ts` 做存在性自检，缺失即报警；
		* 换句话说：**皮肤层不碰哈希类名，集成层必须碰，但碰了就得有人盯着。**
		*
		* 同样刻意**不**覆盖 `:focus-visible` 的 outline：DSH 用
		* `html[data-input-modality=pointer] body :focus-visible{outline-color:#0000}`
		* 实现「仅键盘操作才显示焦点环」。直接写 outline 会连鼠标点击也画出焦点环，
		* 属于可访问性回退。正确做法是覆盖它消费的变量
		* （`--dsw-focus-ring-width` / `--dsw-alias-state-business-primary`）——
		* 后者已在 ZCODE_LIGHT / ZCODE_DARK 里换成 ZCode 的品牌色，
		* 因此焦点环自动跟随 ZCode，且不破坏指针/键盘的区分逻辑。
		*/
		const STRUCTURE_CSS = `
/* 让原生控件（滚动条、输入框光标、选中高亮、表单默认外观）跟随皮肤，
   而不是跟随操作系统。两个选择器都带 :root:root 前缀以保证优先级。 */
:root:root body{color-scheme:light}
:root:root body[data-ds-dark-theme]{color-scheme:dark}
`.trim();
		/**
		* 生成完整皮肤样式表。
		* @returns 可直接写入 `<style>` 的 CSS 文本。
		*/
		function renderSkinCss() {
			const structural = [renderTokenBlock(":root:root", ZCODE_STRUCTURAL), renderTokenBlock(":root:root body", ZCODE_STRUCTURAL)].join("");
			return [
				`/* dsh-zcode-ui — ZCode 皮肤 v${SKIN_VERSION}（设计值取自 zai-org/ZCode packages/ui/src/styles.css） */`,
				renderTokenBlock(LIGHT_SELECTOR, ZCODE_LIGHT),
				renderTokenBlock(DARK_SELECTOR, ZCODE_DARK),
				structural,
				STRUCTURE_CSS
			].join("\n");
		}
		/**
		* 把皮肤样式表安装到当前文档。
		*
		* 幂等：同名样式标签已存在时只做内容替换，不会重复插入。
		* 返回一个卸载函数，供 `ctx.effect` 在插件卸载时回收。
		*
		* @param doc - 目标文档；默认 `globalThis.document`。
		* @returns 卸载函数；无文档环境（SSR / 测试）时返回空操作。
		*/
		function installSkin(doc = globalThis.document) {
			if (doc === void 0) return () => {};
			let tag = doc.querySelector(`style[data-plugin-css="${STYLE_TAG_ID}"]`);
			if (tag === null) {
				tag = doc.createElement("style");
				tag.dataset.plugin = "dsh-zcode-ui";
				tag.dataset.pluginCss = STYLE_TAG_ID;
				doc.head.appendChild(tag);
			}
			tag.textContent = renderSkinCss();
			const root = doc.documentElement;
			const previous = root.getAttribute(SKIN_ATTRIBUTE);
			root.setAttribute(SKIN_ATTRIBUTE, SKIN_VERSION);
			return () => {
				tag?.remove();
				if (previous === null) root.removeAttribute(SKIN_ATTRIBUTE);
				else root.setAttribute(SKIN_ATTRIBUTE, previous);
			};
		}
		//#endregion
		//#region src/client/skin-envelope.ts
		/**
		* 皮肤信封 —— 让进入我们地盘的外来内容自动收敛到皮肤的排版基线。
		*
		* ## 为什么需要它
		*
		* 外来内容契约（`foreign-content-contract.ts`）解决的是"**已知的**外来插件怎么收敛"，
		* 但它靠**枚举类名**——而 DSH 生态里的外来内容大量使用 CSS Module 哈希类名
		* （实测会话区有 `yhfFVG_*` / `cl2Rlq_*` / `wXeviG_*` / `sk-*`，侧栏有 `dsh-session-kit-*`），
		* 根本枚举不完。用户的要求是「**不论加入什么插件都能融入**」，枚举制答不了这条。
		*
		* ## 做法：能继承的属性只在表面上设一次
		*
		* `font-family` 与 `font-variant-numeric` 是**继承属性**——在表面上设一次，
		* 所有后代自动跟随；外来内容若自己显式设了字体，那条声明依然胜出（我们尊重它，
		* 因为那通常是有意的，例如代码块要等宽）。这比重型后代通配更干净：
		* 不需要 `:not()` 长清单，不会用高特异性覆盖别人的有意设定。
		*
		* 唯一不继承的是 `box-sizing`，它对每个元素单独生效，因此需要后代规则——
		* 这也与皮肤既有写法（`.dcu-root *{box-sizing:border-box}`）一致。
		*
		* ## 表单控件：继承路径够不到的第三类（2026-10-13 补）
		*
		* `button / input / select / textarea` 的字体**不是继承来的**——UA 样式表给它们
		* 显式设了 `font: 400 13.3333px Arial` 一类的值，表面上设 `font-family` 对它们无效。
		* 实测（真实 Chromium）：表面上设了 system-ui，裸 `<button>` 仍渲染 Arial——
		* 外来插件的裸按钮会脱离皮肤字体。
		*
		* 修法用 `:where()` 把归一规则的**特异性压到 0**：任何作者样式（哪怕一条 `button{}`、
		* 或插件的哈希类）都能覆盖我们，只有 UA 样式表会被压过。于是两条同时成立：
		* 裸控件跟随皮肤；插件的有意设定原样胜出（不越"不覆盖别人故意设置"的线）。
		*
		* ## 分寸：绝不碰外来内容的颜色、字号、圆角、间距、布局
		*
		* 颜色是语义（错误红、成功绿、品牌色），字号和布局是功能结构——越过这条线，
		* 我们就开始"修复"别人的组件，那是把别人的 UI 变成自己的 bug
		* （详见 docs/KNOWN-ISSUES.md 的负面结果登记）。
		*/
		/** 本插件拥有话语权的表面：外来内容落在这些容器里，就受信封约束。 */
		const SKIN_SURFACES = [
			".dcu-root",
			".dcu-settings-page",
			".dcu-home",
			"[data-dcu-settings-page]",
			"[data-conversation-scroll]",
			"[data-phase=hero]"
		];
		/** 表面清单拼接成的选择器。 */
		const SURFACE_LIST = SKIN_SURFACES.join(",");
		/** 后代通配（box-sizing 用）。 */
		const DESCENDANTS = SKIN_SURFACES.map((surface) => `${surface} *`).join(",");
		/** 表单控件归一（零特异性：`:where()` 不计权，任何作者样式都能覆盖我们、只有 UA 会被压过）。 */
		const FORM_CONTROLS = `:where(${SURFACE_LIST}) :where(button,input,select,textarea)`;
		const SKIN_ENVELOPE_STYLE = [
			`${SURFACE_LIST}{font-family:var(--dsw-font-family)}`,
			`${SURFACE_LIST}{font-variant-numeric:tabular-nums}`,
			`${DESCENDANTS}{box-sizing:border-box}`,
			`${DESCENDANTS}::before,${DESCENDANTS}::after{box-sizing:border-box}`,
			`${FORM_CONTROLS}{font:inherit}`
		].join("\n");
		//#endregion
		//#region src/client/zcode-theme.ts
		/**
		* ZCode 视觉规范落点：Zai Light / Zai Dark 双色板与主题同步。
		* 色值提取自 zai-org/ZCode 的 packages/ui/src/styles.css（.theme-zai-light / .theme-zai-dark 覆盖层），
		* 机制参照其 useTheme.ts：明暗由根节点 class 表达，system 档跟随 prefers-color-scheme。
		*
		* DSH 宿主以 body[data-ds-dark-theme] 表达暗色（宿主自己的主题设置），本模块把它镜像到
		* documentElement 的 theme-zai-light / theme-zai-dark class，与 ZCode 的语义保持一致；
		* 样式表同时认两个信号，未同步时（首帧、无 JS）也不丢主题。
		*/
		/** Zai 双色板：供 <style> 注入，覆盖 dcu-* 变量；选择器与宿主暗色属性、ZCode class 双兼容。 */
		const ZCODE_THEME_STYLE = `
:root{color-scheme:light}
body[data-ds-dark-theme],.theme-zai-dark{color-scheme:dark}
/* 主色属**全局语义色**，不能只挂在下述侧栏作用域里：输入区的发送键也用它填充
   （[data-composer-card] 下的 button[class$=_primary]），而输入区不在 .dcu-root 内，
   挂在侧栏作用域会让该 var() 解析失败并静默失效——详见 docs/KNOWN-ISSUES.md §8。 */
:root{--dcu-primary:#000000;--dcu-primary-foreground:#ffffff}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-primary:#ffffff;--dcu-primary-foreground:#000000}

/* ── 状态色：填充档 / 文字档分离（2026-10-14）─────────────────────────────
   Zai 的「--dsw-alias-state-{success,error,warn}-*」是**按填充用途**推导的值：
   #e03131 / #1e8a3e / #e07b00。它们作为色块（进度条、指示点、按钮底）成立，
   但**当作小字用时亮色档全部不达 WCAG AA**——实测（底 = 侧栏 #f0f0f0 / 页面 #f8f8f8）：

     #e07b00 于 #f0f0f0 = 2.63:1   「待处理」胶囊文字（悬停态 #e4e4e4 更降到 2.36:1）
     #e03131 于 12% 错误色调底   = 3.34:1   会话区错误提示条
     #e07b00 于 #f8f8f8 = 2.82:1   关于页「有更新」
     #1e8a3e 于 #f8f8f8 = 4.15:1   关于页「已安装」

   这与 docs/ZCODE-DESIGN.md §9「明度即层级」是同一个问题：那节把 secondary/tertiary
   按实际底色重取了值，但**没有覆盖状态色轴**。§10.2 契约第 4 条甚至明令第三方插件
   「语义色只约束填充，不得用于文字」——本插件自己的亮色档却在这么做。

   故在此分档：**填充档沿用 Zai 原值不动**（色相语义不变，第三方进度条等仍按原样收敛），
   **文字档按实际底色重新取值**，色相保持同族、只压明度，符合 §11「只用位移与明度」。

   挂「:root」而非侧栏作用域的原因同 --dcu-primary：会话菜单（含删除按钮）经 portal
   渲染到 body，不在 .dcu-root 内，挂作用域会静默失效。

   实测（明暗两档、全部消费底色，含 12% 色调底与行悬停底）：
     文字档亮色  warn #8a4b00 ≥5.04:1  error #b3261e ≥4.84:1  success #176c31 ≥4.82:1
     文字档暗色  warn #ff8a30 ≥6.02:1  error #ff5c5c ≥4.68:1  success #46bf72 ≥6.04:1

   「--dcu-state-error-fill / --dcu-state-error-fill-hover」是「错误底 + 反色文字」按钮
   （归档确认）的配对。悬停方向**必须随主题相反**：亮色前景是白，底色要更暗；
   暗色前景是深色，底色要更亮。旧实现两档一律变亮，导致亮色 3.91:1、暗色 3.93:1 双双掉线。 */
:root{
  --dcu-state-success-text:#176c31;--dcu-state-error-text:#b3261e;--dcu-state-warn-text:#8a4b00;
  --dcu-state-error-fill:#e03131;--dcu-state-error-fill-hover:#c52b2b;
  /* 浮层三件套同样挂在 :root：工具菜单与 Git 弹窗经 portal 渲染到 body，不在
     .dcu-root / .dcu-settings-page / .dcu-home 任一侧栏作用域内，挂在作用域上，
     var() 会解析失败并静默走字面量回退（与 --dcu-primary、--dcu-state-* 同因）。 */
  /* 2026-10-18（红队复核）：--dcu-tip-hover 原先只被消费、从未定义——靠 var() 的 fallback
     勉强生效（CodexWorkspaceBrowser 的 .dcu-wb-tip-pin:hover）。补齐定义，语义同侧栏 hover。 */
  --dcu-tip-bg:#f0f0f0;--dcu-tip-border:rgba(13,13,13,.1);--dcu-tip-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--dcu-tip-hover:rgba(13,13,13,.05);
  /* 浮层专用文字色板：与 --dcu-tip-bg **成对**定义（ZCode 的 tooltip / tooltip-foreground 做法）。
     为什么不能复用侧栏色板：侧栏底是 #f0f0f0，浮层底是 #ffffff，同一个 tertiary
     搬过去对比度会变。此前实测暗色下 secondary 3.99:1 / tertiary 3.68:1 均掉线。
     亮底实测：#262626 15.13:1 ／ #5c5c5c 6.69:1 ／ #686868 5.57:1，全部 ≥AA。 */
  --dcu-tip-primary:#262626;--dcu-tip-secondary:#5c5c5c;--dcu-tip-tertiary:#686868;
  /* 键帽文字：ZCode Kbd 组件用 text-muted-foreground，本仓按侧栏底重取。
     实测（底 = #f0f0f0 叠 3% 中性 = #e9e9e9）：#5c5c5c = 5.51:1 ✅ AA。
     tertiary #686868 只有 4.59:1，看似达标但余量太小，暗色档直接掉到 4.14:1 —— 故不分档都不用它。 */
  --dcu-kbd-foreground:#5c5c5c;
  /* 选中行内的次要文字：选中底 #e5e5e5 上 tertiary #686868 只有 4.42:1（<AA），
     提到 secondary #5c5c5c = 5.31:1 ✅。只影响选中行，普通底色下的取值不变。
     2026-10-18（红队复核）：删掉 --dcu-selected-tertiary —— 它零消费（全仓唯一命中是定义
     与断言里的成对正则），属投机档位。本仓对此有明文纪律（见下方尺寸档那段：
     「零消费的档位是投机设计」），同轮一边删投机档位、一边留着它自相矛盾。
     将来真需要选中态的第三档，再加回来并同时给出消费点。 */
  --dcu-selected-secondary:#5c5c5c;
}
body[data-ds-dark-theme],.theme-zai-dark{
  --dcu-state-success-text:#46bf72;--dcu-state-error-text:#ff5c5c;--dcu-state-warn-text:#ff8a30;
  --dcu-state-error-fill:#ff5c5c;--dcu-state-error-fill-hover:#ff7070;
  /* 浮层三件套（底色/描边/投影）也在暗色下重取：它们挂在 :root 而不是侧栏作用域，
     是为了让 portal 到 body 的浮层（工具菜单、Git 弹窗）也拿得到——见上面亮色那段的说明。 */
  --dcu-tip-bg:#2b2b2b;--dcu-tip-border:rgba(255,255,255,.1);--dcu-tip-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--dcu-tip-hover:rgba(255,255,255,.06);
  /* 暗底 #2b2b2b 实测：#d4d4d4 9.55:1 ／ #9a9a9a 5.03:1 ／ #a3a3a3 5.61:1，全部 ≥AA。
     注意 secondary 取 #9a9a9a 而非侧栏的 #888888——后者在 #2b2b2b 上只有 3.99:1。 */
  --dcu-tip-primary:#d4d4d4;--dcu-tip-secondary:#9a9a9a;--dcu-tip-tertiary:#a3a3a3;
  /* 暗色档实测（底 = #161616 叠 5% 白 = #222222）：
     secondary #888888 = 4.49:1（差 0.01 掉线，不能用）、#9a9a9a = 5.65:1 ✅ AA。 */
  --dcu-kbd-foreground:#9a9a9a;
  /* 选中底 #2d2d2d 上 tertiary #828282 只有 3.58:1（<AA），secondary #888888 也只有 3.89:1，
     两者都掉线，故统一提到 #9a9a9a = 4.89:1 ✅。同上，只保留有消费点的 secondary。 */
  --dcu-selected-secondary:#9a9a9a;
}
/* ── 动效令牌 ─────────────────────────────────────────────────────────────
   2026-10-13 起：原先全站收敛为「180ms ease-out」一条曲线。那是一致，但没有意图——
   出现、移动、消失用同一条曲线，读起来是「没做动效」而不是「克制的动效」。现按意图分档：

     反馈 feedback  悬停 / 按下 / 选中底色变化——必须立刻回应，所以最短。
     移动 move      尺寸、位置、行高变化——需要看得见过程，所以最长。
     进入 enter     内容出现——减速收尾，落点要稳。
     退出 exit      内容消失——加速离场，不要拖住下一个动作。
     按压 press     只有按下瞬间的位移，比反馈更短，做出「手感」。

   ── 2026-10-17 曲线修正（用户反馈「动效不够丝滑」）─────────────────────────
   反馈与移动档此前用 cubic-bezier(.4,0,.2,1)。查 ZCode 编译产物
   （/Applications/ZCode.app/.../styles-Cg6LSa5A.css）后确认这是**错的**：

     --ease-out:    cubic-bezier(0, 0, .2, 1)     ← ZCode 的 .ease-out 用这条
     --ease-in-out: cubic-bezier(.4, 0, .2, 1)    ← 我们误用的其实是「缓入缓出」

   两者前 10% 时间的进度相差 **12 倍**（2.6% vs 30.4%），实测 180ms 位移：

     曲线                    起步 30ms 内已走
     .4,0,.2,1（旧·错）        2px / 92px  ← 用户感知「点了不跟手」
     0,0,.2,1（ease-out·正确）  26px / 92px
     .2,0,0,1（enter）          42px / 92px

   缓入缓出适合「有来有回」的循环动画；单向位移（侧栏开合、行高展开）用它会显得滞重。
   本仓的 feedback / move 全部是单向变化，因此统一改为 ease-out。
   反向测试见 tests/design-system.assert.ts（改回 .4,0,.2,1 即判红）。

   全部落在 ZCode 要求的「快、低戏剧性」区间（90–180ms），不使用带过冲的弹簧曲线：
   cubic-bezier(.2,0,0,1) 是减速曲线，没有回弹；.4,0,1,1 是加速曲线，同样无过冲。
   与色板不同，动效不分明暗——挂 :root，供侧栏、设置页、新会话页共同消费。 */
:root{
  /* 2026-10-26：按 ZCode 3.16.3 CDP 现场实测（cdp-capture/zcode-motion.json）对齐两档。
     实测只有两档，不是一档：
       颜色/背景/边框类 → 0.15s cubic-bezier(0.4, 0, 0.2, 1)   （最常用，13 个属性）
       位移/尺寸/高度类 → 0.3s  cubic-bezier(0, 0, 0.2, 1)
     原值 feedback 120ms(0,0,.2,1) / move 180ms 是估的，偏快且曲线不对。
     保留五档结构不动：enter/exit/press 在 ZCode 侧栏范围内没采到对应值，
     不臆造，维持原值。 */
  --dcu-motion-feedback-duration:150ms;--dcu-motion-feedback-ease:cubic-bezier(.4,0,.2,1);
  --dcu-motion-move-duration:300ms;--dcu-motion-move-ease:cubic-bezier(0,0,.2,1);
  --dcu-motion-enter-duration:160ms;--dcu-motion-enter-ease:cubic-bezier(.2,0,0,1);
  --dcu-motion-exit-duration:120ms;--dcu-motion-exit-ease:cubic-bezier(.4,0,1,1);
  --dcu-motion-press-duration:90ms;--dcu-motion-press-ease:cubic-bezier(.2,0,0,1);
}
/* ── 间距标度（2026-10-16 补，对齐 ZCode DESIGN.md §Spacing）────────────────────
 *
 * ZCode 把间距列为设计系统的独立一层：基准单位 4px，推荐节奏
 * 4 紧贴图标/文字 → 8 紧凑控件内边距与行内间隙 → 12 密集列表项与菜单行
 * → 16 标准卡片与面板内边距 → 20–24 较大分区与对话框内部，
 * 并明令「Prefer a small set of repeated gaps and paddings instead of arbitrary values」。
 *
 * 本插件此前**没有这一层**：几何值直接写字面量，于是长出了 5/7/9/14/18/22px 这类
 * 一次性数字（共 39 处离刻度间距），同一份界面里同义间距出现两三种值——
 * 这正是 ZCode 那条规则要防的「arbitrary values」。它们不是错，但没有体系：
 * 改动时没人知道该跟哪个值，于是继续长新的。
 *
 * 只登记**真正在用**的档位（2026-10-16 收尾自检删掉了 10 个零消费的投机档位）：
 * 第一版按 ZCode 的完整标度预置了 7 个间距档 + 8 个尺寸档，但自检发现其中
 * space-half / space-5 与**全部 8 个尺寸档**在代码里 0 处消费——
 * 那是「为将来准备好档位」的投机设计（AGENTS.md 第 2 条：只写解决问题的最少代码）。
 * 档位是**用出来**的，不是**定出来**的：真需要 20px 时加一行即可，
 * 而预置死令牌只会让后来人以为"这些档位有约定俗成的用法"。
 * 保留下来的 5 档都有实际消费点（space-1..4、6 共 40 处）。
 *
 * 与圆角令牌（--dsw-radius-*）的分工：圆角是 Tailwind 语义档位（sm/md/lg/xl），
 * 间距是线性标度，故这里用数值命名（space-1..space-4/6 对应 4/8/12/16/24）。
 * 命名不随界面字号缩放——ZCode 要求「图标、间距、圆角等 rem 几何不得随字号缩放」。 */
:root{
  --dcu-space-1:4px;      /* 紧贴图标/文字 */
  --dcu-space-2:8px;      /* 紧凑控件内边距、行内间隙 */
  --dcu-space-3:12px;     /* 密集列表项、菜单行 */
  --dcu-space-4:16px;     /* 标准卡片与面板内边距 */
  --dcu-space-6:24px;     /* 对话框内部、较大分区 */
}
/* 加载转圈的共享基元（ZCode 原版复刻，2026-10-13）。
 *
 * 源 = 本地 ZCode 3.15.1：Spinner 组件用 LoaderIcon + Tailwind animate-spin，
 * 主题原文 --animate-spin: spin 1s linear infinite、@keyframes spin{to{transform:rotate(360deg)}}
 * （app bundle CSS 实测）。这里是它的插件侧等价物——1s / linear / 无限，参数不得改：
 * 不做令牌化是因为它不属于五档「意图」过渡，而是 ZCode 锁定的状态动画常量；
 * 图标、尺寸、颜色仍由使用处给（ZCode 同模型：Spinner 只接 className）。
 * 放在主题层（应用级）：侧栏运行中、设置页安装中转圈与将来接入的外来表面共用同一份定义，
 * 避免「两处同义规则各写一遍、谁被删了都不知道」。 */
.dcu-spin{animation:dcu-spin 1s linear infinite}

/* 三态外壳（loading / error / empty）——2026-10-14 补上这块此前完全空白的规范
   （docs/KNOWN-ISSUES.md §13.6 自登记：本仓「无统一规范、无断言」）。
   设计决定：
   · **一个外壳只换语义色**，不换容器几何——同一处信息换个状态不该跳版。
   · **错误态不铺 destructive 底色**。语义靠①文字用 --dcu-state-error-text（≥4.5:1）、
     ②容器带 role="alert"、③表单控件用 aria-invalid 边框表达。铺 12% 色调底是
     此前 .dcu-wb-error 的做法，在 240px 窄栏里是一整块刺眼的红，且与 §10.2 契约
     第 4 条「语义色只约束填充，不得用于文字/整块背景」相抵触。
   · 图标由使用处给（ZCode 同模型：Spinner 只接 className），外壳只管间距与文字。
   放主题层（应用级）：侧栏 / 频道 / 定时 / 行内操作 / 弹窗都要用，避免各抄一份。 */
.dcu-state,.dcu-wb-error{display:block;padding:8px 10px;border-radius:var(--dsw-radius-lg);font-size:var(--dsw-font-size-sm);line-height:20px;color:var(--dcu-sidebar-secondary)}
.dcu-state--error,.dcu-wb-error{color:var(--dcu-state-error-text)}
.dcu-state--empty{color:var(--dcu-sidebar-tertiary)}
/* 需要图标位时用这个修饰符：外壳变 flex，图标位固定 16px、随文字色。 */
.dcu-state--with-icon{display:flex;align-items:flex-start;gap:8px}
.dcu-state--with-icon>.dcu-state-icon{flex:none;width:16px;height:16px;margin-top:2px;color:inherit}
@keyframes dcu-spin{to{transform:rotate(360deg)}}
/* 文档隐藏时暂停动效（移植自 ZCode styles.css:84-92 的 html[data-document-hidden]）。
 *
 * 上游原文的根因：「窗口 hidden 时 CSS 动画无法结算，DocumentTimeline 会持有期间被移除的
 * 元素及整棵子树，后台流式输出时内存无上限累积、恢复可见才释放。」
 * 长对话 + 后台流式输出正是这个泄漏最容易放大的现场。
 *
 * 与下面 prefers-reduced-motion 的分工：本块解决**内存**（页面不可见期间不创建动画对象），
 * 那块解决**可访问性**（用户偏好不要动效）。触发条件无关，不能合并——
 * 用户开着动效偏好时后台照样会累积。
 *
 * 用星号通配是本条**唯一**正当的场景：它必须在隐藏期间覆盖**任何**元素的动画，
 * 包括宿主与第三方插件的（正是它们的动画对象泄漏）。范围限定在
 * html[data-document-hidden] 下，且该属性只在页面不可见时存在，所以日常零开销。 */
html[data-document-hidden] *,html[data-document-hidden] *::before,html[data-document-hidden] *::after{transition:none!important;animation:none!important}
/* 令牌化的副产品：减少动态效果不再需要逐个元素写 transition:none —— 把五档时长一起归零，
   所有消费方自动跟随。各处残留的 transition:none 块保留（它们同时覆盖未令牌化的宿主元素）。 */
@media (prefers-reduced-motion:reduce){
  :root{--dcu-motion-feedback-duration:0ms;--dcu-motion-move-duration:0ms;--dcu-motion-enter-duration:0ms;--dcu-motion-exit-duration:0ms;--dcu-motion-press-duration:0ms}
  /* 时长归零管不到 infinite 动画——波浪与旋转会继续动。按 ZCode 的「停静止帧」处理：
     动作归零，但保留「进行中」的可读性（进度停在当前进度，而不是变回 0；转圈停在原角度，图标不消失）。 */
  :root:root .dcu-about-progress-fill[data-wave=true]{animation:none;width:28%}
  :root:root .dcu-spin{animation:none}
}
/* Zai Light —— 默认浅色，全部语义角色取自 .theme-zai-light 覆盖层。

   2026-10-18（设计审计 P1-1）：secondary 由 #5c5c5c 压到 **#595959**。
   原因：第三档（tertiary）与第二档的明度差塌了。§14.1 为了让 tertiary 达到 AA，
   把它从 L*41.6 抬到 44.0，正好顶到 secondary 旁边 —— 档间 ΔL* 只剩 4.9，
   在 .dcu-wb-section-label（secondary）与紧邻其下的 .dcu-wb-empty（tertiary）
   同字号直接相邻的场景里，两者对比只有 1.20:1，肉眼几乎相同。
   审计的结论是「带宽耗尽 → 减需求（空态改条件渲染）」；复算表明带宽没有耗尽，
   **空间在 secondary 一侧**（往 primary 推不受 AA 地板约束）：
     secondary #595959 → L*37.8，ΔL*(s,t)=6.2，对比度 sidebar 6.15 / hover 5.56，
     primary↔secondary 仍差 22.7（远大于 6）。
   取 6.2 而非更大值，是为了不把 primary 与 secondary 的区别也压没。 */
/* ⚠ 2026-10-28 白缝修复（深色主题）：宿主的侧栏列 [data-dcu-sidebar-column] 是 .dcu-root 的
   **祖先**，祖先读不到后代作用域里定义的变量 —— 于是 CodexSidebar 那条
   background:var(--dcu-sidebar-background, #f0f0f0) 在宿主列上一直取兜底 #f0f0f0（浅灰）。
   静止态被插件自己的壳盖住看不见，但开合动画期间「已收窄的侧栏列」与「未到位的正文列」
   之间会露出这段宽度（实测收起时 104px），深色主题下就是一道白缝。
   修法：在 html/body 上也挂一份同名变量，让祖先链能解析；壳内同名声明值相同，不冲突。 */
:root{--dcu-sidebar-background:#f5f5f5}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-sidebar-background:#161616}
.dcu-root,.dcu-settings-page,.dcu-home{
  /* TA1（03g 主题审计，2026-10-27）：浅色底按 ZCode **分层**取值，不再取中值。
     ZCode tokens.json 实测（浏览器 canvas 像素回读换算，双已知值反验通过）：

       oklch(97%   0 0) → rgb(245)  = #f5f5f5   ← --color-sidebar      （侧栏层）
       oklch(98.5% 0 0) → rgb(250)  = #fafafa   ← --color-background   （内容画布层）
       反验：oklch(87% 0 0) → 212（= 深色前景）、oklch(37.1% 0 0) → 64（= G14 基色）✅

     **245 与 250 的 5 通道差本身就是设计语言**——侧栏略暗以区分层级。
     上一版取中值 247 是错的：把两层压平，两侧都不准，还丢掉了层级差。

     映射：
       .dcu-root（插件侧栏壳）          → #f5f5f5 (245)
       .dcu-settings-page / .dcu-home（整页弹层）→ #fafafa (250)

     G14 联动（已算）：底 245 上 secondary 85% ≈ 6.2:1、tertiary 75% ≈ 4.7:1，仍双双过 AA，
     故 alpha 保持 85%/75% 不动。

     原值 #f0f0f0（240）比 ZCode 侧栏层还暗 5 个通道。 */
  --dcu-sidebar-background:#f5f5f5;--dcu-sidebar-primary:#262626;
  /* G14（03b-sidebar）：原为写死 #595959。改为 alpha 叠加。
     基色 #404040 = ZCode 浅色 --color-foreground（oklch(37.1% 0 0)，其 oklab L=0.3715）。
     目标渲染色 = oklab(0.371 0 0 / 0.6)，与 ZCode 分组标题实测一致。
     **历史坑（2026-10-27 第 3 轮评判对账）**：最初误用 #0a0a0a（foreground-subtle 的基色），
     那是另一个令牌；正确基色必须是 foreground 本身。 */
  /* G14 终版（2026-10-27）：基色 #404040 = ZCode 浅色 --color-foreground（oklab L=0.3715），
     **保住 L 身份**与 ZCode 一致，只把 alpha 抬高以适配 DSH 更暗的侧栏背景。
     为什么必须抬 alpha：ZCode 自己的 oklab(0.371/0.6) 在它的 #fbfbfb 上也只有 3.29:1
     （本就不达 AA），而 DSH 背景 #f0f0f0 更暗，同样 alpha 掉到 3.19:1。
     实测解：alpha 0.85 / 0.75 → 6.05:1 / 4.61:1，双档过 AA 且 ΔL*(s-t)=7.4 可分辨。 */
  --dcu-sidebar-secondary:color-mix(in oklab,#404040 85%,transparent);
  --dcu-sidebar-tertiary:color-mix(in oklab,#404040 75%,transparent);--dcu-sidebar-navigation:#262626;
  /* 2026-10-18（红队复核澄清身份）：--dcu-sidebar-icon 是**图标色**，不是「第四档文字」。
     全仓消费点只有 SVG（菜单图标 / 文件夹 / 设置入口），无一处用作文字。
     故它适用 WCAG 非文本 3:1，不适用文字的 4.5:1，也不参与「三档灰 ΔL*≥6」的档间判据。
     实测：#525252 on #f0f0f0 = 6.86:1（远超 3:1）。
     ⚠ 已知副作用：P1-1 把 secondary 压到 #595959 后，图标与 secondary 的明度差从
     4.2 缩到 2.9。这是**可接受**的——图标是装饰/提示，与正文不是并列层级，
     且两者从不并排表达同一语义。若将来出现「图标必须与文字明确区分」的场景，
     把 icon 压到 #454545 可把 ΔL 拉开到 8.5（on #f0f0f0 8.41:1），代价是图标更重。 */
  --dcu-sidebar-icon:#525252;
  --dcu-sidebar-hover:rgba(13,13,13,.05);--dcu-sidebar-selected:rgba(13,13,13,.05);
  /* 2026-10-18（设计审计 P1-2）：表面分离两套主题机制统一为「填充差 ~1.07 + 边线 ~1.45」。
     实测亮色原本靠填充差 1.073（#f0f0f0 vs 画布 #f8f8f8），边线只有 1.24；
     暗色反之靠边线（1.31），填充差几乎为 0。切主题时边界强度会突变。
     注：审计给的暗色基线「#3f3f40 / 1.72」在全仓不存在（grep 0 命中），实测合成值是
     rgba(255,255,255,.1) over #161616 = #2d2d2d / 1.31 —— 按实测校准，不采信报告数字。
     亮色边线 alpha .1 → .18：合成 #cdcdcd，对比 1.45（原 1.24）。 */
  /* HD1（2026-10-27 顶栏对齐 03e）：顶栏底部分隔线。ZCode 实测 1px、白 5% alpha
     （暗色）。浅色反转为黑 5%，与既有「中性色只用 alpha 叠加」的规则一致。 */
  /* S2（03f 设置页）：ZCode 分区卡片底色 #161616（深）/ 浅色对应更亮的一档。
     DSH 宿主 --dsw-alias-settings-card-fill 是 #2b2b2b，比 ZCode 亮 21 个灰阶。
     这里只在设置页作用域内覆盖，不动宿主令牌本身。 */
  /* S1（03f）：ZCode 设置页导航分区项 16px / radius 12px。
     DSH 原为 14px / 8px。实测 16px 不折行、不溢出（注入验证过），可安全放大。 */
  --dcu-settings-nav-size:16px;
  --dcu-settings-nav-radius:12px;
  /* TA1：设置页整页底 = ZCode 内容画布层 rgb(250)。侧栏层 245 见 .dcu-root。 */
  /* TA4（2026-10-28 静态定案）：ZCode 深色设置卡 = --color-background（#161616，与画布
     同底、仅边框分隔——S2 实测）。浅色对称取画布值 #fafafa（旧 #fbfbfb 是未验证猜测）。 */
  --dcu-settings-page-bg:#fafafa;
  --dcu-settings-card-fill:#fafafa;
  --dcu-header-border:1px solid rgba(13,13,13,.05);
  --dcu-sidebar-border:rgba(13,13,13,.1);--dcu-focus:#0b7fff;
  --dcu-surface:rgba(13,13,13,.03);
}
/* Zai Dark —— 宿主暗色属性或 ZCode 暗色 class 命中任一即切换。

   2026-10-18（P1-1，同上）：secondary 由 #888888 抬到 **#969696**。
   暗色档更糟——ΔL*(secondary,tertiary) 只有 **2.3**（1.08:1，等于没有第三档）。
   方向必须与亮色相反：暗色下往 primary（更亮）推才有空间。
   取 #969696 而非刚够的 #939393：后者的 ΔL 是 6.6，但在选中底 #2d2d2d 上
   secondary 只有 4.48:1（差 0.02 掉出 AA）；#969696 得 ΔL=7.7 且选中底 4.66:1，
   同时 sidebar 6.12 / hover 5.38 全部达标。primary↔secondary 仍差 22.8。 */
body[data-ds-dark-theme] .dcu-root,body[data-ds-dark-theme] .dcu-settings-page,body[data-ds-dark-theme] .dcu-home,
.theme-zai-dark .dcu-root,.theme-zai-dark .dcu-settings-page,.theme-zai-dark .dcu-home{
  --dcu-sidebar-background:#161616;--dcu-sidebar-primary:#d4d4d4;
  /* G14：原为写死 #969696。改为 alpha 叠加。
     基色 #d4d4d4 = ZCode 深色 --color-foreground（oklch(87% 0 0)，oklab L=0.8699）。
     目标渲染色 = oklab(0.87 0 0 / 0.6) —— **与 ZCode 三条项目行实测值完全相同**。
     **历史坑（2026-10-27 第 3 轮评判对账）**：我最初写成 #e5e5e5（= foreground-subtle 的基色），
     它的 oklab L=0.9219，评判方实测到 oklab(0.9219/0.51) 正是这个误用。
     基色必须是 foreground 本身（L=0.87），不是 foreground-subtle。 */
  /* G14 终版：基色 #d4d4d4 就是 ZCode 的 --color-foreground（oklab L=0.8699），
     secondary 渲染为 oklab(0.87/0.68) —— L 与 ZCode 完全一致（差 0.00006），
     只把 alpha 从 0.6 提到 0.68，让 tertiary 也过 AA（4.58:1）并保住三档 ΔL* 8.9。 */
  --dcu-sidebar-secondary:color-mix(in oklab,#d4d4d4 68%,transparent);
  --dcu-sidebar-tertiary:color-mix(in oklab,#d4d4d4 56%,transparent);--dcu-sidebar-navigation:#d4d4d4;
  /* 暗色侧 icon 同属「图标色」身份（见亮色侧说明）。实测 #a3a3a3 on #161616 = 7.17:1。
     P1-1 后与 secondary(#969696) 的明度差从 10.3 缩到 4.9；同样是可接受的，理由同亮色侧。
     注意暗色方向相反：icon 比 secondary 更亮，所以若要拉开应继续提亮而非压暗。 */
  --dcu-sidebar-icon:#a3a3a3;
  --dcu-sidebar-hover:rgba(255,255,255,.05);--dcu-sidebar-selected:rgba(255,255,255,.1);
  /* 2026-10-18（P1-2，暗色侧）：两套主题的**表面分离机制**统一到「边线承担主区分」。
     原先亮色靠填充差（1.073）、暗色靠边线（1.31），切主题时边界强度会突变。
     一度试过把暗色 sidebar 提亮到 #1c1c1c 去造 1.06 的填充差，但**副作用不可接受**：
     底色一亮，tertiary #828282 立刻从 4.71 掉到 4.43（<AA），三档灰必须连锁重取
     （实测需 secondary 升到 #a0a0a0 才保住 ΔL≥6）。大面积底色的亮度是承重约束，
     不能为了对齐一套机制去动它。
     故改为：暗色底色保持 #161616，边线 alpha .1 → .16（合成 #3b3b3b，对比 1.31 → 1.62）。
     与亮色侧 .18（合成 #c7c7c7 / 1.48）方向一致、量级同档，两套主题的边界强度不再突变。 */
  /* S2：设置页卡片深色值。作用域见 settings-page-styles.ts 的 .dcu-settings-page。 */
  /* TA1：设置页深色底 = ZCode --color-background dark #161616 */
  --dcu-settings-page-bg-dark:#161616;
  --dcu-settings-card-fill:#161616;
  --dcu-header-border:1px solid rgba(255,255,255,.05);
  --dcu-sidebar-border:rgba(255,255,255,.1);--dcu-focus:#4099ff;
  --dcu-surface:rgba(255,255,255,.05);
}
`;
		/**
		* 把主题样式表挂到 `document.head`。
		*
		* 此前这份样式表由 `CodexSidebar.tsx` 用 `<style>{ZCODE_THEME_STYLE}</style>` 注入，
		* 于是**主题层的生命周期被侧栏组件绑架**：侧栏不挂载时，`:root` 上的动效令牌
		* （`--dcu-motion-*`）与 `--dcu-primary` 都不存在，而消费它们的并不只有侧栏——
		* `TurnNavigator` 与 `conversation-header` 在会话区，`settings-page` 是 portal 到 body 的。
		* 那两处会静默退化成"没有过渡"，且没有任何报错。
		*
		* 主题是**应用级**的东西，应当与 `installSkin()` 同层注册（见 `index.ts` 的 `ctx.effect`）。
		* 用标记属性保证幂等：重复调用不会插入第二份样式表。
		*
		* @returns dispose 函数（移除本插件插入的那份样式表）。
		*/
		function installThemeStyle() {
			if (typeof document === "undefined") return () => {};
			const TAG_ID = "dsh-zcode-ui-theme";
			let tag = document.querySelector(`style[data-plugin-css="${TAG_ID}"]`);
			if (tag === null) {
				tag = document.createElement("style");
				tag.setAttribute("data-plugin-css", TAG_ID);
				tag.textContent = ZCODE_THEME_STYLE + "\n" + SKIN_ENVELOPE_STYLE;
				document.head.appendChild(tag);
			}
			return () => {
				tag?.remove();
			};
		}
		/**
		* 把宿主暗色属性镜像为 ZCode 的 theme-zai-* class。
		* 返回 dispose；宿主用 MutationObserver 监听 body 属性。
		* 宿主属性是已解析主题的唯一真源（宿主自身处于 system 档时也由宿主解析后再落属性），
		* 不读 prefers-color-scheme——否则宿主显式浅色 + 系统深色时侧栏会被误判成暗色，与内容区撕裂。
		*/
		function syncZCodeTheme() {
			if (typeof document === "undefined") return () => {};
			const root = document.documentElement;
			const body = document.body;
			const resolveZai = () => {
				return body?.hasAttribute?.("data-ds-dark-theme") === true || root.hasAttribute("data-ds-dark-theme") === true ? "zai-dark" : "zai-light";
			};
			const apply = () => {
				const theme = resolveZai();
				root.classList.toggle("theme-zai-light", theme === "zai-light");
				root.classList.toggle("theme-zai-dark", theme === "zai-dark");
				root.classList.toggle("dark", theme === "zai-dark");
			};
			apply();
			const observer = new MutationObserver(apply);
			if (body !== void 0 && body !== null) observer.observe(body, {
				attributes: true,
				attributeFilter: ["data-ds-dark-theme"]
			});
			observer.observe(root, {
				attributes: true,
				attributeFilter: ["data-ds-dark-theme", "class"]
			});
			return () => {
				observer.disconnect();
			};
		}
		//#endregion
		//#region src/client/virtual-skip.ts
		/**
		* 会话消息的离屏跳过（CSS-only，默认开启，可一行命令关闭）。
		*
		* ## 问题
		*
		* 宿主 `ChatNodeList` 对消息是 `entries.map(...)` **全量渲染，没有任何虚拟化**
		* （宿主全文件仅 2 处 `useVirtualizer`，且都在右侧 turn 导航条上）。
		* 长会话会把上千条消息同时挂进 DOM，而全站 4681 条 CSS 规则要对每个节点匹配 ——
		* 实测样式匹配占交互成本 **98.9%**（有 CSS 9.5ms / 无 CSS 0.1ms）。
		*
		* ## 为什么之前插 wrapper 的方案失败了
		*
		* `[data-slot="conversation.session"]` 的内联样式是 `display: contents`，
		* 它**不产生盒子**，所以其子元素无法建立 size containment 上下文
		* （W3C CSSWG Issue #10848；css-contain-2 规定 `content-visibility`
		* 仅适用于支持 size containment 的元素）。
		*
		* 之前的做法是插入一层 wrapper 来"造"一个盒子 —— 高度算对了，
		* 但**插入了新的 DOM 节点**，React 子树结构被改变，宿主布局假设失效，
		* 用户实测出现「组件乱飘」（对话框跳到顶部，加载完才复位）。**已回滚。**
		*
		* ## 本方案：只改 CSS，不插节点
		*
		* 不去加节点，而是**把 `display: contents` 覆盖成 `display: block`**：
		*
		* ```css
		* [data-slot="conversation.session"]{ display:block !important; height:auto !important; }
		* [data-slot="conversation.session"] > *{ content-visibility:auto; contain-intrinsic-size:auto Npx; }
		* ```
		*
		* 于是该元素自己产生盒子，子元素的 size containment 成立，
		* `content-visibility` 正常工作。**DOM 结构完全不变，React 无感知。**
		*
		* ### 实测（真实宿主，1000 单元）
		*
		* | 方案 | 耗时 | scrollHeight |
		* | --- | --- | --- |
		* | 仅 block | 6.7ms | 66760 |
		* | **block + content-visibility** | **4.4ms** | **66760** |
		*
		* - 提速 **1.52×**
		* - 滚动高度偏差 **0%**
		* - 输入框位置偏差 **0px**（与原生 `display:contents` 状态完全一致）
		* - 滚动到底可达、中段滚动正常
		*
		* ## 为什么这次不会"飘"
		*
		* | | 旧方案（wrapper） | 本方案（CSS-only） |
		* | --- | --- | --- |
		* | 改动类型 | 插入 DOM 节点 | 只改 CSS 属性 |
		* | React 是否感知 | **是**（子树结构变了） | **否** |
		* | 实测布局位移 | 有（用户报告乱飘） | **0px** |
		*
		* ## 安全网
		*
		* 1. **回滚口极小**：`localStorage['dcu-virtual-skip'] = '0'` 即关闭；
		* 2. **只在超长会话启用**：消息数 < `ACTIVATE_ABOVE_UNITS` 时不注入任何样式
		*    （短会话本来就不卡，没必要承担任何风险）；
		* 3. **幂等**：样式标签按 id 管理，重复调用不会叠加；
		* 4. **卸载干净**：只移除自己的样式标签。内联 `display:contents` 从头到尾没被改过
		*    （我们是靠 CSS 覆盖，不是写内联），所以卸载后必然完整复原。
		*
		* ## 已知限制
		*
		* - `contain-intrinsic-size` 是单一固定值（见 `VIRTUAL_SKIP_UNIT_PX` 的校准说明）；
		*   宿主换字号或消息类型分布变化后需要重新校准；
		* - 若宿主将来自己引入虚拟滚动，本模块应停用（届时 `display:block` 覆盖无意义）；
		* - **未在用户真实超长会话上直接验证**（隔离环境读不到该会话），
		*   所有数据来自同规模注入测量。若出现异常，设 `'0'` 即完全还原。
		*/
		/** 开关的 localStorage 键。默认开启；设为 '0' 关闭。 */
		const VIRTUAL_SKIP_FLAG = "dcu-virtual-skip";
		/** 样式标签 id（幂等与卸载靠它）。 */
		const STYLE_ID = "dsh-zcode-ui/virtual-skip.css";
		/** 会话容器的选择器。 */
		const SESSION_SELECTOR = "[data-conversation-scroll] [data-slot=\"conversation.session\"]";
		function enabled() {
			try {
				return window.localStorage.getItem(VIRTUAL_SKIP_FLAG) !== "0";
			} catch {
				return true;
			}
		}
		/**
		* 探测「消息所在的那一层」。
		*
		* ## 为什么必须探测
		*
		* 宿主真实结构未知，可能是：
		*   A: `session > 消息 × 490`       （直接子元素就是消息）
		*   B: `session > turn > 消息 × 490`（消息被 turn 包了一层）
		*
		* 若在情况 B 下只给 `session > *` 加 `content-visibility`，
		* 命中的是 **turn 容器**——它内部含 490 条消息、高度上万像素，
		* 用 `contain-intrinsic-size` 估算必然严重偏离 ⇒ 滚动条崩塌。
		*
		* 所以必须先找出「子元素数量足够多」的那一层，只给那一层的子元素打标记。
		*
		* ## 判定规则
		*
		* 从 session 起逐层向下（最多 4 层）：
		* 1. 若当前层子元素 ≥ `ACTIVATE_ABOVE_UNITS` → 就是消息层；
		* 2. 否则选「子元素最多的那个孩子」继续下探（跳过装饰性的单子元素包裹）；
		* 3. 探不到就返回 null，**什么都不做**（宁可不动，也不能乱动）。
		*/
		function findMessageLayer(session) {
			let layer = session;
			for (let depth = 0; depth < 4; depth++) {
				if (layer.children.length >= 300) return layer;
				let next = null;
				let bestCount = 0;
				for (const child of Array.from(layer.children)) {
					if (!(child instanceof HTMLElement)) continue;
					if (child.children.length > bestCount) {
						bestCount = child.children.length;
						next = child;
					}
				}
				if (next === null || bestCount === 0) return null;
				layer = next;
			}
			return layer.children.length >= 300 ? layer : null;
		}
		/** 打标记用的属性名（只加属性，不改结构）。 */
		const UNIT_ATTR = "data-dcu-viskip";
		/** 生成样式表。 */
		function buildStyle() {
			return [`${SESSION_SELECTOR}{display:block !important;height:auto !important}`, `[${UNIT_ATTR}]{content-visibility:auto;contain-intrinsic-size:auto 275px}`].join("\n");
		}
		/** 给消息层的子元素打标记；返回打了几条。 */
		function markMessages(layer) {
			let n = 0;
			for (const child of Array.from(layer.children)) {
				if (!(child instanceof HTMLElement)) continue;
				if (child.getAttribute(UNIT_ATTR) === null) child.setAttribute(UNIT_ATTR, "");
				n++;
			}
			return n;
		}
		/** 卸载：只移除我们自己的样式，不动任何内联样式。 */
		function uninstall() {
			document.getElementById(STYLE_ID)?.remove();
			for (const el of document.querySelectorAll(`[${UNIT_ATTR}]`)) el.removeAttribute(UNIT_ATTR);
		}
		/** 安装：满足条件才注入；幂等。 */
		function installIfNeeded() {
			const session = document.querySelector(SESSION_SELECTOR);
			if (session === null) {
				uninstall();
				return;
			}
			if (session.getElementsByTagName("*").length < 300) {
				uninstall();
				return;
			}
			const layer = findMessageLayer(session);
			if (layer === null) {
				uninstall();
				return;
			}
			markMessages(layer);
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = buildStyle();
			document.head.appendChild(style);
		}
		/**
		* 安装离屏跳过。返回卸载函数。
		*
		* 用 MutationObserver 持续重试：插件初始化时 `conversation.session` 往往为空
		* （首屏在首页，或会话未加载），只跑一次会让功能完全失效。
		*/
		function installVirtualSkip() {
			if (!enabled()) return () => {};
			installIfNeeded();
			const observer = new MutationObserver(() => {
				installIfNeeded();
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			return () => {
				observer.disconnect();
				uninstall();
			};
		}
		//#endregion
		//#region src/client/document-hidden-motion-pause.ts
		/**
		* 文档隐藏时暂停动效 —— 移植自 ZCode `lib/documentHiddenMotionPause.ts`。
		*
		* ## 为什么需要它（上游原文，见 ZCode packages/ui/src/styles.css:84-86）
		*
		* 「窗口 hidden 时 CSS 动画无法结算，DocumentTimeline 会持有期间被移除的元素及整棵子树，
		* 后台流式输出时内存无上限累积、恢复可见才释放。hidden 期间禁用动画，不再创建新的动画对象。」
		*
		* 对本插件的具体意义：DSH 的会话区在后台仍会流式追加内容，被替换掉的旧节点本应立即回收，
		* 但只要页面上还有未结算的动画，Chromium 的 DocumentTimeline 就会继续持有它们。
		* 长对话 + 后台流式输出正是这个泄漏最容易放大的场景（本仓库 §27 已记录过长对话下的
		* 样式重算规模，动画对象累积是同一现场的另一面）。
		*
		* ## 与 reduced-motion 的分工（两者都不能省）
		*
		* | 机制 | 触发条件 | 解决什么 |
		* | --- | --- | --- |
		* | `prefers-reduced-motion` | 用户偏好 | 可访问性：不要动效 |
		* | `data-document-hidden` | 页面不可见 | 内存：隐藏期间不创建动画对象 |
		*
		* 两者的 CSS 写法都是「停动画」，但**触发条件无关**：一个用户开着动效偏好时后台仍会累积。
		* 所以不能合并成一条规则。
		*
		* ## 为什么用属性而不是直接改样式
		*
		* 属性让「隐藏暂停」成为一个**可观测状态**：DevTools 里能直接看到
		* `html[data-document-hidden]`，排查「后台是否真的停了」不需要读 JS 状态。
		* 上游同款（`installDocumentHiddenMotionPause`）。
		*/
		/** 挂在 `html` 上的标记属性；CSS 侧用它停掉 transition / animation。 */
		const DOCUMENT_HIDDEN_ATTRIBUTE = "data-document-hidden";
		/**
		* 安装「文档隐藏时暂停动效」。
		*
		* 立即按当前 `visibilityState` 同步一次（插件可能在页面已经隐藏时被加载，例如
		* 后台标签页里宿主恢复会话），随后监听 `visibilitychange`。
		*
		* @param doc - 目标文档；默认 `globalThis.document`。
		* @returns 卸载函数，供 `ctx.effect` 在插件卸载时回收。
		*/
		function installDocumentHiddenMotionPause(doc = globalThis.document) {
			if (doc === void 0) return () => {};
			const sync = () => {
				doc.documentElement.toggleAttribute(DOCUMENT_HIDDEN_ATTRIBUTE, doc.visibilityState === "hidden");
			};
			sync();
			doc.addEventListener("visibilitychange", sync);
			return () => {
				doc.removeEventListener("visibilitychange", sync);
				doc.documentElement.removeAttribute(DOCUMENT_HIDDEN_ATTRIBUTE);
			};
		}
		//#endregion
		//#region src/client/host-anchor-contract.ts
		/**
		* 参与运行时自检的锚点组。
		*
		* 新增依赖上游哈希类名的代码时，**必须**把锚点登记到这里（`tests/design-system.assert.ts`
		* 会校验源码里用到的锚点都在本表中），否则上游改名后仍然是静默失效。
		*/
		const HOST_ANCHOR_GROUPS = [
			{
				scope: "[data-phase=hero]",
				consequence: "新建会话页的整体排版（hero 标题、引导区宽度、工作区行）会整块失效",
				anchors: [
					"[class*=\"_composerHero\"]",
					"[class$=\"_stack\"]",
					"[class$=\"_headline\"]",
					"[class*=\"_heroWorkspaceRow\"]",
					"[class$=\"_fishHitbox\"]"
				]
			},
			{
				scope: "[data-composer-card]",
				consequence: "发送键会退回宿主默认配色，加号的悬停底与输入壳尺寸规则失效",
				anchors: ["[class$=_primary]", "[class*=\"_add\"]"]
			},
			{
				scope: "[data-conversation-scroll] .md-code-block",
				consequence: "D1 围栏码卡只剩令牌底色：头部条退回宿主深条、码体失去 shiki 底/字与圆角",
				anchors: ["[class*=\"_bannerWrap\"]"]
			}
		];
		/** 在给定根节点下审计锚点，返回缺失项。作用域不在场时跳过该组（不报）。 */
		function findMissingHostAnchors(root) {
			const missing = [];
			for (const group of HOST_ANCHOR_GROUPS) {
				const scope = root.querySelector(group.scope);
				if (scope === null) continue;
				for (const anchor of group.anchors) if (scope.querySelector(anchor) === null) missing.push(`${group.scope} > ${anchor}`);
			}
			return missing;
		}
		/** 从缺失项反查它属于哪一组（用于警告文案）。 */
		const groupOf = (missing) => HOST_ANCHOR_GROUPS.find((group) => missing.startsWith(`${group.scope} > `));
		/**
		* 持续审计宿主锚点：作用域在场但锚点缺失即报警。
		* 同一组缺失只报一次（上游改名会同时打掉一整组，重复报没有新信息）。
		*
		* @param root - 观察根节点，默认 `document.body`。
		* @returns dispose 函数。
		*/
		function observeHostAnchors(root = typeof document === "undefined" ? null : document.body) {
			if (root === null) return () => {};
			const reported = /* @__PURE__ */ new Set();
			let scheduled = false;
			const check = () => {
				scheduled = false;
				if (typeof document !== "undefined" && document.querySelector("[data-dcu-sidebar-motion]") !== null) return;
				const missing = findMissingHostAnchors(root);
				if (missing.length === 0) return;
				const byScope = /* @__PURE__ */ new Map();
				for (const item of missing) {
					const scope = item.split(" > ")[0];
					byScope.set(scope, [...byScope.get(scope) ?? [], item]);
				}
				for (const [scope, items] of byScope) {
					if (reported.has(scope)) continue;
					reported.add(scope);
					const consequence = groupOf(items[0])?.consequence ?? "相关样式会静默失效";
					console.warn(`[dsh-zcode-ui] 宿主锚点失效：${scope} 在场，但契约锚点缺失 ${items.map((item) => item.split(" > ")[1]).join("、")}。 后果：${consequence}。 多半是上游改了 CSS Module 的块名或哈希——请更新 HOST_ANCHOR_GROUPS 与对应样式（见 docs/ZCODE-DESIGN.md §12）。`);
				}
			};
			const schedule = () => {
				if (scheduled) return;
				scheduled = true;
				if (typeof requestAnimationFrame === "function") requestAnimationFrame(check);
				else setTimeout(check, 16);
			};
			const observer = new MutationObserver(schedule);
			observer.observe(root, {
				childList: true,
				subtree: true
			});
			check();
			return () => {
				observer.disconnect();
			};
		}
		//#endregion
		//#region src/client/foreign-surface-discovery.ts
		/**
		* 外来表面发现 —— 让"将来会加入的插件"也能被管起来。
		*
		* ## 枚举制为什么答不了"不论什么插件"
		*
		* `foreign-content-contract.ts` 是**枚举制**：逐个登记外来类名，再逐个收敛。
		* 这在生态里活不下去——DSH 的外来内容大量使用 CSS Module 哈希类名
		* （实测会话区 `yhfFVG_*` / `cl2Rlq_*` / `wXeviG_*` / `sk-*`，侧栏 `dsh-session-kit-*`），
		* 每次加插件都要重新抓包、补清单。清单永远追不上生态。
		*
		* ## 本模块的做法：发现 + 分级，而不是枚举
		*
		* 1. **信封兜底**（`skin-envelope.ts`）先做通用收敛（字体 / 盒模型 / 数字格式）——
		*    这部分不挑插件，进来就生效；
		* 2. 本模块再**发现信封管不到的那部分**：在皮肤 surfaces 里找出"基底不符"的未登记外来根，
		*    连同漂移证据一起报出来，让人决定是收敛还是登记为浮层。
		*
		* **只报不达标的外来根**（与皮肤字体不同、字号/圆角离标度、自带不透明卡片底），
		* 已达标的（实测：system-ui 字体、999/4px/8px 圆角、`#d4d4d4` 的 60%/40% 派生文字色）
		* 一律不报——否则噪声会淹没信号，最后没人看警告。
		*
		* ## 为什么哨兵必须增量扫描（2026-10-18 真机性能事故）
		*
		* 旧实现监听 `document.body` 的**每一次** childList，然后在 rAF 里对
		* `[data-conversation-scroll]` 下的**全部分支**逐个 `getComputedStyle`。长会话里
		* 会话区有 2 万多个元素，其中大量未登记的哈希前缀会走到 `getComputedStyle`：
		* 单次扫描实测 **282ms**（Chrome trace: `FireAnimationFrame > FunctionCall check`）。
		* 而宿主在**鼠标悬停消息**时会挂载/卸载操作条（一次 childList 变更），于是
		* 「鼠标一划过消息 → 全文档扫描 → 界面冻住 0.28 秒」。这是用户第四次报告
		* "鼠标操作慢"的真正根因（§30 的合成夹具没有真实宿主的悬停操作条，漏掉了这条路径）。
		*
		* 现在改成：
		* - 只检查 **mutation.addedNodes** 里的新增子树（删除不触发）；
		* - 每个新增子树用显式栈遍历，**每帧最多 8ms**，超预算留到下一帧；
		* - 初次扫描（页面已有内容）也走同一条队列，不再在初始化时同步扫全树；
		* - 每个前缀只**抽样体检 4 个元素**：长会话里 `icaHSq_flowItem` 同一前缀有 844 个，
		*   逐个查样式在打开会话时实测 796ms/92 帧（2026-10-18 第二轮 trace），抽样后降到个位数帧；
		* - `WeakSet` 去重，React 反复挂载同一节点不重复付 `getComputedStyle`。
		*
		* 代价：告警的 `count` 是"抽样命中的样本数"，不再是一次全量扫描的精确计数。
		* 对诊断用途足够；换来的是悬停从 ~11.5ms/次 降到 ~0.5ms/次（真实长会话实测）。
		*/
		/** 已登记的外来根：前缀 → 处置决定。新增插件时先来这里登记，再决定是否收敛。 */
		const KNOWN_FOREIGN_ROOTS = [
			{
				prefix: "dsh-session-kit",
				what: "侧栏会话 kit 的入口行（trigger / label）",
				decision: "envelope-only"
			},
			{
				prefix: "yhf",
				what: "会话区工具条（模式切换 / 添加 / 主操作）",
				decision: "watch"
			},
			{
				prefix: "boc",
				what: "会话区工具条分支",
				decision: "envelope-only"
			},
			{
				prefix: "cl2",
				what: "会话区模式下拉",
				decision: "envelope-only"
			},
			{
				prefix: "m0vb0q",
				what: "会话区工具条节点",
				decision: "envelope-only"
			},
			{
				prefix: "sk",
				what: "会话区 chip",
				decision: "envelope-only"
			},
			{
				prefix: "w",
				what: "会话区触发器（chevron / label）",
				decision: "envelope-only"
			},
			{
				prefix: "cm",
				what: "侧栏页脚计费卡（余额 / 峰值条）",
				decision: "converged"
			}
		];
		/** 皮肤允许的圆角刻度（与 zcode-tokens.ts 的半径标度一致；full 由 999px 表达）。 */
		const SKIN_RADII = /* @__PURE__ */ new Set([
			"0px",
			"2px",
			"4px",
			"6px",
			"8px",
			"12px",
			"16px",
			"999px",
			"50%"
		]);
		/** 皮肤允许的字号刻度（七档界面档 + 三档展示档）。 */
		const SKIN_SIZES = /* @__PURE__ */ new Set([
			"9px",
			"10px",
			"12px",
			"13px",
			"14px",
			"16px",
			"18px",
			"20px",
			"22px",
			"34px"
		]);
		/** 不算"外来"的前缀：自己的、宿主图标的、以及已登记的。 */
		const NOT_FOREIGN = /* @__PURE__ */ new Set([
			"dcu",
			"lucide",
			...KNOWN_FOREIGN_ROOTS.map((item) => item.prefix)
		]);
		/** 一帧内允许花在扫描上的预算（ms）。超过就留到下一帧，保证输入不被长任务挡住。 */
		const SCAN_BUDGET_MS = 8;
		/**
		* 每个外来前缀最多体检几个元素。
		*
		* 长会话里同一前缀能出现 844 次（`icaHSq_flowItem`），逐个 `getComputedStyle`
		* 在打开会话时实测要 796ms（92 帧）。哨兵只需要"这个前缀不对"的证据，
		* 4 个样本足够；`findForeignDrift` 的全量体检不受此限制。
		*/
		const SAMPLE_PER_PREFIX = 4;
		/** 发现第一条漂移后等多久再告警（ms）。攒一小段时间，让 count 更有代表性。 */
		const REPORT_DELAY_MS = 400;
		/** 取元素用于判定的"代表类名"（第一个类名通常就是模块根）。 */
		const rootClass = (element) => (element.getAttribute("class") ?? "").trim().split(/\s+/)[0] ?? "";
		/** 从代表类名提取前缀：哈希类名取首段，语义类名取首段连字符前。 */
		const prefixOf = (className) => {
			if (className === "") return "";
			return className.split(/[-_]/)[0];
		};
		/**
		* 读取皮肤字体基线。
		*
		* @param root - 扫描根，默认 `document.body`。
		* @returns 基线；皮肤正文还没挂载时返回 null（此时不扫描，等新增节点再来）。
		*/
		function readBaseline(root) {
			const baseline = root.querySelector(".dcu-wb-session-title-text") ?? root.querySelector(".dcu-root");
			if (baseline === null) return null;
			return { font: getComputedStyle(baseline).fontFamily.split(",")[0].trim().replace(/["']/g, "") };
		}
		/**
		* 取"未登记的外来前缀"；不是外来内容时返回 null。
		*
		* 只读类名，**不付 `getComputedStyle`**——这是把"逐元素体检"降成
		* "每个前缀抽几个样本"的前提。
		*/
		function foreignPrefixOf(element) {
			const className = rootClass(element);
			if (className === "") return null;
			const prefix = prefixOf(className);
			if (prefix === "" || NOT_FOREIGN.has(prefix)) return null;
			if (!/^[a-z][a-z0-9]/.test(prefix)) return null;
			return prefix;
		}
		/**
		* 对单个已知前缀的元素做一次样式体检（唯一昂贵调用）。
		*/
		function driftOf(element, prefix, baseline) {
			const style = getComputedStyle(element);
			const drifts = [];
			const font = style.fontFamily;
			if (!/mono|menlo|consolas|courier/i.test(font) && font.split(",")[0].trim().replace(/["']/g, "") !== baseline.font) drifts.push(`字体不同（${font.split(",")[0].trim()} ≠ ${baseline.font}）`);
			const size = style.fontSize;
			if (!SKIN_SIZES.has(size)) drifts.push(`字号 ${size} 不在标度内`);
			const radius = style.borderRadius;
			if (radius !== "" && !SKIN_RADII.has(radius)) drifts.push(`圆角 ${radius} 不在标度内`);
			if (drifts.length === 0) return null;
			return {
				prefix,
				count: 1,
				tag: element.tagName.toLowerCase(),
				drifts
			};
		}
		/** 皮肤 surfaces 的选择器（与 skin-envelope.ts 保持同源，避免两边漂移）。 */
		const SKIN_SURFACE_SELECTOR = [
			".dcu-root",
			".dcu-settings-page",
			".dcu-home",
			"[data-dcu-settings-page]",
			"[data-phase=hero]",
			"[data-conversation-scroll]"
		].join(",");
		/**
		* 持续发现外来表面的漂移：发现不达标的外来根即报警，同一前缀只报一次。
		* 它不修复任何东西——它的职责是把"没人知道有个插件装错了"变成"控制台里看得见"。
		*
		* 扫描是**增量的**：只处理新增子树，每帧最多 8ms；详见文件头的事故记录。
		*
		* @param root - 观察根，默认 `document.body`。
		* @returns dispose 函数。
		*/
		function observeForeignSurfaces(root = typeof document === "undefined" ? null : document.body) {
			if (root === null) return () => {};
			const reported = /* @__PURE__ */ new Set();
			const stats = /* @__PURE__ */ new Map();
			/** 前缀 → 已体检的样本数（只数到 `SAMPLE_PER_PREFIX`）。 */
			const checked = /* @__PURE__ */ new Map();
			const seen = /* @__PURE__ */ new WeakSet();
			const stack = [];
			let scheduled = false;
			let reportTimer = null;
			let baseline;
			const baselineOf = () => {
				if (baseline === void 0 || baseline === null) baseline = readBaseline(root);
				return baseline;
			};
			const report = () => {
				reportTimer = null;
				for (const item of stats.values()) {
					if (reported.has(item.prefix)) continue;
					reported.add(item.prefix);
					console.warn(`[dsh-zcode-ui] 外来表面未达标：前缀 \`${item.prefix}\`（${item.count} 处 <${item.tag}>）—— ${item.drifts.join("；")}。 若是新装的插件：多数情况皮肤信封已兜底；若视觉仍突兀，请在 KNOWN_FOREIGN_ROOTS 登记它， 并按 foreign-content-contract 的三条契约决定收敛方式（见 docs/ZCODE-DESIGN.md §10）。`);
				}
			};
			const flush = () => {
				scheduled = false;
				const base = baselineOf();
				if (base === null) {
					stack.length = 0;
					return;
				}
				const deadline = performance.now() + SCAN_BUDGET_MS;
				while (stack.length > 0 && performance.now() < deadline) {
					const { element, insideSurface } = stack.pop();
					if (!element.isConnected) continue;
					if (seen.has(element)) continue;
					seen.add(element);
					if (insideSurface) {
						const prefix = foreignPrefixOf(element);
						if (prefix !== null) {
							const sampled = checked.get(prefix) ?? 0;
							if (sampled < SAMPLE_PER_PREFIX) {
								checked.set(prefix, sampled + 1);
								const candidate = driftOf(element, prefix, base);
								if (candidate !== null) {
									const existing = stats.get(candidate.prefix);
									stats.set(candidate.prefix, existing === void 0 ? candidate : {
										...existing,
										count: existing.count + 1
									});
									if (!reported.has(candidate.prefix) && reportTimer === null) reportTimer = setTimeout(report, REPORT_DELAY_MS);
								}
							}
						}
					}
					const childrenInside = insideSurface || element.matches(SKIN_SURFACE_SELECTOR);
					for (let child = element.firstElementChild; child !== null; child = child.nextElementSibling) stack.push({
						element: child,
						insideSurface: childrenInside
					});
				}
				if (stack.length > 0) schedule();
			};
			const schedule = () => {
				if (scheduled) return;
				scheduled = true;
				if (typeof requestAnimationFrame === "function") requestAnimationFrame(flush);
				else setTimeout(flush, 16);
			};
			/** 只把"在 surface 内"或"包含 surface"的新增子树排进队列；其余与哨兵无关。 */
			const enqueue = (node) => {
				if (!(node instanceof Element)) return;
				const insideSurface = node.closest(SKIN_SURFACE_SELECTOR) !== null;
				if (!insideSurface && node.querySelector(SKIN_SURFACE_SELECTOR) === null) return;
				stack.push({
					element: node,
					insideSurface
				});
				schedule();
			};
			const observer = new MutationObserver((records) => {
				for (const record of records) for (const node of record.addedNodes) enqueue(node);
			});
			observer.observe(root, {
				childList: true,
				subtree: true
			});
			for (const surface of root.querySelectorAll(SKIN_SURFACE_SELECTOR)) stack.push({
				element: surface,
				insideSurface: false
			});
			schedule();
			return () => {
				observer.disconnect();
				if (reportTimer !== null) clearTimeout(reportTimer);
				stack.length = 0;
			};
		}
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"layout",
			"locale",
			"connection",
			"inputTriggers",
			"conversation"
		];
		function hasDeleteSession(value) {
			return hasArchiveSessionDelete(value);
		}
		async function runHostAction(action, execute) {
			try {
				return await execute();
			} catch (reason) {
				if (reason instanceof UserFacingError || reason instanceof HostActionError) throw reason;
				throw new HostActionError(action, reason);
			}
		}
		/** Archive Manager replaces the official ui-workspace row with this optional service. */
		function startWorkspaceSession(ctx, workspaceId) {
			const uiWorkspace = probeService(ctx, "uiWorkspace");
			if (hasStartSession(uiWorkspace)) {
				uiWorkspace.startSession(workspaceId);
				return;
			}
			if (hasStartSession(ctx.workspaces)) {
				ctx.workspaces.startSession(workspaceId);
				return;
			}
			console.warn("DSH 工作空间服务尚未就绪，无法新建会话。");
		}
		/** 替换 DSH 的官方 sidebar 插槽，不修改 DSH 源码或会话数据。 */
		function apply(ctx) {
			Object.assign(globalThis, { __dcuCurrentSessionId: currentSessionId });
			const widthStorage = browserStorage();
			if (widthStorage) initializeComposerWidth(widthStorage);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "zcode-ui-for-dsh: dictionaries");
			ctx.effect(() => installSkin(), "zcode-ui-for-dsh: skin stylesheet");
			ctx.effect(() => installThemeStyle(), "zcode-ui-for-dsh: theme stylesheet");
			ctx.effect(() => syncZCodeTheme(), "zcode-ui-for-dsh: theme mirror");
			ctx.effect(() => installComposerVisuals(), "zcode-ui-for-dsh: composer visuals");
			ctx.effect(() => installVirtualSkip(), "zcode-ui-for-dsh: virtual skip (experimental)");
			ctx.effect(() => installDocumentHiddenMotionPause(), "zcode-ui-for-dsh: hidden motion pause");
			ctx.effect(() => observeHostAnchors(), "zcode-ui-for-dsh: host anchor sentinel");
			ctx.effect(() => observeForeignSurfaces(), "zcode-ui-for-dsh: foreign surface sentinel");
			ctx.logger.info("dsh-zcode-ui: ZCode skin v%s installed", SKIN_VERSION);
			const t = ctx.locale.bind(NS);
			ctx.effect(() => observeHeroWidthHandles(t("home.resizeInput")), "zcode-ui-for-dsh: hero width handles");
			registerInputHistory(ctx);
			const shortcutCatalog = liveShortcutCatalog(ctx);
			registerSettingsPage(ctx, shortcutCatalog);
			registerPluginConfigSection(ctx);
			const connection = ctx.get("connection");
			const openPath = (path) => openPathInHost(connection, path);
			ctx.effect(() => observeSlimSidebar(), "zcode-ui-for-dsh: slim sidebar");
			ctx.effect(() => observeSettingsNavIcons(), "zcode-ui-for-dsh: settings nav icons");
			ctx.effect(() => observeComposerToolMenus({
				search: t("home.projectSearch"),
				empty: t("home.projectEmpty")
			}), "zcode-ui-for-dsh: composer tool menus");
			ctx.effect(() => observeConversationHeader(), "zcode-ui-for-dsh: conversation header");
			ctx.effect(() => observeOfficialTurnNavigators(), "zcode-ui-for-dsh: official turn navigator");
			ctx.effect(() => installConversationLayout(), "zcode-ui-for-dsh: conversation layout");
			ctx.effect(() => installUserBubbleCollapse(), "zcode-ui-for-dsh: user bubble collapse");
			ctx.effect(() => {
				observeZcodeTurnRail();
				return () => {
					stopZcodeTurnRail();
				};
			}, "zcode-ui-for-dsh: zcode turn rail hover wave");
			ctx.effect(() => dedupeTurnRails(), "zcode-ui-for-dsh: turn rail dedupe");
			const newConversationDraft = createDraftPresenceSource(ctx.sessions.list, () => {
				const id = currentSessionId(ctx.sessions.list.getSnapshot());
				const binding = id === void 0 ? void 0 : ctx.sessions.binding(id);
				return binding === void 0 ? void 0 : ctx.conversation.input.for(binding.ctx).state;
			});
			const companionSlots = createCompanionTabSource(ctx.slots);
			const globalPanels = createGlobalPanelSource(ctx.slots, ctx.locale);
			const footerActions = createFooterActionSource(ctx.slots);
			const navigationHistory = createNavigationHistory(ctx.sessions.list, (id) => openConversation(ctx, ctx.layout, id));
			ctx.effect(() => () => {
				navigationHistory.dispose();
			}, "zcode-ui-for-dsh: navigation history");
			const workspaceShortcuts = createWorkspaceShortcutSource(ctx.slots);
			ctx.effect(() => () => {
				workspaceShortcuts.dispose();
			}, "zcode-ui-for-dsh: workspace shortcuts");
			const shortcutStorage = browserStorage();
			installSessionNavigationShortcuts(ctx, {
				t: (key) => t(key),
				readOrder: () => flattenSidebarSessionOrder({
					workspaces: ctx.workspaces.list.getSnapshot(),
					sessions: ctx.sessions.list.getSnapshot(),
					pinnedWorkspaceIds: readPinnedWorkspaceIds(shortcutStorage),
					workspaceGroups: readWorkspaceGroupsCache(shortcutStorage).workspaceGroups
				}),
				currentId: () => currentSessionId(ctx.sessions.list.getSnapshot()),
				openSession: (sessionId) => {
					openConversation(ctx, ctx.layout, sessionId);
				}
			});
			registerWorkspaceDirectoryFlow(ctx);
			const ownSidebarChildren = {
				[WORKSPACE_DIRECTORY_FLOW]: {
					kind: "single",
					scope: "root"
				},
				"sidebar.channels": {
					kind: "single",
					scope: "root"
				},
				"sidebar.schedule": {
					kind: "single",
					scope: "root"
				}
			};
			const sharedSidebarChildren = {
				"sidebar.panellist": {
					kind: "list",
					scope: "root"
				},
				"sidebar.workspaces": {
					kind: "single",
					scope: "root"
				},
				"sidebar.settings": {
					kind: "single",
					scope: "root"
				},
				"sidebar.footer.action": {
					kind: "list",
					scope: "root"
				}
			};
			const sidebarSlotAliases = {
				"sidebar.panellist": "sidebar.codex.panellist",
				"sidebar.workspaces": "sidebar.codex.workspaces",
				"sidebar.schedule": "sidebar.codex.schedule",
				"sidebar.settings": "sidebar.codex.settings",
				"sidebar.footer.action": "sidebar.codex.footer.action"
			};
			const sidebarAliasChildren = {
				"sidebar.codex.panellist": {
					kind: "list",
					scope: "root"
				},
				"sidebar.codex.workspaces": {
					kind: "single",
					scope: "root"
				},
				"sidebar.codex.schedule": {
					kind: "single",
					scope: "root"
				},
				"sidebar.codex.settings": {
					kind: "single",
					scope: "root"
				},
				"sidebar.codex.footer.action": {
					kind: "list",
					scope: "root"
				}
			};
			const aliasedSidebar = withSlotAliases(CodexSidebar, sidebarSlotAliases);
			const officialSidebarReady = () => ctx.slots.spec?.("sidebar.workspaces") !== void 0;
			ctx.slots.inject("sidebar", () => registerAfterOfficialWave(ctx.slots, "sidebar", officialSidebarReady, (timedOut = false) => {
				const declared = (name) => {
					const spec = ctx.slots.spec;
					return typeof spec === "function" && spec.call(ctx.slots, name) !== void 0;
				};
				const allSidebarChildren = {
					...sharedSidebarChildren,
					...ownSidebarChildren,
					...sidebarAliasChildren
				};
				const children = {};
				const candidates = timedOut ? {
					...ownSidebarChildren,
					...sidebarAliasChildren
				} : allSidebarChildren;
				for (const [name, spec] of Object.entries(candidates)) if (!declared(name)) Object.assign(children, { [name]: spec });
				const register = (next) => {
					try {
						const unregister = ctx.slots.register({
							name: "sidebar",
							priority: -1,
							registrant: "zcode-ui-for-dsh",
							locale: NS,
							children: next,
							inject: () => ({
								newConversationDraft,
								navigationHistory,
								workspaceShortcuts,
								shortcuts: shortcutCatalog,
								prefillNewConversation: (text) => {
									const id = currentSessionId(ctx.sessions.list.getSnapshot());
									const binding = id === void 0 ? void 0 : ctx.sessions.binding(id);
									return prefillNewConversation(binding === void 0 ? void 0 : ctx.conversation.input.for(binding.ctx), text);
								},
								openSession: (sessionId) => {
									openConversation(ctx, ctx.layout, sessionId);
								},
								startSession: (workspaceId) => {
									startWorkspaceSession(ctx, workspaceId);
								},
								toggleSidebar: () => {
									ctx.layout.toggleSidebar();
								},
								archiveSession,
								canDeleteSession: () => hasArchiveSessionDelete(ctx.get("remote.workspaceRegistry")),
								deleteSession,
								forkSession,
								moveSession,
								renameSession,
								openPath,
								companionSlots,
								globalPanels,
								footerActions,
								selectPanel: (id) => {
									selectGlobalPanel(ctx.layout, id);
								}
							})
						}, aliasedSidebar);
						const mirrors = [];
						try {
							for (const [source, target] of Object.entries(sidebarSlotAliases)) if (typeof ctx.slots.spec === "function") mirrors.push(ctx.slots.inject(source, () => mirrorSlot({ slots: ctx.slots }, source, target)));
						} catch (error) {
							for (const dispose of mirrors.reverse()) dispose();
							unregister();
							throw error;
						}
						return () => {
							for (const dispose of mirrors.reverse()) dispose();
							unregister();
						};
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						const conflict = /slot "([^"]+)" is already declared/.exec(message);
						const conflictKey = conflict === null ? void 0 : Object.keys(next).find((key) => key === conflict[1]);
						if (conflictKey === void 0 || next[conflictKey] === void 0) throw error;
						const rest = { ...next };
						delete rest[conflictKey];
						return register(rest);
					}
				};
				return register(children);
			}, true));
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "turn-navigator",
				order: 100,
				locale: NS
			}, TurnNavigator));
			const forkSession = async (sessionId) => {
				await runHostAction("fork", () => forkHostSession(ctx, sessionId));
			};
			const renameSession = async (sessionId, title) => {
				await runHostAction("rename", async () => {
					try {
						await renameHostSession(ctx, sessionId, title);
					} catch (reason) {
						if (reason instanceof UnknownSessionError) throw new UserFacingError(t("sessions.unknown"));
						throw reason;
					}
				});
			};
			const deleteSession = async (sessionId) => {
				const registry = ctx.get("remote.workspaceRegistry");
				if (!hasDeleteSession(registry)) throw new UserFacingError(t("sessions.deleteUnavailable"));
				await runHostAction("delete", async () => {
					const result = await registry.deleteSession(sessionId);
					if (!result.ok) throw result.error === void 0 ? new UserFacingError(t("sessions.deleteUnavailable")) : result.error;
				});
			};
			const archiveSession = (sessionId) => runHostAction("archive", () => archiveHostSession(ctx, sessionId));
			const moveSession = async (sessionId, targetWorkspaceId) => {
				try {
					await requestSessionMove(sessionId, targetWorkspaceId);
				} catch (error) {
					if (!(error instanceof SessionMoveRequestError)) throw error;
					throw new UserFacingError(t(sessionMoveErrorKey(error.code)));
				}
				finishSessionMove({
					sessionId,
					currentUrl: window.location.href,
					navigate: (url) => {
						window.location.replace(url);
					}
				});
			};
			const startConnectorPromptSession = async (promptText) => {
				const prompt = promptText.trim();
				if (prompt === "") throw new UserFacingError(t("connectors.promptRequired"));
				const workspaces = ctx.workspaces.list.getSnapshot();
				const sessionSnapshot = ctx.sessions.list.getSnapshot();
				const selectedSessionId = currentSessionId(sessionSnapshot);
				const currentWorkspaceId = selectedSessionId === void 0 ? void 0 : workspaces.items.find((workspace) => workspace.sessionIds.includes(selectedSessionId))?.workspaceId;
				const baselinesReady = workspaceBaselinesReady(workspaces, sessionSnapshot);
				const targetWorkspaceId = currentWorkspaceId ?? (baselinesReady ? recentWorkspaceId(workspaces.items, sessionSnapshot.byId) : void 0);
				if (targetWorkspaceId === void 0 && !baselinesReady) throw new UserFacingError(t("connectors.workspacesLoading"));
				if (targetWorkspaceId === void 0) throw new UserFacingError(t("connectors.workspaceRequired"));
				const uiWorkspace = probeService(ctx, "uiWorkspace");
				const conversation = ctx.get("conversation");
				if (conversation === void 0) throw new UserFacingError(t("connectors.conversationUnavailable"));
				try {
					if (hasOpenWorkspace(uiWorkspace)) {
						await Promise.resolve(uiWorkspace.openWorkspace(targetWorkspaceId, (id) => {
							const binding = ctx.sessions.binding(id);
							if (binding?.ctx === void 0) throw new UnknownSessionError();
							conversation.input.for(binding.ctx).setDraft(prompt);
						}));
						selectGlobalPanel(ctx.layout, null);
						return;
					}
					const workspaceNavigation = hasConnectWorkspace(uiWorkspace) ? uiWorkspace : hasConnectWorkspace(ctx.workspaces) ? ctx.workspaces : void 0;
					if (workspaceNavigation === void 0) throw new UserFacingError(t("connectors.workspaceUnavailable"));
					const sessionId = await workspaceNavigation.connectWorkspace(targetWorkspaceId);
					await openConversationWithDraft(ctx, ctx.layout, ctx.sessions, sessionId, (binding) => {
						if (binding.ctx === void 0) throw new UnknownSessionError();
						conversation.input.for(binding.ctx).setDraft(prompt);
					});
				} catch (reason) {
					if (reason instanceof UnknownSessionError) throw new UserFacingError(t("connectors.sessionPending"));
					throw reason;
				}
			};
			ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({
				name: "sidebar.workspaces",
				priority: -1,
				locale: NS,
				inject: () => ({
					archiveSession,
					canDeleteSession: () => hasArchiveSessionDelete(ctx.get("remote.workspaceRegistry")),
					deleteSession,
					deleteWorkspace: (workspaceId) => ctx.workspaces.delete(workspaceId),
					forkSession,
					moveSession,
					openPath,
					openSession: (sessionId) => {
						openConversation(ctx, ctx.layout, sessionId);
					},
					shortcuts: shortcutCatalog,
					...typeof ctx.workspaces.pinSession === "function" && typeof ctx.workspaces.unpinSession === "function" ? {
						pinSession: (sessionId) => runHostAction("pin", () => ctx.workspaces.pinSession(sessionId)),
						unpinSession: (sessionId) => runHostAction("pin", () => ctx.workspaces.unpinSession(sessionId))
					} : {},
					renameSession,
					renameWorkspace: (workspaceId, title) => ctx.workspaces.rename(workspaceId, title),
					insertWorkspaceBefore: (workspaceId, beforeWorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
					insertSessionBefore: (workspaceId, sessionId, beforeSessionId) => ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId),
					startSession: (workspaceId) => {
						startWorkspaceSession(ctx, workspaceId);
					},
					workspaceShortcuts
				})
			}, CodexWorkspaceBrowser));
			ctx.effect(() => {
				if (typeof window === "undefined") return () => {};
				const sessionId = new URL(window.location.href).searchParams.get("session");
				if (sessionId === null || sessionId === "") return () => {};
				let opened = false;
				const openDeepLink = () => {
					if (opened || ctx.sessions.list.getSnapshot().byId[sessionId] === void 0) return;
					opened = true;
					openConversation(ctx, ctx.layout, sessionId);
				};
				openDeepLink();
				return ctx.sessions.list.subscribe(openDeepLink);
			}, "zcode-ui-for-dsh: session deep link");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "connectors",
				order: 17,
				label: () => t("sidebar.connectors"),
				icon: "connector",
				inject: () => ({
					sessionStore: ctx.sessions.list,
					startPromptSession: startConnectorPromptSession,
					t
				})
			}, ConnectorsSection));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "about",
				order: Number.MAX_SAFE_INTEGER,
				label: () => t("about.nav"),
				locale: NS
			}, AboutSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.startWorkspaceSession = startWorkspaceSession;
		return module.exports;
	}
});
