import * as os from "node:os";
import * as path from "node:path";

import {
	Injectable,
	Logger,
} from "@nestjs/common";

import {
	BatchJob,
	GoogleGenAI,
} from "@google/genai";

import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleGeminiService {
	private readonly logger = new Logger(GoogleGeminiService.name);

	ai: GoogleGenAI;

	constructor(private readonly configService: ConfigService) {
		this.ai = new GoogleGenAI({
			// apiKey: this.configService.get<string>('GOOGLE_API_KEY'),
			apiKey: "AIzaSyB-Xv9s1D64fIYtUYtQi_pk-i9DgCnSiUI",
		});
	}

	/**
	 * Creates a batch job
	 *
	 * @param batchName
	 * @param filePath
	 * @returns
	 */
	async createBatchJob(batchName: string, filePath: string): Promise<string> {
		this.logger.log(`Creating batch job: ${batchName}`);

		try {
			// Upload the file
			this.logger.log(`Uploading file: ${filePath}`);
			const uploadedFile = await this.ai.files.upload({
				file: filePath,
				config: {
					mimeType: "jsonl",
				},
			});

			if (uploadedFile.name === null || uploadedFile.name === undefined) {
				throw "Failed to upload the file to google";
			}

			// Create a batch job
			this.logger.log(`Creating job for batch: ${batchName}`);
			const fileBatchJob = await this.ai.batches.create({
				model: "gemini-2.5-flash-image",
				src: uploadedFile.name,
				config: {
					displayName: batchName,
				},
			});

			if (fileBatchJob.name === null || fileBatchJob.name === undefined) {
				throw "Failed to create the batch job.";
			}

			return fileBatchJob.name;
		} catch (err) {
			throw err;
		}
	}

	/**
	 * Returns the batch job
	 *
	 * @param jobName
	 * @returns
	 */
	getBatchJob(jobName: string): Promise<BatchJob> {
		this.logger.log(`Retrieving job: ${jobName}`);
		return this.ai.batches.get({ name: jobName, });
	}

	/**
	 * Downloads the batch results file
	 *
	 * @param batchName
	 * @param fileName
	 * @returns
	 */
	async getBatchJobResult(batchName: string, fileName: string) {
		this.logger.log(`Downloading batch results for batch: ${batchName}, fileName: ${fileName}`);
		const downloadPath = path.join(os.tmpdir(), `${batchName}-result.jsonl`);
		await this.ai.files.download({ file: fileName, downloadPath: downloadPath });
		return downloadPath;
	}
}
