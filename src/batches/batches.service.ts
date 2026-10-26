import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';

import { BatchJob } from "@google/genai";

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import dayjs from "dayjs";

import { CreateBatchDto } from "./dtos/AddToBatchDto";

import { getSkipAndTake } from "../common/pagination";

import { BatchStatus } from "./enums/BatchStatus.enum";

import { Batch } from "./entities/batch.entity";
import { BatchItem } from "./entities/batch-item.entity";
import { BatchItemsService } from './batch-items.service';

import { RequestsService } from "./requests.service";
import { GoogleGeminiService } from "../genai/gen-ai.service";
import { ImageService } from "../image/image.service";
import { ProductService } from "../product/product.service";
import { ImageUploadService } from '../image/image-upload.service';

@Injectable()
export class BatchesService {
	private readonly logger = new Logger(BatchesService.name);

	constructor(
		@InjectRepository(Batch) private readonly batchRepository: Repository<Batch>,
		@InjectRepository(BatchItem) private readonly batchItemRepository: Repository<BatchItem>,
		@Inject(BatchItemsService) private readonly batchItemsService: BatchItemsService,
		@Inject(RequestsService) private readonly requestsService: RequestsService,
		@Inject(GoogleGeminiService) private readonly googleGeminiService: GoogleGeminiService,
		@Inject(ImageService) private readonly imageService: ImageService,
		@Inject(ProductService) private readonly productService: ProductService,
		@Inject(ImageUploadService) private readonly imageUploadService: ImageUploadService,
	) { }

	/**
	 * The cut-off time for adding items to current batch. After the cut-off time, items will be added to the next batch.
	 */
	CUTOFF_MINUTE = 45; // The cut off minute is 45th minute of each hour.

	/**
	 * Adds an item to the batch
	 *
	 * @param body
	 * @returns
	 */
	async createBatch(body: CreateBatchDto): Promise<Batch> {
		this.logger.log(`Adding product: ${body.productUUID} to batch.`);

		// Make sure we have the product
		const product = await this.productService.getProduct(body.productUUID);
		if (product === null) {
			throw new BadRequestException({
				error: "Failed to fetch the product. Please check and try again.",
			});
		}

		// Prepare batch items
		const items = this.productService.getBatchItems(product);

		// Get the product product
		const prompt = this.productService.getPrompt(product);

		// Get the batch name for current hour. We will add the item to current or next batch based on the cut-off time.
		let batchName = dayjs().format('YYYY-MM-DD-HH');
		if (new Date().getMinutes() >= this.CUTOFF_MINUTE) {
			batchName = dayjs().add(1, 'hour').format('YYYY-MM-DD-HH');
		}

		// Find the existing batch
		let batch = await this.batchRepository.findOneBy({ name: batchName, });
		if (batch === null) {
			batch = new Batch();
			batch.uuid = crypto.randomUUID();
			batch.name = batchName;
			batch.status = BatchStatus.Pending;
			await this.batchRepository.save(batch);
		}

		// Make sure the product isn't already in the current batch.
		const existingItem = await this.batchItemRepository.findOneBy({
			batch: {
				id: batch.id,
			},
			productUUID: product.uuid,
		});

		if (existingItem) {
			throw new ConflictException({
				error: `This product has already been added to the batch.`,
			});
		}

		// Add each image to the batch
		await Promise.all(items.map(item => {
			const batchItem = new BatchItem();
			batchItem.uuid = crypto.randomUUID();
			batchItem.batch = batch;
			batchItem.productUUID = item.productUUID;
			batchItem.variantUUID = item.variantUUID;
			batchItem.imageUUID = item.imageUUID;
			batchItem.imageUri = item.imageUri;
			batchItem.prompt = prompt;
			return this.batchItemRepository.save(batchItem);
		}));

		return batch;
	}

	/**
	 * Submits a batch job by name
	 *
	 * @param batchName
	 * @returns
	 */
	async submitBatchJobByName(batchName: string): Promise<Batch> {
		this.logger.log(`Submitting batch job to gemini by name: ${batchName}`);

		// Find the batch
		const batch = await this.batchRepository.findOneBy({ name: batchName, });
		if (batch === null) {
			throw new BadRequestException({
				error: `Failed to find the current batch. Please make sure the batch exists for name: ${batchName},`
			});
		}

		try {
			return await this.submitBatchJob(batch);
		} catch (err) {
			throw new BadRequestException({
				error: err,
			});
		}
	}

	/**
	 * Submits a batch job by uuid
	 *
	 * @param batchUUID
	 * @returns
	 */
	async submitBatchJobByUuid(batchUUID: string): Promise<Batch> {
		this.logger.log(`Submitting batch job to gemini by uuid: ${batchUUID}`);

		// Find the batch
		const batch = await this.batchRepository.findOneBy({ uuid: batchUUID, });
		if (batch === null) {
			throw new BadRequestException({
				error: `Failed to find the current batch. Please make sure the batch exists for ${batchUUID},`
			});
		}

		try {
			return await this.submitBatchJob(batch);
		} catch (err) {
			throw new BadRequestException({
				error: err,
			});
		}
	}

	/**
	 * Submits a batch job for a given batch to gemini
	 *
	 * @param batchUUID
	 * @returns
	 */
	async submitBatchJob(batch: Batch): Promise<Batch> {
		this.logger.log(`Submitting batch to gemini: ${batch.uuid}`);

		// Make sure the batch hasn't been submitted already
		if (batch.status === BatchStatus.Processing) {
			throw "Failed to submit the batch job. The job has been submitted already.";
		}

		// Get the batch items
		const batchItems = await this.batchItemsService.getBatchItemsFull(batch);
		if (Array.isArray(batchItems) && batchItems.length === 0) {
			throw "Failed to get batch items. Please ensure there are enough items in the batch to continue.";
		}

		// Generate requests
		const requests = this.requestsService.getRequests(batchItems);
		if (Array.isArray(requests) && requests.length === 0) {
			throw "Failed to create a batch job. Please ensure there are enough items in the batch to continue.";
		}

		// Write the requests
		const filePath = await this.requestsService.generateRequestsJsonL(batch.name, requests);
		if (filePath === null) {
			throw "Failed to create a batch job. Unabled to create the batch file for google gemini.";
		}

		// Create a batch job on google gemini
		const batchJobName = await this.googleGeminiService.createBatchJob(batch.name, filePath);
		if (batchJobName === null) {
			throw "Failed to create a job. Please check and try again.";
		}

		// Delete the batch file
		this.requestsService.delete(filePath);

		// Update the batch status
		batch.jobName = batchJobName;
		batch.status = BatchStatus.Processing;
		return this.batchRepository.save(batch);
	}

	/**
	 * Applies a batch by uuid
	 *
	 * @param batchUUID
	 * @returns
	 */
	async applyBatchJobByUuid(batchUUID: string): Promise<Batch> {
		this.logger.log(`Applying batch by uuid: ${batchUUID}`);

		// Find the batch
		const batch = await this.batchRepository.findOneBy({ uuid: batchUUID, });
		if (batch === null) {
			throw "Failed to find the batch. Please check and try again.";
		}

		try {
			return await this.applyBatchJob(batch);
		} catch (err) {
			throw new BadRequestException({
				error: err,
			});
		}
	}

	/**
	 * Applies a batch by name
	 *
	 * @param batchName
	 * @returns
	 */
	async applyBatchJobByName(batchName: string): Promise<Batch> {
		this.logger.log(`Applying batch by name: ${batchName}`);

		// Find the batch
		const batch = await this.batchRepository.findOneBy({ name: batchName, });
		if (batch === null) {
			throw "Failed to find the batch. Please check and try again.";
		}

		try {
			return await this.applyBatchJob(batch);
		} catch (err) {
			throw new BadRequestException({
				error: err,
			});
		}
	}

	/**
	 * Applies the result of a batch job
	 *
	 * @param batch
	 * @returns
	 */
	async applyBatchJob(batch: Batch): Promise<Batch> {
		this.logger.log(`Applying batch: ${batch.uuid}`);

		// Make sure the job hasn't already completed
		if (batch.status === BatchStatus.Completed) {
			throw "The batch has already been completed.";
		}

		// Find the batch job
		const batchJob = await this.googleGeminiService.getBatchJob(batch.jobName);
		if (batchJob === null) {
			throw "Failed to find the batch job. Please check and try again.";
		}

		// Make sure the job has been succeeded.
		if (batchJob.state !== "JOB_STATE_SUCCEEDED") {
			throw "The job hasn't been successful. Please check and try again.";
		}

		// Make sure the result files exist
		if (batchJob.dest === null || batchJob.dest === undefined) {
			batch.status = BatchStatus.Failed;
			await this.batchRepository.save(batch);
			throw "Failed to find any result files for the batch job.";
		}

		// Download the content of the results
		const downloadPath = await this.googleGeminiService.getBatchJobResult(batch.name, batchJob.dest.fileName as string);

		// Parse the output file
		const jsonLines = this.imageService.getJsonLines(downloadPath);
		if (!Array.isArray(jsonLines) || jsonLines.length === 0) {
			batch.status = BatchStatus.Failed;
			await this.batchRepository.save(batch);
			throw "Failed to parse the json lines.";
		}

		// Save the images to the disk.
		const imageItems = this.imageService.saveImages(jsonLines);
		if (!Array.isArray(imageItems) || imageItems.length === 0) {
			batch.status = BatchStatus.Failed;
			await this.batchRepository.save(batch);
			throw "Failed to create the images.";
		}

		// Upload the images to the server
		const res = await this.imageUploadService.uploadImageItems(imageItems);
		if (!Array.isArray(res) || res.length === 0) {
			batch.status = BatchStatus.Failed;
			await this.batchRepository.save(batch);
			throw "Failed to upload the images";
		}

		// Delete the images
		this.imageService.deleteImages(imageItems);

		// Make sure all images are successfully upload to the server
		if (!res.every(v => v === true)) {
			throw "Failed to upload all images of the batch";
		}

		// Update the batch
		batch.status = BatchStatus.Completed;
		return this.batchRepository.save(batch);
	}

	/**
	 * Retrieves the batch job
	 *
	 * @param batchUUID
	 * @returns
	 */
	async getBatchJob(batchUUID: string): Promise<BatchJob> {
		this.logger.log(`Retrieving job of the batch: ${batchUUID}`);

		// Find the batch
		const batch = await this.batchRepository.findOneBy({ uuid: batchUUID, });
		if (batch === null) {
			throw new NotFoundException({
				error: "Failed to find the batch. Please check and try again.",
			});
		}

		// Make sure the batch isn't pending
		if (batch.status === BatchStatus.Pending) {
			throw new BadRequestException({
				error: "The batch hasn't been submitted to google gemini. Please wait.",
			});
		}

		// Make sure the batch name exists
		if (batch.jobName === null || batch.jobName === undefined) {
			throw new BadRequestException({
				error: "Failed to find the job name for this batch. Please wait until the batch is submitted.",
			});
		}

		// Find the batch job
		const batchJob = await this.googleGeminiService.getBatchJob(batch.jobName);
		if (batchJob === null) {
			throw new NotFoundException({
				error: "Failed to find the batch job. Please check and try again.",
			});
		}

		return batchJob;
	}

	/**
	 * Returns the batches
	 *
	 * @param pageNumber
	 * @param itemsPerPage
	 * @returns
	 */
	getBatches(pageNumber: number = 1, itemsPerPage: number = 100): Promise<Array<Batch>> {
		this.logger.log(`Retrieving batches`);

		// Get pagination params
		const { skip, take } = getSkipAndTake(pageNumber, itemsPerPage);

		return this.batchRepository.find({
			skip: skip,
			take: take,
			order: {
				id: "DESC",
			},
		});
	}

	/**
	 * Returns a batch
	 *
	 * @param batchUUID
	 * @returns
	 */
	async getBatch(batchUUID: string): Promise<Batch> {
		this.logger.log(`Retrieving batch: ${batchUUID}`);

		const batch = await this.batchRepository.findOneBy({ uuid: batchUUID, });
		if (batch === null) {
			throw new NotFoundException({
				error: "Failed to find the batch. Please check and try again.",
			});
		}
		return batch;
	}

	/**
	 * Returns the earliest batch that is in processing
	 *
	 * @returns
	 */
	async getBatchEarliest(): Promise<Batch> {
		this.logger.log(`Retrieving earliest batch`);

		const batch = await this.batchRepository.findOne({
			where: {
				status: BatchStatus.Processing,
			},
			order: {
				id: "ASC",
			},
		});

		if (batch === null) {
			throw "Failed to find the batch in processing";
		}

		return batch;
	}

	/**
	 * Deletes a batch
	 *
	 * @param batchUUID
	 */
	async deleteBatch(batchUUID: string): Promise<void> {
		this.logger.log(`Deleting batch: ${batchUUID}`);
		await this.batchRepository.delete({
			uuid: batchUUID,
		});
	}
}
