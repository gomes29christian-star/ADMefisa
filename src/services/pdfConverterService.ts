/**
 * Converte um arquivo (PDF ou Imagem) em um array de DataURLs de imagens (PNG/JPEG)
 * que qualquer navegador consegue renderizar nativamente em tags <img> sem plugins ou iframes.
 * Carregamento do PDF.js 100% dinâmico/lazy para não sobrecarregar ou quebrar o bundle inicial.
 */
export async function converterArquivoParaImagens(file: File): Promise<string[]> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    // É uma imagem (.jpg, .jpeg, .png, .webp)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve([result]);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // É um PDF: carrega dinamicamente a biblioteca e converte cada página em imagem PNG
  try {
    const [pdfjsLib, workerModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);

    try {
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
      }
    } catch {}

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const imagens: string[] = [];

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 }); // Alta nitidez
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await (page.render({ canvasContext: ctx, viewport } as any)).promise;
        imagens.push(canvas.toDataURL('image/png'));
      }
    }

    if (imagens.length > 0) {
      return imagens;
    }
  } catch (err) {
    console.error('Falha ao converter páginas do PDF para imagem:', err);
  }

  return [];
}
