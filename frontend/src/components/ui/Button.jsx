/**
 * Standard button primitive.
 * @param {import("react").ButtonHTMLAttributes<HTMLButtonElement>} props - Native button props.
 * @returns {JSX.Element}
 */
export default function Button(props) {
	return <button type="button" className="btn" {...props} />;
}
