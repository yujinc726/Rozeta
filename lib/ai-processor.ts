// AI 처리 관련 유틸리티 함수들

interface SlideSegment {
  id: string
  pdfFileName: string
  slideNumber: number
  startTime: string
  endTime: string
  memo?: string
}

interface ProcessedSlide {
  id: string
  pdfFileName: string
  slideNumber: number
  startTime: string
  endTime: string
  memo?: string
  transcript?: string
  summary?: string
  keyTerms?: string[]
}

// AI 처리 진행률을 보고하는 콜백 타입
type ProgressCallback = (progress: number, message: string) => void

/**
 * 녹음과 슬라이드 세그먼트를 AI로 처리합니다.
 * @param audioBlob 녹음된 오디오 블롭
 * @param slideSegments 슬라이드 세그먼트 배열
 * @param onProgress 진행률 콜백 함수
 * @returns 처리된 슬라이드 배열
 */
export async function processRecordingWithProgress(
  audioBlob: Blob,
  slideSegments: SlideSegment[],
  onProgress: ProgressCallback
): Promise<ProcessedSlide[]> {
  try {
    onProgress(10, '오디오 파일을 준비하는 중...')
    
    // FormData 생성
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('segments', JSON.stringify(slideSegments))
    
    onProgress(30, 'Whisper AI로 음성을 텍스트로 변환하는 중...')
    
    // Whisper 서버로 전송
    const whisperServerUrl = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || 'http://localhost:8000'
    const response = await fetch(`${whisperServerUrl}/api/whisper/process`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`)
    }
    
    onProgress(70, '텍스트를 분석하고 요약하는 중...')
    
    const result = await response.json()
    
    onProgress(90, '결과를 정리하는 중...')
    
    // 결과를 ProcessedSlide 형태로 변환
    const processedSlides: ProcessedSlide[] = slideSegments.map((segment, index) => ({
      ...segment,
      transcript: result.transcript || '',
      summary: result.summary || '',
      keyTerms: result.keyTerms || []
    }))
    
    onProgress(100, '처리 완료!')
    
    return processedSlides
    
  } catch (error) {
    console.error('AI 처리 중 오류 발생:', error)
    throw new Error('AI 처리 중 오류가 발생했습니다. 인터넷 연결과 Whisper 서버 상태를 확인해주세요.')
  }
}

/**
 * 단일 오디오 파일을 전사합니다.
 * @param audioBlob 오디오 블롭
 * @returns 전사 결과
 */
export async function transcribeAudio(audioBlob: Blob): Promise<any> {
  const formData = new FormData()
  formData.append('audio', audioBlob)
  formData.append('modelSize', 'base')
  formData.append('language', 'ko')
  formData.append('stableTs', 'true')
  formData.append('removeRepeated', 'true')
  formData.append('merge', 'true')
  
  const whisperServerUrl = process.env.NEXT_PUBLIC_WHISPER_SERVER_URL || 'http://localhost:8000'
  const response = await fetch(`${whisperServerUrl}/api/whisper/process`, {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    throw new Error('전사 처리 중 오류가 발생했습니다.')
  }
  
  return await response.json()
}

/**
 * 슬라이드 세그먼트를 분석합니다.
 * @param segments 분석할 세그먼트 배열
 * @returns 분석 결과
 */
export async function analyzeSlideSegments(segments: any[]): Promise<any[]> {
  const response = await fetch('http://localhost:8000/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ segments })
  })
  
  if (!response.ok) {
    throw new Error('분석 처리 중 오류가 발생했습니다.')
  }
  
  return await response.json()
}

/**
 * 전사 결과를 슬라이드별로 분할합니다.
 * @param transcript 전사 결과
 * @param slideSegments 슬라이드 세그먼트
 * @returns 슬라이드별 전사 결과
 */
export function splitTranscriptBySlides(transcript: any, slideSegments: SlideSegment[]): ProcessedSlide[] {
  // 기본적인 분할 로직 - 실제로는 더 정교한 타임스탬프 매칭이 필요
  return slideSegments.map((segment, index) => ({
    ...segment,
    transcript: transcript.text || '',
    summary: `슬라이드 ${segment.slideNumber}의 요약`,
    keyTerms: ['키워드1', '키워드2']
  }))
}