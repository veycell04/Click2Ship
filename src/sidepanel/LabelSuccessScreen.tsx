import type { CompletedShipment } from '../services/storage';

export function LabelSuccessScreen({
  shipment,
  recentLabels,
  copyStatus,
  printStatus,
  onCopy,
  onDownload,
  onPrint,
  onStartAnother,
  onHistoryCopy,
  onHistoryDownload,
}: {
  shipment: CompletedShipment;
  recentLabels: CompletedShipment[];
  copyStatus: string;
  printStatus: string;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onStartAnother: () => void;
  onHistoryCopy: (shipment: CompletedShipment) => void;
  onHistoryDownload: (shipment: CompletedShipment) => void;
}) {
  const { label } = shipment;
  return (
    <main className="app success-screen">
      <header className="brand">
        <img
          className="brand-mark"
          src="/icons/icon48.png"
          alt="Click2Ship shipping package icon"
        />
        <strong>Click2Ship</strong>
      </header>
      <section className="success-card">
        <div className="success-icon">✓</div>
        <h1>Label created successfully</h1>
        <div className="tracking">
          <span>Tracking number</span>
          <strong tabIndex={0}>{label.trackingNumber}</strong>
        </div>
        <dl className="shipment-summary">
          <div>
            <dt>Recipient</dt>
            <dd>{shipment.recipientName}</dd>
          </div>
          <div>
            <dt>Destination</dt>
            <dd>
              {shipment.destinationCity}, {shipment.destinationState}
            </dd>
          </div>
          <div>
            <dt>Package</dt>
            <dd>
              {shipment.weight} lb · {shipment.length} × {shipment.width} × {shipment.height} in
            </dd>
          </div>
          <div>
            <dt>Label type</dt>
            <dd>{label.labelTypeName}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd>{label.reference}</dd>
          </div>
        </dl>
        <button className="secondary" onClick={onCopy}>
          Copy Tracking Number
        </button>
        {copyStatus && (
          <p className="action-status" role="status">
            {copyStatus}
          </p>
        )}
        <button className="primary" onClick={onDownload}>
          Download Label PDF
        </button>
        <button className="secondary" onClick={onPrint}>
          Print Label
        </button>
        {printStatus && (
          <p className="action-status" role="status">
            {printStatus}
          </p>
        )}
        <button className="text-button" onClick={onStartAnother}>
          Start Another Shipment
        </button>
      </section>
      <section className="card recent-labels">
        <h2>Recent Labels</h2>
        {recentLabels.slice(0, 10).map((entry) => (
          <article key={entry.label.id}>
            <div>
              <strong>{entry.recipientName}</strong>
              <span>
                {entry.destinationCity}, {entry.destinationState} ·{' '}
                {new Date(entry.label.createdAt).toLocaleString()}
              </span>
              <span>
                {entry.label.trackingNumber} · {entry.label.labelTypeName}
              </span>
            </div>
            <button className="secondary compact" onClick={() => onHistoryDownload(entry)}>
              Download
            </button>
            <button className="secondary compact" onClick={() => onHistoryCopy(entry)}>
              Copy Tracking
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
