URL = window.URL || window.webkitURL;

let gumStream; 						//stream from getUserMedia()
let rec; 							//Recorder.js object
let input; 							//MediaStreamAudioSourceNode we'll be recording
let coughHeavyBlob;
// shim for AudioContext when it's not avb. 
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext //audio context to help us record

const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");

//add events to those 2 buttons

function startRecording() {
	console.log("recordButton clicked");

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    const constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/


	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
        $("#recordButton").attr("onclick", "stopRecording()");
        $("#recordButton").html("Stop");
		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device
		*/
		audioContext = new AudioContext();

		/*  assign to gumStream for later use  */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})

		//start the recording process
		rec.record()

		console.log("Recording started");

	}).catch(function(err) {
	  	//enable the record button if getUserMedia() fails
	});
}


function stopRecording() {
	console.log("stopButton clicked");
	//reset button just in case the recording is stopped while paused
	
	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	// blob = rec.exportWAV(createDownloadLink);
	rec.exportWAV(function (blob) {
        coughHeavyBlob = blob;
        const url = URL.createObjectURL(blob);
        $("#heavy-cough").attr("src", url);
    });
    $("#controls").empty();
    $("#controls").append(`
        <button class="btn btn-primary" id="playHeavyCough" onclick="playHeavyCough()">Play</button>
        <button id="recordButton"class="btn btn-primary" onclick="goRecord()">Record Again</button>
    `)
}

function goRecord() {
    $("#controls").empty();
    $("#controls").append(`
    <button id="recordButton"class="btn btn-primary" onclick="startRecording()">Start Record</button>
    <button id="playSampleButton"class="btn btn-primary" onclick="playSample()">Play Sample</button>
`);
}
function createDownloadLink(blob) {
    const url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');
	var link = document.createElement('a');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;
	//save to disk link
	link.href = url;
	link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
	link.innerHTML = "Save to disk";

	//add the new audio element to li
	li.appendChild(au);
	
	//add the filename to the li
	li.appendChild(document.createTextNode(filename+".wav "))

	//add the save to disk link to li
	li.appendChild(link);
	
	//upload link
	var upload = document.createElement('a');
	upload.href="#";
	upload.innerHTML = "Upload";
	upload.addEventListener("click", function(event){
		  var xhr=new XMLHttpRequest();
		  xhr.onload=function(e) {
		      if(this.readyState === 4) {
		          console.log("Server returned: ",e.target.responseText);
		      }
		  };
		  var fd=new FormData();
		  fd.append("audio_data",blob, filename);
		  xhr.open("POST","upload.php",true);
		  xhr.send(fd);
	})
	li.appendChild(document.createTextNode (" "))//add a space in between
	li.appendChild(upload)//add the upload link to li

	//add the li element to the ol
	recordingsList.appendChild(li);
}

function playHeavyCough() {
    const audio = new Audio($("#heavy-cough").attr("src"));
    audio.play();
}


function submit() {
	const age = document.getElementById("age").value;
	if (age == "" || coughHeavyBlob == null || document.getElementById("heavy-cough").duration < 5) {
		alert("Please fill all the fields, record your cough > 5 seconds, your audio is " + document.getElementById("heavy-cough").duration.toFixed(2) + " seconds");
		return;
	}

	const is_return_user =
	  document.getElementById("is_return_user").checked;
	const is_return_user_value = is_return_user ? true : false;
	let data = new FormData();



	const loader = document.querySelector('.page-loader');
	loader.classList.remove('done');

	
	data.append("age", age);
	data.append("is_return_user", is_return_user_value);
	data.append("coughBlob",coughHeavyBlob, "cough.wav");

	var xhr=new XMLHttpRequest();
	xhr.onload=function(e) {
		console.log(this.status)
		if(this.status == 200) {
			loader.classList.add('done');
			result = JSON.parse(e.target.responseText);
			$("#content").empty();
			$("#content").append(`
			<div
			class=""
			style="height: 80vh; position: relative; "
			>
				<div
				style="
					margin: 0;
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					text-align: center;
				"
				>
			  <h1 >Congratulation You are ${result.covid_status}.</h1>
			  <a href="/" class="btn btn-primary">Back to home page</a>
			</div>
		  </div>
			`)
		}
		if (this.status == 400) {
			loader.classList.add('done');
			alert("Server returned: ",e.target.responseText);
		}
		if (this.status == 500) {
			loader.classList.add('done');
			alert("Server returned: ",e.target.responseText);
		}
	};
	xhr.open("POST","http://3.83.124.107/covid_detection",true);
	xhr.send(data);


  }