# talkr-apng

`talkr-apng` is forked from the excellent [apng-js](https://github.com/davidmz/apng-js) library which provides a generalized APNG parsing framework.  `talkr-apng` adds functionality specific to playing APNG files in sync with audio or text-to-speech animations.  Similar to talkr's [GIF parsing library](https://github.com/talkr-app/gif-talkr), `talkr-apng` has special code to play blink and eyebrow animations on files that were generated from the iOS app [talkr](https://talkrapp).  Memory use and loading times are drastically reduced by `talkr-apng` as compared to `gif-talkr` because the png frames are compressed.

## Usage
`npm install talkr-apng`
 
## Demo
Open the docs/index.html file to load an APNG file and play an animation on it.

## API

Please refer to ([apng-js](https://github.com/davidmz/apng-js)) documentation on parseAPNG or the APNG, Player and Frame objects.

The play_for_duration function was added to the player, which will ping-pong for duration on regular APNG files and play animations that include eyebrow raises and blinks on talkr APNGs. It takes the number of milliseconds to play as an agument.

## Creating APNG files

### talkr APNGs 

The premium version of talkr ($2.99) can output APNG files for use with this library.  Select the option in settings, then hit the Edit button on top of the image select screen to select and export your APNG file(s). Talkr APNGs include eyebrow and blink animations that will layer on top of the lip movements.  Frame 0 will always be displayed as the bottom layer, while frames 1-22 are looped forwards and then backwards to animate the lips while frames 23-29 are layered on top to animage the eyelids and eyebrows.

### normal APNGs

Normal APNGs do not need any special configuration.  No eyebrow and blink animations will be created, and no layers are used.  The frames are simply played forwards and then backwards.

Any conversion library like [gif2apng](http://gif2apng.sourceforge.net/) will let you create compatible PNG files from standard GIF files.  You can also assemble and dissassemble APNGs from/to their component images. There is some skill required to choose animations that will look good in sync with text-to-speech. Try to find input files that start with a closed mouth, then open the mouth in the first few frames.  Any movements (especially in the early frames) will be repeated frequently, so try to find input with minimal head movement in the early frames.

This library will attempt to detect APNG files created with talkr by looking at the image metadata in the creator field. If you want to create your own APNG files with eyebrow and blink animations, be sure to pass true as the second parameter to parseAPNG to load your 30-frame APNG as a talkr APNG without looking at the metadata.



