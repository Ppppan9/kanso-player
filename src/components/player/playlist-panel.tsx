import type { PlaylistItemDto, PlaylistRepeatMode } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import IconMusic from "~icons/tabler/music";
import IconMovie from "~icons/tabler/movie";
import IconPlaylist from "~icons/tabler/playlist";
import IconPlaylistX from "~icons/tabler/playlist-x";
import IconRepeat from "~icons/tabler/repeat";
import IconRepeatOnce from "~icons/tabler/repeat-once";
import IconX from "~icons/tabler/x";

export function repeatModeIcon(mode: PlaylistRepeatMode) {
	return mode === "one" ? IconRepeatOnce : IconRepeat;
}

export function repeatModeLabel(mode: PlaylistRepeatMode): string {
	switch (mode) {
		case "one":
			return "Repeat one";
		case "all":
			return "Loop queue";
		default:
			return "Play once";
	}
}

function ItemIcon({ isAudio }: { isAudio: boolean }) {
	return isAudio ? <IconMusic size={14} /> : <IconMovie size={14} />;
}

type PlaylistPanelProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: PlaylistItemDto[];
	currentId: string | null;
	repeatMode: PlaylistRepeatMode;
	onPlayItem: (item: PlaylistItemDto) => void;
	onRemoveItem: (id: string) => void;
	onClear: () => void;
	onCycleRepeat: () => void;
};

export function PlaylistPanel({
	open,
	onOpenChange,
	items,
	currentId,
	repeatMode,
	onPlayItem,
	onRemoveItem,
	onClear,
	onCycleRepeat,
}: PlaylistPanelProps) {
	const RepeatIcon = repeatModeIcon(repeatMode);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex h-full w-[24rem] flex-col border-0 p-0">
				<SheetHeader className="border-b border-(--border) px-4 py-4">
					<SheetTitle className="flex items-center gap-2">
						<IconPlaylist size={16} />
						Playback queue
						<span className="font-data text-xs text-(--muted-foreground)">
							{items.length}
						</span>
					</SheetTitle>
				</SheetHeader>

				{items.length === 0 ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
						<IconPlaylistX
							size={32}
							className="text-(--muted-foreground)/50"
						/>
						<p className="text-sm text-(--muted-foreground)">
							The queue is empty.
						</p>
						<p className="text-xs text-(--muted-foreground)/70">
							Add files from the Playlist page, or drop a folder in the
							library.
						</p>
					</div>
				) : (
					<div className="app-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
						<ul className="space-y-0.5">
							{items.map((item, index) => {
								const isCurrent = item.id === currentId;
								return (
									<li key={item.id}>
										<div
											className={cn(
												"group flex h-10 items-center gap-2 rounded-(--radius) px-2 transition-colors",
												isCurrent
													? "bg-(--accent)/15 text-(--accent-strong)"
													: "text-(--foreground) hover:bg-white/5",
											)}
										>
											<span
												className={cn(
													"font-data w-5 shrink-0 text-right text-[11px]",
													isCurrent
														? "text-(--accent-strong)"
														: "text-(--muted-foreground)/60",
												)}
											>
												{index + 1}
											</span>
											<button
												type="button"
												className="flex min-w-0 flex-1 items-center gap-2 text-left"
												onClick={() => onPlayItem(item)}
												title={item.name}
											>
												<ItemIcon isAudio={item.isAudio} />
												<span
													className={cn(
														"truncate text-[13px]",
														isCurrent && "font-medium",
													)}
												>
													{item.name}
												</span>
											</button>
											<button
												type="button"
												className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--muted-foreground) opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-(--foreground)"
												onClick={() => onRemoveItem(item.id)}
												aria-label={`Remove ${item.name}`}
											>
												<IconX size={14} />
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				)}

				<div className="flex items-center justify-between border-t border-(--border) px-4 py-3">
					<Button
						variant="ghost"
						size="sm"
						onClick={onCycleRepeat}
						className={cn(
							"gap-1.5 text-xs",
							repeatMode !== "off" && "text-(--accent-strong)",
						)}
						aria-label={`Repeat mode: ${repeatModeLabel(repeatMode)}`}
						title={repeatModeLabel(repeatMode)}
					>
						<RepeatIcon size={15} />
						{repeatModeLabel(repeatMode)}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="gap-1.5 text-xs text-(--muted-foreground)"
						onClick={onClear}
						disabled={items.length === 0}
					>
						<IconPlaylistX size={15} />
						Clear
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
