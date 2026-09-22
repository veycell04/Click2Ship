# Book discount configuration

Set `BOOK_DISCOUNT_PERCENT=40` in the **backend** Vercel environment and redeploy
the backend to apply the environment change. Values are percentages, including
decimals, from 0 through 100; `40` means 40%, while `0.40` means 0.4%.
No extension update or Chrome Web Store review is needed.

When configured, every eligible Book candidate uses:

`Math.round(referenceRateCents * (100 - BOOK_DISCOUNT_PERCENT) / 100)`

The existing service-class reference pools, fulfillment mappings, explicit
selection rules, and Media Mail support confirmation remain unchanged. Best Rate
selects the cheapest eligible Book candidate. The standard discount is not
applied first. Standard shipments continue using `SHIPDIME_DISCOUNT_PERCENT`
(including its existing legacy alias and default).

## Backward compatibility

Leave the variable absent to retain the complete previous Book behavior:

- Ground/Priority: apply the configured standard discount to the same reference.
- Supported Media Mail: `max(reference + BOOK_MIN_MARGIN_CENTS,
  min(standard-discounted reference, BOOK_TARGET_PRICE_CENTS))`.
- Best Rate: choose the lowest eligible candidate.

An empty or invalid value fails startup; it does not silently become zero.
`BOOK_TARGET_PRICE_CENTS` is retained for legacy compatibility. It is ignored in
percentage mode, where applying it would conflict with the percentage-only rule.
Recommended future cleanup: remove the target only after deliberately retiring
legacy fallback. It has not been removed here.

## Cost and consumer limitations

The quote path fetches EasyPost reference rates, **not actual ShipAir fulfillment
costs**. A reference is not a purchasable ShipAir cost. Percentage mode therefore
cannot guarantee a provider-cost-plus-margin floor and does not invent one.
`BOOK_MIN_MARGIN_CENTS` still participates in the legacy Media Mail calculation;
it does not provide a real-cost guarantee in either mode. If verified fulfillment
costs are introduced later, apply the real cost plus required margin before
comparing candidates.

The website estimate and extension quote use the same backend calculation.
Equal provider rates and service/category produce equal customer prices, covered
by tests using both actual clients. The website remains ZIP-only as previously
requested: full addresses or changing provider rates can produce different live
prices. No frontend discount formula was added.

At 100%, quotes are zero dollars when there is no actual cost floor. The website
accepts and displays this backend amount. Stripe and purchase behavior were not
changed or certified for zero-dollar purchases. Lower Book discounts than the
standard discount can make Book more expensive; percentage mode intentionally
uses the independent Book percentage rather than silently capping it with the
standard price.

## Existing service selection contract

The parser preserves `shipmentCategory`; a missing category defaults to `standard`.
Book requests use `bookService: "best"` by default, or `bookService: "selected"`
to restrict candidates to the requested `labelTypeId`. An unavailable explicit
service returns an error rather than substituting another service. Equal-priced
candidates retain existing ordering; at 100% several services can tie at zero.

Ground/Priority benchmark pools can include comparable FedEx and UPS rates even
though fulfillment is USPS. These pools and their service mappings are unchanged.
Production Media Mail requires both the configured ShipAir ID and a matching ID
from the provider's label-type response, plus a valid USPS MediaMail reference
rate. Missing or failed confirmation excludes Media Mail, not the other services.
Persisted extension quotes retain the resolved service, label ID, rate, and category;
public ZIP-only estimates remain unpersisted and cannot be used for checkout.

`BOOK_PRICE_CALCULATION` logs the mode, reference service/cents, configured Book
percentage, discounted candidate, selected fulfillment service, final cents,
and null actual-cost floor with `marginFloorGuaranteed: false`. No addresses,
credentials, or payment details are added to logs.

For a mocked 600-cent reference (no actual fulfillment cost available):

| Book discount | Customer price |
| --- | --- |
| 20% | $4.80 |
| 30% | $4.20 |
| 40% | $3.60 |
| 50% | $3.00 |
