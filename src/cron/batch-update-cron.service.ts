import {
	Inject,
	Injectable,
	Logger,
} from "@nestjs/common";

import { Cron } from "@nestjs/schedule";

import { BatchesService } from "../batches/batches.service";

@Injectable()
export class BatchUpdateCronService {
	private readonly logger = new Logger(BatchUpdateCronService.name);

	constructor(
		@Inject(BatchesService) private readonly batchesService: BatchesService,
	) { }

	@Cron("*/30 * * * *") // Every 30 minutes
	async handleBatchUpdate() {
		this.logger.log(`Processing batch results`);

		try {
			// Get the earliest batch that is still in processing
			const batch = await this.batchesService.getBatchEarliest();
			if (batch === null) {
				this.logger.log("Failed to find a batch to update");
				return;
			}

			// Update the batch result
			await this.batchesService.applyBatchJob(batch);

			this.logger.log(`Successfully update the results of the job.`);
		} catch (err) {
			this.logger.error("Failed to update the batch result", err);
		}
	}
}
