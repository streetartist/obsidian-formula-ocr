import { requestUrl } from "obsidian";

export interface RecognitionResult {
	latex: string;
	confidence: number;
}

function buildMultipartBody(
	boundary: string,
	fieldName: string,
	fileName: string,
	contentType: string,
	fileData: ArrayBuffer
): ArrayBuffer {
	const encoder = new TextEncoder();

	const preamble = encoder.encode(
		`--${boundary}\r\n` +
		`Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
		`Content-Type: ${contentType}\r\n\r\n`
	);

	const epilogue = encoder.encode(`\r\n--${boundary}--\r\n`);

	const body = new Uint8Array(preamble.byteLength + fileData.byteLength + epilogue.byteLength);
	body.set(new Uint8Array(preamble), 0);
	body.set(new Uint8Array(fileData), preamble.byteLength);
	body.set(new Uint8Array(epilogue), preamble.byteLength + fileData.byteLength);

	return body.buffer;
}

export async function recognizeFormula(
	imageData: ArrayBuffer,
	token: string,
	endpoint: "turbo" | "standard"
): Promise<RecognitionResult> {
	if (!token) {
		throw new Error("SimpleTex Access Token is not configured. Please set it in plugin settings.");
	}

	const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);
	const path = endpoint === "turbo" ? "/api/latex_ocr_turbo" : "/api/latex_ocr";
	const url = `https://server.simpletex.cn${path}`;

	const body = buildMultipartBody(boundary, "file", "formula.png", "image/png", imageData);

	const response = await requestUrl({
		url,
		method: "POST",
		headers: {
			"token": token,
			"Content-Type": `multipart/form-data; boundary=${boundary}`,
		},
		body,
	});

	const data = response.json;

	if (!data.status) {
		const errorMessages: Record<number, string> = {
			0: "Recognition failed",
			[-1]: "Invalid request",
			[-2]: "Server error",
			[-3]: "Invalid token",
			[-4]: "Rate limit exceeded",
			[-5]: "Insufficient quota",
		};
		const code = typeof data.status === "number" ? data.status : 0;
		throw new Error(`API error: ${errorMessages[code] || data.message || "Unknown error"}`);
	}

	return {
		latex: data.res?.latex || "",
		confidence: data.res?.conf ?? 0,
	};
}
