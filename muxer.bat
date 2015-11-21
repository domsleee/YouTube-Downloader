echo YouTube Downloader Muxer
echo -----------------------------------------------
echo This application merges *.m4v, *.webm video with *.m4a audio into either *.mp4 or *.avi
echo.
echo.

set muxCount=0
for %%i in (*.m4a) do (
	set title=%%i
    set titleStrip=%%~ni
	for %%j in (*.m4v) do (
        set vTitle=%%j
		set vTitleStrip=%%~nj
		if "%vTitleStrip%"=="%titleStrip%" (
			if NOT "%vTitle%"=="*.m4v" (
                set ext=mp4
				call :ffmpegcall
				set muxCount=%muxCount%+1
			)
		)
	)
	for %%j in (*.webm) do (
		set vTitle=%%j
        set vTitleStrip=%%~nj
		if "%vTitleStrip%"=="%titleStrip%" (
			if NOT "%vTitle%"=="*.webm" (
				set ext=avi
				call :ffmpegcall
				set muxCount=%muxCount%+1
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
ffmpeg -i "%vTitle%" -i "%title%" -vcodec copy -acodec copy "%titleStrip%.%ext%"
echo %errorlevel%
if %errorlevel%==1 (
	echo ded
	echo ERROR occurred when trying to mux using FFmpeg. This probably means that you don't have FFmpeg installed
) else (
	echo ded

	del "%title%"
	del "%vTitle%"
	echo SUCCESS! Made %titleStrip%
)
exit /b

:EOF
pause
pause
pause