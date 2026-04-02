import { FileText, Link2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MAX_PDF = 10 * 1024 * 1024;
const MAX_DOCX = 20 * 1024 * 1024;

async function extractPdfText(file) {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	let fullText = "";
	for (let i = 1; i <= pdf.numPages; i += 1) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const pageText = content.items.map((item) => item.str).join(" ");
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
	const [tab, setTab] = useState("pdf");
	const [file, setFile] = useState(null);
	const [gdocsUrl, setGdocsUrl] = useState("");
	const [status, setStatus] = useState("idle");
	const [error, setError] = useState("");

	const title = useMemo(() => {
		if (status === "reading") return "Reading file...";
		if (status === "converting") return "Converting...";
		if (status === "loading") return "Loading into editor...";
		return "";
	}, [status]);

	if (!open) {
		return null;
	}

	const handlePdfImport = async () => {
		setError("");
		if (!file) {
			setError("Please select a PDF file.");
			return;
		}
		if (!file.name.toLowerCase().endsWith(".pdf")) {
			setError("Please select a .pdf file.");
			return;
		}
		if (file.size > MAX_PDF) {
			setError("File exceeds 10MB limit.");
			return;
		}

		try {
			setStatus("reading");
			const text = await extractPdfText(file);
			setStatus("converting");
			const html = toParagraphHtml(text);
			setStatus("loading");
			await onImport({ html, source: file.name });
			onClose();
		} catch (importError) {
			setError(importError?.message || "Could not read file. Is it a valid PDF?");
		} finally {
			setStatus("idle");
		}
	};

	const handleDocxImport = async () => {
		setError("");
		if (!file) {
			setError("Please select a DOCX file.");
			return;
		}
		if (!file.name.toLowerCase().endsWith(".docx")) {
			setError("Please select a .docx file.");
			return;
		}
		if (file.size > MAX_DOCX) {
			setError("File exceeds 20MB limit.");
			return;
		}

		try {
			setStatus("reading");
			const arrayBuffer = await file.arrayBuffer();
			setStatus("converting");
			const result = await mammoth.convertToHtml({ arrayBuffer });
			if (result.messages.length > 0) {
				console.warn("Docx conversion warnings:", result.messages);
			}
			setStatus("loading");
			await onImport({ html: result.value, source: file.name });
			onClose();
		} catch (importError) {
			setError(importError?.message || "Could not read file. Is it a valid Word document?");
		} finally {
			setStatus("idle");
		}
	};

	const handleGdocsImport = async () => {
		setError("");
		const match = gdocsUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
		if (!match) {
			setError("Invalid Google Docs URL.");
			return;
		}

		try {
			setStatus("reading");
			const response = await fetch(`${backendUrl}/api/import/gdocs`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				credentials: "include",
				body: JSON.stringify({ docId: match[1] })
			});

			const contentType = response.headers.get("content-type") || "";
			if (!contentType.includes("application/json")) {
				throw new Error("Google Docs proxy returned non-JSON response.");
			}
			const data = await response.json();
			if (!response.ok || !data?.success) {
				throw new Error(data?.error || "Cannot access Google Doc. Set sharing to Anyone with link.");
			}
			setStatus("loading");
			await onImport({ html: data.html, source: "Google Docs" });
			onClose();
		} catch (importError) {
			setError(importError?.message || "Cannot access Google Doc.");
		} finally {
			setStatus("idle");
		}
	};

	const importHandler = tab === "pdf" ? handlePdfImport : tab === "docx" ? handleDocxImport : handleGdocsImport;

	return (
		<div className="join-modal-overlay" role="dialog" aria-modal="true" aria-label="Import Document">
			<div className="join-modal-card import-modal-card">
				<h1>Import Document</h1>
				<p>Importing will replace current document content. Current content will be auto-saved first.</p>
				<div className="import-tabs">
					<button type="button" className={tab === "pdf" ? "active" : ""} onClick={() => { setTab("pdf"); setError(""); }}>PDF</button>
					<button type="button" className={tab === "docx" ? "active" : ""} onClick={() => { setTab("docx"); setError(""); }}>Word (.docx)</button>
					<button type="button" className={tab === "gdocs" ? "active" : ""} onClick={() => { setTab("gdocs"); setError(""); }}>Google Docs</button>
				</div>

				{tab !== "gdocs" ? (
					<label className="import-dropzone">
						<input
							type="file"
							accept={tab === "pdf" ? ".pdf" : ".docx"}
							onChange={(event) => setFile(event.target.files?.[0] || null)}
						/>
						<Upload size={18} />
						<span>{file ? file.name : `Drop or browse ${tab === "pdf" ? "PDF" : "DOCX"} file`}</span>
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
				{error ? <div className="join-modal-error">{error}</div> : null}

				<div className="import-modal-actions">
					<button type="button" onClick={onClose}>Cancel</button>
					<button type="button" onClick={importHandler} disabled={status !== "idle"}>Import</button>
				</div>

				<div className="import-supports">
					<FileText size={14} /> Supports: PDF · DOCX · Google Docs
					<Link2 size={14} />
				</div>
			</div>
		</div>
	);
}
