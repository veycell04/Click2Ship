export async function copyText(
  text: string,
  clipboard: Pick<Clipboard, 'writeText'> | undefined = navigator.clipboard,
): Promise<boolean> {
  if (!clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadPdf(blob: Blob, trackingNumber: string): void {
  if (!blob.type.toLowerCase().includes('application/pdf')) {
    throw new Error(`Expected application/pdf, received ${blob.type || 'unknown'}.`);
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Click2Ship-${trackingNumber}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function openPdfForPrint(
  loadPdf: () => Promise<Blob>,
  openWindow: (url?: string, target?: string) => Window | null = window.open.bind(window),
): Promise<boolean> {
  const printWindow = openWindow('', '_blank');
  const blob = await loadPdf();
  if (!blob.type.toLowerCase().includes('application/pdf')) {
    printWindow?.close();
    throw new Error(`Expected application/pdf, received ${blob.type || 'unknown'}.`);
  }
  const url = URL.createObjectURL(blob);
  if (!printWindow) {
    openWindow(url, '_blank');
    return false;
  }
  printWindow.addEventListener('load', () => printWindow.print(), { once: true });
  printWindow.location.href = url;
  return true;
}
