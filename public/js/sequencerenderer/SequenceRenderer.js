

(function () {

	var SequenceRenderer = function(numFrames, touch) {
		this.numFramesTotal = numFrames;
		this.touch = touch;
		this.stageQuality = 'low';
		this.playing = true;
		this.viewport = new Rectangle(0,0,0,0);

		this.viewport.width = window.innerWidth;
		this.viewport.height = window.innerHeight;
	};


	var s = SequenceRenderer;
	var p = SequenceRenderer.prototype;

	s.FPS = 60;
	s.VIDEO_FPS = 25;
	s.SPEED = s.VIDEO_FPS/s.FPS;
	s.START_FRAME = 0;
	s.RENDER_TYPE_CANVAS = 1;
	s.RENDER_TYPE_IMAGE = 2;
	s.RENDER_TYPE = s.RENDER_TYPE_CANVAS;

	p.init = function(element) {
		this.element = element;
		this.position = 100;
		this.input = new InteractionInput(element, this.onInteraction.bind(this), this.touch ? 'touch' : 'notouch');
		this.input.enable();
		this.renderer = new Renderer(s.RENDER_TYPE, this.viewport.width, this.viewport.height);
		this.sequence = new ImageSequence('assets/sequence/');
		this.controls = new Controls();

		this.renderer.addChild(this.sequence);
		this.isBuffering = false;
		this.sequence.gotoAndStop(s.START_FRAME);

		this.dom = document.createElement('div');
		this.dom.setAttribute('id', 'sequence-renderer');
		this.history = {};
		this.setQuality('low');
		this.setPlayState(this.history.playing, true, true, true, true);
		this.dom.appendChild(this.renderer.stage);
		this.element.appendChild(this.dom);
		this.element.appendChild(this.controls.dom);

		this.resize();

	};

	p.addFrames = function(data) {
		this.sequence.addFrames(data);
	};

	p.setBuffered = function(percent){
		this.controls.setBuffered(percent);
	}

	p.resize = function() {
		this.viewport.width = window.innerWidth;
		this.viewport.height = window.innerHeight;
		this.renderer.resize(this.viewport.width, this.viewport.height);


		if(this.renderer.rendable.frame){
			this.lastRendered = null;
			this.onUpdate(this.currentPosition);
		}

	};

	p.onUpdate = function(position){
		this.sequence.gotoAndStop(position);
		if(this.lastRendered === position){
			if(this.stageQuality === 'low' && this.renderer.stageQuality === 'high'){
				return;
			}
			if(this.stageQuality === this.renderer.stageQuality){
				return;
			}
		};

		this.renderer.render(this.stageQuality);
		this.lastRendered = this.sequence.currentFrame;
		this.controls.setPosition(this.sequence.currentFrame/this.numFramesTotal);

	};

	p.renderHighres = function(){
		if(this.touch) return;
		this.renderer.setHighQuality(this.sequence);
	};

	p.start = function() {
		this.playing = true;
		this.targetFrame = 0;
		this.position = s.START_FRAME;
		this.history.direction = this.input.direction;
		this.history.playing = this.playing;

		console.log(s.SPEED);
		this.onTickEvent();
	};

	p.onTogglePlay = function() {
		var newState = this.playing ? false : true;
		this.setPlayState(newState, true, true, true);
	};

	p.setPlayState = function(value, ease, autoStart, saveToHistory, force) {
		if(!force && this.playing === value) return;
		this.playing = value;
		if(this.playing) {
			this.setQuality('low');
			if(this.input.direction === 0) this.input.direction = this.history.direction;
			this.history.direction = this.input.direction;
			if(ease) this.input.tweenVelocityVal = 0;
		}else{
			this.setQuality('high');
			this.input.direction = 0;
			this.input.setVelocity(1);
		}
		if(saveToHistory)this.history.playing = this.playing;
	};

	p.onAutoPlay = function() {
		if(this.freezed) return;
		this.setPlayState(true, true, true, true);
	};

	p.onMoveVideo = function(event) {
		if(!this.playing){
			this.setPlayState(true, true, true, true);
		}

		this.input.direction=event.detail.dir;
		this.input.addTargetVelocity(3);
	};

	p.onInteraction = function(type) {
		if(this.freezed) return;
		switch(type){
			case InteractionInput.INTERACTION_CLICK:
			break;
			case InteractionInput.INTERACTION_START:
				this.hasMoved = false;
				this.playingBeforeInteract = this.playing;
				this.setPlayState(false);
			break;
			case InteractionInput.ON_INTERACTION:
				this.hasMoved = true;
				this.targetFrame = this.position + (this.input.targetVelocity * this.input.direction);
			break;
			case InteractionInput.INTERACTION_END:
				if(this.freezed){
					this.input.direction = this.history.direction;
					this.playing = this.history.playing;
					return;
				}
				if(this.input.targetVelocity > 2 && this.input.direction !== 0){
					this.setPlayState(true, false, false, true);
				}else{
					if(!this.hasMoved && !this.playingBeforeInteract){
						this.setPlayState(true, true, true, true);
					}else{
						this.setPlayState(false, true, true, true, true);
					}
				}
			break;
		}
	};


	p.setQuality = function(quality) {
		if(this.touch) quality = 'low';
		this.stageQuality = quality;
	};

	p.onTickEvent = function(force) {
		this.input.tweenVelocity(this.playing);
		var newPos = 0;

		if(this.playing){
			newPos = this.position + (s.SPEED * this.input.moveVelocity * this.input.direction);
		}else{
			newPos = this.position + ((this.targetFrame - this.position)*.5);
		}

		var loopFrame = this.loopFrame(newPos);
		if(loopFrame !== null){
			newPos = loopFrame;
		}

		if(!this.sequence.canPlay(newPos)){
			// if(this.canplay)NotificationManager.notify('buffer_state_change', {canplay: false});
			// this.canplay = false;
			requestAnimationFrame(this.onTickEvent.bind(this));
			return;

		}else{
			// if(!this.canplay)NotificationManager.notify('buffer_state_change', {canplay: true});
			// this.canplay = true;
		}


		//write newpos to position values
		if(this.playing){
			this.position = this.targetFrame = newPos;
		}else{
			this.position = newPos;
			if(loopFrame !== null) this.targetFrame = newPos;
		}
		this.currentPosition = Math.floor(this.position);

		this.onUpdate(this.currentPosition);
		requestAnimationFrame(this.onTickEvent.bind(this));
		//this.stats.end();
	};

	p.loopFrame = function(val) {
		var nVal = val;
		if(nVal >= this.numFramesTotal){
			nVal = nVal - this.numFramesTotal;
			return nVal;
		}else if(nVal < 0){
			nVal = this.numFramesTotal + nVal;
			return nVal;
		}
		return null;
	};



	/************** CONTROLS **********/

	var Controls = function(){
		this.dom = document.createElement('div');
		this.dom.setAttribute('id', 'controls');

		this.timeline = document.createElement('div');
		this.timeline.className = 'timeline';

		this.indicator = document.createElement('div');
		this.indicator.className = 'indicator';

		this.buffer = document.createElement('div');
		this.buffer.className = 'buffer';

		this.timeline.appendChild(this.buffer);
		this.timeline.appendChild(this.indicator);
		this.dom.appendChild(this.timeline);
	}


	Controls.prototype.setPosition = function(position){
		var duration = (window.innerWidth*.9);
		this.indicator.style.left = position*duration + 'px';
		// this.progress.css({left: position*duration});
	}

	Controls.prototype.setBuffered = function(progress){
		this.buffer.style.width = progress*100 + '%';
	}

	/************* RENDERER ***************/


	var Renderer = function(type, width, height){
		this.bounds = new Rectangle(0,0,width, height);
		this.sourceRect = new Rectangle(0,0,1280,720);
		this.setRenderType(type);
	};

	Renderer.RENDER_TYPE_CANVAS = s.RENDER_TYPE_CANVAS;
	Renderer.RENDER_TYPE_IMAGE = s.RENDER_TYPE_IMAGE;


	Renderer.prototype.setRenderType = function(type){
		this.renderType = type;

		switch(this.renderType){
			case Renderer.RENDER_TYPE_CANVAS:
				this.stage = document.createElement('canvas');
				this.ctx = this.stage.getContext('2d');
				this.renderFunc = this.renderDrawImage;

			break;
			case Renderer.RENDER_TYPE_IMAGE:
				this.stage = document.createElement('img');
				this.stage.draggable = false;
				this.renderFunc = this.renderSetTagSrc;
			break;
		}

		this.stage.className = 'stage';
	};

	Renderer.prototype.renderSetTagSrc = function(source){
		this.stage.src = source;
	};

	Renderer.prototype.renderDrawImage = function(source){
		var img = new Image();
		img.src = source;
		this.ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.bounds.width, this.bounds.height);
	};

	Renderer.prototype.render = function(quality){

		var src = this.rendable.frame.data;
		var highres = null;
		switch(quality){
			case 'low':
				break;
			case 'high':
				highres = this.rendable.getHighres(this.rendable.frame.file);
				if(highres !== null) src = highres;
				else quality = 'low';
				break;
		}

		this.renderFunc(src);
		this.stageQuality = quality;
	};

	Renderer.prototype.addChild = function(rendable){
		this.rendable = rendable;
	};

	Renderer.prototype.setHighQuality = function(){
		this.render('high');
	};


	Renderer.prototype.resize = function(w, h){
		var nW = w;
		var scale = nW/this.sourceRect.width;
		var nH = scale * this.sourceRect.height;

		if(nH <= h){
			nH = h;
			scale = nH/this.sourceRect.height;
			nW = scale * this.sourceRect.width;
		}

		var top = (h - nH)*.5;
		var left = (w - nW) *.5;

		this.bounds.width = nW;
		this.bounds.height = nH;
		this.bounds.x = left;
		this.bounds.y = top;


		this.stage.width = this.bounds.width;
		this.stage.height = this.bounds.height;

		this.stage.style.width = this.bounds.width + 'px';
		this.stage.style.height = this.bounds.height + 'px';
		this.stage.style.left = this.bounds.x + 'px';
		this.stage.style.top = this.bounds.y + 'px';

		switch(this.renderType){
			case Renderer.RENDER_TYPE_CANVAS:
			break;
			case Renderer.RENDER_TYPE_IMAGE:
			break;
		}


	}


	/************* SEQUENCE *************/


	var ImageSequence = function(imageFolder){
		this.imageFolder = imageFolder;
		this.frames = {};
		this.currentFrame = 0;
		this.numFrames = 0;
		this.buffered = 0;
		this.highres = new Image();
	};

	ImageSequence.prototype.addFrames = function(frames){
		for(var i = 0; i < frames.length; i++){
			var f = {};
			f.data = frames[i].data;
			f.index = frames[i].frame;
			f.file = frames[i].file;
			this.frames[f.index] = f;
			this.numFrames++;
		}
		this.buffered = this.numFrames;
	};

	ImageSequence.prototype.gotoAndStop = function(frame){
		if(this.currentFrame === frame && this.frame){
			return;
		};

		this.currentFrame = frame;
		var f = this.frames[this.currentFrame];
		this.highres.src = '';
		this.highres._file = null;
		this.highres.complete = false;
		if(!f) return;
		this.frame = f;
	};

	ImageSequence.prototype.canPlay = function(){
		if(this.frames[this.currentFrame]) return true;
		else return false;
	};

	ImageSequence.prototype.getHighres = function(file, force){

		var src = this.imageFolder + 'highres/' + file;
		if(this.highres._file !== file){
			this.highres._file = file;
			this.highres.src = src;
		}
		if(this.highres.complete || force) return this.highres.src;
		else return null;
	};

	ImageSequence.prototype.pad = function(str, max){
		 return str.length < max ? this.pad("0" + str, max) : str;
	};


	/********* RECTANGLE ***********/

	var Rectangle = function(x,y,w,h){
		this.x = x;
		this.y = y;
		this.width = w ? w : 0;
		this.height = h ? h : 0;
	}

	/************ INPUT ****************/

	var InteractionInput = function(element, onInteractionCallback, type){
		this.element = element;
		this.onInteractionCallback = onInteractionCallback;
		this.moveDistance = 0;
		this.moveVelocity = this.tweenVelocityVal = 0;
		this.targetVelocity = 8;
		this.direction = 1;
		this.interactionStart = 0;
		this.interactionEnd = 0;
		this.frameCount = 0;

		this.startEvent = type == 'touch' ? 'touchstart' : 'mousedown';
		this.moveEvent = type == 'touch' ? 'touchmove' : 'mousemove';
		this.endEvent = type == 'touch' ? 'touchend' : 'mouseup';
		this.hasMoveListener = false;
	};

	InteractionInput.INTERACTION_START = 0;
	InteractionInput.ON_INTERACTION = 1;
	InteractionInput.INTERACTION_END = 2;
	InteractionInput.INTERACTION_CLICK = 3;
	InteractionInput.MAX = 30;

	InteractionInput.prototype.enable = function(){
		this._onInteractionBind = this.onInteraction.bind(this);
		this._onInteractionStartBind = this.onInteractionStart.bind(this);
		this._onInteractionEndBind = this.onInteractionEnd.bind(this);

		this.element.addEventListener(this.moveEvent, this._onInteractionBind);
		this.element.addEventListener(this.startEvent, this._onInteractionStartBind);
		this.element.addEventListener(this.endEvent, this._onInteractionEndBind);
	};
	InteractionInput.prototype.disable = function(){
		this.element.removeEventListener(this.moveEvent, this._onInteractionBind);
		this.element.removeEventListener(this.startEvent, this._onInteractionStartBind);
		this.element.removeEventListener(this.endEvent, this._onInteractionEndBind);
	};

	InteractionInput.prototype.tweenVelocity = function(autoDecrease){
		var ease = 0.2;
		this.tweenVelocityVal += (this.targetVelocity - this.tweenVelocityVal) * ease;
		this.moveVelocity = Math.round(this.tweenVelocityVal*100)/100;
		if(autoDecrease)this.targetVelocity*=0.98;
		this.targetVelocity = Math.max(this.targetVelocity, 1);
	};

	InteractionInput.prototype.setVelocity = function(val){
		this.targetVelocity = this.moveVelocity = this.tweenVelocityVal = val;
	};

	InteractionInput.prototype.setTargetVelocity = function(val){
		this.targetVelocity = val;
	};

	InteractionInput.prototype.addTargetVelocity = function(val){
		this.targetVelocity = Math.min(this.targetVelocity+val, InteractionInput.MAX);
	};

	InteractionInput.easeInOutQubic = function(t, b, c, d) {
		var ts=(t/=d)*t;
		var tc=ts*t;
		return b+c*(-2*tc + 3*ts);
	};

	InteractionInput.prototype.onInteractionStart = function(event){
		this.direction = 0;
		this.started = true;
		this.moveDistance = this.interactionStart = event.touches ? event.touches[0].pageX : event.pageX;
		this.onInteractionCallback(InteractionInput.INTERACTION_START);
	};

	InteractionInput.prototype.onInteraction = function(event){
		var x = event.touches ? event.touches[0].pageX : event.pageX;
		var y = event.touches ? event.touches[0].pageY : event.pageY;
		event.preventDefault();
		event.stopPropagation();
		if(!this.started) return;
		var move = (this.moveDistance - x);
		this.moveDistance = x;
		var dir = move/Math.abs(move);
		if(!dir) dir = 0;
		this.direction = dir;
		var sW = window.innerWidth;
		var p = 0.2*sW;
		this.targetVelocity = Math.min(Math.abs(move*.5), InteractionInput.MAX);
		this.onInteractionCallback(InteractionInput.ON_INTERACTION);
	};

	InteractionInput.prototype.onInteractionEnd = function(event){
		this.started = false;
		this.onInteractionCallback(InteractionInput.INTERACTION_END);
	};

	window.SequenceRenderer = SequenceRenderer;
}());
