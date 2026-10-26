

import {
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";

import { getSkipAndTake } from "../common/pagination";

import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Batch } from "./entities/batch.entity";
import { BatchItem } from "./entities/batch-item.entity";

@Injectable()
export class BatchItemsService {
	private readonly logger = new Logger(BatchItemsService.name);

	constructor(
		@InjectRepository(Batch) private readonly batchRepository: Repository<Batch>,
		@InjectRepository(BatchItem) private readonly batchItemRepository: Repository<BatchItem>,
	) { }

	/**
	 * Returns the items of a batch
	 *
	 * @param batchUUID
	 * @param pageNumber
	 * @param itemsPerPage
	 * @returns
	 */
	async getBatchItems(batchUUID: string, pageNumber: number = 1, itemsPerPage: number = 100): Promise<Array<BatchItem>> {
		this.logger.log(`Retrieving batch items of the batch: ${batchUUID}`);

		// Find the batch
		const batch = await this.batchRepository.findOneBy({ uuid: batchUUID, });
		if (batch === null) {
			throw new NotFoundException({
				error: "Failed to find the batch. Please check and try again.",
			});
		}

		// Get pagination params
		const { skip, take } = getSkipAndTake(pageNumber, itemsPerPage);

		return this.batchItemRepository.find({
			relationLoadStrategy: "query",
			order: {
				id: "DESC",
			},
			skip: skip,
			take: take,
		});
	}

	async getBatchItemsFull(batch: Batch): Promise<Array<BatchItem>> {
		const batchItems: Array<BatchItem> = [];

		// Query the database for batch items
		let pageNumber = 1, itemsPerPage = 24;

		while (true) {
			// Calculate pagination
			const { skip, take } = getSkipAndTake(pageNumber, itemsPerPage);

			// Fetch items
			const items = await this.batchItemRepository.find({
				where: {
					batch: {
						id: batch.id,
					},
				},
				skip: skip,
				take: take,
			});

			// Add fetch items to the buffer
			if (Array.isArray(items) && items.length !== 0) {
				for (let i = 0; i < items.length; i++) {
					batchItems[batchItems.length] = items[i];
				}
			}

			// Break the while loop if retrieve items are less than items per page
			if (items.length < itemsPerPage) {
				break;
			}

			// Increment page number
			itemsPerPage++;
		}

		return batchItems;
	}

	/**
	 * Returns the batch item
	 *
	 * @param batchItemUUID
	 * @returns
	 */
	async getBatchItem(batchItemUUID: string): Promise<BatchItem> {
		this.logger.log(`Retrieving batch item: ${batchItemUUID}`);

		// Find the batch item
		const batchItem = await this.batchItemRepository.findOneBy({ uuid: batchItemUUID, });
		if (batchItem === null) {
			throw new NotFoundException({
				error: "Failed to find the batch item. Please check and try again.",
			});
		}
		return batchItem;
	}

	/**
	 * Deletes a batch item
	 *
	 * @param batchItemUUID
	 */
	async deleteBatchItem(batchItemUUID: string): Promise<void> {
		this.logger.log(`Deleting batch item: ${batchItemUUID}`);
		await this.batchItemRepository.delete({
			uuid: batchItemUUID,
		});
	}
}
