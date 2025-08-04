interface SRTEntry {
  index: number;
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
}

interface SlideTranscript {
  slideNumber: number;
  startTime: string;
  endTime: string | undefined;
  transcript: string;
}

// SRT 시간 형식 (00:00:00,000)을 초 단위로 변환
export function parseSRTTime(timeStr: string): number {
  const [time, millis] = timeStr.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(millis) / 1000;
}

// SRT 텍스트를 파싱하여 entries 배열로 변환
export function parseSRT(srtText: string): SRTEntry[] {
  const entries: SRTEntry[] = [];
  const blocks = srtText.trim().split('\n\n');
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const index = parseInt(lines[0]);
      const [startTimeStr, endTimeStr] = lines[1].split(' --> ');
      const text = lines.slice(2).join(' ');
      
      entries.push({
        index,
        startTime: parseSRTTime(startTimeStr),
        endTime: parseSRTTime(endTimeStr),
        text: text.trim()
      });
    }
  }
  
  return entries;
}

// 시간 문자열 (00:00:00.000)을 초 단위로 변환
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const [hours, minutes, secondsWithMs] = parts;
    const [seconds, ms = '0'] = secondsWithMs.split('.');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
  }
  return 0;
}

// 슬라이드별로 자막을 분할
export function extractTranscriptBySlides(
  transcript: string, 
  slideSyncs: Array<{
    slideNumber: number;
    startTime: string;
    endTime?: string;
  }>
): SlideTranscript[] {
  const srtEntries = parseSRT(transcript);
  const slideTranscripts: SlideTranscript[] = [];
  
  for (const slide of slideSyncs) {
    const slideStartSec = parseTimeToSeconds(slide.startTime);
    const slideEndSec = slide.endTime ? parseTimeToSeconds(slide.endTime) : Infinity;
    
    // 해당 슬라이드 시간 범위에 속하는 자막들 찾기
    const slideTexts = srtEntries
      .filter(entry => {
        // 자막이 슬라이드 시간 범위와 겹치는지 확인
        return (entry.startTime >= slideStartSec && entry.startTime < slideEndSec) ||
               (entry.endTime > slideStartSec && entry.endTime <= slideEndSec) ||
               (entry.startTime <= slideStartSec && entry.endTime >= slideEndSec);
      })
      .map(entry => entry.text);
    
    slideTranscripts.push({
      slideNumber: slide.slideNumber,
      startTime: slide.startTime,
      endTime: slide.endTime,
      transcript: slideTexts.join(' ')
    });
  }
  
  return slideTranscripts;
}

// 현재 재생 시간에 해당하는 자막 찾기
export function getCurrentSubtitle(transcript: string, currentTimeInSeconds: number): string {
  const srtEntries = parseSRT(transcript);
  
  for (const entry of srtEntries) {
    if (currentTimeInSeconds >= entry.startTime && currentTimeInSeconds <= entry.endTime) {
      return entry.text;
    }
  }
  
  return '';
}