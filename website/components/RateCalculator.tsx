'use client';

import { useRef, useState, type FormEvent } from 'react';
import { CHROME_STORE_URL } from '../lib/chromeStore';
import { fetchRateEstimate, shipmentSummary, trackRateEvent, type RateInputs, type RateEstimate } from '../lib/rateCalculator';

export function RateCalculator() {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('standard');
  const [copied, setCopied] = useState('');
  const [result, setResult] = useState<{ input: RateInputs; estimate: RateEstimate; options: RateEstimate[] } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const input: RateInputs = {
      originZip: String(data.get('originZip')).trim(), destinationZip: String(data.get('destinationZip')).trim(),
      weight: Number(data.get('weight')), length: Number(data.get('length')), width: Number(data.get('width')), height: Number(data.get('height')),
      shipmentCategory: data.get('shipmentCategory') as RateInputs['shipmentCategory'], service: data.get('service') as RateInputs['service'],
    };
    inFlight.current = true;
    setBusy(true); setError(''); setResult(null); setCopied('');
    trackRateEvent('rate_check_started');
    try {
      const rates = await fetchRateEstimate(input);
      setResult({ input, ...rates });
      trackRateEvent('rate_check_success');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to check this rate. Please try again.');
      trackRateEvent('rate_check_failed');
    } finally { inFlight.current = false; setBusy(false); }
  }
  function handoff() {
    trackRateEvent('get_this_rate_clicked');
    if (result) {
      try { sessionStorage.setItem('shipdime-rate-inputs', JSON.stringify({ ...result.input, selectedLabelTypeId: result.estimate.labelTypeId })); }
      catch { /* Installation remains available if storage is disabled. */ }
    }
  }
  return (
    <section className="section rate-calculator-section" id="rate-calculator" aria-labelledby="calculator-title">
      <div className="shell">
        <div className="section-heading"><p className="eyebrow">Shipping rate calculator</p><h2 id="calculator-title">Find Your Shipping Deal</h2><p>Enter your shipment details once and let ShipDime search the available shipping options for you.</p><p>Explore discount shipping rates when looking for cheap shipping labels. No login or extension needed to check your shipping price.</p></div>
        <div className="rate-calculator-grid">
          <form onSubmit={submit} onChange={() => { setResult(null); setError(''); setCopied(''); }} aria-busy={busy}>
            <fieldset disabled={busy}>
              <legend>Shipment details</legend>
              <div className="rate-field-grid">
                <label>From: Origin ZIP Code<input name="originZip" required inputMode="numeric" autoComplete="section-origin postal-code" pattern="[0-9]{5}(-[0-9]{4})?" maxLength={10} placeholder="60101" /></label>
                <label>To: Destination ZIP Code<input name="destinationZip" required inputMode="numeric" autoComplete="section-destination postal-code" pattern="[0-9]{5}(-[0-9]{4})?" maxLength={10} placeholder="48047" /></label>
                <label>Weight (lb)<input name="weight" type="number" inputMode="decimal" required min="0.1" max="70" step="any" placeholder="3" /></label>
                <label>Package Type<select name="shipmentCategory" value={category} onChange={(event) => setCategory(event.target.value)}><option value="standard">Standard Package</option><option value="book">Books &amp; Media</option></select></label>
              </div>
              <div className="rate-dimensions">{['Length', 'Width', 'Height'].map((dimension) => <label key={dimension}>{dimension} (in)<input name={dimension.toLowerCase()} type="number" inputMode="decimal" required min="0.000001" step="any" /></label>)}</div>
              <label>Shipping option<select name="service" defaultValue="best"><option value="best">Best Rate / Cheapest</option><option value="ground">USPS Ground Advantage</option><option value="priority">USPS Priority Mail</option></select></label>
              {category === 'book' && <p className="microcopy">Books and other eligible media shipments.</p>}
              <p className="microcopy">U.S. domestic shipping · 0.1–70 lb</p>
              <button className="button primary" type="submit" disabled={busy}>{busy ? 'Checking your ShipDime rate…' : 'Check My Rate'}</button>
            </fieldset>
          </form>
          <div className="rate-result" aria-live="polite" aria-atomic="true">
            {error && <p role="alert">{error}</p>}
            {busy && <p role="status">Checking your ShipDime rate…</p>}
            {!result && !busy && !error && <><h3>Your ShipDime rate estimate</h3><p>Enter your ZIP codes and package details to see a live price from ShipDime’s backend.</p></>}
            {result && <>
              <p className="eyebrow">Your ShipDime rate · ZIP-only estimate</p>
              <p className="rate-result-price">{result.estimate.customerDisplayAmount}</p>
              <h3>{result.estimate.serviceName}</h3>
              <p>{result.input.weight} lb · {result.input.length} × {result.input.width} × {result.input.height} in<br />{result.input.originZip} → {result.input.destinationZip}</p>
              {result.options.length > 1 && <details><summary>See shipping options</summary><ul>{result.options.map((option) => <li key={option.labelTypeId}>{option.serviceName}: <strong>{option.customerDisplayAmount}</strong></li>)}</ul></details>}
              <a className="button primary" href={CHROME_STORE_URL} target="_blank" rel="noreferrer" onClick={handoff}>Get This Rate</a>
              <p>Install ShipDime to create and purchase your label.</p>
              <button className="button secondary" type="button" onClick={async () => {
                try { await navigator.clipboard.writeText(shipmentSummary(result.input, result.estimate)); setCopied('Shipment details copied.'); }
                catch { setCopied('Copy is unavailable. Use the shipment summary below.'); }
              }}>Copy shipment details</button>
              <p role="status">{copied}</p>
              <details><summary>Shipment summary for the extension</summary><pre>{shipmentSummary(result.input, result.estimate)}</pre></details>
            </>}
            <p className="microcopy">ZIP-only estimates use the same ShipDime pricing engine. Full sender and recipient addresses in the extension may produce a different rate. Rates can vary by shipment and may change before purchase.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
