/**
 * Formats revision timestamp into local readable text.
 * @param {string} createdAt - ISO date string.
 * @returns {string}
 */
function formatRelativeTime(createdAt) {
  const delta = Date.now() - new Date(createdAt).getTime();
  const sec = Math.max(1, Math.floor(delta / 1000));
  if (sec < 60) {
    return `${sec}s ago`;
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min}m ago`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr}h ago`;
  }
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/**
 * Displays revisions and allows restoring one snapshot.
 * @param {{
 * revisions: Array<{ _id: string, createdAt: string, createdBy: string, summary: string }>,
 * loading: boolean,
 * restoringId: string | null,
 * error: string,
 * onRefresh: () => void,
 * onRestore: (revisionId: string) => void
 * }} props - Revision panel props.
 * @returns {JSX.Element}
 */
export default function RevisionHistory({
  revisions,
  loading,
  restoringId,
  error,
  onRefresh,
  onRestore
}) {
  const skeletonRows = [1, 2, 3];

  return (
    <section className="revision-panel">
      <div className="revision-header panel-title-row">
        <h2>History</h2>
        <span className="panel-count">{revisions.length}</span>
        <button type="button" className="toolbar-btn" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
			<ul className="revision-list">
				{skeletonRows.map((item) => (
					<li key={item} className="revision-item skeleton-row" />
				))}
			</ul>
		) : null}

      {error ? (
			<div className="revision-error-wrap">
				<p className="revision-error">{error}</p>
				<button type="button" className="toolbar-btn" onClick={onRefresh}>
					Retry
				</button>
			</div>
		) : null}

      {!loading && !error && revisions.length === 0 ? (
        <p className="revision-meta">No revisions yet.</p>
      ) : null}

      <ul className="revision-list">
        {revisions.map((revision) => (
          <li key={revision._id} className="revision-item revision-row">
            <div>
              <p className="revision-summary">{formatRelativeTime(revision.createdAt)}</p>
              <p className="revision-meta">{(revision.summary || "Revision snapshot").slice(0, 60)}...</p>
            </div>
            <button
              type="button"
              className="toolbar-btn revision-restore-btn"
              disabled={Boolean(restoringId)}
              onClick={() => onRestore(revision._id)}
            >
              {restoringId === revision._id ? "Restoring..." : "Restore"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}