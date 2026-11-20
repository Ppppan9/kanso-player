import type { PlaylistItemDto, PlaylistRepeatMode } from "./contracts";

export const PLAYLIST_STORAGE_KEY = "kanso.playlist.v1";

export type PlaylistState = {
	items: PlaylistItemDto[];
	currentId: string | null;
	repeatMode: PlaylistRepeatMode;
};

export const DEFAULT_PLAYLIST_STATE: PlaylistState = {
	items: [],
	currentId: null,
	repeatMode: "all",
};

/** Returns the id of the track that should play after `currentId` ends, or null. */
export function computeNextId(
	items: PlaylistItemDto[],
	currentId: string | null,
	repeatMode: PlaylistRepeatMode,
): string | null {
	if (items.length === 0) return null;
	if (currentId === null) return items[0].id;
	const index = items.findIndex((item) => item.id === currentId);
	if (index === -1) return items[0].id;
	if (index + 1 < items.length) return items[index + 1].id;
	return repeatMode === "off" ? null : items[0].id;
}

/** Returns the id of the track before `currentId`, or null when at the top. */
export function computePrevId(
	items: PlaylistItemDto[],
	currentId: string | null,
): string | null {
	if (items.length === 0) return null;
	const index = currentId
		? items.findIndex((item) => item.id === currentId)
		: -1;
	if (index === -1) return items[items.length - 1].id;
	return index > 0 ? items[index - 1].id : null;
}

export function buildQueueItems(
	startIndex: number,
	items: PlaylistItemDto[],
): { items: PlaylistItemDto[]; currentId: string | null } {
	if (items.length === 0) return { items: [], currentId: null };
	const clampedIndex = Math.max(0, Math.min(startIndex, items.length - 1));
	return { items, currentId: items[clampedIndex].id };
}

export function parseStoredPlaylistState(raw: string): PlaylistState | null {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null) return null;
		const candidate = parsed as Partial<PlaylistState>;
		if (!Array.isArray(candidate.items)) return null;
		const items = candidate.items.filter(
			(item): item is PlaylistItemDto =>
				typeof item === "object" &&
				item !== null &&
				typeof item.id === "string" &&
				typeof item.name === "string" &&
				typeof item.isAudio === "boolean",
		);
		const repeatMode =
			candidate.repeatMode === "one" ||
			candidate.repeatMode === "off" ||
			candidate.repeatMode === "all"
				? candidate.repeatMode
				: DEFAULT_PLAYLIST_STATE.repeatMode;
		const currentId =
			typeof candidate.currentId === "string" &&
			items.some((item) => item.id === candidate.currentId)
				? candidate.currentId
				: null;
		return { items, currentId, repeatMode };
	} catch {
		return null;
	}
}

type Listener = () => void;

class PlaylistStore {
	private state: PlaylistState = DEFAULT_PLAYLIST_STATE;
	private listeners = new Set<Listener>();
	private storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
		null;

	/** Storage must be injected (renderer localStorage); tests can pass a stub. */
	attachStorage(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
		this.storage = storage;
		const raw = storage.getItem(PLAYLIST_STORAGE_KEY);
		if (raw) {
			this.state = parseStoredPlaylistState(raw) ?? DEFAULT_PLAYLIST_STATE;
		}
	}

	getSnapshot = (): PlaylistState => this.state;

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	private setState(next: PlaylistState) {
		this.state = next;
		if (this.storage) {
			try {
				this.storage.setItem(
					PLAYLIST_STORAGE_KEY,
					JSON.stringify(this.state),
				);
			} catch {
				// Storage full or unavailable — the in-memory queue still works.
			}
		}
		for (const listener of this.listeners) listener();
	}

	/** Replace the whole queue and start at `startIndex` (used for batch adds). */
	setQueue(items: PlaylistItemDto[], startIndex = 0) {
		const { items: queue, currentId } = buildQueueItems(startIndex, items);
		this.setState({ ...this.state, items: queue, currentId });
	}

	/** Append items without touching the current track. */
	appendItems(items: PlaylistItemDto[]) {
		if (items.length === 0) return;
		this.setState({
			...this.state,
			items: [...this.state.items, ...items],
		});
	}

	setCurrent(id: string | null) {
		if (id !== null && !this.state.items.some((item) => item.id === id)) return;
		this.setState({ ...this.state, currentId: id });
	}

	removeItem(id: string) {
		const index = this.state.items.findIndex((item) => item.id === id);
		if (index === -1) return;
		const items = this.state.items.filter((item) => item.id !== id);
		const currentId =
			this.state.currentId === id
				? (computeNextId(this.state.items, id, "off") ??
					computePrevId(this.state.items, id))
				: this.state.currentId;
		this.setState({ ...this.state, items, currentId });
	}

	clear() {
		this.setState({ ...this.state, items: [], currentId: null });
	}

	setRepeatMode(repeatMode: PlaylistRepeatMode) {
		this.setState({ ...this.state, repeatMode });
	}

	nextId(): string | null {
		return computeNextId(
			this.state.items,
			this.state.currentId,
			this.state.repeatMode,
		);
	}

	prevId(): string | null {
		return computePrevId(this.state.items, this.state.currentId);
	}

	/** Move the current pointer to the next track; returns the new id or null. */
	advance(): string | null {
		const id = this.nextId();
		if (id) this.setCurrent(id);
		return id;
	}
}

export const playlistStore = new PlaylistStore();

let storageAttached = false;

/** Attach renderer localStorage once; safe to call on every mount. */
export function ensurePlaylistStorage(): void {
	if (storageAttached || typeof window === "undefined") return;
	storageAttached = true;
	playlistStore.attachStorage(window.localStorage);
}

let autoPlayRequested = false;

/**
 * Mark that the next loaded queue track should start playing immediately
 * (queue advance, or clicking an item in the queue). Transient on purpose:
 * a plain module flag, never persisted.
 */
export function requestQueueAutoPlay(): void {
	autoPlayRequested = true;
}

export function consumeQueueAutoPlay(): boolean {
	if (!autoPlayRequested) return false;
	autoPlayRequested = false;
	return true;
}

export function toPlaylistItems(
	files: Array<{
		fileName: string;
		sourcePath: string;
		isAudio: boolean;
	}>,
): PlaylistItemDto[] {
	return files.map((file) => ({
		id: file.sourcePath,
		name: file.fileName,
		path: file.sourcePath,
		isAudio: file.isAudio,
	}));
}
