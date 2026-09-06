@echo off
rem ============================================================
rem  fix-java.bat — Capacitor 8 / Android Gradle 构建要求 JDK 21
rem  本机默认是 Java 17，直接跑 gradlew 会报 "无效的源发行版：21"。
rem  本脚本只做一件事：找到并临时设置 JAVA_HOME/PATH（不写回系统），
rem  然后把剩余参数当作命令执行。用法：
rem
rem   fix-java.bat gradlew.bat assembleDebug        （在 android/ 下执行）
rem   fix-java.bat "D:\path\jdk-21" gradlew.bat assembleDebug
rem
rem  JDK 21 推荐：Temurin 便携版（解压即用，免安装）
rem  https://adoptium.net/temurin/releases/?version=21
rem ============================================================

setlocal enabledelayedexpansion

set "FOUND="

if not "%~1"=="" (
  if exist "%~1\bin\java.exe" (
    set "FOUND=%~1"
    shift
  )
)

if not defined FOUND (
  set "CAND=%JAVA_HOME%"
  if defined CAND if exist "%CAND%\bin\java.exe" (
    "%CAND%\bin\java.exe" -version 2>&1 | findstr /C:"21" >nul && set "FOUND=%CAND%"
  )
)

if not defined FOUND (
  for /d %%D in ("%LOCALAPPDATA%\Programs\Eclipse Adoptium\jdk-21*") do set "FOUND=%%D"
)

if not defined FOUND (
  for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*" "%ProgramFiles%\Java\jdk-21*") do set "FOUND=%%D"
)

if not defined FOUND (
  echo [fix-java] 未找到 JDK 21。请下载 Temurin 21 便携版并指定路径：
  echo   fix-java.bat "D:\path\jdk-21" gradlew.bat assembleDebug
  exit /b 1
)

set "JAVA_HOME=%FOUND%"
set "PATH=%FOUND%\bin;%PATH%"
echo [fix-java] JAVA_HOME=%JAVA_HOME%
"%FOUND%\bin\java.exe" -version

if "%~1"=="" exit /b 0

echo [fix-java] 执行: %*
call %*
exit /b %errorlevel%