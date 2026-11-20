import type { DumpQueryDto, PlayerPreferencesDto } from "./contracts";
import { DEFAULT_EQ_GAINS } from "./equalizer";

export const APP_NAME = "Kanso";

export const DEFAULT_DUMP_QUERY = {
	sort: "recent",
	order: "desc",
	page: 1,
	pageSize: 24,
} as const satisfies Pick<DumpQueryDto, "sort" | "order" | "page" | "pageSize">;

export const DEFAULT_PLAYER_PREFERENCES = {
	dumpSort: DEFAULT_DUMP_QUERY.sort,
	dumpView: "comfortable",
	sidebarCollapsed: false,
	titlebarMode: "auto",
	playerVolume: 0.9,
	playerMuted: false,
	playerFitMode: "contain",
	playerLoop: false,
	playerPlaybackRate: 1,
	speedPresetPrimary: 1,
	speedPresetSecondary: 2.2,
	accentColor: "#f76f53",
	playerEqEnabled: false,
	playerEqGains: [...DEFAULT_EQ_GAINS],
} as const satisfies PlayerPreferencesDto;

export const SUPPORTED_VIDEO_EXTENSIONS = [
	".mp4",
	".mkv",
	".webm",
	".mov",
	".avi",
	".m4v",
	".ts",
] as const;

export const SUPPORTED_AUDIO_EXTENSIONS = [
	".mp3",
	".m4a",
	".aac",
	".flac",
	".wav",
	".ogg",
	".opus",
	".wma",
] as const;

export const SUPPORTED_MEDIA_EXTENSIONS = [
	...SUPPORTED_VIDEO_EXTENSIONS,
	...SUPPORTED_AUDIO_EXTENSIONS,
] as const;

export function isSupportedAudioExtension(extension: string): boolean {
	return (SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);
}

export function isSupportedMediaExtension(extension: string): boolean {
	return (SUPPORTED_MEDIA_EXTENSIONS as readonly string[]).includes(extension);
}
