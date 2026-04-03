import React from "react";

/**
 * Prevents the app from rendering a blank page when an unhandled runtime error occurs.
 */
export default class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, info) {
		console.error("=== APP CRASH ===");
		console.error("Error:", error?.message || error);
		console.error("Stack:", error?.stack || "No stack");
		console.error("Component:", info?.componentStack || "No component stack");
	}

	render() {
		if (this.state.hasError) {
			const message = this.state.error?.message || "Unexpected error occurred";
			const isImportError = /Unexpected case|mammoth|pdfjs|import/i.test(message);

			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						height: "100vh",
						gap: "12px",
						fontFamily: "Inter, sans-serif",
						padding: "24px",
						textAlign: "center",
						background: "#F0EEE9"
					}}
				>
					<div
						style={{
							background: "white",
							borderRadius: "12px",
							padding: "32px 40px",
							maxWidth: "420px",
							boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
						}}
					>
						<div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠</div>
						<h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px", color: "#111827" }}>
							{isImportError ? "Import Failed" : "Something went wrong"}
						</h2>
						<p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 20px", lineHeight: "1.5" }}>
							{isImportError
								? "The file could not be imported into the editor. Try a different file or copy-paste text manually."
								: message}
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							style={{
								padding: "10px 24px",
								background: "#2563EB",
								color: "white",
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								fontSize: "14px",
								fontWeight: "500"
							}}
						>
							Reload Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
