import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { recordings, recordEntries } from "@/lib/database"
import { createClient } from "@supabase/supabase-js"

// Gemini API 키 확인
const apiKey = process.env.GOOGLE_GEMINI_API_KEY
if (!apiKey) {
  console.error("GOOGLE_GEMINI_API_KEY is not set in environment variables")
}

// Gemini 클라이언트 초기화
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    if (!genAI) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Please add GOOGLE_GEMINI_API_KEY to your .env.local file." },
        { status: 500 }
      )
    }

    // 사용자 인증 토큰 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]

    // 인증된 Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { recordingId, regenerate = false } = await request.json()

    if (!recordingId) {
      return NextResponse.json(
        { error: "Recording ID is required" },
        { status: 400 }
      )
    }

    // 토큰을 사용하여 인증된 Supabase 요청
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    if (error || !data) {
      console.error('Recording query error:', error)
      return NextResponse.json(
        { error: "Recording not found or access denied" },
        { status: 404 }
      )
    }

    const recording = data

    // 슬라이드 엔트리 가져오기 (인증된 클라이언트 사용)
    const { data: entries, error: entriesError } = await supabase
      .from('record_entries')
      .select('*')
      .eq('recording_id', recordingId)
      .order('created_at', { ascending: true })

    if (entriesError) {
      console.error('Failed to get record entries:', entriesError)
      return NextResponse.json(
        { error: "Failed to load slide entries" },
        { status: 500 }
      )
    }

    // 이미 AI 분석이 되어있고 재생성이 아닌 경우
    if (!regenerate && recording.ai_analyzed_at) {
      const hasAllExplanations = entries.every(e => e.ai_explanation && Object.keys(e.ai_explanation).length > 0)
      
      if (hasAllExplanations) {
        return NextResponse.json({
          success: true,
          message: "AI analysis already exists",
          overview: recording.ai_lecture_overview,
          entries: entries
        })
      }
    }
    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No slide entries found" },
        { status: 400 }
      )
    }

    // 텍스트 변환이 안 되어있으면 에러
    if (!recording.transcript) {
      return NextResponse.json(
        { error: "Transcript not available. Please run AI transcription first." },
        { status: 400 }
      )
    }

    // Gemini 2.5 Pro 모델 사용 (안정 버전)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 100000, // 충분한 출력 토큰
      }
    })

    // 전체 강의 데이터 준비
    const lectureData = {
      title: recording.title,
      totalSlides: entries.length,
      duration: recording.duration || 0,
      slides: entries.map(entry => {
        // 각 슬라이드의 시간 구간에 해당하는 텍스트 추출
        const slideTranscript = extractTranscriptForSlide(
          recording.transcript!, 
          entry.start_time, 
          entry.end_time
        )
        
        return {
          number: entry.slide_number,
          material: entry.material_name,
          transcript: slideTranscript,
          memo: entry.memo || "",
          timeRange: {
            start: entry.start_time,
            end: entry.end_time
          }
        }
      })
    }

    // Gemini 프롬프트 생성
    const prompt = `
당신은 대학 강의를 듣는 학생을 돕는 AI 튜터입니다.
전체 ${lectureData.totalSlides}개 슬라이드의 강의 자료와 녹음 내용을 제공합니다.
각 슬라이드에 대해 다음 JSON 형식으로 설명을 생성해주세요.

강의 정보:
- 제목: ${lectureData.title}
- 전체 슬라이드 수: ${lectureData.totalSlides}
- 강의 시간: ${formatDuration(lectureData.duration)}

각 슬라이드별 정보:
${lectureData.slides.map(slide => `
슬라이드 ${slide.number} (${slide.material}):
- 시간: ${slide.timeRange.start} ~ ${slide.timeRange.end || '끝'}
- 교수님 설명: ${slide.transcript}
- 학생 메모: ${slide.memo || '없음'}
`).join('\n')}

다음 JSON 형식으로 응답해주세요:
{
  "lecture_overview": {
    "main_topic": "전체 강의의 핵심 주제",
    "key_concepts": ["핵심 개념 1", "핵심 개념 2", ...],
    "flow": "강의의 전체적인 흐름과 구성 설명"
  },
  "slides": [
    {
      "slide_number": 1,
      "ai_explanation": {
        "summary": "이 슬라이드의 3-5줄 핵심 요약",
        "detailed": "교수님 설명을 보충하는 상세한 설명",
        "key_points": ["중요 포인트 1", "중요 포인트 2"],
        "connections": {
          "previous": "이전 슬라이드와 어떻게 연결되는지",
          "next": "다음 슬라이드로 어떻게 이어지는지"
        },
        "exam_points": ["시험에 출제될 가능성이 높은 포인트"],
        "examples": ["실제 예시나 응용 사례"],
        "study_tips": "이 내용을 효과적으로 학습하는 방법"
      }
    },
    ...
  ],
  "study_guide": {
    "summary": "전체 강의를 한 문단으로 요약",
    "important_slides": [가장 중요한 슬라이드 번호들],
    "suggested_review_order": [복습 시 권장하는 슬라이드 순서]
  }
}

각 슬라이드 설명은 한국어로 작성하고, 대학생이 이해하기 쉽도록 친근하고 명확하게 설명해주세요.
`

    // Gemini API 호출
    console.log("Calling Gemini API...")
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // JSON 파싱
    let analysisResult
    try {
      // JSON 블록 추출 (```json ... ``` 형태인 경우)
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonText = jsonMatch ? jsonMatch[1] : text
      analysisResult = JSON.parse(jsonText)
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError)
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      )
    }

    // 데이터베이스 업데이트 (인증된 클라이언트 사용)
    const updatePromises = []

    // 1. 전체 강의 분석 결과 저장
    updatePromises.push(
      supabase
        .from('recordings')
        .update({
          ai_lecture_overview: analysisResult.lecture_overview,
          ai_analyzed_at: new Date().toISOString()
        })
        .eq('id', recordingId)
    )

    // 2. 각 슬라이드별 AI 설명 저장
    for (const slideAnalysis of analysisResult.slides) {
      const entry = entries.find(e => e.slide_number === slideAnalysis.slide_number)
      if (entry) {
        updatePromises.push(
          supabase
            .from('record_entries')
            .update({
              ai_explanation: slideAnalysis.ai_explanation,
              ai_generated_at: new Date().toISOString(),
              ai_model: "gemini-2.5-pro"
            })
            .eq('id', entry.id)
        )
      }
    }

    // 모든 업데이트 실행
    const updateResults = await Promise.all(updatePromises)
    
    // 업데이트 에러 체크
    for (const result of updateResults) {
      if (result.error) {
        console.error('Update error:', result.error)
        throw new Error('Failed to save AI analysis results')
      }
    }

    // 업데이트된 데이터 다시 가져오기
    const { data: updatedEntries } = await supabase
      .from('record_entries')
      .select('*')
      .eq('recording_id', recordingId)
      .order('created_at', { ascending: true })

    const { data: updatedRecording } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()

    return NextResponse.json({
      success: true,
      message: "AI analysis completed",
      overview: updatedRecording?.ai_lecture_overview,
      study_guide: analysisResult.study_guide,
      entries: updatedEntries || []
    })

  } catch (error) {
    console.error("AI analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI analysis failed" },
      { status: 500 }
    )
  }
}

// 시간 구간에 해당하는 텍스트 추출 헬퍼 함수
function extractTranscriptForSlide(
  fullTranscript: string, 
  startTime: string, 
  endTime: string | null
): string {
  // 간단한 구현 - 실제로는 더 정교한 타임스탬프 매칭이 필요
  // subtitles가 있다면 그것을 사용하는 것이 더 정확할 수 있음
  
  // 전체 텍스트를 슬라이드 수로 대략 나누기 (임시 구현)
  const lines = fullTranscript.split('\n').filter(line => line.trim())
  const totalLines = lines.length
  
  // 시작 시간과 종료 시간을 기반으로 대략적인 위치 계산
  // 실제로는 subtitles의 타임스탬프를 사용하는 것이 더 정확
  
  return fullTranscript // 일단 전체 반환, 추후 개선 필요
}

// 시간 포맷팅 헬퍼 함수
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${secs}초`
  }
  return `${minutes}분 ${secs}초`
}