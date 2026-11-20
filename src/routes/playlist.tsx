import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useSyncExternalStore } from "react";
import { repeatModeLabel } from "@/components/player/playlist-panel";
import { PageFrame } from "@/components/shared/page-frame";
import { Button } from "@/components/ui/button";
import type { MediaFileDto, PlaylistItemDto } from "@/lib/contracts";
import {
	ensurePlaylistStorage,
	playlistStore,
	requestQueueAutoPlay,
	toPlaylistItems,
} from "@/lib/playlist-store";
import { getPlayerApi } from "@/lib/player-api";
import { cn } from "@/lib/utils";
import IconFolderPlus from "~icons/tabler/folder-plus";
import IconMusic from "~icons/tabler/music";
import IconMovie from "~icons/tabler/movie";
import IconPlaylistPlus from "~icons/tabler/playlist-add";
import IconPlaylistX from "~icons/tabler/playlist-x";
import IconRepeat from "~icons/tabler/repeat";
import IconRepeatOnce from "~icons/tabler/repeat-once";
import IconX from "~icons/tabler/x";

export const Route = createFileRoute("/playlist")({
	component: PlaylistPage,
});

function PlaylistPage() {
	const router = useRouter();
	ensurePlaylistStorage();
	const queue = useSyncExternalStore(
		playlistStore.subscribe,
		playlistStore.getSnapshot,
	);

	const playItem = useCallback(
		(item: PlaylistItemDto) => {
			requestQueueAutoPlay();
			playlistStore.setCurrent(item.id);
			if (item.videoId) {
				void router.navigate({
					to: "/player/$videoId",
					params: { videoId: item.videoId },
				});
			} else if (item.path) {
				void router.navigate({
					to: "/player/external",
					search: { path: item.path },
				});
			}
		},
		[router],
	);

	const addToQueue = useCallback(
		(files: MediaFileDto[]) => {
			if (files.length === 0) return;
			const items = toPlaylistItems(files);
			// Replace the queue and start from the first picked file.
			playlistStore.setQueue(items, 0);
			playItem(items[0]);
		},
		[playItem],
	);

	const addFiles = useCallback(async () => {
		addToQueue(await getPlayerApi().playlist.chooseFiles());
	}, [addToQueue]);

	const addFolder = useCallback(async () => {
		addToQueue(await getPlayerApi().playlist.chooseFolder());
	}, [addToQueue]);

	return (
		<PageFrame
			title="Playlist"
			description="Batch-add video or audio files and play them in order. The queue keeps playing across sessions."
			actions={
				<>
					<Button onClick={() => void addFiles()}>
						<IconPlaylistPlus size={16} />
						Add files
					</Button>
					<Button variant="secondary" onClick={() => void addFolder()}>
						<IconFolderPlus size={16} />
						Add folder
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className={cn(queue.repeatMode !== "off" && "text-(--accent-strong)")}
						onClick={() =>
							playlistStore.setRepeatMode(
								queue.repeatMode === "off"
									? "all"
									: queue.repeatMode === "all"
										? "one"
										: "off",
							)
						}
						aria-label={`Repeat mode: ${repeatModeLabel(queue.repeatMode)}`}
						title={repeatModeLabel(queue.repeatMode)}
					>
						{queue.repeatMode === "one" ? (
							<IconRepeatOnce size={16} />
						) : (
							<IconRepeat size={16} />
						)}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						disabled={queue.items.length === 0}
						onClick={() => playlistStore.clear()}
						aria-label="Clear queue"
						title="Clear queue"
					>
						<IconPlaylistX size={16} />
					</Button>
				</>
			}
		>
			{queue.items.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-(--radius) border border-dashed border-(--border) py-24 text-center">
					<IconPlaylistX size={36} className="text-(--muted-foreground)/40" />
					<p className="text-sm text-(--muted-foreground)">
						The queue is empty.
					</p>
					<p className="max-w-xs text-xs text-(--muted-foreground)/70">
						Use “Add files” to multi-select media in a folder, or “Add
						folder” to queue everything at the folder's top level.
					</p>
				</div>
			) : (
				<ul className="space-y-0.5">
					{queue.items.map((item, index) => {
						const isCurrent = item.id === queue.currentId;
						return (
							<li key={item.id}>
								<div
									className={cn(
										"group flex h-12 items-center gap-3 rounded-(--radius) px-3 transition-colors",
										isCurrent
											? "bg-(--accent)/15 text-(--accent-strong)"
											: "text-(--foreground) hover:bg-white/5",
									)}
								>
									<span
										className={cn(
											"font-data w-6 shrink-0 text-right text-xs",
											isCurrent
												? "text-(--accent-strong)"
												: "text-(--muted-foreground)/60",
										)}
									>
										{index + 1}
									</span>
									<button
										type="button"
										className="flex min-w-0 flex-1 items-center gap-3 text-left"
										onClick={() => playItem(item)}
										title={item.name}
									>
										{item.isAudio ? (
											<IconMusic size={15} className="shrink-0" />
										) : (
											<IconMovie size={15} className="shrink-0" />
										)}
										<span
											className={cn(
												"truncate text-sm",
												isCurrent && "font-medium",
											)}
										>
											{item.name}
										</span>
									</button>
									<button
										type="button"
										className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-(--muted-foreground) opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-(--foreground)"
										onClick={() => playlistStore.removeItem(item.id)}
										aria-label={`Remove ${item.name}`}
									>
										<IconX size={15} />
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</PageFrame>
	);
}
