import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Injectable, Logger } from "@nestjs/common";

import type { GeminiBatchRequestItem } from "../types";

import { BatchItem } from "./entities/batch-item.entity";
import { ConfigService } from "@nestjs/config";
import { getTransformedImageUrl } from "../common/image-url-transformation";

@Injectable()
export class RequestsService {
	private readonly logger = new Logger(RequestsService.name);

	/**
	 * Node Environment
	 */
	nodeEnv: string = "";

	/**
	 * Assets host
	 */
	assetsHost: string = "";

	constructor(private readonly configService: ConfigService) {
		this.nodeEnv = this.configService.get<string>('NODE_ENV') as string;
		this.assetsHost = this.configService.get<string>('ASSETS_HOST') as string;
		if (!this.assetsHost) {
			switch (this.nodeEnv) {
				case "dev":
					this.assetsHost = "https://assets.dev.camiontrading.com";
					break;
				case "prod":
					this.assetsHost = "https://assets.camiontrading.com";
					break;
				default:
					break;
			}
		}
	}

	/**
	 * Generates requests using the batch items
	 *
	 * @param batchItems
	 * @returns
	 */
	getRequests(batchItems: Array<BatchItem>): Array<GeminiBatchRequestItem> {
		this.logger.log(`Generating gemini requests`);

		if (!Array.isArray(batchItems) || batchItems.length === 0) {
			return [];
		}

		return batchItems.map(batchItem => ({
			key: `${batchItem.uuid}/${batchItem.productUUID}/${batchItem.variantUUID}/${batchItem.imageUUID}`,
			request: {
				// model: "gemini-2.5-flash-image",
				contents: [
					{
						role: "user",
						parts: [
							{
								text: batchItem.prompt,
							},
							{
								file_data: {
									mime_type: "image/jpeg",
									file_uri: getTransformedImageUrl(batchItem.imageUri, this.assetsHost),
								},
							},
						],
					},
				],
			},
		}));
	}

	/**
	 * Generates a JSONL file for the image service
	 *
	 * @param batchName
	 * @param requests
	 * @returns
	 */
	generateRequestsJsonL(batchName: string, requests: Array<GeminiBatchRequestItem>): Promise<string> {
		return new Promise((resolve, reject) => {
			if (batchName === null || batchName === undefined || !Array.isArray(requests) || requests.length === 0) {
				reject("Not enough items in the batch.");
			}

			// The output file after all the requests have been written to it.
			const filePath = path.join(os.tmpdir(), `${batchName}.jsonl`);

			// Create a writable stream for efficiency, with larger files.
			const writeStream = fs.createWriteStream(filePath, { flags: "w", });
			writeStream.on("finish", () => {
				resolve(filePath);
			});

			writeStream.on("error", (err) => {
				reject(err);
			});

			// Write each request on a new line
			for (const request of requests) {
				writeStream.write(JSON.stringify(request) + '\n');
			}

			// End and close the stream
			writeStream.end();
			writeStream.close();
		});
	}

	/**
	 * Deletes the batch file after submitting job
	 *
	 * @param filePath
	 */
	delete(filePath: string) {
		this.logger.log(`Deleting ${filePath} after submitting batch job`);
		fs.unlinkSync(filePath);
	}
}
