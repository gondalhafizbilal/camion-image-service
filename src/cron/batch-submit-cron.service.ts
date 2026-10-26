import {
	Inject,
	Injectable,
	Logger,
} from "@nestjs/common";

import { Cron } from "@nestjs/schedule";

import dayjs from "dayjs";

import { BatchesService } from "../batches/batches.service";

@Injectable()
export class BatchSubmitCronService {
	private readonly logger = new Logger(BatchSubmitCronService.name);

	constructor(
		@Inject(BatchesService) private readonly batchesService: BatchesService,
	) { }

	@Cron("5 * * * *") // At 5 minutes past the hour
	async handleBatchSubmit() {
		this.logger.log("Submitting batch to gemini");

		try {
			// Get the batch name for the past hour.
			const batchName = dayjs().subtract(1, 'hour').format('YYYY-MM-DD-HH');

			// Submit the batch for the past hour
			const batch = await this.batchesService.submitBatchJobByName(batchName);
			if (batch === null) {
				this.logger.log("Failed to find a batch to submit");
				return;
			}

			this.logger.log(`Submitted batch job to gemini, batch: ${batch.name}, job: ${batch.jobName}`);
		} catch (err) {
			this.logger.error("Failed to submit batch job", err);
		}
	}
}
