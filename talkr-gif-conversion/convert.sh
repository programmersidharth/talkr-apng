# Convert a talkr-generated GIF file to an APNG file
#
# Note: apngasm does not let you set disposal options
# so the APNG files won't look good in a browser. 
#
# This script requires imagemagick and apngasm to be installed 
# OSX: brew install imagemagick; brew install apngasm;
#
# Note, using a conversion app like gif2apng gets you close,
# but it optimizes the frames with custom disposal options that
# assume the gif is always playing forward
#
# To do it on all files in a directory:
#     for f in *.GIF; do ./convert.sh $f; done

g=$1

# Extract PNG frames for the gif.  These files do not
# have the same size as the original GIF file (the geometry is offset)
convert $g tmp%02d.png


# Get the size of the original GIF (frame 0)
size=$(identify -format "%[fx:w]x%[fx:h]" $g[0])

# Create a blank, transparent canvas the same size as the gif.
convert -size $size xc:none _canvas.png

# For each png file generated from each frame of the gif
for f in tmp*; do
	# Add it to the blank canvas at the appropriate offset.
	geom=$(identify -format "%X%Y" $f); 
	convert _canvas.png $f -geometry $geom -composite +repage $f;

done

for f in tmp*; do
	if [[ $f != tmp00.png ]]; then 
		# Remove the logo from all frames after the first to make the output file smaller
		# If you are actually using the frames at the bottom-right, deleting this for loop
		convert $f -size 192x48 xc:white -alpha set -geometry 100% -gravity southeast -compose dst_out -composite $f
	fi
done

# Now assemble the appropriate-sized PNG files into an APNG file.
outputname=${g%????}.png
apngasm -o $outputname tmp*.png

# Clean up.
rm tmp*
rm _canvas.png

