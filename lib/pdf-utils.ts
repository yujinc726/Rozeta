// PDF.js를 동적으로 임포트하여 클라이언트 사이드에서만 로드
let pdfjsLib: any = null

const initPdfjs = async () => {
  if (typeof window !== 'undefined' && !pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  }
  return pdfjsLib
}

export async function getPdfPageCount(file: File): Promise<number> {
  try {
    if (typeof window === 'undefined') {
      throw new Error('PDF 처리는 브라우저에서만 가능합니다.')
    }

    // PDF.js 초기화
    const pdfjs = await initPdfjs()
    if (!pdfjs) {
      throw new Error('PDF.js를 로드할 수 없습니다.')
    }

    // File을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    
    // PDF 문서 로드
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
    
    return pdf.numPages
  } catch (error) {
    console.error('Error reading PDF:', error)
    throw new Error('PDF 파일을 읽을 수 없습니다.')
  }
}

export async function getPdfPageThumbnail(file: File, pageNumber: number, scale: number = 2.0): Promise<string> {
  try {
    if (typeof window === 'undefined') {
      throw new Error('PDF 처리는 브라우저에서만 가능합니다.')
    }

    // PDF.js 초기화
    const pdfjs = await initPdfjs()
    if (!pdfjs) {
      throw new Error('PDF.js를 로드할 수 없습니다.')
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
    
    if (pageNumber > pdf.numPages || pageNumber < 1) {
      throw new Error('잘못된 페이지 번호입니다.')
    }
    
    const page = await pdf.getPage(pageNumber)
    // 고화질 렌더링을 위해 scale 증가
    const viewport = page.getViewport({ scale: scale })
    
    // Canvas 생성
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('Canvas context를 생성할 수 없습니다.')
    }
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    // 고화질 렌더링 설정
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    
    // 페이지 렌더링
    await page.render({
      canvasContext: context,
      viewport: viewport,
      intent: 'display' // 화면 표시용 최적화
    }).promise
    
    // Canvas를 고화질 JPEG로 변환 (PNG보다 파일 크기 작음)
    return canvas.toDataURL('image/jpeg', 0.95)
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    throw new Error('썸네일을 생성할 수 없습니다.')
  }
} 