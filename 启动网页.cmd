@echo off
setlocal
chcp 65001 >nul
title Mingli - Quick Start
pushd "%~dp0"
if errorlevel 1 exit /b 1

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js 24 LTS:
  echo https://nodejs.org/
  echo Then close this window and double-click this file again.
  pause
  popd
  exit /b 1
)

node scripts/start.mjs %*
if errorlevel 1 pause
popd
endlocal
