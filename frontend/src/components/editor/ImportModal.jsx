import { FileText, Link2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MAX_PDF = 10 * 1024 * 1024;
const MAX_DOCX = 20 * 1024 * 1024;

const escapeHtml = (value) =>
	String(value || "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

async function extractPdfText(file) {
	const pdfjsLib = await import("pdfjs-dist");
	pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
	let fullText = "";
	for (let i = 1; i <= pdf.numPages; i += 1) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const lines = {};
		content.items.forEach((item) => {
			if (!item?.str || !String(item.str).trim()) {
				return;
			}
			const y = Math.round(item?.transform?.[5] || 0);
			if (!lines[y]) {
				lines[y] = [];
			}
			lines[y].push(String(item.str));
		});

		const pageLines = Object.keys(lines)
			.sort((a, b) => Number(b) - Number(a))
			.map((y) => lines[y].join(" ").trim())
			.filter(Boolean);

		if (pageLines.length > 0) {
			fullText += `${pageLines.join("\n")}\n\n`;
		}
	}
	return fullText;
}

function toParagraphHtml(text) {
	return String(text || "")
		.split("\n\n")
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => `<p>${escapeHtml(chunk)}</p>`)
		.join("");
}

function sanitizeForTipTap(html) {
	if (!html || typeof html !== "string") {
		return "<p></p>";
	}

	let clean = html;
	clean = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
	clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
	clean = clean.replace(/<meta[^>]*>/gi, "");
	clean = clean.replace(/<link[^>]*>/gi, "");
	clean = clean.replace(/<html[^>]*>/gi, "");
	clean = clean.replace(/<\/html>/gi, "");
	clean = clean.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
	clean = clean.replace(/<body[^>]*>/gi, "");
	clean = clean.replace(/<\/body>/gi, "");
	clean = clean.replace(/<(iframe|object|embed|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "");
	clean = clean.replace(/<(iframe|object|embed|noscript)[^>]*\/?\s*>/gi, "");

	clean = clean.replace(/<div[^>]*>/gi, "<p>");
	clean = clean.replace(/<\/div>/gi, "</p>");

	clean = clean.replace(/\s+style="[^"]*"/gi, "");
	clean = clean.replace(/\s+class="[^"]*"/gi, "");
	clean = clean.replace(/\s+id="[^"]*"/gi, "");
	clean = clean.replace(/\s+lang="[^"]*"/gi, "");
	clean = clean.replace(/\s+xml:[^=]+="[^"]*"/gi, "");

	clean = clean.replace(/<img[^>]*>/gi, "");
	clean = clean.replace(/<figure[^>]*>/gi, "");
	clean = clean.replace(/<\/figure>/gi, "");
	clean = clean.replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, "");
	clean = clean.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, "<p>[Table content removed - tables not supported]</p>");

	clean = clean.replace(/<p[^>]*>\s*<p[^>]*>/gi, "<p>");
	clean = clean.replace(/<\/p>\s*<\/p>/gi, "</p>");
	clean = clean.replace(/<(ul|ol)[^>]*>\s*<p[^>]*>/gi, "<$1>");
	clean = clean.replace(/<\/p>\s*<\/(ul|ol)>/gi, "</$1>");

	clean = clean.replace(/<p[^>]*>\s*<\/(h[1-6]|ul|ol|blockquote|pre)>/gi, "</$1>");
	clean = clean.replace(/<(h[1-6]|ul|ol|blockquote|pre)[^>]*>\s*<\/p>/gi, "<$1>");

	clean = clean.replace(/<p[^>]*>\s*<\/p>/gi, "");
	clean = clean.replace(/<p[^>]*>&nbsp;<\/p>/gi, "");

	const hasBlockTags = /<(p|h[1-6]|ul|ol|li|blockquote|pre)[^>]*>/i.test(clean);
	if (!hasBlockTags && clean.trim()) {
		clean = `<p>${clean.trim()}</p>`;
	}

	if (!clean.trim()) {
		return "<p>No readable content found in file.</p>";
	}

	return clean;
}

function htmlToSafeTextHtml(input) {
	const raw = String(input || "").trim();
	if (!raw) {
		return "<p></p>";
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(raw, "text/html");
		const plain = (doc.body?.textContent || doc.documentElement?.textContent || "").trim();
		return sanitizeForTipTap(toParagraphHtml(plain));
	} catch {
		return sanitizeForTipTap(toParagraphHtml(raw.replace(/<[^>]+>/g, " ")));
	}
}

function extractGoogleDocId(value) {
	const text = String(value || "").trim();
	if (!text) {
		return "";
	}

	if (/^[a-zA-Z0-9-_]{20,}$/.test(text)) {
		return text;
	}

	const match = text.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
	return match?.[1] || "";
}

/**
 * Import modal for PDF, Word and Google Docs.
 * @param {{
 * open: boolean,
 * backendUrl: string,
 * onClose: () => void,
 * onImport: (payload: { html: string, source: string }) => Promise<void>
 * }} props
 * @returns {JSX.Element | null}
 */
export default function ImportModal({ open, backendUrl, onClose, onImport }) {
	const [activeTab, setActiveTab] = useState("pdf");
	const [selectedFile, setSelectedFile] = useState(null);
	const [gdocsUrl, setGdocsUrl] = useState("");
	const [importStep, setImportStep] = useState("");
	const [importError, setImportError] = useState("");

	useEffect(() => {
		setImportError("");
	}, [activeTab, selectedFile]);

	const title = useMemo(() => {
		if (!importStep) return "";
		if (importStep === "reading") return "Reading file...";
		if (importStep === "converting") return "Converting...";
		if (importStep === "loading") return "Loading into editor...";
		return "";
	}, [importStep]);

	if (!open) {
		return null;
	}

	const importPdf = async (file) => {
		if (!file) {
			throw new Error("No file selected");
}

		if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
			throw new Error("Please select a valid .pdf file");
}

		if (file.size > MAX_PDF) {
			throw new Error("PDF too large. Maximum size is 10MB");
}

		setImportStep("reading");
		let text = "";
		try {
			text = await extractPdfText(file);
		} catch (error) {
			if (String(error?.message || "").toLowerCase().includes("pdfjs")) {
				throw new Error("pdfjs-dist not installed. Run: npm install pdfjs-dist");
			}
			throw new Error(`Cannot open PDF: ${error?.message || "Unknown PDF error"}`);
		}
		if (!text || !text.trim()) {
			throw new Error("No text found in PDF. The PDF may be image-based or scanned.");
}

		setImportStep("converting");
		const html = sanitizeForTipTap(toParagraphHtml(text));
		if (!html || html.trim() === "" || html === "<p></p>") {
			throw new Error("No content extracted from file");
}

		return html;
	};

	const importDocx = async (file) => {
		if (!file) {
			throw new Error("No file selected");
}

		const validTypes = [
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/msword"
		];
		const hasValidExt = [".docx", ".doc"].some((ext) => file.name.toLowerCase().endsWith(ext));
		if (!validTypes.includes(file.type) && !hasValidExt) {
			throw new Error("Please select a .docx Word file");
		}

		if (file.size > MAX_DOCX) {
			throw new Error("File too large. Maximum size is 20MB");
}

		setImportStep("reading");
		let mammoth;
		try {
			mammoth = await import("mammoth");
		} catch {
			throw new Error("mammoth not installed. Run: npm install mammoth");
		}
		const arrayBuffer = await file.arrayBuffer();

		setImportStep("converting");
		let result;
		try {
			result = await mammoth.convertToHtml(
				{ arrayBuffer },
				{
					styleMap: [
						"p[style-name='Heading 1'] => h1:fresh",
						"p[style-name='Heading 2'] => h2:fresh",
						"p[style-name='Heading 3'] => h3:fresh",
						"b => strong",
						"i => em",
						"u => u"
					]
				}
			);
		} catch (error) {
			throw new Error(`Failed to read Word file: ${error?.message || "Unknown DOCX error"}`);
		}
		if (!result || typeof result.value !== "string") {
			throw new Error("Word file conversion returned no content");
		}

		if (Array.isArray(result.messages) && result.messages.length > 0) {
			console.warn("Docx warnings:", result.messages);
}

		let html = sanitizeForTipTap(result.value);
		if (!html || html === "<p></p>") {
			const textResult = await mammoth.extractRawText({ arrayBuffer });
			html = sanitizeForTipTap(toParagraphHtml(textResult?.value || ""));
		}
		if (!html || html === "<p></p>") {
			html = htmlToSafeTextHtml(result.value || "");
		}
		if (!html || html === "<p></p>") {
			throw new Error("Failed to read Word file: no readable text found");
		}

		return html;
};

	const importGoogleDoc = async (url) => {
		if (!url || !url.trim()) {
			throw new Error("Please paste a Google Docs URL");
}
		if (!url.includes("docs.google.com/document")) {
			throw new Error("Invalid URL. Must be a Google Docs link like https://docs.google.com/document/d/...");
}

		const docId = extractGoogleDocId(url);
		if (!docId) {
			throw new Error("Could not find document ID in URL");
}

		setImportStep("reading");
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);
		try {
			const response = await fetch(`${backendUrl}/api/import/gdocs`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				credentials: "include",
				body: JSON.stringify({ docId }),
				signal: controller.signal
			});

			const contentType = response.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				throw new Error("Backend returned invalid response. Check backend logs.");
			}

			const data = await response.json();
			if (!response.ok || !data?.success) {
				throw new Error(data?.error || "Failed to fetch Google Doc");
			}

			let html = sanitizeForTipTap(data.html || "");
			if (!html || html === "<p></p>") {
				html = htmlToSafeTextHtml(data.html || "");
			}
			if (!html || html === "<p></p>") {
				throw new Error("Google Doc appears empty or could not be read. Ensure sharing is set to Anyone with link can view.");
			}

			return html;
		} catch (error) {
			if (error?.name === "AbortError") {
				throw new Error("Request timed out. Check your internet connection.");
			}
			throw error;
		} finally {
			clearTimeout(timeout);
		}
};

	const handleImport = async () => {
		setImportError("");

		if (typeof onImport !== "function") {
			setImportError("Editor not ready. Please wait.");
			return;
		}

		try {
			let htmlContent = "";
			let sourceName = "Imported document";

			if (activeTab === "docx") {
				htmlContent = await importDocx(selectedFile);
				sourceName = selectedFile?.name || "Word document";
			} else if (activeTab === "pdf") {
				htmlContent = await importPdf(selectedFile);
				sourceName = selectedFile?.name || "PDF";
			} else {
				htmlContent = await importGoogleDoc(gdocsUrl);
				sourceName = "Google Docs";
			}

			if (!htmlContent || !htmlContent.trim()) {
				throw new Error("No content extracted from file");
			}

			setImportStep("loading");
			await onImport({ html: htmlContent, source: sourceName });
			onClose();
		} catch (importError) {
			console.error("Import failed:", importError);
			setImportError(importError?.message || "Import failed. Please try again.");
		} finally {
			setImportStep("");
		}
	};

	const importDisabled = !!importStep || (!selectedFile && activeTab !== "gdocs");

	return (
		<div className="join-modal-overlay" role="dialog" aria-modal="true" aria-label="Import Document">
			<div className="join-modal-card import-modal-card">
				<h1>Import Document</h1>
				<p>Importing will replace current document content. Current content will be auto-saved first.</p>
				<div className="import-tabs">
					<button type="button" className={activeTab === "pdf" ? "active" : ""} onClick={() => { setActiveTab("pdf"); setImportError(""); }}>PDF</button>
					<button type="button" className={activeTab === "docx" ? "active" : ""} onClick={() => { setActiveTab("docx"); setImportError(""); }}>Word (.docx)</button>
					<button type="button" className={activeTab === "gdocs" ? "active" : ""} onClick={() => { setActiveTab("gdocs"); setImportError(""); }}>Google Docs</button>
				</div>

				{activeTab !== "gdocs" ? (
					<label className="import-dropzone">
						<input
							type="file"
							accept={activeTab === "pdf" ? ".pdf" : ".docx"}
							onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
						/>
						<Upload size={18} />
						<span>{selectedFile ? selectedFile.name : `Drop or browse ${activeTab === "pdf" ? "PDF" : "DOCX"} file`}</span>
					</label>
				) : (
					<div className="import-gdocs-box">
						<label htmlFor="gdocs-link">Paste Google Docs share link</label>
						<input
							id="gdocs-link"
							type="url"
							value={gdocsUrl}
							onChange={(event) => setGdocsUrl(event.target.value)}
							placeholder="https://docs.google.com/document/d/.../edit"
						/>
						<small>Make sure document is set to Anyone with link can view.</small>
					</div>
				)}

				{title ? <div className="import-progress"><span className="ring" />{title}</div> : null}
				{importError ? <div className="join-modal-error">{importError}</div> : null}

				<div className="import-modal-actions">
					<button type="button" onClick={onClose}>Cancel</button>
					<button type="button" onClick={handleImport} disabled={importDisabled}>{importStep ? "Importing..." : "Import"}</button>
				</div>

				<div className="import-supports">
					<FileText size={14} /> Supports: PDF · DOCX · Google Docs
					<Link2 size={14} />
				</div>
			</div>
		</div>
	);
}
