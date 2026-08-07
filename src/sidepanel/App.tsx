import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { emptyAddress, type Address, type PackageDetails } from '../domain/models';
import { validatePackageWeight } from '../domain/packageWeight';
import { isAddressExtractionResult } from '../services/addressMapping';
import {
  click2ShipBackendClient,
  BackendClientError,
  type BackendConnectionDiagnostic,
  type BackendLabelType,
  type BackendPriceQuote,
} from '../services/click2ShipBackendClient';
import { describeCreateLabelError, type CreateLabelDiagnostic } from '../services/createLabelError';
import {
  EXTRACTION_RESULT_KEY,
  EXTRACTION_SESSION_ID_KEY,
  loadExtractionResult,
  loadExtractionSessionId,
  loadSelectedAt,
  loadSelection,
  loadSelectionDebug,
  loadSelectionId,
  loadSelectionStatus,
  loadSender,
  loadCompletedShipment,
  loadRecentLabels,
  loadPaymentOrder,
  saveCompletedShipment,
  savePaymentOrder,
  saveSender,
  startAnotherShipment,
  SELECTION_DEBUG_KEY,
  SELECTION_ID_KEY,
  SELECTION_KEY,
  SELECTED_AT_KEY,
  SELECTION_STATUS_KEY,
  type CompletedShipment,
  type SelectionDebugData,
} from '../services/storage';
import { emptyShipmentSession, shipmentSessionReducer } from './shipmentSession';
import { LabelTypeSelect } from './LabelTypeSelect';
import { copyText, downloadPdf, openPdfForPrint } from './labelActions';
import { createPricingInputKey, describePricingError, PricingRequestGate } from './pricingState';
import { PriceCard } from './PriceCard';
import {
  getPricingRequirements,
  groupMissingPricingRequirements,
  pricingRequirementControlId,
  type PricingRequirement,
} from './pricingRequirements';

const presets: Record<PackageDetails['preset'], Omit<PackageDetails, 'preset'>> = {
  'poly-mailer': { weight: '2', length: '12', width: '9', height: '1' },
  'small-box': { weight: '2', length: '8', width: '6', height: '4' },
  'medium-box': { weight: '2', length: '14', width: '10', height: '6' },
  'large-box': { weight: '2', length: '18', width: '14', height: '12' },
  custom: { weight: '2', length: '', width: '', height: '' },
};

const packageLabels: Record<PackageDetails['preset'], string> = {
  'poly-mailer': 'Poly mailer',
  'small-box': 'Small box',
  'medium-box': 'Medium box',
  'large-box': 'Large box',
  custom: 'Custom',
};

const developmentDiagnosticsEnabled =
  import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';
const buildTimestamp = __CLICK2SHIP_BUILD_TIMESTAMP__;
const PRICE_TIMEOUT_MS = 5_000;

const withPricingTimeout = <T,>(request: Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const error = new Error('Pricing request exceeded 5 seconds.');
      error.name = 'TimeoutError';
      reject(error);
    }, PRICE_TIMEOUT_MS);
    void request.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });

type AddressField = keyof Address;
const isSelectionDebugData = (value: unknown): value is SelectionDebugData => {
  if (!value || typeof value !== 'object') return false;
  const data = value as SelectionDebugData;
  return (
    typeof data.rawSelectionText === 'string' &&
    typeof data.structuredSelection === 'string' &&
    typeof data.parserInput === 'string' &&
    typeof data.detectedMarketplace === 'string' &&
    (data.extractionResult === null || isAddressExtractionResult(data.extractionResult))
  );
};
const fields: Array<{ key: AddressField; label: string; optional?: boolean; wide?: boolean }> = [
  { key: 'fullName', label: 'Full name', wide: true },
  { key: 'company', label: 'Company', optional: true, wide: true },
  { key: 'addressLine1', label: 'Address line 1', wide: true },
  { key: 'addressLine2', label: 'Address line 2', optional: true, wide: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zipCode', label: 'ZIP code' },
  { key: 'country', label: 'Country' },
  { key: 'phone', label: 'Phone', optional: true },
];

function AddressForm({
  value,
  onChange,
  prefix,
  missingByKey,
  touched,
  onTouched,
}: {
  value: Address;
  onChange: (next: Address) => void;
  prefix: string;
  missingByKey: Map<string, PricingRequirement>;
  touched: Set<string>;
  onTouched: (key: string) => void;
}) {
  return (
    <div className="field-grid">
      {fields.map(({ key, label, optional, wide }) => {
        const requirementKey = `${prefix}.${key}`;
        const missing = missingByKey.get(requirementKey);
        const showError = Boolean(missing && touched.has(requirementKey));
        return (
        <label className={`${wide ? 'wide' : ''}${showError ? ' field-missing' : ''}`} key={key}>
          <span>
            {label} {optional && <small>Optional</small>}
          </span>
          <input
            id={`${prefix}-${key}`}
            value={value[key]}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
            required={!optional}
            autoComplete={key === 'zipCode' ? 'postal-code' : 'off'}
            onBlur={() => onTouched(requirementKey)}
            aria-invalid={showError || undefined}
            aria-describedby={showError ? `${prefix}-${key}-pricing-error` : undefined}
          />
          {showError && (
            <small id={`${prefix}-${key}-pricing-error`} className="field-error">
              <span aria-hidden="true">⚠ </span>{missing?.message}
            </small>
          )}
        </label>
      )})}
    </div>
  );
}

export function App() {
  const selectionIdRef = useRef('');
  const selectionTextRef = useRef('');
  const createInFlightRef = useRef(false);
  const [selectionDebug, setSelectionDebug] = useState<SelectionDebugData | null>(null);
  const [shipmentSession, dispatchSession] = useReducer(
    shipmentSessionReducer,
    undefined,
    emptyShipmentSession,
  );
  const recipient = shipmentSession.parsedRecipient;
  const [sender, setSender] = useState<Address>(emptyAddress());
  const [senderStatus, setSenderStatus] = useState('');
  const [parcel, setParcel] = useState<PackageDetails>({
    ...presets['poly-mailer'],
    preset: 'poly-mailer',
  });
  const [packedConfirmed, setPackedConfirmed] = useState(false);
  const [finalConfirmed, setFinalConfirmed] = useState(false);
  const [completedShipment, setCompletedShipment] = useState<CompletedShipment | null>(null);
  const [recentLabels, setRecentLabels] = useState<CompletedShipment[]>([]);
  const [labelTypes, setLabelTypes] = useState<BackendLabelType[]>([]);
  const [selectedLabelTypeId, setSelectedLabelTypeId] = useState<string>('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelError, setLabelError] = useState('');
  const [backendHealth, setBackendHealth] = useState('not checked');
  const [healthResponseStatus, setHealthResponseStatus] = useState<number | null>(null);
  const [labelTypesStatus, setLabelTypesStatus] = useState('idle');
  const [labelTypesResponseStatus, setLabelTypesResponseStatus] = useState<number | null>(null);
  const [connectionDiagnostic, setConnectionDiagnostic] =
    useState<BackendConnectionDiagnostic | null>(null);
  const [createLabelDiagnostic, setCreateLabelDiagnostic] = useState<CreateLabelDiagnostic | null>(
    null,
  );
  const [copyStatus, setCopyStatus] = useState('');
  const [printStatus, setPrintStatus] = useState('');
  const [paymentPrice, setPaymentPrice] = useState<BackendPriceQuote | null>(null);
  const [pricingStatus, setPricingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [touchedPricingFields, setTouchedPricingFields] = useState<Set<string>>(
    () => new Set(),
  );
  const [pricingError, setPricingError] = useState('');
  const [quotedInputKey, setQuotedInputKey] = useState('');
  const [pricingDiagnostic, setPricingDiagnostic] = useState({
    url: click2ShipBackendClient.urlFor('/api/pricing/quote'),
    status: null as number | null,
    rawResponse: '',
    parsedAmount: null as number | null,
    pricingMode: '',
  });
  const pricingRequestGateRef = useRef(new PricingRequestGate());
  const [orderId, setOrderId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const handleQuoteExpired = useCallback(() => {
    setPaymentPrice(null);
    setQuotedInputKey('');
    setPricingStatus('error');
    setPricingError('Quote expired');
  }, []);

  useEffect(() => {
    void Promise.all([
      loadSelectionId(),
      loadSelection(),
      loadExtractionResult(),
      loadExtractionSessionId(),
      loadSelectedAt(),
      loadSender(),
      loadSelectionDebug(),
      loadSelectionStatus(),
      loadCompletedShipment(),
      loadRecentLabels(),
      loadPaymentOrder(),
    ])
      .then(
        ([
          selectionId,
          selectedText,
          extractionResult,
          extractionSessionId,
          selectedAt,
          savedSender,
          savedDebug,
          savedStatus,
          savedCompletedShipment,
          savedRecentLabels,
          savedPaymentOrder,
        ]) => {
          selectionIdRef.current = selectionId;
          selectionTextRef.current = selectedText;
          setSelectionDebug(savedDebug);
          setSender(savedSender);
          setRecentLabels(savedRecentLabels);
          if (savedPaymentOrder?.selectionId === selectionId) {
            setOrderId(savedPaymentOrder.orderId);
            setPaymentStatus('Waiting for payment…');
          }
          if (savedCompletedShipment?.selectionId === selectionId) {
            setCompletedShipment(savedCompletedShipment);
          } else if (selectionId) {
            void click2ShipBackendClient
              .getLabelBySelection(selectionId)
              .then(async (label) => {
                if (!label || selectionIdRef.current !== selectionId) return;
                const recovered: CompletedShipment = {
                  selectionId,
                  label,
                  recipientName: extractionResult?.fullName ?? '',
                  destinationCity: extractionResult?.city ?? '',
                  destinationState: extractionResult?.state ?? '',
                  weight: presets['poly-mailer'].weight,
                  length: presets['poly-mailer'].length,
                  width: presets['poly-mailer'].width,
                  height: presets['poly-mailer'].height,
                };
                await saveCompletedShipment(recovered);
                setCompletedShipment(recovered);
                setRecentLabels((current) =>
                  [
                    recovered,
                    ...current.filter((entry) => entry.label.id !== recovered.label.id),
                  ].slice(0, 10),
                );
              })
              .catch((error: unknown) => console.error('Failed to restore completed label', error));
          }
          if (selectionId) {
            dispatchSession({
              type: 'new',
              id: selectionId,
              rawSelection: selectedText,
              createdAt: selectedAt || Date.now(),
            });
          }
          if (extractionResult && extractionSessionId === selectionId) {
            dispatchSession({
              type: 'ready',
              id: selectionId,
              rawSelection: selectedText,
              result: extractionResult,
            });
          } else if (selectionId && savedStatus === 'fallback') {
            dispatchSession({ type: 'error', id: selectionId, rawSelection: selectedText });
          }
        },
      )
      .catch((error: unknown) => console.error('Failed to load shipment data', error));

    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      const changedSelectionId = changes[SELECTION_ID_KEY]?.newValue;
      const changedText = changes[SELECTION_KEY]?.newValue;
      if (typeof changedSelectionId === 'string') {
        const nextSelectionId = changedSelectionId;
        const nextText = typeof changedText === 'string' ? changedText : selectionTextRef.current;
        selectionIdRef.current = nextSelectionId;
        selectionTextRef.current = nextText;
        console.log('New selection received', {
          selectionId: nextSelectionId,
          selectedAddressText: nextText,
        });
        setCompletedShipment(null);
        setOrderId('');
        setPaymentStatus('');
        dispatchSession({
          type: 'new',
          id: nextSelectionId,
          rawSelection: nextText,
          createdAt:
            typeof changes[SELECTED_AT_KEY]?.newValue === 'number'
              ? changes[SELECTED_AT_KEY].newValue
              : Date.now(),
        });
      } else if (typeof changedText === 'string' && selectionIdRef.current) {
        selectionTextRef.current = changedText;
        dispatchSession({
          type: 'selection-read',
          id: selectionIdRef.current,
          rawSelection: changedText,
        });
      }

      const extractionValue = changes[EXTRACTION_RESULT_KEY]?.newValue;
      const extractionSessionId = changes[EXTRACTION_SESSION_ID_KEY]?.newValue;
      if (isAddressExtractionResult(extractionValue)) {
        const resultSelectionId =
          typeof extractionSessionId === 'string' ? extractionSessionId : '';
        if (resultSelectionId !== selectionIdRef.current) {
          console.log('Ignoring stale extraction result', {
            staleSelectionId: resultSelectionId,
            currentSelectionId: selectionIdRef.current,
          });
        } else {
          console.log('Applying extraction result', {
            selectionId: resultSelectionId,
            extractionResult: extractionValue,
          });
          dispatchSession({
            type: 'ready',
            id: resultSelectionId,
            rawSelection: typeof changedText === 'string' ? changedText : selectionTextRef.current,
            result: extractionValue,
          });
        }
      }

      const debugValue = changes[SELECTION_DEBUG_KEY]?.newValue;
      const nextDebug = isSelectionDebugData(debugValue) ? debugValue : null;
      if (nextDebug) setSelectionDebug(nextDebug);
      const nextStatus = changes[SELECTION_STATUS_KEY]?.newValue;
      if (nextStatus === 'fallback' && !isAddressExtractionResult(extractionValue)) {
        dispatchSession({
          type: 'error',
          id: selectionIdRef.current,
          rawSelection: selectionTextRef.current,
        });
      } else if (nextStatus === 'loading') {
        dispatchSession({ type: 'parsing', id: selectionIdRef.current });
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const loadLabelTypes = useCallback(async () => {
    setLabelTypesStatus('loading');
    setHealthResponseStatus(null);
    setLabelTypesResponseStatus(null);
    setLabelError('');
    const diagnostic = await click2ShipBackendClient.testConnection();
    setConnectionDiagnostic(diagnostic);
    setHealthResponseStatus(diagnostic.healthHttpStatus);
    setLabelTypesResponseStatus(diagnostic.labelTypesHttpStatus);
    setBackendHealth(diagnostic.healthResult);
    if (diagnostic.error) {
      console.error('Failed to load label types', diagnostic);
      setLabelTypesStatus('failed');
      setLabelError(diagnostic.error);
      return;
    }
    const body = { labelTypes: diagnostic.parsedLabelTypes };
    if (!Array.isArray(body.labelTypes)) {
      throw new Error(`Expected labelTypes array, received: ${JSON.stringify(body)}`);
    }
    setLabelTypes(body.labelTypes);
    setSelectedLabelTypeId((current) => {
      if (body.labelTypes.some((labelType) => String(labelType.id) === current)) return current;
      return body.labelTypes.length === 1 ? String(body.labelTypes[0].id) : '';
    });
    setLabelTypesStatus(`loaded ${body.labelTypes.length}`);
    setLabelError('');
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLabelTypes(), 0);
    return () => window.clearTimeout(timer);
  }, [loadLabelTypes]);

  const pricingInput = useMemo(
    () => ({
      selectionId: shipmentSession.id,
      labelTypeId: selectedLabelTypeId,
      parcel: { ...parcel },
      sender: { ...sender },
      recipient: { ...recipient },
    }),
    [
      shipmentSession.id,
      selectedLabelTypeId,
      parcel,
      sender,
      recipient,
    ],
  );
  const pricingRequirements = useMemo(
    () =>
      getPricingRequirements({
        selectedLabelTypeId,
        sender,
        recipient,
        package: parcel,
      }),
    [selectedLabelTypeId, sender, recipient, parcel],
  );
  const missingPricingRequirements = useMemo(
    () => pricingRequirements.filter((requirement) => !requirement.valid),
    [pricingRequirements],
  );
  const groupedMissingPricingRequirements = useMemo(
    () => groupMissingPricingRequirements(pricingRequirements),
    [pricingRequirements],
  );
  const missingPricingByKey = useMemo(
    () => new Map(missingPricingRequirements.map((requirement) => [requirement.key, requirement])),
    [missingPricingRequirements],
  );
  const pricingReady = missingPricingRequirements.length === 0;
  const canRequestPricing = pricingReady && pricingInput.selectionId !== '';
  const pricingInputKey = createPricingInputKey(pricingInput);
  const currentPrice = pricingReady && quotedInputKey === pricingInputKey ? paymentPrice : null;
  const displayedPricingStatus =
    pricingReady && paymentPrice !== null && quotedInputKey !== pricingInputKey
      ? 'loading'
      : pricingStatus;

  const focusPricingRequirement = useCallback((requirement: PricingRequirement) => {
    const key = requirement.key === 'package.dimensions' ? 'package.length' : requirement.key;
    setTouchedPricingFields((current) => new Set(current).add(key));
    const id = pricingRequirementControlId(requirement);
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element?.focus({ preventScroll: true });
    element?.classList.add('pricing-focus-flash');
    window.setTimeout(() => element?.classList.remove('pricing-focus-flash'), 1200);
  }, []);

  const loadPaymentPrice = useCallback(async (input: typeof pricingInput) => {
    const requestId = pricingRequestGateRef.current.begin();
    const requestedUrl = click2ShipBackendClient.urlFor('/api/pricing/quote');
    const startedAt = performance.now();
    setPricingStatus('loading');
    setPricingError('');
    try {
      const price = await withPricingTimeout(
        click2ShipBackendClient.getPricingQuote(
          input.selectionId,
          input.labelTypeId,
          input.sender,
          input.recipient,
          input.parcel,
        ),
      );
      if (!pricingRequestGateRef.current.isCurrent(requestId)) return;
      setPaymentPrice(price);
      setQuotedInputKey(createPricingInputKey(input));
      setPricingStatus('success');
      setPricingDiagnostic({
        url: requestedUrl,
        status: 200,
        rawResponse: JSON.stringify({ success: true, quote: price }),
        parsedAmount: price.customerPriceCents,
        pricingMode: price.pricingMode,
      });
      console.log('Pricing request completed', {
        pricingRequestUrl: requestedUrl,
        httpStatus: 200,
        responseBody: price,
        requestDurationMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      if (!pricingRequestGateRef.current.isCurrent(requestId)) return;
      const clientError = error instanceof BackendClientError ? error : null;
      setPaymentPrice(null);
      setQuotedInputKey('');
      setPricingStatus('error');
      setPricingError(describePricingError(error));
      setPricingDiagnostic({
        url: clientError?.requestedUrl || requestedUrl,
        status: clientError?.status ?? 0,
        rawResponse: clientError?.responseBody || '(empty)',
        parsedAmount: null,
        pricingMode: '',
      });
      console.error('Pricing request did not complete', {
        pricingRequestUrl: clientError?.requestedUrl || requestedUrl,
        httpStatus: clientError?.status ?? 'not received',
        responseBody: clientError?.responseBody || '(empty)',
        requestDurationMs: Math.round(performance.now() - startedAt),
        error,
      });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (!canRequestPricing) {
          pricingRequestGateRef.current.invalidate();
          setPaymentPrice(null);
          setQuotedInputKey('');
          setPricingStatus('idle');
          setPricingError('');
          return;
        }
        void loadPaymentPrice(pricingInput);
      },
      canRequestPricing ? 300 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [canRequestPricing, pricingInput, loadPaymentPrice]);

  const weightValidation = useMemo(() => validatePackageWeight(parcel.weight), [parcel.weight]);
  const canGenerate =
    packedConfirmed &&
    finalConfirmed &&
    !creatingLabel &&
    paymentPrice !== null &&
    quotedInputKey === pricingInputKey &&
    orderId === '' &&
    shipmentSession.id !== '' &&
    selectedLabelTypeId !== '' &&
    recipient.fullName.trim() !== '' &&
    recipient.addressLine1.trim() !== '' &&
    recipient.city.trim() !== '' &&
    recipient.state.trim() !== '' &&
    recipient.zipCode.trim() !== '' &&
    sender.fullName.trim() !== '' &&
    sender.addressLine1.trim() !== '' &&
    sender.city.trim() !== '' &&
    sender.state.trim() !== '' &&
    sender.zipCode.trim() !== '' &&
    weightValidation.valid &&
    Number(parcel.length) > 0 &&
    Number(parcel.width) > 0 &&
    Number(parcel.height) > 0;

  const changePreset = (preset: PackageDetails['preset']) => {
    setParcel((current) => ({ ...current, ...presets[preset], preset }));
  };

  const handleSaveSender = async () => {
    await saveSender(sender);
    setSenderStatus('Sender saved locally');
    window.setTimeout(() => setSenderStatus(''), 2500);
  };

  const handleGenerate = async () => {
    if (!canGenerate || createInFlightRef.current) return;
    createInFlightRef.current = true;
    setCreatingLabel(true);
    setLabelError('');
    setCreateLabelDiagnostic(null);
    try {
      const checkout = await click2ShipBackendClient.createCheckout(
        paymentPrice?.quoteId ?? '',
      );
      setOrderId(checkout.orderId);
      await savePaymentOrder(shipmentSession.id, checkout.orderId);
      setPaymentStatus('Waiting for payment confirmation…');
      if (checkout.checkoutUrl) await chrome.tabs.create({ url: checkout.checkoutUrl });
    } catch (error) {
      const described = describeCreateLabelError(error, developmentDiagnosticsEnabled);
      setCreateLabelDiagnostic(described.diagnostic);
      setLabelError(described.message);
    } finally {
      createInFlightRef.current = false;
      setCreatingLabel(false);
    }
  };

  useEffect(() => {
    if (!orderId || completedShipment) return;
    let stopped = false;
    let polling = false;
    let attempts = 0;
    const poll = async () => {
      if (stopped || polling) return;
      polling = true;
      attempts += 1;
      try {
        const order = await click2ShipBackendClient.getOrderStatus(orderId);
        if (order.status === 'checkout_created' || order.status === 'payment_pending') {
          setPaymentStatus('Waiting for payment…');
        } else if (order.status === 'paid' || order.status === 'label_processing') {
          setPaymentStatus('Payment received. Creating your label…');
        } else if (order.status === 'payment_failed') {
          setPaymentStatus('Payment failed. You may start a new checkout attempt.');
          stopped = true;
        } else if (order.status === 'label_failed') {
          setPaymentStatus('Payment succeeded, but label creation failed. Do not pay again.');
          setLabelError(order.errorMessage || 'Contact support for label recovery or a refund.');
          stopped = true;
        } else if (order.status === 'label_created' && order.label) {
          const completed: CompletedShipment = {
            selectionId: shipmentSession.id,
            label: order.label,
            recipientName: recipient.fullName,
            destinationCity: recipient.city,
            destinationState: recipient.state,
            weight: parcel.weight,
            length: parcel.length,
            width: parcel.width,
            height: parcel.height,
          };
          await saveCompletedShipment(completed);
          setCompletedShipment(completed);
          setRecentLabels((current) =>
            [completed, ...current.filter((entry) => entry.label.id !== completed.label.id)].slice(
              0,
              10,
            ),
          );
          stopped = true;
        }
      } catch (error) {
        console.error('Order status polling failed', error);
      } finally {
        polling = false;
      }
      if (attempts >= 150 && !stopped) {
        stopped = true;
        setPaymentStatus('Payment status timed out. Reopen Click2Ship to check this order again.');
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [orderId, completedShipment, shipmentSession.id, recipient, parcel]);

  const downloadLabel = async (shipment = completedShipment) => {
    if (!shipment) return;
    const blob = await click2ShipBackendClient.downloadLabel(shipment.label.id);
    downloadPdf(blob, shipment.label.trackingNumber);
  };

  const printLabel = async () => {
    if (!completedShipment) return;
    const automatic = await openPdfForPrint(() =>
      click2ShipBackendClient.downloadLabel(completedShipment.label.id),
    );
    setPrintStatus(
      automatic
        ? 'Print dialog opened.'
        : 'Automatic printing was blocked. Use the browser print dialog in the opened PDF.',
    );
  };

  const copyTracking = async (shipment = completedShipment) => {
    if (!shipment) return;
    const copied = await copyText(shipment.label.trackingNumber);
    setCopyStatus(
      copied
        ? 'Tracking number copied'
        : 'Copy failed. Select the tracking number above and copy it manually.',
    );
    window.setTimeout(() => setCopyStatus(''), 2500);
  };

  const reset = async () => {
    const nextSelectionId = await startAnotherShipment();
    selectionIdRef.current = nextSelectionId;
    selectionTextRef.current = '';
    dispatchSession({ type: 'new-empty', id: nextSelectionId, createdAt: Date.now() });
    setParcel({ ...presets['poly-mailer'], preset: 'poly-mailer' });
    setPackedConfirmed(false);
    setFinalConfirmed(false);
    setCompletedShipment(null);
    setOrderId('');
    setPaymentStatus('');
    setLabelError('');
    setCopyStatus('');
  };

  const resetExtensionData = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.clear();
      }
      setSelectionDebug(null);
      selectionIdRef.current = '';
      selectionTextRef.current = '';
      dispatchSession({ type: 'clear' });
      setSender(emptyAddress());
      setCompletedShipment(null);
      setSenderStatus('Extension data reset');
    } catch (error) {
      console.error('Failed to reset extension data', error);
      setSenderStatus('Could not reset extension data');
    }
  };

  if (completedShipment) {
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
          <p className="eyebrow">Label created successfully</p>
          <h1>Label created successfully</h1>
          <div className="tracking">
            <span>Tracking number</span>
            <strong>{completedShipment.label.trackingNumber}</strong>
          </div>
          <dl className="shipment-summary">
            <div>
              <dt>Recipient</dt>
              <dd>{completedShipment.recipientName}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>
                {completedShipment.destinationCity}, {completedShipment.destinationState}
              </dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>
                {completedShipment.weight} lb · {completedShipment.length} ×{' '}
                {completedShipment.width} × {completedShipment.height} in
              </dd>
            </div>
            <div>
              <dt>Label type</dt>
              <dd>{completedShipment.label.labelTypeName}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{completedShipment.label.reference}</dd>
            </div>
          </dl>
          <button className="primary" onClick={() => void downloadLabel()}>
            Download Label PDF
          </button>
          <button className="secondary" onClick={() => void copyTracking()}>
            Copy Tracking Number
          </button>
          {copyStatus && (
            <p className="action-status" role="status">
              {copyStatus}
            </p>
          )}
          <button className="secondary" onClick={() => void printLabel()}>
            Print Label
          </button>
          {printStatus && (
            <p className="action-status" role="status">
              {printStatus}
            </p>
          )}
          <button className="text-button" onClick={reset}>
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
              <button className="secondary compact" onClick={() => void downloadLabel(entry)}>
                Download
              </button>
              <button className="secondary compact" onClick={() => void copyTracking(entry)}>
                Copy Tracking
              </button>
            </article>
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="brand">
        <img
          className="brand-mark"
          src="/icons/icon48.png"
          alt="Click2Ship shipping package icon"
        />
        <div>
          <strong>Click2Ship</strong>
          <span>Test workflow</span>
        </div>
        <span className="demo-pill">DEMO</span>
      </header>

      <section className="intro">
        <p className="eyebrow">New shipment</p>
        <h1>Create a shipping label</h1>
        <p>Review the selected address, add package details, and generate a test label.</p>
        {shipmentSession.status === 'idle' && !shipmentSession.rawSelection && (
          <div className="warning-banner" role="status">
            Select an address on a webpage and right-click Create Shipping Label
          </div>
        )}
        {(shipmentSession.status === 'reading' || shipmentSession.status === 'parsing') && (
          <div className="loading-banner" role="status">
            <span className="loading-dot" /> Reading address...
          </div>
        )}
        {shipmentSession.status === 'error' && shipmentSession.rawSelection && (
          <div className="warning-banner" role="status">
            Automatic extraction was unavailable. Enter the recipient address manually.
          </div>
        )}
        {developmentDiagnosticsEnabled && (
          <details className="source backend-diagnostics">
            <summary>Backend diagnostics</summary>
            <pre>{`Build timestamp: ${buildTimestamp}\nAPI base URL: ${click2ShipBackendClient.apiBaseUrl}\nHealth request URL: ${connectionDiagnostic?.healthRequestUrl ?? click2ShipBackendClient.urlFor('/api/health')}\nHealth result: ${connectionDiagnostic?.healthResult ?? backendHealth}\nLabel-types request URL: ${connectionDiagnostic?.labelTypesRequestUrl ?? click2ShipBackendClient.urlFor('/api/shipping/label-types')}\nLabel-types HTTP status: ${connectionDiagnostic?.labelTypesHttpStatus ?? labelTypesResponseStatus ?? 'not received'}\nRaw label-types response: ${connectionDiagnostic?.rawLabelTypesResponse || '(empty)'}\nParsed label-type count: ${connectionDiagnostic?.parsedLabelTypes.length ?? 0}\nCurrent extension ID: ${typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime.id : 'unavailable'}\nCurrent extension origin: ${window.location.origin}\nSide-panel message result: ${connectionDiagnostic?.sidePanelMessageResult ?? 'not received'}\nBackground fetch status: ${connectionDiagnostic?.backgroundFetchStatus ?? 'not received'}\nFetch error: ${connectionDiagnostic?.error || 'none'}\nHealth HTTP status: ${healthResponseStatus ?? 'not received'}\nLabel-types state: ${labelTypesStatus}\nCreate-label request URL: ${createLabelDiagnostic?.requestUrl || click2ShipBackendClient.urlFor('/api/shipping/labels')}\nCreate-label HTTP status: ${createLabelDiagnostic?.httpStatus ?? 'not requested'}\nCreate-label response body: ${createLabelDiagnostic?.responseBody || '(empty)'}\nCreate-label parsed error: ${JSON.stringify(createLabelDiagnostic?.parsedError ?? null)}\nShipAir status: ${createLabelDiagnostic?.shipAirStatus ?? 'not received'}\nShipAir response: ${JSON.stringify(createLabelDiagnostic?.shipAirResponse ?? null)}`}</pre>
            <pre>{`Pricing request URL: ${pricingDiagnostic.url}\nPricing HTTP status: ${pricingDiagnostic.status ?? 'not requested'}\nRaw pricing response: ${pricingDiagnostic.rawResponse || '(empty)'}\nParsed amount: ${pricingDiagnostic.parsedAmount ?? 'not received'}\nPricing mode: ${pricingDiagnostic.pricingMode || 'not received'}`}</pre>
            <button
              type="button"
              className="secondary compact"
              onClick={() => void loadLabelTypes()}
            >
              Test Backend Connection
            </button>
          </details>
        )}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleGenerate();
        }}
      >
        <section className="card">
          <div className="section-heading">
            <span className="step">1</span>
            <div>
              <h2>Recipient</h2>
              <p>Parsed from your selected text</p>
            </div>
          </div>
          <details className="source" open>
            <summary>Original selected text</summary>
            <pre>
              {shipmentSession.rawSelection ||
                'No text selected. Right-click selected address text on a webpage.'}
            </pre>
          </details>
          {developmentDiagnosticsEnabled && (
            <details className="source debug-source">
              <summary>Selection parser debug</summary>
              <pre>
                {JSON.stringify(
                  {
                    detectedMarketplace: selectionDebug?.detectedMarketplace || 'generic',
                    extractionSource: selectionDebug?.extractionResult?.source ?? '',
                    confidence: selectionDebug?.extractionResult?.confidence ?? 0,
                    shipmentSessionStatus: shipmentSession.status,
                    shipmentSessionId: shipmentSession.id,
                    rawSelection: selectionDebug?.rawSelectionText ?? shipmentSession.rawSelection,
                    cleanedInput: selectionDebug?.parserInput ?? shipmentSession.rawSelection,
                    parsedResult: selectionDebug?.extractionResult ?? null,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          )}
          <AddressForm
            value={recipient}
            onChange={(next) =>
              dispatchSession({ type: 'edit-recipient', id: shipmentSession.id, recipient: next })
            }
            prefix="recipient"
            missingByKey={missingPricingByKey}
            touched={touchedPricingFields}
            onTouched={(key) => setTouchedPricingFields((current) => new Set(current).add(key))}
          />
        </section>

        <section className="card">
          <div className="section-heading">
            <span className="step">2</span>
            <div>
              <h2>Sender</h2>
              <p>Saved only on this device</p>
            </div>
          </div>
          <AddressForm
            value={sender}
            onChange={setSender}
            prefix="sender"
            missingByKey={missingPricingByKey}
            touched={touchedPricingFields}
            onTouched={(key) => setTouchedPricingFields((current) => new Set(current).add(key))}
          />
          <div className="save-row">
            <button
              type="button"
              className="secondary compact"
              onClick={() => void handleSaveSender()}
            >
              Save sender locally
            </button>
            <span role="status">{senderStatus}</span>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <span className="step">3</span>
            <div>
              <h2>Package</h2>
              <p>Use packed dimensions</p>
            </div>
          </div>
          <label
            className={`wide${missingPricingByKey.has('service.labelType') && touchedPricingFields.has('service.labelType') ? ' field-missing' : ''}`}
          >
            <span>Package preset</span>
            <select
              value={parcel.preset}
              onChange={(event) => changePreset(event.target.value as PackageDetails['preset'])}
            >
              {Object.entries(packageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            <span>Label type</span>
            <LabelTypeSelect
              id="service-labelType"
              labelTypes={labelTypes}
              selectedLabelTypeId={selectedLabelTypeId}
              onChange={(nextLabelTypeId) => {
                pricingRequestGateRef.current.invalidate();
                setTouchedPricingFields((current) =>
                  new Set(current).add('service.labelType'),
                );
                setSelectedLabelTypeId(nextLabelTypeId);
                setPaymentPrice(null);
                setQuotedInputKey('');
                setPricingError('');
                setPricingStatus(nextLabelTypeId ? 'loading' : 'idle');
              }}
              invalid={missingPricingByKey.has('service.labelType') && touchedPricingFields.has('service.labelType')}
              describedBy={touchedPricingFields.has('service.labelType') ? 'service-labelType-pricing-error' : undefined}
            />
            {missingPricingByKey.has('service.labelType') && touchedPricingFields.has('service.labelType') && (
              <small id="service-labelType-pricing-error" className="field-error">
                <span aria-hidden="true">⚠ </span>Required to calculate price
              </small>
            )}
          </label>
          <div className="dimensions">
            {(['weight', 'length', 'width', 'height'] as const).map((key) => (
              <label
                key={key}
                className={missingPricingByKey.has(`package.${key}`) && touchedPricingFields.has(`package.${key}`) ? 'field-missing' : ''}
              >
                <span>
                  {key[0].toUpperCase() + key.slice(1)}{' '}
                  <small>{key === 'weight' ? 'lb' : 'in'}</small>
                </span>
                <input
                  id={`package-${key}`}
                  type="number"
                  min={key === 'weight' ? 2 : 0.1}
                  step={key === 'weight' ? 0.01 : 0.1}
                  value={parcel[key]}
                  required
                  onChange={(event) =>
                    setParcel({
                      ...parcel,
                      [key]: event.target.value,
                      ...(key !== 'weight' ? { preset: 'custom' as const } : {}),
                    })
                  }
                  onBlur={() => setTouchedPricingFields((current) => new Set(current).add(`package.${key}`))}
                  aria-invalid={missingPricingByKey.has(`package.${key}`) && touchedPricingFields.has(`package.${key}`) || undefined}
                  aria-describedby={missingPricingByKey.has(`package.${key}`) && touchedPricingFields.has(`package.${key}`) ? `package-${key}-pricing-error` : undefined}
                />
                {missingPricingByKey.has(`package.${key}`) && touchedPricingFields.has(`package.${key}`) && (
                  <small id={`package-${key}-pricing-error`} className="field-error">
                    <span aria-hidden="true">⚠ </span>{missingPricingByKey.get(`package.${key}`)?.message}
                  </small>
                )}
              </label>
            ))}
          </div>
        </section>

        <PriceCard
          serviceName={currentPrice?.serviceName ?? ''}
          retailPrice={currentPrice?.referenceDisplayAmount ?? ''}
          customerPrice={currentPrice?.customerDisplayAmount ?? ''}
          savings={currentPrice?.savingsDisplayAmount ?? ''}
          savingsPercent={currentPrice?.savingsPercent ?? 0}
          expiresAt={currentPrice?.expiresAt ?? ''}
          status={displayedPricingStatus}
          errorMessage={pricingError}
          onRetry={() => void loadPaymentPrice(pricingInput)}
          onExpired={handleQuoteExpired}
          pricingReady={pricingReady}
          missingRequirements={groupedMissingPricingRequirements}
          onRequirementClick={focusPricingRequirement}
        />

        <section className="card confirmations">
          <label>
            <input
              type="checkbox"
              checked={packedConfirmed}
              onChange={(event) => setPackedConfirmed(event.target.checked)}
              required
            />
            <span>
              I confirm that the package is already packed and the weight and dimensions are
              accurate.
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={finalConfirmed}
              onChange={(event) => setFinalConfirmed(event.target.checked)}
              required
            />
            <span>
              I have reviewed all information and understand this will create a real, final shipping
              label.
            </span>
          </label>
        </section>

        {labelError && (
          <div className="label-error" role="alert">
            <p>{labelError}</p>
            <button
              type="button"
              className="secondary compact"
              onClick={() => void loadLabelTypes()}
            >
              Retry
            </button>
          </div>
        )}
        {paymentStatus && (
          <div className="loading-banner" role="status">
            {paymentStatus}
          </div>
        )}
        <p className="pricing-payment-status" role="status">
          {!pricingReady
            ? `${groupedMissingPricingRequirements.length} ${groupedMissingPricingRequirements.length === 1 ? 'item' : 'items'} needed before pricing`
            : displayedPricingStatus === 'loading'
              ? 'Calculating current USPS retail rate…'
              : currentPrice
                ? 'Price ready'
                : 'Pricing unavailable'}
        </p>
        <p className="fine-print">
          Once payment is completed and the shipping label is successfully generated, the label is
          final and nonrefundable.
        </p>
        <button className="primary generate" type="submit" disabled={!canGenerate}>
          {creatingLabel
            ? 'Opening secure checkout…'
            : `Pay ${paymentPrice?.customerDisplayAmount ?? '…'} and Create Label`}
        </button>
        <p className="fine-print">Stripe test mode only. Do not use a real payment card.</p>
        {developmentDiagnosticsEnabled && (
          <button
            className="text-button reset-data"
            type="button"
            onClick={() => void resetExtensionData()}
          >
            Reset extension data
          </button>
        )}
      </form>
    </main>
  );
}
