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
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const [hours, minutes, secondsWithMs] = parts;
    const [seconds, ms = '0'] = secondsWithMs.split('.');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms.padEnd(3, '0')) / 1000;
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
    
    const slideTexts = srtEntries
      .filter(entry => {
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
  // arrangedSubtitles를 사용하면 이미 문장 단위로 정리되어 있습니다.
  const srtEntries = parseSRT(transcript);
  
  for (const entry of srtEntries) {
    if (currentTimeInSeconds >= entry.startTime && currentTimeInSeconds <= entry.endTime) {
      return entry.text;
    }
  }
  
  return '';
}

// SRT 형식 생성 함수
export function createSrtContent(segments: any[], wordLevel: boolean = false): string {
  let srtLines: string[] = [];
  let index = 1;

  segments.forEach((segment: any) => {
    let startTime, endTime, text;
    
    if (wordLevel) {
      if (segment.start !== undefined && segment.end !== undefined) {
        startTime = formatTimestamp(segment.start);
        endTime = formatTimestamp(segment.end);
        text = segment.word || segment.text || '';
      } else if (segment.timestamp && Array.isArray(segment.timestamp)) {
        startTime = formatTimestamp(segment.timestamp[0]);
        endTime = formatTimestamp(segment.timestamp[1]);
        text = segment.word || segment.text || '';
      } else {
        console.warn('Unknown word segment format:', segment);
        return;
      }
    } else {
      // chunk/segment 단위 처리. faster-whisper는 start/end를 사용.
      if (segment.start !== undefined && segment.end !== undefined) {
        startTime = formatTimestamp(segment.start);
        endTime = formatTimestamp(segment.end);
        text = segment.text || '';
      } else if (segment.timestamp && Array.isArray(segment.timestamp)) {
        // 이전 모델 호환용
        startTime = formatTimestamp(segment.timestamp[0]);
        endTime = formatTimestamp(segment.timestamp[1]);
        text = segment.text || '';
      } else {
        console.warn('Unknown segment format:', segment);
        return;
      }
    }
    
    text = text.trim();
    
    if (text) {
      srtLines.push(`${index}`);
      srtLines.push(`${startTime} --> ${endTime}`);
      srtLines.push(text);
      srtLines.push('');
      index++;
    }
  });

  return srtLines.join('\n');
}

// 타임스탬프 포맷 함수
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, '0');
}

// 자막 정리 함수 - 단어 개수 기반으로 적절한 길이로 분할
export function arrangeSubtitles(srtContent: string, wordsPerSubtitle: number = 12): string {
  const blocks = srtContent.trim().split('\n\n');
  const arrangedBlocks: string[] = [];
  
  let currentWords: string[] = [];
  let currentStartTime: string | null = null;
  let currentEndTime: string = '';
  let index = 1;
  const WORDS_PER_SUBTITLE = wordsPerSubtitle; // 자막당 단어 수

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeInfo = lines[1];
      const text = lines.slice(2).join(' ').trim();
      
      const [start, end] = timeInfo.split(' --> ');
      
      if (!currentStartTime) {
        currentStartTime = start;
      }
      currentEndTime = end;
      
      if (text) {
        currentWords.push(text);
      }
      
      // 단어 개수가 충분하거나 문장 종료 기호가 있으면 자막 생성
      const hasEndMark = text.match(/[.!?。！？]$/) || text.endsWith('다.') || text.endsWith('요.') || text.endsWith('까?');
      const hasEnoughWords = currentWords.length >= WORDS_PER_SUBTITLE;
      
      if ((hasEnoughWords || hasEndMark) && currentWords.length > 0) {
        const subtitleText = currentWords.join(' ');
        arrangedBlocks.push(`${index}`);
        arrangedBlocks.push(`${currentStartTime} --> ${currentEndTime}`);
        arrangedBlocks.push(subtitleText);
        arrangedBlocks.push('');
        
        currentWords = [];
        currentStartTime = null;
        index++;
      }
    }
  });
  
  // 남은 단어들 처리
  if (currentWords.length > 0 && currentStartTime) {
    const subtitleText = currentWords.join(' ');
    arrangedBlocks.push(`${index}`);
    arrangedBlocks.push(`${currentStartTime} --> ${currentEndTime}`);
    arrangedBlocks.push(subtitleText);
    arrangedBlocks.push('');
  }
  
  return arrangedBlocks.join('\n');
}

// 단어 단위 자막을 적절한 구문 단위로 그룹화하는 함수
export function groupWordsIntoPhases(wordLevelSrt: string, wordsPerPhrase: number = 12): string {
  const entries = parseSRT(wordLevelSrt);
  if (entries.length === 0) return '';
  
  const groupedBlocks: string[] = [];
  let index = 1;
  
  for (let i = 0; i < entries.length; i += wordsPerPhrase) {
    const groupEnd = Math.min(i + wordsPerPhrase, entries.length);
    const group = entries.slice(i, groupEnd);
    
    if (group.length === 0) continue;
    
    const startTime = formatTimestamp(group[0].startTime);
    const endTime = formatTimestamp(group[group.length - 1].endTime);
    const text = group.map(e => e.text).join(' ');
    
    groupedBlocks.push(`${index}`);
    groupedBlocks.push(`${startTime} --> ${endTime}`);
    groupedBlocks.push(text);
    groupedBlocks.push('');
    
    index++;
  }
  
  return groupedBlocks.join('\n');
}
