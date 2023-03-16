URL = window.URL || window.webkitURL;
const jsondata = {
	age: 0,
	gender: 'male',
	smoker: 'y',
	vaccination_dose: 'no doses',
	cold: false,
	cough: false,
	fever: false,
	diarrhoea: false,
	sore_throat: false,
	loss_of_smell: false,
	muscle_pain: false,
	fatigue: false,
	breathing_difficulties: false,
	pneumonia: false,
	asthma: false,
	chronic_lung_disease: false,
	others_resp: false,
	hypertension: false,
	ischemic_heart_disease: false,
	diabetes: false,
	others_preexist: false,
}

let recordings = {
	"breathing-shallow": null,
	"breathing-deep": null,
	"cough-shallow": null,
	"cough-heavy": null,
	"vowel-a": null,
	"vowel-e": null,
	"vowel-o": null,
	"counting-normal": null,
	"counting-fast": null,
};
// object key recordings

let recordingsKey = Object.keys(recordings);
let gumStream; 						//stream from getUserMedia()
let rec; 							//Recorder.js object
let input; 							//MediaStreamAudioSourceNode we'll be recording
let coughHeavyBlob;
// shim for AudioContext when it's not avb. 
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext //audio context to help us record


function startRecording(audio_name, index, hint) {
	console.log("recordButton clicked");

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/

	const constraints = { audio: true, video: false }

	/*
	  Disable the record button until we get a success or fail from getUserMedia() 
  */


	/*
		We're using the standard promise based getUserMedia() 
		https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {

		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
		$(`#${audio_name}-controls`).empty();
		$(`#${audio_name}-controls`).append(`
			<p>${hint}</p>
			<button class="btn btn-primary" id="stop-${audio_name}" onclick="stopRecording('${audio_name}', ${index}, '${hint}')">Stop Recording</button>
		`)
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
		rec = new Recorder(input, { numChannels: 1 })

		//start the recording process
		rec.record()


		console.log("Recording started");

	}).catch(function (err) {
		//enable the record button if getUserMedia() fails
	});
}


function stopRecording(audio_name, index, hint) {
	console.log("stopButton clicked");
	//reset button just in case the recording is stopped while paused

	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	rec.exportWAV(function (blob) {
		coughHeavyBlob = blob;
		recordings[audio_name] = blob;
		const url = URL.createObjectURL(blob);
		$(`#${audio_name}`).attr("src", url);
	});
	$(`#${audio_name}-controls`).empty();
	$(`#${audio_name}-controls`).append(`
		<p>${hint}</p>
        <button class="btn btn-primary" id="playRecordedAudio" onclick="playRecordedAudio('${audio_name}')">Play</button>
        <button id="recordButton"class="btn btn-primary" onclick="saveAudio('${audio_name}', ${index + 1})">Save</button>
        <button id="recordButton"class="btn btn-primary" onclick="goRecord('${audio_name}', ${index}, '${hint}')">Record Again</button>
    `)
}
function saveAudio(audio_name, nextAudioIndex) {
	console.log(recordings)
	$(`#${audio_name}-title`).addClass("text-success");

	$(`#${audio_name}-controls`).hide();
	$(`#${recordingsKey[nextAudioIndex]}-controls`).show();
}

function goRecord(audio_name, index, hint) {
	$(`#${audio_name}-controls`).empty();
	$(`#${audio_name}-controls`).append(`
	<p>${hint}</p>
    <button id="recordButton"class="btn btn-primary" onclick="startRecording('${audio_name}', ${index}, '${hint}')">Start Record</button>
    <button id="playSampleButton"class="btn btn-primary" onclick="playSample('sample-${audio_name}')">Play Sample</button>
`);
}

function playRecordedAudio(audio_name) {
	const audio = new Audio($(`#${audio_name}`).attr("src"));
	audio.play();
}

function dataChange(inputname) {
	value = $(`input[name='${inputname}']`).val();
	jsondata[inputname] = value;
}

function submit() {
	if (Object.values(recordings).includes(null) || jsondata.age <= 0) {
		alert("Please record all the audio samples and fill in your age");
		return;
	}

	console.log(jsondata)
	let formData = new FormData();

	const loader = $('.page-loader');
	console.log(loader)
	loader.removeClass('done');
	$(".page-loader").append(`
		<h1 style="
		position: absolute;
		top: 40%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		color: #f78b77;
	">AI Is Analyzing</h1>
	`);
	for (var key in jsondata) {
		formData.append(key, jsondata[key]);
	}
	for (var key in recordings) {
		formData.append(key.replace("-", ""), recordings[key], `${key}.wav`);
	}


	var xhr = new XMLHttpRequest();
	xhr.onload = function (e) {
		console.log(this.status)
		if (this.status == 200) {
			result = JSON.parse(e.target.responseText);
			message = result.message;
			$("#content").empty();
			$("#content").append(`
			<div
			class=""
			style="height: 85vh; position: relative; "
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
			  <h1>${message}</h1>
			  <p>Our recommended online clinic - <a href="https://www.doctoroncall.com.my/">DoctorOnCall</a></p>
			  <a href="/" class="btn btn-primary">Go Back Home</a>
			</div>
			 </div>
			`)
		}
		if (this.status == 400) {
			alert("Server returned: ", e.target.responseText);
		}
		if (this.status == 500) {
			alert("Server error: 500, try again or contact 010-9361029 for help");
		}
		loader.addClass('done');
	};
	xhr.open("POST", "https://api.leadinghao.me/covid_detection", true);
	xhr.send(formData);
}

function playSample(sampleHTMLId) {
	const audio = new Audio($(`#${sampleHTMLId}`).attr("src"));
	audio.play();
}