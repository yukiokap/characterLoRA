@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   Character LoRA Manager 起動ツール
echo ========================================
echo.
echo [1/2] アプリケーションを起動中...
start "" "AiManager.exe"

echo [2/2] ブラウザを開く準備をしています...
timeout /t 5 /nobreak > nul

echo ブラウザを起動します: http://localhost:3001
start http://localhost:3001

echo.
echo 起動が完了しました！
echo この画面（黒いウィンドウ）は閉じても大丈夫です。
echo.
pause
