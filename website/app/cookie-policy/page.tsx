import Link from 'next/link';
import { pageMetadata } from '../../lib/metadata';

export const metadata = pageMetadata({
  title: 'Cookie and Tracking Policy — ShipDime',
  description: 'How the ShipDime website uses Google Ads measurement and how to manage browser tracking settings.',
  path: '/cookie-policy',
});

export default function CookiePolicyPage() {
  return <div className="shell legal-page">
    <p className="eyebrow">Privacy and tracking</p>
    <h1>Cookie and Tracking Policy</h1>
    <p className="lead">This page explains the tracking technology used on the ShipDime public website. Read our <Link href="/privacy">Privacy Policy</Link> for shipment, payment, and extension data handling.</p>
    <section><h2>Website operation</h2><p>The website uses hosting, scripts, and static assets to display pages and play the product demo. The website code does not currently create its own login, cart, or preference cookies, or store website preferences in local storage. Hosting providers may process request information such as IP addresses and browser details to deliver and protect the site.</p></section>
    <section><h2>Google Ads measurement</h2><p>ShipDime loads a Google tag for Google Ads after the page becomes interactive. It helps measure advertising activity and attribution. Depending on browser settings and Google&apos;s behavior, the tag may set or read cookies or advertising identifiers and send information about page visits, ad interactions, browser/device details, and network requests to Google.</p><p>The tag is supplied by Google and uses Google&apos;s infrastructure. The website does not currently present a cookie consent banner or wait for a site-level consent choice before loading this tag. Browser restrictions can affect what it stores or sends.</p></section>
    <section><h2>Your browser controls</h2><p>You can review, block, or delete cookies in your browser settings, including third-party cookies where supported. Blocking tracking can limit advertising measurement. Deleting website cookies does not automatically delete shipment records or data saved by the Chrome extension.</p><p>See <a href="https://support.google.com/chrome/answer/95647">Chrome cookie controls</a>, <a href="https://myadcenter.google.com/">Google My Ad Center</a>, and <a href="https://policies.google.com/technologies/ads">Google&apos;s advertising technology information</a> for further choices and explanations.</p></section>
    <section><h2>Extension and checkout</h2><p>The extension separately uses Chrome local storage for saved sender details, shipment state, and recent labels. Hosted payment pages and other third-party services may use their own technologies. Those services are distinct from cookies on this public website.</p></section>
    <section><h2>Questions</h2><p>Contact <a href="mailto:info@veycell.org">info@veycell.org</a> with questions about this policy or your data.</p></section>
  </div>;
}
