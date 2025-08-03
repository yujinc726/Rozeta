# Whisper Server

로컬에서 OpenAI Whisper를 실행하는 Python 서버입니다.

## 설치 방법

### 1. Python 설치
- Python 3.8 이상이 필요합니다
- [Python 공식 사이트](https://www.python.org/downloads/)에서 다운로드

### 2. 가상환경 생성 (선택사항)
```bash
cd whisper-server
python -m venv venv
```

### 3. 가상환경 활성화
- Windows:
  ```bash
  venv\Scripts\activate
  ```
- Mac/Linux:
  ```bash
  source venv/bin/activate
  ```

### 4. 패키지 설치
```bash
pip install -r requirements.txt
```

### 5. 서버 실행
- Windows:
  ```bash
  start.bat
  ```
- 또는 직접 실행:
  ```bash
  python main.py
  ```

서버는 `http://localhost:8000`에서 실행됩니다.

## 사용 가능한 모델

- tiny (39M) - 가장 빠름, 정확도 낮음
- base (74M) - 빠름, 적당한 정확도
- small (244M) - 균형잡힌 선택
- medium (769M) - 높은 정확도
- large (1550M) - 매우 높은 정확도
- large-v2 - large 개선 버전
- large-v3 - 최신 버전
- turbo - 빠른 처리에 최적화

## API 엔드포인트

### POST /api/whisper/process
오디오 파일을 처리하고 자막을 생성합니다.

### GET /models
사용 가능한 모델 목록을 반환합니다.

### POST /api/analyze
텍스트 세그먼트를 분석합니다.

## 주의사항

- 첫 실행 시 모델 다운로드로 시간이 걸릴 수 있습니다
- GPU가 있으면 더 빠르게 처리됩니다 (CUDA 설치 필요)
- 메모리가 충분해야 합니다 (large 모델은 10GB 이상 권장) 