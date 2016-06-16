@echo off
echo YouTube Downloader Muxer
echo -----------------------------------------------
echo This application merges *.m4v, *.webm video with *.m4a audio into either *.mp4 or *.avi
echo.
echo.
setlocal enabledelayedexpansion

set muxCount=0
for %%i in (*.m4a) do (
	set title=%%i
    set titleStrip=%%~ni
	for %%j in (*.m4v) do (
        set vTitle=%%j
		set vTitleStrip=%%~nj
		if "%%~ni"=="%%~nj" (
			if NOT "%vTitle%"=="*.m4v" (
                set ext=mp4
				call :ffmpegcall
				set /A muxCount=!muxCount!+1
			)
		)
	)
	for %%k in (*.webm) do (
		set vTitle=%%k
        set vTitleStrip=%%~nk
		if "%%~ni"=="%%~nk" (
			if NOT "%vTitle%"=="*.webm" (
				set ext=avi
				call :ffmpegcall
				set /A muxCount=!muxCount!+1
			)
		)
	)
)
echo.
echo -------------------============-------------------
echo Finished scanning, found %muxCount% video/s to mux
echo -------------------============-------------------	
echo.
goto EOF

:ffmpegcall
echo.
echo.
ffmpeg -i "%vTitle%" -i "%title%" -vcodec copy -acodec copy "%titleStrip%.%ext%" >nul
if %errorlevel% GTR 0 (
	echo ERROR occurred when trying to mux using FFmpeg.
) else (
	echo "%titleStrip%.%ext%" muxed successfully
	del "%title%"
	del "%vTitle%"
)
exit /b
:EOF
pause >nul