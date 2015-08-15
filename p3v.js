/*jslint browser: true unparam: true*/
/*global _p3v: true, $, requestAnimationFrame, cancelAnimationFrame, ready, imagesLoaded */

(function () {
  'use strict';

  ready(function () {
    window._p3v = {
      defaults: {
        reverse: false,
        acceleration: 0.2,
        inertia: true,
        bind: null,
        direction: 'horizontal',
        logo: 'logo.png',
        spinner: 'spinner.gif',
        progress: '<p>Loading... %p% (%i of %n)</p>'
      },

      options: {},

      device: {
        video: null,
        photos: null,
        width: 600
      },

      // There's a bug in IE <=8 where variables cannot
      // have the same name as any DOM Element's ID
      selector: '#product',
      el: null,

      vars: {
        duration: 1,
        lastPosition: 1,
        scaledTargetPosition: 0.2,
        currentPosition: 1,  // Keep track of position while accelerating
        targetPosition: 1,  // Index of photo to display before any mouse movements
        videoPosition: 0.2, // Safari bug when <= 0.1
        floats: false // Use floating point numbers for position? (only in video mode)
      },

      fn: {
        // This is the main entry point
        init: function (selector, options) {
          // If there's only one argument and it's
          // an object, parse it as options
          if (!options && typeof selector === 'object') {
            _p3v.fn.setOptions(selector);
          }

          if (typeof options === 'object') {
            _p3v.fn.setOptions(options);
          }

          if (typeof selector === 'string') {
            _p3v.selector = selector;
          }

          // TODO: Support multiple elements
          _p3v.el = $(_p3v.selector).addClass('p3v');
          var logo = $('<img class="p3v-loading p3v-logo" />');
          logo.attr('src', _p3v.options.logo);
          _p3v.el.append(logo);

          var spinner = $('<img class="p3v-loading p3v-spinner" />');
          spinner.attr('src', _p3v.options.spinner);
          _p3v.el.append(spinner);

          _p3v.el.children().addClass('p3v-placeholder');

          // Get features supported by the device and browser
          _p3v.device = _p3v.fn.deviceInfo();
          _p3v.fn.setOptionsFromDeviceInfo();

          // Calculate initial dimensions
          // $(_p3v.elPhotos[0]).ready(_p3v.fn.resize);

          // Listen for Mouse/Touch events
          _p3v.fn.bindHandlers();

          // Is the video element supported?
          if (_p3v.device.video) {
            console.log('Detected video support. Waiting for video to load');
            _p3v.mode = 'video';

            var elVideo = $('<video autobuffer preload tabindex="0"></video>');

            elVideo.append('<source type="video/mp4; codecs=\'avc1.42E01E, mp4a.40.2\'" src="vi1-1.mp4"></source>');
            elVideo.append('<source type="video/webm; codecs=\'vp8, vorbis\'" src="vi1-5.webm"></source>');
            elVideo.append('<source type="video/ogg; codecs=\'theora, vorbis\'" src="vi1-1.ogv"></source>');

            elVideo.css('opacity', 0);

            _p3v.el.append(elVideo);
            _p3v.elVideo = elVideo[0];

            // Wait until the video has finished loading
            if (_p3v.elVideo.duration > 1) { _p3v.fn.initWithVideo(); }
            _p3v.fn.bindEvent(_p3v.elVideo, 'loadeddata', _p3v.fn.initWithVideo, false);

          // Fallback #1 to canvas
          } else if (false && _p3v.device.canvas) {
            console.log('Detected canvas but no video support');
            _p3v.mode = 'canvas';

            var elCanvas = $('<canvas tabindex="0"></canvas>');
            elCanvas.css('opacity', 0);

            _p3v.el.append(elCanvas);
            _p3v.elCanvas = elCanvas[0];

            _p3v.fn.loadPhotos(_p3v.fn.initWithCanvas);

          // Fallback #2 to photos
          } else {
            console.log('No video or canvas tag supported, falling back to photos');
            _p3v.mode = 'photos';

            _p3v.fn.loadPhotos(_p3v.fn.initWithPhotos);
          }
        },

        loadPhotos: function (callback) {

          // Add a container element for all the photos
          _p3v.el.append('<div class="p3v-photosContainer">');
          var photosContainer = $('.p3v-photosContainer');

          // Add img tags
          var i;
          for (i = 1; i <= _p3v.device.photoCount; i++) {
            photosContainer.append(
              '<img src="image/'
              + _p3v.device.photoWidth
              + '/image-'
              + _p3v.fn.pad(i, 3)
              + '.jpg" />');
          }

          // Callback when photos have finished downloading
          var done = function () {
            _p3v.elPhotos = photosContainer.find('img');
            _p3v.vars.loadingProgress = Math.ceil(_p3v.elPhotos.length / _p3v.device.photoCount * 100);
            
            _p3v.fn.makeUnselectable(_p3v.elPhotos);
            console.log('Done loading ' + _p3v.elPhotos.length + ' photos');
            callback();
          };

          // TODO: Indicate Progress
          var progress = function (instance, image) {
            _p3v.elPhotos = photosContainer.find('img');
            _p3v.vars.loadingProgress = Math.ceil(_p3v.elPhotos.length / _p3v.device.photoCount * 100);
            console.log('Loading photo ' + image.img.src);
          };

          var imgLoad = imagesLoaded(_p3v.selector);
          imgLoad.on('always', done);
          imgLoad.on('progress', progress);
        },

        makeUnselectable: function(target) {
          $(target)
            .addClass('p3v-unselectable')
            .attr('unselectable', 'on')
            .attr('draggable', 'false')
            .on('dragstart', function () { return false; });

          $(target)
              .find('*')
              .attr('draggable', 'false')
              .attr('unselectable', 'on');

          // Disable navigation on scroll
          // TODO: Proper scrolling support
          $(window).mousewheel(function (e) {
            e.preventDefault();
          });
        },

        deviceInfo: function () {
          var device = {};

          device.width = $(window).width();

          device.photoWidth = (function () {
            var sizes   = [];
            var counts  = {};

            $.each(_p3v.options.photos, function (i, a) {
              // IE9 Bug: options.photos length may be too large by one
              if (a === undefined) { return; }

              console.log('Available photos for size ' + a.size + ' count ' + a.count);
              sizes.push(a.size);
              counts[a.size] = a.count;
            });

            device.photoWidth = _p3v.fn.closest(device.width, sizes);
            device.photoCount = counts[device.photoWidth];

            console.log('Selecting photo size ' + device.photoWidth + ' because window width is ' + device.width);

            return device.photoWidth;
          }());

          device.video = (function () {
            var el = document.createElement('video');
            var canPlay = el.canPlayType;
            var maxWidth = (device.width > 568);

            return (maxWidth && el && canPlay && _p3v.fn.userAgent('Intel Mac OS X 10_10') && _p3v.fn.userAgent('Safari') && _p3v.fn.userAgent('AppleWebKit/600'));
          }());

          device.mobile = (function () {
            return (_p3v.fn.userAgent('iPad')
              || _p3v.fn.userAgent('iPod')
              || _p3v.fn.userAgent('iPhone'));
          }());

          device.canvas = (function () {
            var el = document.createElement('canvas');
            var context = (el.getContext && el.getContext('2d'));

            return (el && context &&
              (!(_p3v.fn.userAgent('Firefox') || device.mobile)));
          }());

          device.photo = true;

          device.android = _p3v.fn.userAgent('Android');

          device.inertia = (function () {
            return (!(_p3v.fn.userAgent('Firefox') || device.mobile));
          }());

          return device;
        },

        setOptionsFromDeviceInfo: function () {
          if (!_p3v.device.inertia && _p3v.options.inertia) {
            console.log('Disabling inertia to speed up rendering');
            _p3v.options.inertia = false;
          }

        },

        initWithVideo: function () {
          console.log('Initializing video');

          // Positions can be floats
          _p3v.vars.floats = true;

          _p3v.vars.duration = _p3v.elVideo.duration;

          $(_p3v.elVideo).css('opacity', 1);

          if (!_p3v.options.reverse) {
            _p3v.fn.targetPosition = function () {
              return _p3v.vars.targetPosition * _p3v.vars.duration;
            };
          } else {
            _p3v.fn.targetPosition = function () {
              return _p3v.vars.duration - _p3v.vars.targetPosition * _p3v.vars.duration;
            };
          }

          _p3v.fn.draw = function (targetPosition) {
            var position = targetPosition;
            // Fix for old Mobile Safari
            _p3v.elVideo.currentTime = position + 0.2;
          };

          console.log('Initialized video');
          _p3v.fn.startDraw();
        },

        initWithCanvas: function () {

          // Which photo should we show?
          if (!_p3v.options.reverse) {
            _p3v.fn.targetPosition = function () {
              return Math.floor(_p3v.vars.targetPosition * _p3v.elPhotos.length);
            };
          } else {
            _p3v.fn.targetPosition = function () {
              return (_p3v.elPhotos.length - 1) - Math.floor(_p3v.vars.targetPosition * _p3v.elPhotos.length);
            };
          }

          // Draw letterboxed photo into canvas
          // The scaled/offset values are calculated by _p3v.fn.resize()
          _p3v.fn.draw = function (position) {
            var image = _p3v.elPhotos[Math.floor(position)];

            _p3v.vars.canvasContext.drawImage(image, 0, 0,
              _p3v.vars.photoWidth,
              _p3v.vars.photoHeight);
          };

          // As soon as we can fetch the dimensions
          // of the first photo, start drawing

          _p3v.vars.canvasContext = _p3v.elCanvas.getContext('2d');
          _p3v.fn.resize(true);
          $(_p3v.elCanvas).css('opacity', 1);

          console.log('Initialized canvas');
          _p3v.fn.startDraw();
        },

        initWithPhotos: function () {
          console.log('Initializing ' + _p3v.elPhotos.length + ' photos');

          _p3v.elPhotos.css({'opacity': 0});

          // TODO: Cleaner implementation, remove duplicate
          // code shared with initWithCanvas
          if (!_p3v.options.reverse) {
            _p3v.fn.targetPosition = function () {
              return Math.floor(_p3v.vars.targetPosition * _p3v.elPhotos.length);
            };
          } else {
            _p3v.fn.targetPosition = function () {
              return (_p3v.elPhotos.length - 1) - Math.floor(_p3v.vars.targetPosition * _p3v.elPhotos.length);
            };
          }

          // Hide all photos, and then show one only
          // Setting opacity is faster than .hide()
          _p3v.fn.draw = function (position) {
            // Method 1: Opacity
            // $(_p3v.elPhotos.css({'opacity': 0})[Math.floor(position)]).css({'opacity': 1});
            
            // Method 2: Display none/block
            $(_p3v.elPhotos.css({'display': 'none'})[Math.floor(position)]).css({'display': 'block'});
          };

          console.log('Initialized photos');
          _p3v.fn.startDraw();
        },

        // Everything's initialized now
        // we'll run a quick frame rate test and then start drawing
        startDraw: function () {
          _p3v.fn.testDrawDelay(function (avgDelay, fps) {
            console.log('Average drawing delay ' + avgDelay + ' (' + fps + ' fps)');

            var loop = function () {
              requestAnimationFrame(function (time) {
                var delta = (_p3v.vars.previousTime || 0) / time;

                if (delta) {
                  _p3v.fn.doDraw(delta);
                }

                _p3v.vars.previousTime = time;

                loop();
              });
            };

            $('.p3v-placeholder').remove();
            loop();

          });
        },

        doDraw: function (delta) {
          var targetPosition = _p3v.fn.targetPosition();

          if (targetPosition < 0) {
            targetPosition = 1;
          }

          if (isNaN(targetPosition)) {
            _p3v.targetPosition = 1;
            return;
          }

          if (_p3v.options.inertia) {
            _p3v.vars.currentPosition +=
              (targetPosition - _p3v.vars.currentPosition) * _p3v.options.acceleration;
          } else {
            _p3v.vars.currentPosition +=
              (targetPosition - _p3v.vars.currentPosition) * delta;
          }

          console.log(targetPosition);

          // Video position can be a float, photo positions must be integers
          if (!_p3v.vars.floats) {
            _p3v.vars.currentPosition = Math.floor(_p3v.vars.currentPosition);
          }

          if ((_p3v.vars.lastPosition || 0) !== targetPosition) {
            // console.log('Position ~' + targetPosition);
          }

          _p3v.vars.lastPosition = Math.floor(_p3v.vars.currentPosition);

          _p3v.fn.draw(_p3v.vars.currentPosition);

        },

        // The first time the mousemove event fires,
        // this function will replace itself with
        // the browser-specific implementation
        mousemove: function(firstEvent) {
          if (_p3v.vars.mousemoveOnce) { return; }

          if (firstEvent.pageX) {
            // Regular Browsers
            _p3v.fn.mousemove = $.debounce(6, function (e) {
              var mouseX = e.pageX;
              var mouseY = e.pageY;
              _p3v.fn.updateTargetPosition(mouseX, mouseY);
              // console.log('Regular Mousemove X ' + mouseX + ' Y ' + mouseY);
            });

            console.log('Binding regular mousemove event');
            _p3v.vars.mousemoveOnce = true;
          } else if (firstEvent.clientX) {
            _p3v.fn.mousemove = function(e) {
              // IE <= 8
              var mouseX = e.clientX + document.body.scrollLeft;
              var mouseY = e.clientY + document.body.scrollTop;

              if (mouseX < 0) { mouseX = 0; }
              if (mouseY < 0) { mouseY = 0; }

              _p3v.fn.updateTargetPosition(mouseX, mouseY);
              // console.log('IE Mousemove X ' + mouseX + ' Y ' + mouseY);
            }

            console.log('Binding IE mousemove event');
            _p3v.vars.mousemoveOnce = true;
          } else {
            var error = 'Unknown mouse event received';
            console.log(error);
            console.log(JSON.stringify(firstEvent));
          }

          // Re-bind with the new function
          _p3v.fn.bindHandlers();
        },

        updateTargetPosition: function(x, y) {
          _p3v.vars.targetPosition = x / _p3v.device.width;
          // console.log('update targetPosition ' + _p3v.vars.targetPosition);
        },

        resize: function (force) {
          if (!force && $(window).width() === _p3v.device.width) { 
            return;
          }

          console.log('R ' + _p3v.device.width + '=?=' + $(window).width() );

          _p3v.device.width  = $(window).width();
          _p3v.vars.elWidth  = $(_p3v.selector).width();
          _p3v.vars.elHeight = $(_p3v.selector).height();



          console.log('Resized to width ' + _p3v.device.width);

          if (_p3v.mode === 'canvas') {
            _p3v.vars.photoWidth  = $(_p3v.elPhotos[0]).width();
            _p3v.vars.photoHeight = $(_p3v.elPhotos[0]).height();

            _p3v.elCanvas.width  = _p3v.vars.photoWidth;
            _p3v.elCanvas.height = _p3v.vars.photoHeight;

            console.log('Resized canvas');
          }
        },

        bindHandlers: function () {
          _p3v.fn.bindEvent(window, 'resize',              $.throttle(100, _p3v.fn.resize),    false);
          _p3v.fn.bindEvent(document, 'orientationchange', $.throttle(100, _p3v.fn.resize),    false);
          _p3v.fn.bindEvent(document, 'mousemove',         $.throttle(7,   _p3v.fn.mousemove), false);

          // There's a bug in Android's touchmove
          // TODO: Restore scrolling
          // http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
          if (_p3v.device.android) {
            console.log('Detected Android, enabling swipe shim');

            // var c = document.getElementById('p3v');
            // c.addEventListener("swipeStart", console.log, false);
            // c.addEventListener("swipeMove", console.log, false);
            // c.addEventListener("swipeEnd", console.log, false);
            // c.addEventListener("swipeUp", console.log, false);
            // c.addEventListener("swipeDown", console.log, false);
            // c.addEventListener("swipeLeft", console.log, false);
            // c.addEventListener("swipeRight", console.log, false);
            // c.addEventListener("scroll", console.log, false);

            _p3v.fn.bindEvent(document, 'touchstart', function (e) {
              e.preventDefault();
            });
          }

          _p3v.fn.bindEvent(document, 'touchmove', function (e) {
            e.preventDefault();
            _p3v.vars.targetPosition = e.pageX / _p3v.device.width;
          });

        },

        unbindHandlers: function () {
          window.onmousemove = undefined;
        },

        // Old IE's addEventListener is called attachEvent
        bindEvent: function (el, eventName, eventHandler) {
          if (el.addEventListener) {
            el.addEventListener(eventName, eventHandler, false);
          } else if (el.attachEvent) {
            el.attachEvent('on' + eventName, eventHandler);
          }
        },

        stop: function () {
          _p3v.fn.unbindHandlers();
          cancelAnimationFrame(_p3v.vars.animationFrame);
          clearInterval(_p3v.vars.drawInterval);
        },

        setOptions: function (options) {
          if (options === undefined) {
            options = {};
          }

          if (_p3v.options === undefined) {
            _p3v.options = {};
          }

          _p3v.options = $.extend($.extend(_p3v.defaults, _p3v.options), options);
        },

        // http://www.adequatelygood.com/Minimum-Timer-Intervals-in-JavaScript.html
        testDrawDelay: function (callback) {
          var iterations = 10;
          var i = 0;
          var results = 0;

          var iterate = function () {
            var date = new Date().getTime();

            var delayed = function () {
              results += new Date().getTime() - date;
              i += 1;
              if (i < iterations) {
                iterate();
              } else {
                var avgDelay = results / iterations;
                var fps = Math.floor(1000 / avgDelay);
                callback(avgDelay, fps);
                return;
              }
            };

            requestAnimationFrame(delayed, 0);
          };

          iterate();
        },

        userAgent: function (search) {
          return (navigator.userAgent.toLowerCase().indexOf(search.toLowerCase()) >= 0);
        },

        round: function (number, decimals) {
          return +(Math.round(number + "e+" + decimals) + "e-" + decimals);
        },

        pad: function (num, size) {
          var s = "000000000" + num;
          return s.substr(s.length - size);
        },

        closest: function (num, arr) {
          var curr = arr[0];
          var diff = Math.abs(num - curr);
          var val;
          var newdiff;
          for (val = 0; val < arr.length; val++) {
            newdiff = Math.abs(num - arr[val]);
            if (newdiff < diff) {
              diff = newdiff;
              curr = arr[val];
            }
          }
          return curr;
        }
      }
    };
  });

  window.p3v = function (selector, options) {
    ready(function () {
      _p3v.fn.init(selector, options);
    });
  };

}());
