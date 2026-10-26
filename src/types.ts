export type ProductOptionValue = {
	uuid: string;
	valueEn: string;
	valueAr: string;
	position: number;
};

export type ProductOption = {
	uuid: string;
	nameEn: string;
	nameAr: string;
	position: number;
	values: Array<ProductOptionValue>;
};

export type Money = {
	amount: number;
	currencyCode: string;
};

export type Weight = {
	amount: number;
	unit: string;
};

export type Dimensions = {
	width: number;
	height: number;
	length: number;
	unit: string;
};

export type ProductVariantImageDimensions = {
	width: number;
	height: number;
};

export type ProductVariantOptionValue = {
	optionValue: {
		uuid: string;
		valueEn: string;
		valueAr: string;
		position: number;
	};
};

export type ProductVariantImage = {
	uuid: string;
	imageUrl: string;
	thumbnailUrl: string;
	alt: string;
	isFeatured: string;
	position: number;
	dimensions: ProductVariantImageDimensions;
};

export type ProductVariant = {
	uuid: string;
	titleEn: string;
	titleAr: string;
	sku: string;
	barcode: string;
	cost: Money;
	weight: Weight;
	dimensions: Dimensions;
	salesCount: string;
	optionValues: Array<ProductVariantOptionValue>;
	images: Array<ProductVariantImage>;
	skuMeta: string | null;
};

export type ProductCategory = {
	id: number;
	category: {
		uuid: string;
		slug: string;
		nameEn: string;
		nameAr: string;
		pricingFactor: string;
		discountPercentage: string;
		thumbnailUrl: string;
		isFeatured: boolean;
	};
};

export type Product = {
	uuid: string;
	slug: string;
	titleEn: string;
	titleAr: string;
	briefEn: string;
	briefAr: string;
	descriptionEn: string;
	descriptionAr: string;
	descriptionHtmlEn: string;
	descriptionHtmlAr: string;
	status: string;
	shopId: string;
	shopName: string;
	procurementId: string;
	salesCount: number;
	likesCount: number;
	reviewsCount: number;
	ratingSum: number;
	ratingCount: number;
	ratingAvg: string;
	ratingOneStarCount: number;
	ratingTwoStarCount: number;
	ratingThreeStarCount: number;
	ratingFourStarCount: number;
	ratingFiveStarCount: number;
	options: Array<ProductOption>;
	variants: Array<ProductVariant>;
	productCategories: Array<ProductCategory>;
	reviews: Array<unknown>;
};

export type GeminiBatchRequestItem = {
	key: string;
	request: {
		// model: "gemini-2.5-flash-image",
		contents: Array<{
			role: "user",
			parts: Array<{
				text: string;
			} | {
				file_data: {
					mime_type: string;
					file_uri: string;
				},
			}>;
		}>;
	};
};
