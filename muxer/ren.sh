for file in *; do
	mv ./"$file" "./${file/mp3/.mp3}"
done

