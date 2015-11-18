#!/bin/bash
cd "$(dirname "$0")"

function ffmpegcall {
	ffmpeg -i "$1" -i "$2" -vcodec copy -acodec copy "$3"
	if [ $? -gt 0 ]; then
		echo ERROR occurred when trying to mux using FFmpeg. This probably means that you don\'t have FFmpeg installed
	else
		rm -f "$1"
		rm -f "$2"
		echo SUCCESS! Made "$3"
		return
	fi
}

function getTitle {
	echo $(echo $1 | rev | cut -f 2- -d '.' | rev)
}

muxCount=0
for i in *.m4a; do
	title=$(getTitle "$i" "m4a")
	for j in *.m4v; do
		vTitle=$(getTitle "$j" "m4v")
		if [ "$vTitle" == "$title" ] && [ "$j" != "*.m4v" ]; then
			echo "$title"
			ffmpegcall "$j" "$i" "$title.mp4"
			muxCount=$((muxCount + 1))
		fi
	done
	for j in *.webm; do
		vTitle=$(getTitle "$j" "webm")
		if [ "$vTitle" == "$title" ] && [ "$j" != "*.webm" ]; then
			ffmpegcall "$j" "$i" "$title.avi"
			muxCount=$((muxCount + 1))
		fi
	done
done
echo
echo "-------------------============-------------------"
echo "Finished scanning, found $muxCount video/s to mux"
echo "-------------------============-------------------"	
echo 