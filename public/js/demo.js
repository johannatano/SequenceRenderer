var App = function(){

};

App.prototype.init = function(isMobile){
	var config = 0;
	function is_touch_device() {
		try {
			document.createEvent("TouchEvent");
			return true;
		} catch (e) {
			return false;
		}
	}

	var isTouch = is_touch_device();

	//load the config.json file
	$.getJSON('assets/sequence/json/config.json', function( data ) {
			config = data;

			//preload 50%
			var NUM_PRELOADED_FILES = Math.floor(config.numFiles*.5);
			var started = false;

			//25/60, can be overridden manually to faster or slower, eg. 5, or 0.1;
			SequenceRenderer.SPEED = SequenceRenderer.VIDEO_FPS/SequenceRenderer.FPS;

			//use canvas render for desktop and image render on mobile for best performance
			SequenceRenderer.RENDER_TYPE = isTouch ? SequenceRenderer.RENDER_TYPE_IMAGE : SequenceRenderer.RENDER_TYPE_CANVAS;
			var renderer = new SequenceRenderer(config.numFrames, isTouch);
			renderer.init(document.body);
			//load the frames.json files
			var dataFiles = [];
			var filesLoaded = 0;
			for(var i = 0; i < config.numFiles; i++){
				$.getJSON('assets/sequence/json/framesdata_'+i+'.json', function( data ) {
					filesLoaded++;
					renderer.addFrames(data);
					renderer.setBuffered(filesLoaded/config.numFiles);

					if(filesLoaded >= NUM_PRELOADED_FILES && !started){
						//start render
						renderer.start();
						started = true;
					}
				});
			}



			$(window).resize(renderer.resize.bind(renderer));
	});

};
