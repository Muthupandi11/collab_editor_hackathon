import { FileText, Link2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * Import modal for PDF, Word and Google Docs using backend-only processing.
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
	const [googleDocsUrl, setGoogleDocsUrl] = useState("");
	const [importError, setImportError] = useState("");
	const [importStep, setImportStep] = useState("");

	useEffect(() => {
		setImportError("");
	}, [activeTab, selectedFile, googleDocsUrl]);

	const title = useMemo(() => {
		if (!importStep) return "";
		return importStep;
	}, [importStep]);

	if (!open) {
		return null;
	}

	const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000) => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await fetch(url, { ...options, signal: controller.signal });
		} finally {
			clearTimeout(timeout);
		}
	};

	const sendFileToBackend = async (endpoint, file) => {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetchWithTimeout(
			`${backendUrl}${endpoint}`,
			{
				method: "POST",
				body: formData,
				credentials: "include"
			},
			30000
		);

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			const text = await response.text();
			console.error("Non-JSON response:", text.slice(0, 200));
			throw new Error(`Server error. Check backend logs. Status: ${response.status}`);
		}

		const data = await response.json();
		if (!data.success) {
			throw new Error(data.error || "Import failed");
		}
		return data.html;
	};

	const importDocx = async (file) => {
		if (!file) {
			throw new Error("Please select a Word file first");
		}
		setImportStep("Uploading Word file...");
		return sendFileToBackend("/api/import/docx", file);
	};

	const importPdf = async (file) => {
		if (!file) {
			throw new Error("Please select a PDF file first");
		}
		setImportStep("Uploading PDF...");
		return sendFileToBackend("/api/import/pdf", file);
	};

	const importGoogleDoc = async (url) => {
		if (!url?.trim()) {
			throw new Error("Please paste a Google Docs URL");
		}
		if (!url.includes("docs.google.com/document")) {
			throw new Error("Invalid URL. Must be: https://docs.google.com/document/d/...");
		}

		const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
		if (!match?.[1]) {
			throw new Error("Cannot find document ID in URL");
		}

		setImportStep("Fetching Google Doc...");
		const response = await fetchWithTimeout(
			`${backendUrl}/api/import/gdocs`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				credentials: "include",
				body: JSON.stringify({ docId: match[1] })
			},
			15000
		);

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			throw new Error("Backend error. Check backend logs.");
		}

		const data = await response.json();
		if (!data.success) {
			throw new Error(data.error || "Import failed");
		}
		return data.html;
	};

	const handleImport = async () => {
		if (typeof onImport !== "function") {
			setImportError("Editor not ready. Please reload the page.");
			return;
		}

		setImportError("");

		try {
			let html = "";
			let source = "Imported document";

			if (activeTab === "docx") {
				html = await importDocx(selectedFile);
				source = selectedFile?.name || "Word document";
			} else if (activeTab === "pdf") {
				html = await importPdf(selectedFile);
				source = selectedFile?.name || "PDF";
			} else if (activeTab === "gdocs") {
				html = await importGoogleDoc(googleDocsUrl);
				source = "Google Docs";
			}

			if (!html?.trim()) {
				throw new Error("No content received from server");
			}

			setImportStep("Loading into editor...");
			await onImport({ html, source });
			setImportStep("");
			onClose();
		} catch (error) {
			console.error("Import failed:", error);
			setImportStep("");
			if (error?.name === "AbortError") {
				setImportError("Request timed out. Please try again.");
				return;
			}
			setImportError(error?.message || "Import failed. Please try again.");
		}
	};

	const importDisabled = !!importStep || (!selectedFile && activeTab !== "gdocs");

	return (
		<div className="join-modal-overlay" role="dialog" aria-modal="true" aria-label="Import Document">
			<div className="join-modal-card import-modal-card">
				<h1>Import Document</h1>
				<p>Importing will replace current document content. Current content will be auto-saved first.</p>

				<div className="import-tabs">
					<button type="button" className={activeTab === "pdf" ? "active" : ""} onClick={() => setActiveTab("pdf")}>PDF</button>
					<button type="button" className={activeTab === "docx" ? "active" : ""} onClick={() => setActiveTab("docx")}>Word (.docx)</button>
					<button type="button" className={activeTab === "gdocs" ? "active" : ""} onClick={() => setActiveTab("gdocs")}>Google Docs</button>
				</div>

				{activeTab !== "gdocs" ? (
					<label className="import-dropzone">
						<input
							type="file"
							accept={activeTab === "pdf" ? ".pdf" : ".doc,.docx"}
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
							value={googleDocsUrl}
							onChange={(event) => setGoogleDocsUrl(event.target.value)}
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
					<FileText size={14} /> Supports: PDF - DOCX - Google Docs
					<Link2 size={14} />
				</div>
			</div>
		</div>
	);
}
