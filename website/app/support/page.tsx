export const metadata = { title: 'Support — ShipDime', description: 'Get help with a ShipDime shipping label or tracking number.' };

export default function SupportPage() {
  const subject = encodeURIComponent('ShipDime support');
  const body = encodeURIComponent('Hi ShipDime Support,\n\nI need help with my shipping label.\n\nShipDime reference number (if available):\n\nIssue:\n');
  return <div className="shell legal-page"><p className="eyebrow">Support</p><h1>Need help with a label?</h1><p className="lead">If you have trouble accessing a label or tracking number, contact us and include your ShipDime reference number if available.</p><section className="support-card"><h2>Contact ShipDime Support</h2><p>Describe what happened and include your reference number or tracking number when available.</p><p><strong>Never send payment card information by email.</strong></p><a className="button primary" href={`mailto:info@veycell.org?subject=${subject}&body=${body}`}>Email support</a><a className="email-link" href="mailto:info@veycell.org">info@veycell.org</a></section></div>;
}
