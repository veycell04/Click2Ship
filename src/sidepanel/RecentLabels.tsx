import type { CompletedShipment } from '../services/storage';

export function RecentLabels({
  labels,
  onDownload,
  onPrint,
  onCopy,
  onSupport,
}: {
  labels: CompletedShipment[];
  onDownload: (shipment: CompletedShipment) => void;
  onPrint: (shipment: CompletedShipment) => void;
  onCopy: (shipment: CompletedShipment) => void;
  onSupport: (shipment: CompletedShipment) => void;
}) {
  return (
    <section className="card recent-labels" aria-labelledby="recent-labels-heading">
      <h2 id="recent-labels-heading">Recent Labels</h2>
      {labels.length === 0 ? (
        <p className="fine-print">Your successfully created labels will appear here.</p>
      ) : (
        labels.slice(0, 10).map((entry) => (
          <article key={entry.label.id}>
            <div className="recent-label-details">
              <strong>{entry.recipientName || 'Shipping label'}</strong>
              <span>{new Date(entry.label.createdAt).toLocaleString()}</span>
              <span>USPS service: {entry.label.labelTypeName.replace(/^USPS\s+/i, '')}</span>
              <span>Tracking: {entry.label.trackingNumber}</span>
              {entry.price && <span>Amount paid: {entry.price}</span>}
            </div>
            <div className="recent-label-actions">
              <button className="secondary compact" onClick={() => onDownload(entry)}>Download Label</button>
              <button className="secondary compact" onClick={() => onPrint(entry)}>Print Label</button>
              <button className="secondary compact" onClick={() => onCopy(entry)}>Copy Tracking</button>
              <button className="text-button compact" onClick={() => onSupport(entry)}>Report a problem</button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
