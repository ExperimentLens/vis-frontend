type Html2CanvasOptions = { backgroundColor?: string; scale?: number; logging?: boolean };
type Html2Canvas = (element: HTMLElement, options: Html2CanvasOptions) => Promise<HTMLCanvasElement>;

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

/** Rasterize a DOM element to a downloaded PNG, lazy-loading html2canvas from CDN once. */
export const exportElementToPng = async (
  element: HTMLElement,
  filename: string,
  backgroundColor: string,
): Promise<void> => {
  const w = window as unknown as { html2canvas?: Html2Canvas };

  if (!w.html2canvas) {
    const script = document.createElement('script');

    script.src = CDN;
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }

  if (!w.html2canvas) return;

  const canvas = await w.html2canvas(element, { backgroundColor, scale: 2, logging: false });

  canvas.toBlob(blob => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
};
