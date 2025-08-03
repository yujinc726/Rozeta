@echo off
echo Starting Whisper Server...

REM Python 가상환경 활성화 (있다면)
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM 서버 시작
python main.py

pause 