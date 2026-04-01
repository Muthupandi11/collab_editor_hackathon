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
  isOffline,
  onRefresh,
  onRestore
}) {
  const skeletonRows = [1, 2, 3];

  return (
    <section className="revision-panel bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="revision-header panel-title-row border-l-4 border-blue-500 pl-3">
        <h2 className="text-gray-900 dark:text-gray-200">History</h2>
        <span className="panel-count">{revisions.length}</span>
        <button type="button" className="toolbar-btn" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {isOffline ? <p className="revision-meta text-amber-600 dark:text-amber-400">Revisions save when backend is connected.</p> : null}

      {loading ? (
			<ul className="revision-list">
				{skeletonRows.map((item) => (
					<li key={item} className="h-16 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
				))}
			</ul>
		) : null}

      {error ? (
			<div className="revision-error-wrap rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
				<p className="revision-error text-amber-700 dark:text-amber-300">{error}</p>
				<button type="button" className="toolbar-btn" onClick={onRefresh}>
					Reconnect
				</button>
			</div>
		) : null}

      {!loading && !error && revisions.length === 0 ? (
        <div className="revision-meta rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-center">
				<div className="text-2xl mb-2">📝</div>
				<p className="m-0">Start typing to create history</p>
			</div>
      ) : null}

      <ul className="revision-list">
        {revisions.map((revision) => (
          <li key={revision._id} className="revision-item revision-row bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 rounded-lg p-3">
            <div className="min-w-0">
              <p className="revision-summary text-gray-800 dark:text-gray-200">{formatRelativeTime(revision.createdAt)}</p>
              <p className="revision-meta text-gray-500 dark:text-gray-400 truncate">{(revision.summary || "Revision snapshot").slice(0, 60)}...</p>
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