import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { emptyAddress, type Address, type PackageDetails } from '../domain/models';
import { validatePackageWeight } from '../domain/packageWeight';
import { isAddressExtractionResult } from '../services/addressMapping';
import {
  click2ShipBackendClient,
  BackendClientError,
  type BackendConnectionDiagnostic,
  type BackendLabelType,
  type BackendOrderResult,
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
  loadPaymentOrders,
  loadPendingNewShipment,
  consumePendingNewShipment,
  saveCompletedShipment,
  saveRecentLabel,
  savePaymentOrder,
  updatePaymentOrderStatus,
  saveSender,
  startAnotherShipment,
  SELECTION_DEBUG_KEY,
  SELECTION_ID_KEY,
  SELECTION_KEY,
  SELECTED_AT_KEY,
  SELECTION_STATUS_KEY,
  PENDING_NEW_SHIPMENT_KEY,
  isPendingNewShipment,
  type CompletedShipment,
  type SelectionDebugData,
} from '../services/storage';
import { resolveInitialSidePanelRoute } from './shipmentRouting';
import { emptyShipmentSession, shipmentSessionReducer } from './shipmentSession';
import { parseFallbackAddress } from './fallbackAddressParsing';
import { copyText, downloadPdf, openPdfForPrint } from './labelActions';
import { createPricingInputKey, describePricingError, PricingRequestGate } from './pricingState';
import { PriceCard } from './PriceCard';
import { LabelTypeSelect } from './LabelTypeSelect';
import { mapBackendPricingFieldErrors } from './pricingFieldErrors';
import { RecentLabels } from './RecentLabels';
import { createSupportMailto } from './support';
import { shipmentDestination, shipmentPackage } from './shipmentDisplay';
import {
  getPricingRequirements,
  groupMissingPricingRequirements,
  pricingRequirementControlId,
  type PricingRequirement,
} from './pricingRequirements';

const presets: Record<PackageDetails['preset'], Omit<PackageDetails, 'preset'>> = {
  'book-poly-mailer': { weight: '2', length: '12', width: '9', height: '1' },
  'poly-mailer': { weight: '2', length: '12', width: '9', height: '1' },
  'small-box': { weight: '2', length: '8', width: '6', height: '4' },
  'medium-box': { weight: '2', length: '14', width: '10', height: '6' },
  'large-box': { weight: '2', length: '18', width: '14', height: '12' },
  custom: { weight: '2', length: '', width: '', height: '' },
};

const packageLabels: Record<PackageDetails['preset'], string> = {
  'book-poly-mailer': 'Book / Poly Mailer',
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

const completedShipmentFromOrder = (order: BackendOrderResult): CompletedShipment | null => {
  if (order.status !== 'label_created' || !order.label || !order.successDetails) return null;
  const details = order.successDetails;
  return {
    orderId: order.id,
    quoteId: order.quoteId,
    selectionId: order.selectionId,
    label: {
      ...order.label,
      trackingNumber: details.trackingNumber,
      labelTypeName: details.serviceName,
      reference: details.reference ?? '',
      downloadUrl: details.labelUrl ?? order.label.downloadUrl,
    },
    recipientName: details.recipientName,
    destinationCity: '',
    destinationState: '',
    destination: details.destination,
    weight: details.weightLb === null ? '' : String(details.weightLb),
    length: details.lengthIn === null ? '' : String(details.lengthIn),
    width: details.widthIn === null ? '' : String(details.widthIn),
    height: details.heightIn === null ? '' : String(details.heightIn),
    price: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: order.currency || 'USD',
    }).format(order.amountCents / 100),
  };
};

const hasSuccessDisplayDetails = (shipment: CompletedShipment): boolean =>
  Boolean(
    shipment.recipientName.trim() &&
      shipmentDestination(shipment) &&
      shipment.weight &&
      shipment.length &&
      shipment.width &&
      shipment.height,
  );

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

export function AddressForm({
  value,
  onChange,
  onFieldEdited,
  prefix,
  missingByKey,
  touched,
  onTouched,
}: {
  value: Address;
  onChange: (next: Address) => void;
  onFieldEdited: (key: string) => void;
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
        const showError = Boolean(
          missing && (touched.has(requirementKey) || (key === 'zipCode' && value[key].trim() !== '')),
        );
        return (
        <label className={`${wide ? 'wide' : ''}${showError ? ' field-missing' : ''}`} key={key}>
          <span>
            {label} {optional && <small>Optional</small>}
          </span>
          <input
            id={`${prefix}-${key}`}
            value={value[key]}
            onChange={(event) => {
              onFieldEdited(requirementKey);
              onChange({ ...value, [key]: event.target.value });
            }}
            required={!optional}
            autoComplete={key === 'zipCode' ? 'postal-code' : 'off'}
            onBlur={() => {
              if (key === 'zipCode') {
                const normalizedZip = value[key].trim();
                if (normalizedZip !== value[key]) {
                  onFieldEdited(requirementKey);
                  onChange({ ...value, [key]: normalizedZip });
                }
              }
              onTouched(requirementKey);
            }}
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
  const [standardLabelTypeId, setSelectedLabelTypeId] = useState<string>('');
  const [bookLabelTypeId, setBookLabelTypeId] = useState<string>('best');
  const selectedLabelTypeId = parcel.preset === 'book-poly-mailer' ? bookLabelTypeId : standardLabelTypeId;
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
  const [backendPricingFieldErrors, setBackendPricingFieldErrors] = useState<
    PricingRequirement[]
  >([]);
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
  const [orderStatus, setOrderStatus] = useState<BackendOrderResult['status'] | ''>('');
  const [pollRevision, setPollRevision] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [currentView, setCurrentView] = useState<'shipment' | 'recent'>('shipment');
  const handleQuoteExpired = useCallback(() => {
    setPaymentPrice(null);
    setQuotedInputKey('');
    setPricingStatus('error');
    setPricingError('Quote expired');
  }, []);

  useEffect(() => {
    const parseStoredFallback = (selectionId: string, selectedAddressText: string) => {
      if (!selectionId || !selectedAddressText.trim()) {
        dispatchSession({ type: 'error', id: selectionId, rawSelection: selectedAddressText });
        return;
      }

      dispatchSession({ type: 'parsing', id: selectionId });
      void parseFallbackAddress(selectedAddressText)
        .then((result) => {
          if (selectionIdRef.current !== selectionId) {
            console.log('Ignoring stale extraction result', {
              staleSelectionId: selectionId,
              currentSelectionId: selectionIdRef.current,
            });
            return;
          }
          console.log('Applying fallback extraction result', {
            selectionId,
            extractionResult: result,
          });
          dispatchSession({
            type: 'ready',
            id: selectionId,
            rawSelection: selectedAddressText,
            result,
          });
        })
        .catch((error: unknown) => {
          console.error('Fallback address parsing failed', error);
          if (selectionIdRef.current !== selectionId) return;
          dispatchSession({ type: 'error', id: selectionId, rawSelection: selectedAddressText });
        });
    };

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
      loadPaymentOrders(),
      loadPendingNewShipment(),
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
          savedPaymentOrders,
          pendingNewShipment,
        ]) => {
          const route = resolveInitialSidePanelRoute({
            pendingNewShipment,
            selectionId,
            paymentOrder: savedPaymentOrder,
            completedShipment: savedCompletedShipment,
          });
          const activeSelectionId = route.selectionId;
          const activeText =
            route.view === 'new-shipment' ? route.intent.selectedText : selectedText;
          selectionIdRef.current = activeSelectionId;
          selectionTextRef.current = activeText;
          setSelectionDebug(savedDebug);
          setSender(savedSender);
          setRecentLabels(savedRecentLabels);
          if (route.view === 'recovery') {
            const savedPaymentOrder = route.order;
            setOrderId(savedPaymentOrder.orderId);
            if (
              ['draft', 'checkout_created', 'payment_pending', 'paid', 'label_processing', 'label_created', 'payment_failed', 'label_failed'].includes(
                savedPaymentOrder.currentStatus,
              )
            ) {
              setOrderStatus(savedPaymentOrder.currentStatus as BackendOrderResult['status']);
            }
            setPaymentStatus('Waiting for payment…');
          }
          void Promise.allSettled(
            savedPaymentOrders.map((storedOrder) =>
              click2ShipBackendClient.getOrderStatus(storedOrder.orderId),
            ),
          ).then(async (results) => {
            const recovered = results
              .filter(
                (result): result is PromiseFulfilledResult<BackendOrderResult> =>
                  result.status === 'fulfilled',
              )
              .map((result) => completedShipmentFromOrder(result.value))
              .filter((shipment): shipment is CompletedShipment => shipment !== null);
            if (recovered.length === 0) return;
            await Promise.all(recovered.map(saveRecentLabel));
            setRecentLabels((current) =>
              [...recovered, ...current]
                .filter(
                  (entry, index, all) =>
                    all.findIndex((candidate) => candidate.label.id === entry.label.id) === index,
                )
                .slice(0, 10),
            );
          });
          if (route.view === 'completed' && hasSuccessDisplayDetails(route.shipment)) {
            setCompletedShipment(route.shipment);
          } else if (route.view !== 'new-shipment' && activeSelectionId) {
            void click2ShipBackendClient
              .getLabelBySelection(activeSelectionId)
              .then(async (label) => {
                if (!label || selectionIdRef.current !== activeSelectionId) return;
                const recovered: CompletedShipment = {
                  selectionId: activeSelectionId,
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
          if (activeSelectionId) {
            dispatchSession({
              type: 'new',
              id: activeSelectionId,
              rawSelection: activeText,
              createdAt:
                route.view === 'new-shipment' ? route.intent.createdAt : selectedAt || Date.now(),
            });
          }
          if (extractionResult && extractionSessionId === activeSelectionId) {
            if (developmentDiagnosticsEnabled) console.log('ADDRESS_PARSE_RESULT', {
              selectionId: activeSelectionId,
              success: true,
              fieldsPresent: {
                fullName: Boolean(extractionResult.fullName),
                address1: Boolean(extractionResult.address1),
                city: Boolean(extractionResult.city),
                state: Boolean(extractionResult.state),
                zip: Boolean(extractionResult.zip),
              },
            });
            dispatchSession({
              type: 'ready',
              id: activeSelectionId,
              rawSelection: activeText,
              result: extractionResult,
            });
          } else if (activeSelectionId && activeText.trim() && savedStatus === 'fallback') {
            parseStoredFallback(activeSelectionId, activeText);
          }
          if (route.view === 'new-shipment') {
            setCurrentView('shipment');
            setCompletedShipment(null);
            setOrderId('');
            setOrderStatus('');
            setPaymentStatus('');
            setPaymentPrice(null);
            setQuotedInputKey('');
            pricingRequestGateRef.current.invalidate();
            void consumePendingNewShipment(route.selectionId);
          }
        },
      )
      .catch((error: unknown) => console.error('Failed to load shipment data', error));

    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      const pendingIntent = changes[PENDING_NEW_SHIPMENT_KEY]?.newValue;
      if (isPendingNewShipment(pendingIntent)) {
        if (developmentDiagnosticsEnabled) console.log('ADDRESS_PARSE_START', {
          selectionId: pendingIntent.selectionId,
          textLength: pendingIntent.selectedText.length,
        });
        selectionIdRef.current = pendingIntent.selectionId;
        selectionTextRef.current = pendingIntent.selectedText;
        setCurrentView('shipment');
        setCompletedShipment(null);
        setOrderId('');
        setOrderStatus('');
        setPaymentStatus('');
        setPaymentPrice(null);
        setQuotedInputKey('');
        setPricingStatus('idle');
        setPricingError('');
        setBackendPricingFieldErrors([]);
        pricingRequestGateRef.current.invalidate();
        setParcel({ ...presets['poly-mailer'], preset: 'poly-mailer' });
        setPackedConfirmed(false);
        setFinalConfirmed(false);
        dispatchSession({
          type: 'new',
          id: pendingIntent.selectionId,
          rawSelection: pendingIntent.selectedText,
          createdAt: pendingIntent.createdAt,
        });
        void consumePendingNewShipment(pendingIntent.selectionId);
      }
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
        setOrderStatus('');
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
        parseStoredFallback(selectionIdRef.current, selectionTextRef.current);
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
    setSelectedLabelTypeId((current) =>
      body.labelTypes.some((labelType) => String(labelType.id) === current)
        ? current
        : String(body.labelTypes[0]?.id ?? ''),
    );
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
    () =>
      new Map(
        [...missingPricingRequirements, ...backendPricingFieldErrors].map((requirement) => [
          requirement.key,
          requirement,
        ]),
      ),
    [backendPricingFieldErrors, missingPricingRequirements],
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

  const clearBackendPricingFieldError = useCallback((key: string) => {
    setBackendPricingFieldErrors((current) => current.filter((error) => error.key !== key));
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
      setBackendPricingFieldErrors([]);
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
      const fieldErrors = mapBackendPricingFieldErrors(error);
      setPaymentPrice(null);
      setQuotedInputKey('');
      setPricingStatus('error');
      setBackendPricingFieldErrors(fieldErrors);
      if (fieldErrors.length > 0) {
        setTouchedPricingFields((current) => {
          const next = new Set(current);
          fieldErrors.forEach((fieldError) => next.add(fieldError.key));
          return next;
        });
      }
      setPricingError(
        fieldErrors.length > 0 ? 'Please fix the highlighted fields.' : describePricingError(error),
      );
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
    if (preset === 'book-poly-mailer' && parcel.preset !== preset) setBookLabelTypeId('best');
    ['package.weight', 'package.length', 'package.width', 'package.height'].forEach(
      clearBackendPricingFieldError,
    );
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
    setBackendPricingFieldErrors([]);
    setCreateLabelDiagnostic(null);
    try {
      const checkout = await click2ShipBackendClient.createCheckout(
        paymentPrice?.quoteId ?? '',
      );
      setOrderId(checkout.orderId);
      await savePaymentOrder(
        shipmentSession.id,
        checkout.orderId,
        paymentPrice?.quoteId ?? '',
        checkout.status ?? 'payment_pending',
      );
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
        setOrderStatus(order.status);
        await updatePaymentOrderStatus(orderId, order.status);
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
          const completed = completedShipmentFromOrder(order);
          if (!completed) return;
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
        setPaymentStatus('Payment status timed out. Reopen ShipDime to check this order again.');
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [orderId, completedShipment, shipmentSession.id, recipient, parcel, paymentPrice, pollRevision]);

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

  const printSavedLabel = async (shipment: CompletedShipment) => {
    const automatic = await openPdfForPrint(() =>
      click2ShipBackendClient.downloadLabel(shipment.label.id),
    );
    setPrintStatus(
      automatic
        ? 'Print dialog opened.'
        : 'Automatic printing was blocked. Use the browser print dialog in the opened PDF.',
    );
  };

  const openSupport = async (shipment?: CompletedShipment) => {
    const supportUrl = createSupportMailto({
      orderId: shipment?.orderId || orderId,
      trackingNumber: shipment?.label.trackingNumber || completedShipment?.label.trackingNumber,
      serviceName: shipment?.label.labelTypeName || completedShipment?.label.labelTypeName,
    });
    await chrome.tabs.create({ url: supportUrl });
  };

  const retryPaidLabel = async () => {
    if (!orderId) return;
    setLabelError('');
    setPaymentStatus('Payment received. Creating your label…');
    try {
      const result = await click2ShipBackendClient.retryLabel(orderId);
      await updatePaymentOrderStatus(orderId, result.status);
      setOrderStatus(result.status);
      setPaymentStatus('Payment received. Creating your label…');
      setPollRevision((current) => current + 1);
    } catch {
      setPaymentStatus("Payment received, but we couldn't create your label.");
      setLabelError('Do not pay again. Contact support for help.');
    }
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
    setOrderStatus('');
    setPaymentStatus('');
    setLabelError('');
    setCopyStatus('');
    setCurrentView('shipment');
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

  if (currentView === 'recent') {
    return (
      <main className="app">
        <header className="brand">
          <img className="brand-mark" src="/icons/icon48.png" alt="ShipDime shipping package icon" />
          <strong>ShipDime</strong>
        </header>
        <button className="text-button" onClick={() => setCurrentView('shipment')}>
          Back to shipment
        </button>
        <RecentLabels
          labels={recentLabels}
          onDownload={(shipment) => void downloadLabel(shipment)}
          onPrint={(shipment) => void printSavedLabel(shipment)}
          onCopy={(shipment) => void copyTracking(shipment)}
          onSupport={(shipment) => void openSupport(shipment)}
        />
      </main>
    );
  }

  if (completedShipment) {
    return (
      <main className="app success-screen">
        <header className="brand">
          <img
            className="brand-mark"
            src="/icons/icon48.png"
            alt="ShipDime shipping package icon"
          />
          <strong>ShipDime</strong>
          <button className="text-button" onClick={() => setCurrentView('recent')}>
            Recent Labels
          </button>
        </header>
        <section className="success-card">
          <div className="success-icon">✓</div>
          <p className="eyebrow">Label created successfully</p>
          <h1>Label created successfully</h1>
          <p><strong>Your label is saved.</strong></p>
          <p>If this window closes, reopen ShipDime and go to Recent Labels.</p>
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
              <dd>{shipmentDestination(completedShipment) || 'Not available'}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{shipmentPackage(completedShipment) || 'Not available'}</dd>
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
        {currentView === ('recent' as string) && <section className="card recent-labels">
          <h2>Recent Labels</h2>
          {recentLabels.slice(0, 10).map((entry) => (
            <article key={entry.label.id}>
              <div>
                <strong>{entry.recipientName}</strong>
                <span>
                  {entry.destinationCity}, {entry.destinationState} ·{' '}
                  {new Date(entry.label.createdAt).toLocaleString()}
                </span>
                <span>Carrier: USPS · Service: {entry.label.labelTypeName.replace(/^USPS\s+/i, '')}</span>
                <span>Tracking: {entry.label.trackingNumber}{entry.price ? ` · Price: ${entry.price}` : ''}</span>
              </div>
              <button className="secondary compact" onClick={() => void downloadLabel(entry)}>
                Download
              </button>
              <button className="secondary compact" onClick={() => void copyTracking(entry)}>
                Copy Tracking
              </button>
              <button className="secondary compact" onClick={() => void printSavedLabel(entry)}>
                Print Label
              </button>
              <button className="text-button compact" onClick={() => void openSupport(entry)}>
                Report a problem
              </button>
            </article>
          ))}
        </section>}
        <footer className="support-footer">
          <button className="text-button" onClick={() => void openSupport(completedShipment)}>
            Problem with a label?
          </button>
        </footer>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="brand">
        <img
          className="brand-mark"
          src="/icons/icon48.png"
          alt="ShipDime shipping package icon"
        />
        <div>
          <strong>ShipDime</strong>
          <span>Shipping made simple</span>
        </div>
        <button className="text-button" onClick={() => setCurrentView('recent')}>
          Recent Labels
        </button>
      </header>

      <section className="intro">
        <p className="eyebrow">New shipment</p>
        <h1>Create a shipping label</h1>
        <p>Review the selected address, add package details, and create your shipping label.</p>
        {shipmentSession.status === 'idle' && !shipmentSession.rawSelection && (
          <div className="warning-banner" role="status">
            Select an address on a webpage and right-click Create shipping label with ShipDime
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
            <pre>{`Build timestamp: ${buildTimestamp}\nAPI base URL: ${click2ShipBackendClient.apiBaseUrl}\nHealth request URL: ${connectionDiagnostic?.healthRequestUrl ?? click2ShipBackendClient.urlFor('/api/health')}\nHealth result: ${connectionDiagnostic?.healthResult ?? backendHealth}\nLabel-types request URL: ${connectionDiagnostic?.labelTypesRequestUrl ?? click2ShipBackendClient.urlFor('/api/shipping/label-types')}\nLabel-types HTTP status: ${connectionDiagnostic?.labelTypesHttpStatus ?? labelTypesResponseStatus ?? 'not received'}\nRaw label-types response: ${connectionDiagnostic?.rawLabelTypesResponse || '(empty)'}\nParsed label-type count: ${connectionDiagnostic?.parsedLabelTypes.length ?? 0}\nCurrent extension ID: ${typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime.id : 'unavailable'}\nCurrent extension origin: ${window.location.origin}\nSide-panel message result: ${connectionDiagnostic?.sidePanelMessageResult ?? 'not received'}\nBackground fetch status: ${connectionDiagnostic?.backgroundFetchStatus ?? 'not received'}\nFetch error: ${connectionDiagnostic?.error || 'none'}\nHealth HTTP status: ${healthResponseStatus ?? 'not received'}\nLabel-types state: ${labelTypesStatus}\nCreate-label request URL: ${createLabelDiagnostic?.requestUrl || click2ShipBackendClient.urlFor('/api/shipping/labels')}\nCreate-label HTTP status: ${createLabelDiagnostic?.httpStatus ?? 'not requested'}\nCreate-label response body: ${createLabelDiagnostic?.responseBody || '(empty)'}\nCreate-label parsed error: ${JSON.stringify(createLabelDiagnostic?.parsedError ?? null)}`}</pre>
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
            onFieldEdited={clearBackendPricingFieldError}
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
            onFieldEdited={clearBackendPricingFieldError}
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
          <label className="wide">
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
          {(
            <label
              className={`wide${missingPricingByKey.has('service.labelType') && touchedPricingFields.has('service.labelType') ? ' field-missing' : ''}`}
            >
              <span>Label type</span>
              <LabelTypeSelect
                id="label-type"
                labelTypes={labelTypes}
                isBook={parcel.preset === 'book-poly-mailer'}
                selectedLabelTypeId={selectedLabelTypeId}
                onChange={(value) => {
                  clearBackendPricingFieldError('service.labelType');
                  if (parcel.preset === 'book-poly-mailer') setBookLabelTypeId(value);
                  else setSelectedLabelTypeId(value);
                  setTouchedPricingFields((current) => new Set(current).add('service.labelType'));
                }}
                invalid={missingPricingByKey.has('service.labelType') && touchedPricingFields.has('service.labelType')}
              />
              {missingPricingByKey.has('service.labelType') && touchedPricingFields.has('service.labelType') && (
                <small id="service-labelType-pricing-error" className="field-error">
                  <span aria-hidden="true">! </span>{missingPricingByKey.get('service.labelType')?.message}
                </small>
              )}
            </label>
          )}
          {parcel.preset === 'book-poly-mailer' && (
            <div className="book-shipping-notice" role="status">
              <strong>Optimized for eligible book shipments</strong>
              <span>Media Mail eligibility depends on package contents.</span>
            </div>
          )}
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
                  min={0.1}
                  max={key === 'weight' ? 70 : undefined}
                  step={key === 'weight' ? 0.01 : 0.1}
                  value={parcel[key]}
                  required
                  onChange={(event) => {
                    clearBackendPricingFieldError(`package.${key}`);
                    setParcel({
                      ...parcel,
                      [key]: event.target.value,
                      ...(key !== 'weight' && parcel.preset !== 'book-poly-mailer' ? { preset: 'custom' as const } : {}),
                    });
                  }}
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
          deliveryDays={null}
          expiresAt={currentPrice?.expiresAt ?? ''}
          status={displayedPricingStatus}
          errorMessage={pricingError}
          onRetry={() => void loadPaymentPrice(pricingInput)}
          onExpired={handleQuoteExpired}
          pricingReady={pricingReady}
          missingRequirements={groupedMissingPricingRequirements}
          onRequirementClick={focusPricingRequirement}
        />
        {parcel.preset === 'book-poly-mailer' && currentPrice && (
          <p className="book-rate-note">
            Selected service: <strong>{currentPrice.serviceName}</strong>.{' '}
            {currentPrice.isMediaMail
              ? 'Media Mail eligibility depends on package contents.'
              : currentPrice.eligibilityNotice}
          </p>
        )}

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

        {orderStatus === 'label_failed' && (
          <div className="label-error" role="alert">
            <strong>Payment received, but we couldn't create your label.</strong>
            <p>Do not pay again.</p>
            <button type="button" className="secondary compact" onClick={() => void retryPaidLabel()}>
              Retry Label Creation
            </button>
            <button type="button" className="text-button compact" onClick={() => void openSupport()}>
              Contact Support
            </button>
          </div>
        )}
        {labelError && orderStatus !== 'label_failed' && (
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
          ? 'Calculating shipping rates…'
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
      <footer className="support-footer">
        <button className="text-button" onClick={() => void openSupport()}>
          Need help?
        </button>
      </footer>
    </main>
  );
}
