# Get started

## Step 1 - Convert your video

Encode your video in three different formats.
    
    ffmpeg -i input.mp4 -qmax 25 -threads 4 output.webm

    ffmpeg -i input.mp4 -c:v libvpx -crf 10 -b:v 1M -s hd720 -threads 4 output.webm

For older browsers, extract still frames from your video.

    ffmpeg -i input.mp4 -s hd1080 -r 3 image/1080/image-%3d.jpg
    ffmpeg -i input.mp4 -s hd480 -r 3 image/480/image-%3d.jpg
    jpegoptim image/1080/*.jpg
    jpegoptim image/480/*.jpg

# TODO
 - Start with one image. Progressively enhance with either video on canvas or photos
 - Flash fallback for older browsers
 - Mobile and touch support
 - Vertical movement
 - Keyboard control, scroll control
 - Autoplay
 - Seamless loop / hover right side to turn infinitely
 - Custom binding
 - Maybe free plan with logo overlaid (like flowplayer), and/or hosted data caps / plans
 - Fullscreen (toggleable, optional)

# BUGS
 - Video stops updating after some time - recreate DOM element after idle
 - Must have a Doctype (check when embedding!)
