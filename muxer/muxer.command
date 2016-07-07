#!/bin/bash

# Obligatory title and information
clear
echo "YouTube Downloader Muxer"
echo "-----------------------------------------------"
echo "This application merges *.m4v, *.webm video with"
echo "*.m4a audio into either *.mp4 or *.avi"
echo

# Location of ffmpeg (may need to be changed
# if wrapping for application wrapping)
ffmpeg="ffmpeg"

# Number of items processed
vidCount=0
vidErrCount=0
audCount=0
audErrCount=0

# Main function - execution starts here
function main {
	# Work through videos
	for i in *.m4a; do
		title=$(getTitle "$i" "m4a")
		for j in *.m4v; do
			vTitle=$(getTitle "$j" "m4v")
			if [ "AUDIO - $vTitle" == "$title" ] && [ "$j" != "*.m4v" ]; then
				mux "$j" "$i" "$vTitle.mp4"
			fi
		done

		# Webm processing (untested)
		for j in *.webm; do
			vTitle=$(getTitle "$j" "webm")
			if [ "$vTitle" == "$title" ] && [ "$j" != "*.webm" ]; then
				mux "$j" "$i" "$title.avi"
			fi
		done
	done

	# Work through MP3
	for i in *.m4a; do
		title=$(getTitle "$i" "m4a")
		header=$(getHead "$i")

		if [ "$header" == "MP3" ]; then
			mp3 "$i" "$title.mp3"
		fi
	done

	# Print results
	total=$((vidCount + vidErrCount + audCount + audErrCount))
	echo
	echo "SUMMARY"
	echo "-------------------============-------------------"
	echo "MUX (M4V + M4A -> MP4)"
	echo "- SUCCESS: $vidCount"
	echo "- ERROR:   $vidErrCount"
	echo
	echo "MP3 (M4A -> MP3 audio)"
	echo "- SUCCESS: $audCount"
	echo "- ERROR:   $audErrCount"
	echo
	echo "TOTAL:     $total"
	echo "-------------------============-------------------"	
	echo
}

# Get the title from the entire filename
function getTitle {
	echo $(echo $1 | rev | cut -f 2- -d '.' | rev)
}

# Get the title from the entire filename
function getHead {
	echo $(echo $1 | cut -f1 -d '-')
}

# VIDEO - mux the m4v and m4a together
# Parameters: inputOne, inputTwo, fileName
function mux {
	$ffmpeg -loglevel panic -i "$1" -i "$2" -vcodec copy -acodec copy "$3"
	echo "MUX $?: $3"
	if [ $? -gt 0 ]; then
		vidErrCount=$((vidErrCount + 1))
	else
		rm -f "$1"
		rm -f "$2"
		vicCount=$((vidCount + 1))
	fi
}

# AUDIO - convert the m4a into mp3
# Parameters: inputFile, fileName
function mp3 {
	# Get string after "- "
	name=${2#*- }
	$ffmpeg -loglevel panic -i "$1" -c:a libmp3lame -ac 2 -b:a 192k "$name"
	echo "MP3 $?: $name"
	if [ $? -gt 0 ]; then
		audErrCount=$((audErrCount + 1))
	else
		rm -f "$1"
		audCount=$((audCount + 1))
	fi
}

# "$0" hack is used to allow for a top-down
# approach, since it loads the code later
main "$0"