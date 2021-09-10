//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

'use strict';

var _app = null;

//--------------------------------------------------------------------------------------------
var App = function ()
{
    this.self = this;

    //
    // objects
    this.controls = null;
    this.websocket = null;
    this.ttsSupported = false;
    this.voices = [];
    this.voice = null;

    this.isTTSIdle = true;
    this.queue = [];
    this.processingData = null;
    this.currentWordIndex = -1;
}
//--------------------------------------------------------------------------------------------

App.prototype.constructor = App;

//--------------------------------------------------------------------------------------------
App.prototype.initialize = function initApp()
{
    this.controls = new UIControls(this);
    if (this.controls == null) {
        console.error("Failed to create UI controls object.");
        return;
    }

    this.controls.initialize();

    this.setupWebSocket();
    this.setupTTS();
}
//--------------------------------------------------------------------------------------------
App.prototype.setupWebSocket = function ()
{
    var host = "ws://" + location.hostname + ":" + location.port + "/ws";

    this.webSocketConnected = false;

    try {
        this.reportStatus('Connecting to "' + host + '"...');

        this.webSocket = new WebSocket(host);

        this.webSocket.onopen = this.onWebSocketOpen.bind(this);
        this.webSocket.onclose = this.onWebSocketClose.bind(this);
        this.webSocket.onmessage = this.onWebSocketMessage.bind(this);
        this.webSocket.onerror = this.onWebSocketError.bind(this);
    }
    catch (exception) {
        this.reportStatus('WebSocket: exception');
        if (window.console)
            console.log(exception);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.setupTTS = function ()
{
    var scope = this;

    this.lblTTSPhrase = document.getElementById('ttsPhrase');

    if (!('speechSynthesis' in window)) {
        this.reportStatus('<span style = "color: red;">Your browser <strong>does not support</strong> speech synthesis.</span>');
        return;
    }

    // load voices
    scope.loadVoices();

    // Chrome loads voices asynchronously.
    window.speechSynthesis.onvoiceschanged = function (e) {
        scope.loadVoices();
    };

    this.ttsSupported = true;
}
//--------------------------------------------------------------------------------------------
App.prototype.loadVoices = function ()
{
    var scope = this;
    var synthesis = window.speechSynthesis;

    this.voices = [];

    // Fetch the available voices.
    var voices = synthesis.getVoices();

    // Loop through each of the voices.
    voices.forEach(function (voice, i) {
        scope.voices.push(voice.name);
    });

    this.voice = null;

    if (this.voices.length > 2) {
        this.voice = synthesis.getVoices().filter(function (voice) { return voice.name == scope.voices[2]; })[0];
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onTTSStart = function (event)
{
    this.isTTSIdle = false;

    if (this.lblTTSPhrase) {
        this.lblTTSPhrase.innerHTML = event.utterance.text;
    }

    this.monitorTTSProgress("start", event);
}
//--------------------------------------------------------------------------------------------
App.prototype.onTTSBoundary = function (event)
{
    if (this.lblTTSPhrase) {
        var str = event.utterance.text;
        var html = str.substring(0, event.charIndex) + "<strong>" + str.substring(event.charIndex, event.charIndex + event.charLength) + "</strong>" + str.substring(event.charIndex + event.charLength);
        this.lblTTSPhrase.innerHTML = html;
    }

    this.monitorTTSProgress("boundary", event);
}
//--------------------------------------------------------------------------------------------
App.prototype.onTTSEnd = function (event)
{
    if (this.lblTTSPhrase) {
        this.lblTTSPhrase.innerHTML = event.utterance.text;
    }

    this.monitorTTSProgress("end", event);

    this.processingData = null;
    this.isTTSIdle = true;

    //
    // check for more
    this.processQueue();
}
//--------------------------------------------------------------------------------------------
App.prototype.onTTSMark = function (event)
{
}
//--------------------------------------------------------------------------------------------
App.prototype.onTTSError = function (event)
{
    this.processingData = null;
    this.isTTSIdle = false;

    console.log('An error has occurred with the speech synthesis: ' + event.error);

    this.reportStatus('<span style = "color: red;">Speech Synthesis Error: ' + event.error + '</span>');

    var msg = JSON.stringify({ msgType: "ttsStatus", "ttsStatus": { "status": "error", "error": "" + event.error } });

    this.sendWSMessage(msg);
}
//--------------------------------------------------------------------------------------------
App.prototype.doneInitializing = function ()
{
}
//--------------------------------------------------------------------------------------------
App.prototype.reportStatus = function (msg)
{
    if (this.controls)
        this.controls.reportStatus(msg);
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketOpen = function()
{
    this.webSocketConnected = true;
    this.reportStatus('WebSocket: connection opened.');
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketClose = function (event)
{
    var reason = "";

    //
    // only error code 1006 is dispatched: https://www.w3.org/TR/websockets/#concept-websocket-close-fail
    //
    if (event.code == 1000)
        reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
    else if (event.code == 1001)
        reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
    else if (event.code == 1002)
        reason = "An endpoint is terminating the connection due to a protocol error";
    else if (event.code == 1003)
        reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
    else if (event.code == 1004)
        reason = "Reserved. The specific meaning might be defined in the future.";
    else if (event.code == 1005)
        reason = "No status code was actually present.";
    else if (event.code == 1006) {
        reason = "The connection with the server was closed.";
    } else if (event.code == 1007)
        reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
    else if (event.code == 1008)
        reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
    else if (event.code == 1009)
        reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
    else if (event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
        reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
    else if (event.code == 1011)
        reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
    else if (event.code == 1015)
        reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
    else
        reason = "Unknown reason";

    this.reportStatus('WebSocket: <span style = "color: red;">' + reason + '</span>');

    window.alert('WebSocket: ' + reason);

    this.webSocketConnected = false;

    if (this.controls) {
        this.controls.DisableAllControls();
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketMessage = function (event)
{
    if (typeof event === "undefined" || typeof event.data !== "string")
        return;

    var data = JSON.parse(event.data);

    if (data.msgType == 'initialization') {
        if (this.controls) {
            this.controls.initializeGestureLibrary(data.initialization);
        }
    } else if (data.msgType == 'w2v') {
        this.processW2V(data.w2v);
    } else {
        console.log("onWebSocketMessage: unhandled data type '" + data.msgType + "'.");
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketError = function (event)
{
    this.reportStatus('<span style = "color: red;">WebSocket Error: ' + event.data + '</span>');
}
//--------------------------------------------------------------------------------------------
App.prototype.sendWSMessage = function (msg)
{
    if (this.webSocket == null)
        return;

    if (this.webSocketConnected) {
        this.webSocket.send(msg);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.processW2V = function (data)
{
    var phrase = data['phrase'];
    var wordList = data['wordList'];
    var gestureName = data['gestureName'];
    var scores = data['scores'];
    var triggerWordNum = parseInt(data['triggerWordNum']);

    var len = wordList.length;
    var info = "phrase: <span style=\"color: black; background-color: white;\">&nbsp;";
    var nnbs = "&#8239;"; // narrow no-break space

    for (var i = 0; i < len; i++) {
        var word = wordList[i];
        var score = scores[i];
        var txtColor = (score < 0.3) ? "RGB(0,0,0)" : "RGB(255, 255, 255)";
        var bkColor = (score < 0.3) ? "RGB(255, 255, 255)" : "#12bc00";

        if (score > 0)
            word = '<div class="tooltip" style="color: ' + txtColor + '; background-color: ' + bkColor + ';">' + nnbs + word + nnbs + '<span class="tooltiptext">' + score.toFixed(3) + '</span></div>';

        info = info + word + nnbs;
    }

    info = info + "</span>";
    info = info + "&nbsp, trigger: '" + wordList[triggerWordNum] + "', gesture: '" + gestureName + "'";

    if (this.controls)
        this.controls.reportStatus(info);

    this.queue.push(data);

    if (this.isTTSIdle)
        this.processQueue();
}
//--------------------------------------------------------------------------------------------
App.prototype.processQueue = function ()
{
    if (this.queue.length == 0)
        return;

    //
    // remove and prcess first entry...
    this.processingData = this.queue[0];
    this.queue.splice(0, 1);

    var data = this.processingData;
    var phrase = data['phrase'];
    var gestureName = data['gestureName'];

    //
    // load the gesture ahead of time so it is ready to go...
    if (typeof gestureName != 'undefined') {
        this.loadGesture(gestureName);
    }

    this.sayThis(phrase);
}
//--------------------------------------------------------------------------------------------
App.prototype.monitorTTSProgress = function (status, event)
{
    var phrase = event.utterance.text;
    var charIndex = parseInt(event.charIndex);
    var charLength = parseInt(event.charLength);
    var time = event.elapsedTime;

    var data = this.processingData;
    var phrase = data['phrase'];
    var wordList = data['wordList'];
    var gestureName = data['gestureName'];
    var scores = data['scores'];
    var triggerWordNum = parseInt(data['triggerWordNum']);

    var charEnd = (charIndex + charLength);
    var currentWord = phrase.substring(charIndex, charEnd).toLowerCase();

    if (typeof gestureName === 'undefined')
        return;

    if (status == "start")
        this.currentWordIndex = -1;

    if (["", ",", ".", "-", ";", ":", "/", "?", "!", "(", ")"].indexOf(currentWord) >= 0) {
        // skipping...
        return;
    }

    if (status == "boundary") {
        //
        // find the next matching word
        var startIdx = this.currentWordIndex + 1;
        var fFoundWord = false;
        var numWords = wordList.length;

        while (startIdx < numWords) {
            var word = wordList[startIdx].toLowerCase();

            if (word == currentWord) {
                fFoundWord = true;
                break;
            }

            startIdx++;
        }

        if (fFoundWord) {
            this.currentWordIndex = startIdx;

            if (triggerWordNum == this.currentWordIndex) {
                this.playGesture(gestureName);
            }
        } else
            console.log("ERROR: the spoken word '" + word + "' was not found in the original phrase! Ignoring...");
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.loadGesture = function (gestureName)
{
    var msg = JSON.stringify({ msgType: "loadGesture", "gesture": gestureName });

    this.sendWSMessage(msg);
}
//--------------------------------------------------------------------------------------------
App.prototype.playGesture = function (gestureName)
{
    var msg = JSON.stringify({ msgType: "playGesture", "gesture": gestureName });

    this.sendWSMessage(msg);
}
//--------------------------------------------------------------------------------------------
App.prototype.sayThis = function (phrase)
{
    var synthesis = window.speechSynthesis;
    var utterance = new SpeechSynthesisUtterance(phrase);

    // set utterance properties
    utterance.voice = this.voice;
    utterance.pitch = 0.6;  // 0 to 2
    utterance.rate = 0.6;   // 0.1 to 10
    utterance.volume = 0.8; // 0 to 1

    utterance.onstart = this.onTTSStart.bind(this);
    utterance.onend = this.onTTSEnd.bind(this);
    utterance.onboundary = this.onTTSBoundary.bind(this);
    utterance.onmark = this.onTTSMark.bind(this);
    utterance.onerror = this.onTTSError.bind(this);

    // speak the utterance
    synthesis.speak(utterance);

    this.isTTSIdle = false;
}
//--------------------------------------------------------------------------------------------
