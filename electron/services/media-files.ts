import fs from "node:fs";
import path from "node:path";
import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import {
	isSupportedAudioExtension,
	isSupportedMediaExtension,
} from "../../src/lib/constants";
import type { MediaFileDto } from "../../src/lib/contracts";
import { allowExternalMediaPath } from "./smart-library";

function toMediaFileDto(filePath: string): MediaFileDto | null {
	try {
		const resolvedPath = path.resolve(filePath);
		if (!fs.statSync(resolvedPath).isFile()) return null;
		const isAudio = isSupportedAudioExtension(
			path.extname(resolvedPath).toLowerCase(),
		);
		return {
			fileName: path.basename(resolvedPath),
			sourcePath: resolvedPath,
			folderPath: path.dirname(resolvedPath),
			isAudio,
		};
	} catch {
		return null;
	}
}

/** Natural sort so numbered files play in the expected order (ep2 before ep10). */
function naturalCompare(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Top-level scan of a folder for supported media files, naturally sorted. */
export function scanFolderForMedia(folderPath: string): MediaFileDto[] {
	const resolvedFolder = path.resolve(folderPath);
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(resolvedFolder, { withFileTypes: true });
	} catch {
		return [];
	}
	return entries
		.filter(
			(entry) =>
				entry.isFile() &&
				isSupportedMediaExtension(path.extname(entry.name).toLowerCase()),
		)
		.map((entry) => toMediaFileDto(path.join(resolvedFolder, entry.name)))
		.filter((dto): dto is MediaFileDto => dto !== null)
		.sort((a, b) => naturalCompare(a.fileName, b.fileName));
}

function toDtoListAndWhitelist(paths: string[]): MediaFileDto[] {
	const items = paths
		.map(toMediaFileDto)
		.filter((dto): dto is MediaFileDto => dto !== null);
	// Only whitelisted paths can be served through the video:// protocol.
	for (const item of items) {
		allowExternalMediaPath(item.sourcePath);
	}
	return items;
}

async function showOpenDialog(options: OpenDialogOptions): Promise<string[]> {
	const parentWindow = BrowserWindow.getAllWindows()[0];
	const result = parentWindow
		? await dialog.showOpenDialog(parentWindow, options)
		: await dialog.showOpenDialog(options);
	return result.canceled ? [] : result.filePaths;
}

export async function chooseMediaFiles(): Promise<MediaFileDto[]> {
	const filePaths = await showOpenDialog({
		properties: ["openFile", "multiSelections"],
		title: "Add Files to Playlist",
	});
	return toDtoListAndWhitelist(filePaths);
}

export async function chooseMediaFolder(): Promise<MediaFileDto[]> {
	const folderPaths = await showOpenDialog({
		properties: ["openDirectory"],
		title: "Add Folder to Playlist",
	});
	if (folderPaths.length === 0) return [];
	return toDtoListAndWhitelist(scanFolderForMedia(folderPaths[0]));
}
