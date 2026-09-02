interface GroundAdvantageSpotChecksProps {
  heading?: string;
  compact?: boolean;
}

const checks = [
  ['0.5 lb', 'IL → NY', '$5.59', '$6.68', '16.3% lower'],
  ['2 lb', 'IL → TX', '$5.59', '$7.80', '28.3% lower'],
  ['5 lb', 'IL → CA', '$5.68', '$7.88', '27.9% lower'],
  ['10 lb', 'IL → FL', '$10.41', '$12.30', '15.4% lower'],
];

export function GroundAdvantageSpotChecks({ heading = 'ShipDime vs Pirate Ship: Our Ground Advantage Spot Checks', compact = false }: GroundAdvantageSpotChecksProps) {
  return (
    <section className={`spot-checks${compact ? ' spot-checks-compact' : ''}`}>
      <p className="eyebrow">Tested price examples</p>
      <h2>{heading}</h2>
      <p>In four recent manual checks using identical USPS Ground Advantage shipment details, ShipDime returned a lower price than Pirate Ship for each tested shipment.</p>
      <div className="comparison-table-wrap"><table className="comparison-table spot-check-table"><thead><tr><th scope="col">Package</th><th scope="col">Route</th><th scope="col">ShipDime</th><th scope="col">Pirate Ship</th><th scope="col">Difference</th></tr></thead><tbody>
        {checks.map(([parcel, route, shipDime, pirateShip, difference]) => <tr key={`${parcel}-${route}`}><th scope="row">{parcel}</th><td>{route}</td><td>{shipDime}</td><td>{pirateShip}</td><td><strong>{difference}</strong></td></tr>)}
      </tbody></table></div>
      <p className="spot-check-disclosure">Manual spot checks performed September 2026 using the same package details and origin/destination on each service. Shipping rates change and vary by package, route, service and provider. These examples do not guarantee ShipDime will be cheaper for every shipment.</p>
    </section>
  );
}
