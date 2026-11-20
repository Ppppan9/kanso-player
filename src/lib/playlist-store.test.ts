import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildQueueItems,
	computeNextId,
	computePrevId,
	DEFAULT_PLAYLIST_STATE,
	parseStoredPlaylistState,
	PLAYLIST_STORAGE_KEY,
	playlistStore,
	toPlaylistItems,
	type PlaylistItemDto,
} from "./playlist-store";

function item(id: string): PlaylistItemDto {
	return { id, name: `${id}.mp4`, path: `/media/${id}.mp4`, isAudio: false };
}

describe("computeNextId", () => {
	it("returns the first item when nothing is current", () => {
		expect(computeNextId([item("a"), item("b")], null, "all")).toBe("a");
	});

	it("advances to the next item", () => {
		expect(computeNextId([item("a"), item("b")], "a", "off")).toBe("b");
	});

	it("stops at the end when repeat is off", () => {
		expect(computeNextId([item("a"), item("b")], "b", "off")).toBeNull();
	});

	it("wraps to the first item when repeat is all", () => {
		expect(computeNextId([item("a"), item("b")], "b", "all")).toBe("a");
	});

	it("falls back to the first item when current is missing", () => {
		expect(computeNextId([item("a")], "gone", "off")).toBe("a");
	});

	it("returns null for an empty queue", () => {
		expect(computeNextId([], "a", "all")).toBeNull();
	});
});

describe("computePrevId", () => {
	it("returns the previous item", () => {
		expect(computePrevId([item("a"), item("b")], "b")).toBe("a");
	});

	it("returns null at the top of the queue", () => {
		expect(computePrevId([item("a"), item("b")], "a")).toBeNull();
	});

	it("returns the last item when nothing is current", () => {
		expect(computePrevId([item("a"), item("b")], null)).toBe("b");
	});
});

describe("buildQueueItems", () => {
	it("clamps the start index into range", () => {
		expect(buildQueueItems(9, [item("a"), item("b")])).toEqual({
			items: [item("a"), item("b")],
			currentId: "b",
		});
	});

	it("handles an empty queue", () => {
		expect(buildQueueItems(0, [])).toEqual({ items: [], currentId: null });
	});
});

describe("parseStoredPlaylistState", () => {
	it("restores a valid state", () => {
		const state = parseStoredPlaylistState(
			JSON.stringify({
				items: [item("a")],
				currentId: "a",
				repeatMode: "one",
			}),
		);
		expect(state).toEqual({ items: [item("a")], currentId: "a", repeatMode: "one" });
	});

	it("drops current ids that are not in the queue", () => {
		const state = parseStoredPlaylistState(
			JSON.stringify({ items: [item("a")], currentId: "gone", repeatMode: "all" }),
		);
		expect(state?.currentId).toBeNull();
	});

	it("rejects malformed payloads", () => {
		expect(parseStoredPlaylistState("not json")).toBeNull();
		expect(parseStoredPlaylistState(JSON.stringify({ items: "nope" }))).toBeNull();
	});
});

describe("playlistStore", () => {
	let storage: Record<string, string>;

	beforeEach(() => {
		storage = {};
		playlistStore.attachStorage({
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
				storage[key] = value;
			},
			removeItem: (key: string) => {
				delete storage[key];
			},
		});
		playlistStore.clear();
		playlistStore.setRepeatMode(DEFAULT_PLAYLIST_STATE.repeatMode);
	});

	it("replaces the queue and starts at the requested index", () => {
		playlistStore.setQueue([item("a"), item("b"), item("c")], 0);
		expect(playlistStore.getSnapshot().currentId).toBe("a");

		playlistStore.setQueue([item("x"), item("y")], 1);
		expect(playlistStore.getSnapshot().currentId).toBe("y");
	});

	it("persists state to storage", () => {
		playlistStore.setQueue([item("a")], 0);
		const stored = JSON.parse(storage[PLAYLIST_STORAGE_KEY]) as {
			currentId: string | null;
		};
		expect(stored.currentId).toBe("a");
	});

	it("notifies subscribers on change", () => {
		const listener = vi.fn();
		const unsubscribe = playlistStore.subscribe(listener);
		playlistStore.setQueue([item("a")], 0);
		expect(listener).toHaveBeenCalled();
		unsubscribe();
	});

	it("advances through the queue and wraps around", () => {
		playlistStore.setQueue([item("a"), item("b")], 0);
		expect(playlistStore.advance()).toBe("b");
		expect(playlistStore.advance()).toBe("a");
	});

	it("stops advancing when repeat is off", () => {
		playlistStore.setQueue([item("a"), item("b")], 0);
		playlistStore.setRepeatMode("off");
		playlistStore.advance();
		expect(playlistStore.advance()).toBeNull();
		expect(playlistStore.getSnapshot().currentId).toBe("b");
	});

	it("removing the current item points at the next one", () => {
		playlistStore.setQueue([item("a"), item("b"), item("c")], 1);
		playlistStore.removeItem("b");
		expect(playlistStore.getSnapshot().currentId).toBe("c");
	});

	it("clear resets the queue", () => {
		playlistStore.setQueue([item("a")], 0);
		playlistStore.clear();
		expect(playlistStore.getSnapshot()).toEqual(DEFAULT_PLAYLIST_STATE);
	});

	it("toPlaylistItems maps file dtos", () => {
		expect(
			toPlaylistItems([
				{ fileName: "a.mp3", sourcePath: "/m/a.mp3", isAudio: true },
			]),
		).toEqual([
			{ id: "/m/a.mp3", name: "a.mp3", path: "/m/a.mp3", isAudio: true },
		]);
	});
});
