/**
 * Wraps the app page shell.
 * @param {{ children: import("react").ReactNode }} props - Layout props.
 * @returns {JSX.Element}
 */
export default function AppLayout({ children }) {
	return <div className="app-shell">{children}</div>;
}
