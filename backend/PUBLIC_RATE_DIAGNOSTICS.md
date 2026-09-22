# Public estimate failure investigation

Reproduction: `POST /api/pricing/estimate`, origin 60630, destination 48047,
3 lb, 14 x 10 x 10 in, standard, best. Production returned HTTP 503 with
`RATE_UNAVAILABLE`. The 60101 / 14 x 10 x 5 comparison also returned 503.
An invalid ZIP (`BAD`) returned the same 503 rather than schema validation's 422.
The production health endpoint reported database connected.

Given the checked-in route, these results localize failure to its rate-limit
database gate, before schema validation or provider rating. The old catch block
discarded the database error. Missing migration 005 / `public_rate_limits` is the
leading cause, **not a confirmed production SQL error**: production logs and a
production database connection were not available locally.

The limiter now recovers specifically from SQLSTATE `42P01` by creating the
existing migration's table/index if absent, then retrying the original atomic
counter once. Other SQL failures remain closed; there is no unrestricted or
process-local production fallback. Existing table contents are preserved.
If the runtime DB role cannot create tables, run the existing migration through
the normal privileged migration process. No production migration was run here.

## Trace and provider verification

`website/lib/rateCalculator.ts` sends measurements in pounds/inches to the public
endpoint. `parsePublicRateInput` validates ZIPs, defaults countries to US, creates
postal-only addresses, and maps best/ground to 120 and priority to 87. The provider
omits absent names/streets/cities/states; it supplies ZIP + US and converts 3 lb
to 48 oz. It does not fabricate address details or impose residential verification.

`getEstimate` fetches rates once, calls the same internal calculation as extension
`getQuote` for Ground/Priority, and selects the lowest returned customer price.
Book continues through its existing path. No formula, discount, mapping, or
selection rule changed in this fix.

An actual API call using the locally configured **EasyPost test-mode account**
returned 11 accepted rates for each requested shipment. For both, USPS Ground
Advantage was 614 reference cents and Priority was 952; the unchanged local 20%
setting produced 491 and 762 customer cents, selecting Ground. These are test-mode
observations, not advertised or guaranteed production rates.

USPS accepted ZIP-only input without city/state/street; these fields stayed null
in the provider response. Some unrelated carrier accounts reported missing street
or unsupported geography, without invalidating the usable USPS rates. This proves
support on the test account, not that every production carrier/account supports it.
Regression tests compare the public and extension endpoints with the same mocked
provider rates. No successful full-address **production** extension quote was
available for a live paired comparison.

## Vercel diagnostics

- `PUBLIC_RATE_FAILED`: request ID, stage, reason, safe SQLSTATE/provider status.
  `RATE_LIMIT_STORE_UNAVAILABLE` and `42P01` identify missing rate-limit schema.
- `PUBLIC_RATE_REQUEST`: normalized ZIPs, category, service and measurements, plus
  selection ID for correlation after validation.
- `REFERENCE_RATE_DIAGNOSTIC`: raw/accepted/rejected counts, available services,
  references, and classified carrier issues; no raw provider message text.
- `REFERENCE_RATE_FAILED`: safe classification/status of a provider exception.
- `PUBLIC_RATE_SUCCESS`: resolved service and customer cents.

Reasons distinguish `NO_PROVIDER_RATE`, `INVALID_ADDRESS`, `UNSUPPORTED_SERVICE`,
`PROVIDER_ERROR`, `INVALID_PACKAGE`, and `NO_ELIGIBLE_RATE`. Public error bodies
stay generic; credentials, complete addresses and provider exception bodies are
not added to logs. ZIP-only estimates remain unpersisted/non-purchasable.

After deploying, repeat both shipments and the invalid-ZIP control. Expect valid
estimates when eligible rates exist, and 422 for the invalid ZIP. If 503 persists,
inspect `PUBLIC_RATE_FAILED` rather than assuming the provider returned no rates.
