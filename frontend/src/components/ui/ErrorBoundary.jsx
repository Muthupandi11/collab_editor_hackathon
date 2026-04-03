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
		console.error("App crashed:", error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						height: "100vh",
						gap: "16px",
						fontFamily: "Inter, sans-serif",
						padding: "24px",
						textAlign: "center"
					}}
				>
					<h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>Something went wrong</h2>
					<p style={{ color: "#6B7280", fontSize: "14px", margin: 0 }}>
						{this.state.error?.message || "Unknown error"}
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
							fontSize: "14px"
						}}
					>
						Reload Page
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
