import { FileText, Link2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MAX_PDF = 10 * 1024 * 1024;
const MAX_DOCX = 20 * 1024 * 1024;

async function extractPdfText(file) {
	const pdfjsLib = await import("pdfjs-dist");
	const workerVersion = pdfjsLib.version || "3.11.174";
	pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${workerVersion}/pdf.worker.min.js`;

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
	let fullText = "";
	for (let i = 1; i <= pdf.numPages; i += 1) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const pageText = content.items
			.map((item) => (typeof item?.str === "string" ? item.str : ""))
			.filter(Boolean)
			.join(" ");
		fullText += `${pageText}\n\n`;
	}
	return fullText;
}

function toParagraphHtml(text) {
	return String(text || "")
		.split("\n\n")
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => `<p>${chunk.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
		.join("");
}

function normalizeImportedHtml(input) {
	const fallback = "<p></p>";
	const raw = String(input || "").trim();
	if (!raw) {
		return fallback;
	}

	const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
	if (!looksLikeHtml) {
		return toParagraphHtml(raw) || fallback;
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(raw, "text/html");
		const root = doc.body || doc.documentElement;
		if (!root) {
			return fallback;
		}

		root.querySelectorAll("script, style, iframe, object, embed, link, meta, noscript").forEach((node) => node.remove());
		root.querySelectorAll("*").forEach((node) => {
			node.removeAttribute("class");
			node.removeAttribute("id");
			node.removeAttribute("style");
		});

		const html = (root.innerHTML || "").trim();
		return html || fallback;
	} catch {
		return fallback;
	}
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
		return toParagraphHtml(plain);
	} catch {
		return toParagraphHtml(raw.replace(/<[^>]+>/g, " "));
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
		const text = await extractPdfText(file);
		if (!text || !text.trim()) {
			throw new Error("No text found in PDF. The PDF may be image-based or scanned.");
}

		setImportStep("converting");
		const html = normalizeImportedHtml(toParagraphHtml(text));
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
		if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".docx")) {
			throw new Error("Please select a valid .docx file");
}

		if (file.size > MAX_DOCX) {
			throw new Error("File too large. Maximum size is 20MB");
}

		setImportStep("reading");
		const mammoth = await import("mammoth");
		const arrayBuffer = await file.arrayBuffer();

		setImportStep("converting");
		const result = await mammoth.convertToHtml({ arrayBuffer });
		if (!result || typeof result.value !== "string") {
			throw new Error("mammoth returned empty result");
}

		if (Array.isArray(result.messages) && result.messages.length > 0) {
			console.warn("Docx warnings:", result.messages);
}

		let html = normalizeImportedHtml(result.value);
		if (!html || html === "<p></p>") {
			const textResult = await mammoth.extractRawText({ arrayBuffer });
			html = normalizeImportedHtml(textResult?.value || "");
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

			let html = normalizeImportedHtml(data.html);
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
