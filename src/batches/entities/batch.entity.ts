import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

import { Exclude } from "class-transformer";

import { BatchStatus } from "../enums/BatchStatus.enum";

import { BatchItem } from "./batch-item.entity";

@Entity({ name: "batches", })
export class Batch {
	@Exclude()
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: "uuid", nullable: false, unique: true, })
	uuid: string;

	@Column({ type: "varchar", length: 32, unique: true, })
	name: string;

	@Column({
		type: "enum",
		enum: BatchStatus,
		default: BatchStatus.Pending,
	})
	@Index()
	status: BatchStatus;

	@Column({ type: "varchar", length: 64, default: null, })
	jobName: string;

	@OneToMany(() => BatchItem, (batchItem) => batchItem.batch, { cascade: true, })
	items: Array<BatchItem>;

	@UpdateDateColumn({
		name: "updated_at",
		type: "timestamptz",
	})
	updatedAt: Date;

	@CreateDateColumn({
		name: "created_at",
		type: "timestamptz",
	})
	createdAt: Date;
}
