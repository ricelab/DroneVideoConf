/**
 *
 * script.js
 * Main JavaScript code for DVC web client
 *
 * Written by Brennan Jones
 *
 * Last modified: 29 March 2015
 *
 */


var panLeftButton;
var panRightButton;
var zoomInButton;
var zoomOutButton;
var elevateUpButton;
var elevateDownButton;
var freezeButton;


jQuery(function()
{
	/* NOTE: Change this to the server's IP address / domain name and any port number you'd like.
	    (Maybe grab server information dynamically later.) */
	// var url = "http://10.11.78.44:8080";
	var url = "http://127.0.0.1:12345";
	
	var socket = io.connect(url);
	
	var doc = jQuery(document),
	    win = jQuery(window);
	
	var numFramesReceived = 0;
	
	
	panLeftButton = jQuery('#panLeftButton'),
	panRightButton = jQuery('#panRightButton'),
	zoomInButton = jQuery('#zoomInButton'),
	zoomOutButton = jQuery('#zoomOutButton'),
	elevateUpButton = jQuery('#elevateUpButton'),
	elevateDownButton = jQuery('#elevateDownButton'),
	freezeButton = jQuery('#freezeButton');
	
	panLeftButton.on('click', function() {		
		socket.emit('Command', { 'command': 'PanLeft' });
	});
	
	panRightButton.on('click', function() {		
		socket.emit('Command', { 'command': 'PanRight' });
	});
	
	zoomInButton.on('click', function() {		
		socket.emit('Command', { 'command': 'ZoomIn' });
	});
	
	zoomOutButton.on('click', function() {		
		socket.emit('Command', { 'command': 'ZoomOut' });
	});
	
	elevateUpButton.on('click', function() {		
		socket.emit('Command', { 'command': 'ElevateUp' });
	});
	
	elevateDownButton.on('click', function() {		
		socket.emit('Command', { 'command': 'ElevateDown' });
	});
	
	freezeButton.on('click', function() {		
		socket.emit('Command', { 'command': 'Freeze' });
	});
	
	
	var defaultConfig = {
        filter: "original",
        filterHorLuma: "optimized",
        filterVerLumaEdge: "optimized",
        getBoundaryStrengthsA: "optimized"
    };
		
	var div = jQuery('#videoFrameContainer');
	var canvas = document.createElement('canvas');
	canvas.style.background = 'black';
	var size = new Size(640, 368);
	var webGLCanvas = new YUVWebGLCanvas(canvas, size);
	div.append(canvas);
	
	var avc = new Avc();
	avc.configure(defaultConfig);
	avc.onPictureDecoded = function (buffer, width, height)
	{
		//console.log("onPictureDecoded: W: " + width + " H: " + height);
		
		// Paint decoded buffer.
		if (!buffer) {
            return;
        }
        var lumaSize = width * height;
        var chromaSize = lumaSize >> 2;

        webGLCanvas.YTexture.fill(buffer.subarray(0, lumaSize));
        webGLCanvas.UTexture.fill(buffer.subarray(lumaSize, lumaSize + chromaSize));
        webGLCanvas.VTexture.fill(buffer.subarray(lumaSize + chromaSize, lumaSize + 2 * chromaSize));
        webGLCanvas.drawScene();
	};
	
	
	/**
	 * SOCKET MESSAGE HANDLERS
	 */
	
	/* VIDEO */
	
	socket.on('DroneVideoFrame', function(data)
	{
		numFramesReceived++;
		console.log('Video frame received: ' + numFramesReceived);
		
		/*
		for (var i = 0; i < 4; i++)
			avc.decode(data.videoData[i]);
		*/
		avc.decode(data.videoData);
	});
	
	/* COMMANDS */
	
	socket.on('CommandAcknowledged', function(data)
	{
		console.log('Command acknowledged: ' + data.command);
		
		// Reset the buttons.
		panLeftButton.css({"background-color":""}).css({"background-color":"#FFFFFF"});
		panRightButton.css({"background-color":""}).css({"background-color":"#FFFFFF"});
		zoomInButton.css({"background-color":""}).css({"background-color":"#FFFFFF"});
		zoomOutButton.css({"background-color":""}).css({"background-color":"#FFFFFF"});
		elevateUpButton.css({"background-color":""}).css({"background-color":"#FFFFFF"});
		elevateDownButton.css({"background-color":""}).css({"background-color":"#FFFFFF"});
		freezeButton.css({"background-color":""}).css({"background-color":"#FFFFFF"});
		
		switch(data.command)
		{
			case 'PanLeft':
				panLeftButton.css({"background-color":""}).css({"background-color":"lightgray"});
				break;
			case 'PanRight':
				panRightButton.css({"background-color":""}).css({"background-color":"lightgray"});
				break;
			case 'ZoomIn':
				zoomInButton.css({"background-color":""}).css({"background-color":"lightgray"});
				break;
			case 'ZoomOut':
				zoomOutButton.css({"background-color":""}).css({"background-color":"lightgray"});
				break;
			case 'ElevateUp':
				elevateUpButton.css({"background-color":""}).css({"background-color":"lightgray"});
				break;
			case 'ElevateDown':
				elevateDownButton.css({"background-color":""}).css({"background-color":"lightgray"});
				break;
			case 'Freeze':
				freezeButton.css({"background-color":""}).css({"background-color":"lightgray"});
				break;
			default:
				break;
		}
	});
});