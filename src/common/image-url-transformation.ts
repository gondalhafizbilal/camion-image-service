export const getTransformedImageUrl = (imageUrl: string, assetsHost: string): string => {
	if (!imageUrl || !assetsHost) {
		return "";
	}

	if (imageUrl.startsWith("https://")) {
		return imageUrl.replace("https://dev-assets-167781471441-eu-north-1.s3.eu-north-1.amazonaws.com", assetsHost);
	} else if (imageUrl.startsWith("s3://")) {
		return imageUrl.replace("s3:/", assetsHost);
	}

	return "";
}
