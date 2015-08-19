/**
 *
 * server.js
 * Node.js Server
 *
 */

var app = require('http').createServer(handler),
	io = require('socket.io')(app),
	static = require('node-static'),
	fs = new static.Server('../DVC-DesktopClient-Web/'),
	filesystem = require('fs'),
	PeerServer = require('peer').PeerServer,
	server = PeerServer({port: 9001, path: '/dvc'});

// If the URL of the server is opened in a browser.
function handler(request, response)
{
	request.addListener('end', function() {
		fs.serve(request, response);
	}).resume();
}

app.listen(8081);

var serverStartedDate = Date.now();
console.log('Server started. [' + (new Date()).toString() + ']');


/* PEER */
var mobileClientPeerID;
var desktopClientPeerID;

/* CLIENT SOCKET SESSION IDs */
var mobileClientSocketSessionID = null;
var desktopClientSocketSessionID = null;
var investigatorClientSocketSessionID = null;

/* DRONE STATUSES */
var droneConnectionState = 0;
var droneBatteryPercentage = 0;
var droneCameraPosition = {
	'pan': 0,
	'tilt': 0
};

/* DRONE SEQUENTIAL PHOTO TIMELINE */
var numTimelinePhotosReceived = 0;

/* DRONE VIDEO */
var droneVideoWriteStream = filesystem.createWriteStream('DroneVideo_' + serverStartedDate + '.264');	// file containing the raw H.264 drone video stream from the mobile client

/* MANUAL OVERRIDE */
var manualOverrideState = 0;

/* LOG FILE */
var logFileWriteStream = filesystem.createWriteStream('LogFile_' + serverStartedDate + '.txt');	// log file of actions taken by users
var logStarted = new Date();

/* OTHER */
var mcCurrentTab = 'Disconnected';


io.sockets.on('connection', function(socket)
{	
	var clientAddress = socket.request.connection.remoteAddress;

	console.log('A client (' + clientAddress + ') connected [' + (new Date()).toString() + ']');

	var clientType;

	socket.on('disconnect', function()
	{
		console.log(clientType + ' client (' + clientAddress + ') disconnected [' + (new Date()).toString() + ']');
		io.sockets.emit('ClientDisconnect', clientType);

		if (clientType == 'Desktop')
		{
			desktopClientSocketSessionID = null;
		}
		else if (clientType == 'Mobile')
		{
			mobileClientSocketSessionID = null;

			droneConnectionState = 0;
			console.log('DroneConnectionUpdate: ' + droneConnectionState + ' [' + (new Date()).toString() + ']');
			socket.broadcast.emit('DroneConnectionUpdate', droneConnectionState);

			droneBatteryPercentage = 0;
			console.log('DroneBatteryUpdate: ' + droneBatteryPercentage + '% [' + (new Date()).toString() + ']');
			socket.broadcast.emit('DroneBatteryUpdate', droneBatteryPercentage);

			droneCameraPosition = {
				'pan': 0,
				'tilt': 0
			};
			console.log('DroneCameraUpdate: pan: ' + droneCameraPosition['pan'] + ', tilt: ' + droneCameraPosition['tilt'] + ' [' + (new Date()).toString() + ']');
			socket.broadcast.emit('DroneCameraUpdate', droneCameraPosition);

			mcCurrentTab = 'Disconnected';
			console.log('MCTabToggle: ' + mcCurrentTab + ' [' + (new Date()).toString() + ']');
			logFileWriteStream.write(Date.now() - logStarted + ': MCTabToggle: ' + mcCurrentTab + ' [' + (new Date()).toString() + ']\n');
			socket.broadcast.emit('MCTabToggle', mcCurrentTab);
		}
		else if (clientType == 'Investigator')
		{
			investigatorClientSocketSessionID = null;

			manualOverrideState = 0;
			io.sockets.emit('ManualOverrideStateChanged', manualOverrideState);
		}
	});


	socket.emit('DroneConnectionUpdate', droneConnectionState);
	socket.emit('DroneBatteryUpdate', droneBatteryPercentage);
	socket.emit('DroneCameraUpdate', droneCameraPosition);
	socket.emit('ManualOverrideStateChanged', manualOverrideState);
	socket.emit('MCTabToggle', mcCurrentTab);
	
	
	/**
	 * SOCKET MESSAGE HANDLERS
	 */
	
	/* DEBUGGING */
	
	socket.on('Echo', function(data)
	{
		console.log(data + '[' + (new Date()).toString() + ']');
	});
	
	
	/* CONNECTION */
	
	socket.on('MobileClientConnect', function(data)
	{
		if (mobileClientSocketSessionID == null)
		{
			mobileClientSocketSessionID = socket.id;
			console.log('Mobile client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Mobile';
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized mobile client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});
	
	socket.on('DesktopClientConnect', function(data)
	{
		if (desktopClientSocketSessionID == null)
		{
			desktopClientSocketSessionID = socket.id;
			console.log('Desktop client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Desktop';
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized desktop client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});

	socket.on('InvestigatorClientConnect', function(data)
	{
		if (investigatorClientSocketSessionID == null)
		{
			investigatorClientSocketSessionID = socket.id;
			console.log('Investigator client connected (' + clientAddress + ') [' + (new Date()).toString() + ']');
			clientType = 'Investigator';
		}
		else
		{
			socket.disconnect('unauthorized');
			console.log('Unauthorized investigator client (' + clientAddress + ') tried to connect [' + (new Date()).toString() + ']');
		}
	});


	/* PEER */

	socket.on('MobileClientPeerID', function(data)
	{
		console.log('MobileClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		mobileClientPeerID = data;
		trySendCallCommand();
	});
	
	socket.on('DesktopClientPeerID', function(data)
	{
		console.log('DesktopClientPeerID: ' + data + ' [' + (new Date()).toString() + ']');

		desktopClientPeerID = data;
		trySendCallCommand();
	});

	function trySendCallCommand()
	{
		if (desktopClientPeerID && mobileClientPeerID)
		{
			io.sockets.emit('CallCommand', mobileClientPeerID);
		}
	}


	/* DRONE STATUSES AND UPDATES */

	socket.on('DroneConnectionUpdate', function(data)
	{
		console.log('DroneConnectionUpdate: ' + data + ' [' + (new Date()).toString() + ']');
		
		droneConnectionState = data;
		socket.broadcast.emit('DroneConnectionUpdate', droneConnectionState);
	});

	socket.on('DroneBatteryUpdate', function(data)
	{
		console.log('DroneBatteryUpdate: ' + data + '% [' + (new Date()).toString() + ']');
		
		droneBatteryPercentage = data;
		socket.broadcast.emit('DroneBatteryUpdate', droneBatteryPercentage);
	});

	socket.on('DroneCameraUpdate', function(data)
	{
		console.log('DroneCameraUpdate: pan: ' + data['pan'] + ', tilt: ' + data['tilt'] + ' [' + (new Date()).toString() + ']');
		
		droneCameraPosition = data;
		socket.broadcast.emit('DroneCameraUpdate', droneCameraPosition);
	});
	
	
	/* DRONE VIDEO */
	
	socket.on('DroneVideoFrame', function(data)
	{
		droneVideoWriteStream.write(data);
		if (desktopClientSocketSessionID != null && io.sockets.connected[desktopClientSocketSessionID] != undefined)
		{
			io.sockets.connected[desktopClientSocketSessionID].emit('DroneVideoFrame', data);
		}
	});
	
	
	/* COMMANDS */
	
	socket.on('Command', function(data)
	{
		console.log('Command: ' + data + ' [' + (new Date()).toString() + ']');

		logFileWriteStream.write(Date.now() - logStarted + ': Command: ' + data + ' [' + (new Date()).toString() + ']\n');

		socket.broadcast.emit('Command', data);
	});


	/* INVESTIGATOR COMMANDS */

	socket.on('InvestigatorCommand', function(data)
	{
		console.log('InvestigatorCommand: ' + data + ' [' + (new Date()).toString() + ']');

		if (data == 'Takeoff')
		{
			logFileWriteStream.write(Date.now() - logStarted + ': TAKEOFF -- resetting millisecond count to 0. [' + (new Date()).toString() + ']\n');
			logStarted = new Date();
		}

		socket.broadcast.emit('InvestigatorCommand', data);
	});


	/* MANUAL OVERRIDE */

	socket.on('ManualOverrideStateRequestChange', function(data)
	{
		console.log('ManualOverrideStateRequestChange: ' + data + ' [' + (new Date()).toString() + ']');
		manualOverrideState = data;
		io.sockets.emit('ManualOverrideStateChanged', manualOverrideState);
	});

	socket.on('ManualOverrideCommand', function(data)
	{
		// Relay command if manual override is turned on.
		if (manualOverrideState)
		{
			console.log('ManualOverrideCommand: ' + data + ' [' + (new Date()).toString() + ']');

			socket.broadcast.emit('ManualOverrideCommand', data);
		}
	});

	
	/* DRONE SEQUENTIAL PHOTO TIMELINE */

	socket.on('DronePhoto', function(data)
	{
		console.log('DronePhoto: ' + numTimelinePhotosReceived + ' [' + (new Date()).toString() + ']');

		filesystem.writeFile("./timelinePhotos/test" + numTimelinePhotosReceived++ + ".jpg", data, function(error)
		{
			if (error)
			{
		        return console.log(error);
		    }

		    console.log('The file was saved! [' + (new Date()).toString() + ']');
		});

		if (desktopClientSocketSessionID != null && io.sockets.connected[desktopClientSocketSessionID] != undefined)
		{
			io.sockets.connected[desktopClientSocketSessionID].emit('DronePhoto', data);
		}
	});


	/* OTHER */

	socket.on('MCTabToggle', function(data)
	{
		console.log('MCTabToggle: ' + data + ' [' + (new Date()).toString() + ']');

		logFileWriteStream.write(Date.now() - logStarted + ': MCTabToggle: ' + data + ' [' + (new Date()).toString() + ']\n');
		
		mcCurrentTab = data;
		socket.broadcast.emit('MCTabToggle', mcCurrentTab);
	});

	socket.on('MCCameraSwap', function(data)
	{
		console.log('MCCameraSwap: ' + data + ' [' + (new Date()).toString() + ']');
		logFileWriteStream.write(Date.now() - logStarted + ': MCCameraSwap: ' + data + ' [' + (new Date()).toString() + ']\n');
	});

	socket.on('MCVideoChatSwapMainViews', function(data)
	{
		console.log('MCVideoChatSwapMainViews: ' + data + ' [' + (new Date()).toString() + ']');
		logFileWriteStream.write(Date.now() - logStarted + ': MCVideoChatSwapMainViews: ' + data + ' [' + (new Date()).toString() + ']\n');
	});

	socket.on('MCOrientationChange', function(data)
	{
		console.log('MCOrientationChange: ' + data + ' [' + (new Date()).toString() + ']');
		logFileWriteStream.write(Date.now() - logStarted + ': MCOrientationChange: ' + data + ' [' + (new Date()).toString() + ']\n');
	});
});
