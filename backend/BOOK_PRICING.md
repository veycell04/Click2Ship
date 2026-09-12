# Book quote selection

The quote parser preserves `shipmentCategory`; an omitted category defaults to
`standard`. Standard quote selection and discount calculations are unchanged.

For book quotes, compare these eligible candidates by final customer price:

- Ground Advantage and Priority: use each service's existing benchmark eligibility
  rules and cheapest reference rate, then `round(referenceCents * (100 - discountPercent) / 100)`.
  These are USPS fulfillment services; their existing benchmarks can include
  comparable FedEx or UPS rates. Keeping those pools preserves standard prices.
- Media Mail: include only a positive USD USPS MediaMail rate with the existing
  configured ShipAir Media Mail label type ID. Preserve its existing calculation:
  `max(referenceCents + minimumMarginCents, min(discountedReferenceCents, targetPriceCents))`.

Return the candidate with the lowest customer price and persist its corresponding
service, label type ID, reference rate, and category. Equal prices keep the first
standard candidate. Missing Media Mail does not prevent standard candidates.
The target is not a forced price or a discount applied to standard candidates.

Book quote requests may specify `bookService: "best"` (the default for older
clients) or `bookService: "selected"`. Selected mode restricts candidates to
the requested `labelTypeId`, and returns an unavailable-service error instead
of substituting. Best Rate is never more expensive than the equivalent standard
option; an explicitly selected service may cost more than a different service.
The standard UI and its selection remain independent of book choices.

In production, Media Mail requires both a configured label type ID and a
matching ID in ShipAir's label-type response. The backend marks that label type
with `bookService: "media-mail"` for the dropdown and rechecks provider support
when quoting. A missing/failed confirmation excludes Media Mail. Eligibility
also requires a USPS MediaMail reference rate for the shipment.

## Fulfillment cost limitation

The current quote provider supplies EasyPost reference rates, not ShipAir
fulfillment costs. No verified provider cost is available during quoting.
Therefore standard candidates retain the existing standard discount behavior;
Media Mail retains its conservative reference-plus-margin calculation. Neither
an EasyPost reference nor the stored `carrierRateCents` field proves ShipAir cost,
and this flow cannot guarantee a margin against an unknown fulfillment cost.

If verified costs are introduced, they must be matched to the actual fulfillment
service and shipment before comparing candidates, and candidates below that cost
plus required margin must be excluded. Such a floor can conflict with the
never-exceed-standard requirement when the unchanged standard quote itself is
below cost; it must not be implemented by silently assuming reference equals cost.
