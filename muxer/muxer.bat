:: Disable echo
@echo off

:: Print header
echo YouTube Downloader Muxer v1.2
echo -----------------------------------------------
echo Post processing for YouTube Downloader
echo See documentation for more information
echo.

:: Allows for proper usage of for loops
setlocal enabledelayedexpansion

:: Declare global variables
set vidCount=0
set vidErrCount=0
set audCount=0
set audErrCount=0

:: Iterate through .m4a files
for %%i in (*.m4a) do (
	:: Strip the title of it's extension
	set "title=%%i"
	set "titleStrip=%%~ni"

	:: Iterate through .m4v files
	for %%j in (*.m4v) do (
		set "vTitle=%%j"
		set "vTitleStrip=%%~nj"
		if "!titleStrip!"=="AUDIO - !vTitleStrip!" (
			echo %vTitle%
			if NOT "!vTitle!"=="*.m4v" (
				set ext=mp4
				call :mux
			)
		)
	)

	:: Iterate through .webm files
	for %%k in (*.webm) do (
		set "vTitle=%%k"
		set "vTitleStrip=%%~nk"
		echo !titleStrip! VS AUDIO - !TitleStrip!
		if "!titleStrip!"=="AUDIO - !vTitleStrip!" (
			if NOT "!vTitle!"=="*.webm" (
				set ext=avi
				call :mux
			)
		)
	)

	:: Check if the audio file has MP3 before it
	if "!title:~0,3!"=="MP3" (
		call :mp3
	)
)

:: Print out summary information
set /A total=!vidCount! + !vidErrCount! + !audCount! + !audErrCount!
echo.
echo SUMMARY
echo -----------------------------------------------
echo MUX (M4V + M4A -^> MP4)
echo - SUCCESS: %vidCount%
echo - ERROR:   %vidErrCount%
echo.
echo MP3 (M4A -^> MP3 audio)
echo - SUCCESS: %audCount%
echo - ERROR:   %audErrCount%
echo.
echo TOTAL:     %total%
echo -----------------------------------------------
echo.
goto EOF

:: Muxing function - merges audio and video
:mux
	echo|set /p=Joining !titleStrip!...
	ffmpeg -y -loglevel panic -i "!vTitle!" -i "!title!" -vcodec copy -acodec copy "!titleStrip!.%ext%"
	if %errorlevel% GTR 0 (
		echo ERROR
		set /A vidErrCount=!vidErrCount!+1
	) else (
		echo DONE
		del %title%
		del %vTitle%
		set /A vidCount=!vidCount!+1
	)
	exit /b

:: MP3 function - converts to mp3
:mp3
	echo|set /p=Converting !titleStrip!...

	:: Strip the first 6 characters "MP3 - "
	ffmpeg -y -loglevel panic -i "!title!" -c:a libmp3lame -ac 2 -b:a 192k "!titleStrip:~6!.mp3"
	if %errorlevel% GTR 0 (
		echo ERROR
		set /A audErrCount=!audErrCount!+1
	) else (
		echo DONE
		del "!title!"
		set /A audCount=!audCount!+1
	)
	exit /b

:: Pause the program until key press
:EOF
pause >nul