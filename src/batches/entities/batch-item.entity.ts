import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

import { Exclude } from "class-transformer";

import { Batch } from "./batch.entity";

@Entity({ name: "batch_items", })
export class BatchItem {
	@Exclude()
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: "uuid", nullable: false, unique: true, })
	uuid: string;

	@ManyToOne(() => Batch, (batch) => batch.items, { onDelete: "CASCADE", })
	@Index()
	batch: Batch;

	@Column({ type: "uuid", nullable: false, })
	@Index()
	productUUID: string;

	@Column({ type: "uuid", nullable: false, })
	@Index()
	variantUUID: string;

	@Column({ type: "uuid", nullable: false, })
	@Index()
	imageUUID: string;

	@Column({ type: "varchar", length: 256, })
	imageUri: string;

	@Column({ type: "text", })
	prompt: string;

	@Exclude()
	@UpdateDateColumn({
		name: "updated_at",
		type: "timestamptz",
	})
	updatedAt: Date;

	@Exclude()
	@CreateDateColumn({
		name: "created_at",
		type: "timestamptz",
	})
	createdAt: Date;
}
