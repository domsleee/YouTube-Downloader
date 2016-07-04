#!/bin/bash

# Obligatory title and information
echo "YouTube Downloader Muxer"
echo "-----------------------------------------------"
echo "This application merges *.m4v, *.webm video with"
echo "*.m4a audio into either *.mp4 or *.avi"
echo
echo

# Location of ffmpeg (may need to be changed
# if wrapping for application wrapping)
ffmpeg="ffmpeg"

# Main function - execution starts here
function main {
	# Number of items processed
	vidCount=0
	audCount=0

	# Work through videos
	for i in *.m4a; do
		title=$(getTitle "$i" "m4a")
		for j in *.m4v; do
			vTitle=$(getTitle "$j" "m4v")
			echo "$j $i"
			if [ "$AUDIO - vTitle" == "$title" ] && [ "$j" != "*.m4v" ]; then
				mux "$j" "$i" "$title.mp4"
				vidCount=$((vidCount + 1))
			fi
		done

		# Webm processing (untested)
		for j in *.webm; do
			vTitle=$(getTitle "$j" "webm")
			if [ "$vTitle" == "$title" ] && [ "$j" != "*.webm" ]; then
				mux "$j" "$i" "$title.avi"
				vidCount=$((vidCount + 1))
			fi
		done
	done

	# Work through MP3
	# <to be written>

	# Print results
	echo
	echo "-------------------============-------------------"
	echo "Finished scanning"
	echo "M4V + M4A videos: $vidCount"
	echo "M4A -> MP3 audio: $audCount"
	echo "-------------------============-------------------"	
	echo 
}

# Get the title from the entire filename
function getTitle {
	echo $(echo $1 | rev | cut -f 2- -d '.' | rev)
}

# VIDEO - mux the m4v and m4a together
function mux {
	$ffmpeg -i "$1" -i "$2" -vcodec copy -acodec copy "$3"
	if [ $? -gt 0 ]; then
		echo ERROR occurred when trying to mux using FFmpeg. This probably means that you don\'t have FFmpeg installed
	else
		rm -f "$1"
		rm -f "$2"
		echo SUCCESS! Made "$3"
		return
	fi
}

# "$0" hack is used to allow for a top-down
# approach, since it loads the code later
main "$0"