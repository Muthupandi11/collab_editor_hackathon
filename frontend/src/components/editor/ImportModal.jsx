import { FileText, Link, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "../../lib/toast.js";

/**
 * Import modal for TXT, DOCX, PDF and Google Docs.
 * @param {{
 * open: boolean,
 * onClose: () => void,
 * onImport: (payload: { html: string, source: string }) => Promise<void>
 * }} props
 * @returns {JSX.Element | null}
 */
export default function ImportModal({ open, onClose, onImport }) {
	const [activeTab, setActiveTab] = useState("txt");
	const [selectedFile, setSelectedFile] = useState(null);
	const [googleDocsUrl, setGoogleDocsUrl] = useState("");
	const [importError, setImportError] = useState("");
	const [importStep, setImportStep] = useState("");

	const title = useMemo(() => {
		if (!importStep) return "";
		return importStep;
	}, [importStep]);

	if (!open) {
		return null;
	}

	const toHtmlFromText = (text) => {
		const escaped = String(text || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		const html = escaped
			.split(/\n{2,}/)
			.map((line) => line.replace(/\n/g, " ").trim())
			.filter(Boolean)
			.map((line) => `<p>${line}</p>`)
			.join("");

		return html || "<p></p>";
	};

	const getHtmlFromFile = async () => {
		const BACKEND = import.meta.env.VITE_BACKEND_URL;

		if (activeTab === "txt") {
			if (!selectedFile) {
				throw new Error("Please select a TXT file first");
			}
			if (selectedFile.size > 10 * 1024 * 1024) {
				throw new Error("TXT file too large. Maximum size is 10MB");
			}

			const isTxt =
				selectedFile.type === "text/plain" ||
				selectedFile.name.toLowerCase().endsWith(".txt");
			if (!isTxt) {
				throw new Error("Only .txt files are supported in TXT tab");
			}

			setImportStep("Reading TXT file...");
			const text = await selectedFile.text();
			if (!text || !text.trim()) {
				throw new Error("TXT file is empty");
			}
			return toHtmlFromText(text);
		}

		if (activeTab === "docx") {
			setImportStep("Uploading Word file...");
			if (!selectedFile) {
				throw new Error("Please select a DOCX file");
			}
			if (!selectedFile.name.toLowerCase().endsWith(".docx")) {
				throw new Error("Please select a .docx file");
			}

			const formData = new FormData();
			formData.append("file", selectedFile);

			const res = await fetch(`${BACKEND}/api/import/docx`, {
				method: "POST",
				body: formData,
				credentials: "include"
			});

			const raw = await res.text();
			let data;
			try {
				data = JSON.parse(raw);
			} catch {
				throw new Error(`Server error: ${raw.slice(0, 100)}`);
			}

			if (!data.success) {
				throw new Error(data.error || "DOCX import failed");
			}

			return data.html;
		}

		if (activeTab === "pdf") {
			setImportStep("Uploading PDF...");
			if (!selectedFile) {
				throw new Error("Please select a PDF file");
			}
			if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
				throw new Error("Please select a .pdf file");
			}

			const formData = new FormData();
			formData.append("file", selectedFile);

			const res = await fetch(`${BACKEND}/api/import/pdf`, {
				method: "POST",
				body: formData,
				credentials: "include"
			});

			const raw = await res.text();
			let data;
			try {
				data = JSON.parse(raw);
			} catch {
				throw new Error(`Server error: ${raw.slice(0, 100)}`);
			}

			if (!data.success) {
				throw new Error(data.error || "PDF import failed");
			}

			return data.html;
		}

		if (activeTab === "gdocs") {
			setImportStep("Fetching Google Doc...");
			if (!googleDocsUrl.trim()) {
				throw new Error("Please paste a Google Docs URL");
			}
			if (!googleDocsUrl.includes("docs.google.com/document")) {
				throw new Error("Invalid URL. Must be a Google Docs link.");
			}

			const match = googleDocsUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
			if (!match?.[1]) {
				throw new Error("Cannot find document ID in URL");
			}

			const res = await fetch(`${BACKEND}/api/import/gdocs`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ docId: match[1] })
			});

			const raw = await res.text();
			let data;
			try {
				data = JSON.parse(raw);
			} catch {
				throw new Error(`Server error: ${raw.slice(0, 100)}`);
			}

			if (!data.success) {
				throw new Error(data.error || "Google Docs import failed");
			}

			return data.html;
		}

		throw new Error(`Unknown import type: ${activeTab}`);
	};

	const handleImport = async () => {
		if (typeof onImport !== "function") {
			setImportError("Editor not ready. Please reload the page.");
			return;
		}

		setImportError("");

		try {
			const html = await getHtmlFromFile();
			const source =
				activeTab === "gdocs"
					? "Google Docs"
					: selectedFile?.name || activeTab.toUpperCase();

			if (!html?.trim()) {
				throw new Error("No content received");
			}

			setImportStep("");
			setSelectedFile(null);
			setGoogleDocsUrl("");
			onClose();

			// Critical timing: let modal unmount fully before touching editor content.
			await new Promise((resolve) => setTimeout(resolve, 150));

			await onImport({ html, source });

			// Keep the same post-settle pause used by working TXT import flow.
			await new Promise((resolve) => setTimeout(resolve, 100));

			toast.success("Document imported successfully!");
		} catch (error) {
			console.error("Import failed:", error);
			setImportStep("");
			setImportError(error?.message || "Import failed. Please try again.");
			toast.error(error?.message || "Import failed. Please try again.");
		}
	};

	const importDisabled =
		!!importStep ||
		(activeTab === "gdocs" ? !googleDocsUrl.trim() : !selectedFile);

	const importTitle =
		activeTab === "txt"
			? "Import TXT"
			: activeTab === "docx"
				? "Import DOCX"
				: activeTab === "pdf"
					? "Import PDF"
					: "Import Google Docs";

	return (
		<div className="join-modal-overlay" role="dialog" aria-modal="true" aria-label="Import Document">
			<div className="join-modal-card import-modal-card">
				<h1>{importTitle}</h1>
				<p>Importing will replace current document content. Current content will be auto-saved first.</p>

				<div className="import-tabs" role="tablist" aria-label="Import sources">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "txt"}
						onClick={() => {
							setActiveTab("txt");
							setSelectedFile(null);
							setGoogleDocsUrl("");
							setImportError("");
						}}
					>
						TXT
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "docx"}
						onClick={() => {
							setActiveTab("docx");
							setSelectedFile(null);
							setGoogleDocsUrl("");
							setImportError("");
						}}
					>
						DOCX
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "pdf"}
						onClick={() => {
							setActiveTab("pdf");
							setSelectedFile(null);
							setGoogleDocsUrl("");
							setImportError("");
						}}
					>
						PDF
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "gdocs"}
						onClick={() => {
							setActiveTab("gdocs");
							setSelectedFile(null);
							setImportError("");
						}}
					>
						Google Docs
					</button>
				</div>

				{activeTab === "gdocs" ? (
					<label className="import-dropzone gdocs-input-wrap">
						<Link size={18} />
						<input
							type="url"
							placeholder="Paste Google Docs URL"
							value={googleDocsUrl}
							onChange={(event) => setGoogleDocsUrl(event.target.value)}
						/>
					</label>
				) : (
					<label className="import-dropzone">
						<input
							type="file"
							accept={
								activeTab === "txt"
									? ".txt,text/plain"
									: activeTab === "docx"
										? ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
										: ".pdf,application/pdf"
							}
							onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
						/>
						<Upload size={18} />
						<span>
							{selectedFile
								? selectedFile.name
								: activeTab === "txt"
									? "Drop or browse TXT file"
									: activeTab === "docx"
										? "Drop or browse DOCX file"
										: "Drop or browse PDF file"}
						</span>
					</label>
				)}

				{title ? <div className="import-progress"><span className="ring" />{title}</div> : null}
				{importError ? <div className="join-modal-error">{importError}</div> : null}

				<div className="import-modal-actions">
					<button type="button" onClick={onClose}>Cancel</button>
					<button type="button" onClick={handleImport} disabled={importDisabled}>{importStep ? "Importing..." : "Import"}</button>
				</div>

				<div className="import-supports">
					<FileText size={14} /> Supports: TXT, DOCX, PDF, Google Docs
				</div>
			</div>
		</div>
	);
}
