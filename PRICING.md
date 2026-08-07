# Click2Ship pricing

EasyPost is the backend-only USPS rate provider. Creating an EasyPost Shipment with `from_address`,
`to_address`, and `parcel` retrieves rates; Click2Ship never buys postage from EasyPost. It keeps
only USPS rates with a valid `retail_rate`, which is the post-office retail comparison price. The
EasyPost account rate and list rate are never shown or used as the reference.

Click2Ship pounds are converted to EasyPost ounces (`weight * 16`). ShipAir label type `87` maps
only to EasyPost service code `Priority`, displayed as **USPS Priority Mail**. Ground Advantage is
not active until ShipAir confirms its matching label-type ID.

All calculations use integer cents:

```text
customerPriceCents = Math.round(referencePriceCents * (100 - discountPercent) / 100)
savingsCents = referencePriceCents - customerPriceCents
```

At 20%, 800 cents becomes 640, 500 becomes 400, and 1525 becomes 1220. Quotes expire after ten
minutes. A newer quote for the same selection invalidates the older quote.

Backend configuration:

```text
EASYPOST_API_KEY=EZTK...
CLICK2SHIP_DISCOUNT_PERCENT=20
```

Use an EasyPost test key during development. The key must never be prefixed with `VITE_` or sent to
the extension.
