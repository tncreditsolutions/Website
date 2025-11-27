import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Set up the PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFViewerProps {
  fileData: Blob;
  fileName: string;
}

export function PDFViewer({ fileData, fileName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocument | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        renderPage(pdfDoc, 1);
      } catch (err) {
        setError("Failed to load PDF");
        console.error(err);
      }
    };

    loadPdf();
  }, [fileData]);

  const renderPage = async (pdfDoc: pdfjsLib.PDFDocument, pageNum: number) => {
    setRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Failed to get canvas context");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      setImageUrl(canvas.toDataURL());
    } catch (err) {
      setError("Failed to render page");
      console.error(err);
    } finally {
      setRendering(false);
    }
  };

  const goToNextPage = () => {
    if (pdf && currentPage < numPages!) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      renderPage(pdf, nextPage);
    }
  };

  const goToPreviousPage = () => {
    if (pdf && currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      renderPage(pdf, prevPage);
    }
  };

  if (error) {
    return <div className="text-center text-destructive p-4">{error}</div>;
  }

  if (!pdf) {
    return <div className="text-center text-muted-foreground p-4">Loading PDF...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center bg-muted p-4 rounded-md">
        {rendering ? (
          <div className="text-muted-foreground">Rendering page...</div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={`Page ${currentPage}`} className="max-w-full max-h-96 rounded" />
        ) : (
          <div className="text-muted-foreground">Loading page...</div>
        )}
      </div>

      {numPages && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || rendering}
            data-testid="button-pdf-previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {numPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === numPages || rendering}
            data-testid="button-pdf-next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
