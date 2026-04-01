/**
 * Formats revision timestamp into local readable text.
 * @param {string} createdAt - ISO date string.
 * @returns {string}
 */
function formatRevisionDate(createdAt) {
  return new Date(createdAt).toLocaleString();
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
  return (
    <section className="revision-panel">
      <div className="revision-header panel-title-row">
        <h2>Revision History</h2>
        <span className="panel-count">{revisions.length}</span>
        <button type="button" className="toolbar-btn" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? <p className="revision-meta">Loading revisions...</p> : null}
      {error ? <p className="revision-error">{error}</p> : null}
      {!loading && !error && revisions.length === 0 ? (
        <p className="revision-meta">No snapshots yet. Auto snapshots run every 30 seconds.</p>
      ) : null}

      <ul className="revision-list">
        {revisions.map((revision) => (
          <li key={revision._id} className="revision-item">
            <div>
              <p className="revision-summary">{revision.summary || "Revision"}</p>
              <p className="revision-meta">
                {formatRevisionDate(revision.createdAt)} by {revision.createdBy || "system"}
              </p>
            </div>
            <button
              type="button"
              className="toolbar-btn"
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