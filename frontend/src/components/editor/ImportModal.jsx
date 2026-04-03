import { FileText, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "../../lib/toast.js";

/**
 * Import modal for TXT files only.
 * @param {{
 * open: boolean,
 * onClose: () => void,
 * onImport: (payload: { html: string, source: string }) => Promise<void>
 * }} props
 * @returns {JSX.Element | null}
 */
export default function ImportModal({ open, onClose, onImport }) {
	const [selectedFile, setSelectedFile] = useState(null);
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

	const handleImport = async () => {
		if (typeof onImport !== "function") {
			setImportError("Editor not ready. Please reload the page.");
			return;
		}

		setImportError("");

		try {
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
				throw new Error("Only .txt files are supported");
			}

			setImportStep("Reading TXT file...");
			const text = await selectedFile.text();
			if (!text || !text.trim()) {
				throw new Error("TXT file is empty");
			}

			const html = toHtmlFromText(text);
			const source = selectedFile.name;

			if (!html?.trim()) {
				throw new Error("No content received from server");
			}

			setImportStep("");
			setSelectedFile(null);
			onClose();

			// Critical timing: let modal unmount fully before touching editor content.
			await new Promise((resolve) => setTimeout(resolve, 150));

			setImportStep("Loading into editor...");
			await onImport({ html, source });
			await new Promise((resolve) => setTimeout(resolve, 100));
		} catch (error) {
			console.error("Import failed:", error);
			setImportStep("");
			setImportError(error?.message || "Import failed. Please try again.");
			toast.error(error?.message || "Import failed. Please try again.");
		}
	};

	const importDisabled = !!importStep || !selectedFile;

	return (
		<div className="join-modal-overlay" role="dialog" aria-modal="true" aria-label="Import Document">
			<div className="join-modal-card import-modal-card">
				<h1>Import TXT</h1>
				<p>Importing will replace current document content. Current content will be auto-saved first.</p>

				<label className="import-dropzone">
					<input
						type="file"
						accept=".txt,text/plain"
						onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
					/>
					<Upload size={18} />
					<span>{selectedFile ? selectedFile.name : "Drop or browse TXT file"}</span>
				</label>

				{title ? <div className="import-progress"><span className="ring" />{title}</div> : null}
				{importError ? <div className="join-modal-error">{importError}</div> : null}

				<div className="import-modal-actions">
					<button type="button" onClick={onClose}>Cancel</button>
					<button type="button" onClick={handleImport} disabled={importDisabled}>{importStep ? "Importing..." : "Import"}</button>
				</div>

				<div className="import-supports">
					<FileText size={14} /> Supports: TXT only
				</div>
			</div>
		</div>
	);
}
