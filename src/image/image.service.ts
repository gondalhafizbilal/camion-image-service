import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ImageService {
	private readonly logger = new Logger(ImageService.name);

	/**
	 * Saves the image to disk and return the path
	 *
	 * @param mimeType
	 * @param data
	 * @returns
	 */
	saveImage(mimeType: string, data: string): string {
		this.logger.log(`Creating a target file with type: ${mimeType}`);

		let outputPath = "";
		switch (mimeType) {
			case "image/png":
				outputPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.png`);
				break;
			case "image/jpeg":
				outputPath = path.join(os.tmpdir(), `${crypto.randomUUID()}.jpg`);
				break;
			default:
				break;
		}

		// Create a buffer
		const buffer = Buffer.from(data, "base64");
		fs.writeFileSync(outputPath, buffer, { encoding: "base64", })

		return outputPath;
	}

	/**
	 * Returns the objects from the output file of gemini
	 *
	 * @param downloadPath
	 * @returns
	 */
	getJsonLines(downloadPath: string): Array<{
		key: string;
		mimeType: string;
		data: string;
	}> {
		if (!downloadPath || !fs.existsSync(downloadPath)) {
			return [];
		}

		// Read the file
		const bufferContent = fs.readFileSync(downloadPath, "utf-8");
		if (!bufferContent || bufferContent.length === 0) {
			return [];
		}

		// Read the buffer and split it into lines
		const lines = bufferContent.split("\n");
		if (!Array.isArray(lines) || lines.length === 0) {
			return [];
		}

		// Output mime and data
		let mimeType = "", data = "";

		return lines
			.filter(line => line !== null && line !== undefined && line.length !== 0)
			.map(line => {
				const lineObject = JSON.parse(line);

				if (!lineObject || !lineObject.key || !lineObject.response) {
					return null;
				}

				if (!Array.isArray(lineObject.response.candidates) || lineObject.response.candidates.length === 0) {
					return null;
				}

				if (!lineObject.response.candidates[0] || !lineObject.response.candidates[0].content) {
					return null;
				}

				if (!Array.isArray(lineObject.response.candidates[0].content.parts) || lineObject.response.candidates[0].content.parts.length === 0) {
					return null;
				}

				lineObject.response.candidates[0].content.parts.forEach(part => {
					if (part === null || part === undefined) {
						return;
					}

					if (part.inlineData !== null && part.inlineData !== undefined) {
						mimeType = part.inlineData.mimeType;
						data = part.inlineData.data;
					}
				});

				return {
					key: lineObject.key,
					mimeType: mimeType,
					data: data,
				};
			})
			.filter(entry => entry !== null);
	}

	/**
	 * Saves images
	 *
	 * @param jsonLines
	 * @returns
	 */
	saveImages(jsonLines: Array<{
		key: string;
		mimeType: string;
		data: string;
	}>): Array<{ key: string, outputPath: string, }> {
		if (!Array.isArray(jsonLines) || jsonLines.length === 0) {
			return [];
		}

		return jsonLines.map(line => ({
			key: line.key,
			outputPath: this.saveImage(line.mimeType, line.data),
		}));
	}

	/**
	 * Deletes the images
	 *
	 * @param imageItems
	 */
	deleteImages(imageItems: Array<{ key: string, outputPath: string, }>) {
		if (!Array.isArray(imageItems) || imageItems.length === 0) {
			return;
		}
		imageItems.map(imageItem => fs.unlinkSync(imageItem.outputPath));
	}
}
