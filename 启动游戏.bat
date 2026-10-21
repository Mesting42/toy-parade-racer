@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 需要安装 Node.js 20 或更新版本。
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo 正在安装项目依赖……
  call npm install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)
echo 启动《玩具巡游赛》……
call npm run dev
endlocal
