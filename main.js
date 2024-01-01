let firstNumber;
let secondNumber;
let correctAnswerValue;
let responseMessage;
let secondMaxTotal;
let operator = "+";
let maxTotal = 10;
let pointLimitPercentage = 0.8;
let points = 0;
let currentLevel = 1;
//Interval's
let levelInterval = 40000;
let gameEndTimer = 240000;
let gameRunning = 0;
//IntervalID
let setLevelInterval;
let stopGameTimeout;
//Server config
let serverPort = 3000;
let debugMode = 0; //1 for enabled 0 for disabled
let answerMode = 0; //1 for enabled 0 for disabled (shows the correct answer always)
let godMode = 0; //1 for enabled 0 for disabled (shows the correct answer in the web interface)
let showClientAnswer = 0 //1 for enabled 0 for disabled (show the answer that the client sent back)
const express = require('express');
const { fstat } = require('fs');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
    //index.html
    res.sendFile(__dirname + '/client/index.html');
});

app.get('/choice', (req, res) => {
    gameRunning = 0;
    res.sendFile(__dirname + '/client/choice.html');
    stopGame();
    clearUserData();
})

app.get('/liitmine', (req, res) => {
    //Set correctAnswerValue to use the correct operator and send to arvutus.html
    operator = "+";
    res.sendFile(__dirname + '/client/arvutus.html');
    gameRunning = 1;
});

app.get('/lahutamine', (req, res) => {
    //Set correctAnswerValue to use the correct operator and send to arvutus.html
    operator = "-";
    res.sendFile(__dirname + '/client/arvutus.html');
    gameRunning = 1;
});

server.listen(serverPort, () => {
    console.log('Server started on port', serverPort);
});

io.on('connection', (socket) => {
    
    //Only start math if user is on the correct page (gameRunning = 1)
    console.log("Connection made");
    if (gameRunning == 1) {
        if (debugMode == 1) {console.log("gameset to 1");};
        getNewCalculation();
        io.emit('calculation', { firstNumber: firstNumber, secondNumber: secondNumber, calculationType: operator});
        if (godMode == 1) { io.emit('godModeData', correctAnswerValue); };
        if (debugMode == 1) {console.log(socket.id);};
        //Answers the answer for the calculation
        socket.on('answer', (msg) => {
            if (showClientAnswer == 1) {
                console.log(msg);
            }
            if (msg == correctAnswerValue) {
                calculatePoints(true);
                responseMessage = "Correct answer! You currently have " + points + " points. Current level: " + currentLevel;
            }
            else {
                calculatePoints(false);
                responseMessage = "Incorrect answer! You currently have " + points + " points. Current level: " + currentLevel;
            }
            io.emit('answerCheck', { answerType: responseMessage});
            getNewCalculation();
            io.emit('calculation', { firstNumber: firstNumber, secondNumber: secondNumber, calculationType: operator});
        });
        setLevelInterval = setInterval(setLevel, levelInterval);
        stopGameTimeout = setTimeout(stopGame, gameEndTimer);
        if (debugMode == 1) {console.log("timeout and interval set");};
    }   
});

function getNewCalculation() {
    //Generates correct answer with the correct operator
    if (operator == "+") {
        if (currentLevel == 1 || currentLevel == 2) {
            firstNumber = Math.floor(Math.random() * maxTotal);
            secondMaxTotal = maxTotal - firstNumber;
            secondNumber = Math.floor(Math.random() * secondMaxTotal);
            if (secondNumber < (firstNumber / 2)) {console.info("secondnumber smaller than firstnumber div 2")}
        }
        //Needed for eliminating the calculations from the previous levels
        else if (currentLevel > 2) {
            firstNumber = Math.floor(Math.random() * (maxTotal - (maxTotal * 0.1)) + (maxTotal * 0.1));
            secondMaxTotal = maxTotal - firstNumber;
            secondNumber = Math.floor(Math.random() * (secondMaxTotal - (secondMaxTotal * 0.5)) + (secondMaxTotal * 0.2));
            if (secondNumber < (firstNumber / 2)) {console.info("secondnumber smaller than firstnumber div 2")}
        } //TODO: fix secondMaxRandom being too low (777 - 23)
        correctAnswerValue = firstNumber + secondNumber;
        if (answerMode == 1) {console.log(correctAnswerValue);};
    }
    else if (operator == "-") {
        if (currentLevel == 1 || currentLevel == 2) {
            firstNumber = Math.floor(Math.random() * maxTotal);
            secondNumber = Math.floor(Math.random() * firstNumber);
        }
        //Needed for eliminating the calculations from the previous levels
        else if (currentLevel > 2) {
            firstNumber = Math.floor(Math.random() * (maxTotal - (maxTotal * 0.1)) + (maxTotal * 0.1));
            secondNumber = Math.floor(Math.random() * (firstNumber - (maxTotal * 0.1)) + (maxTotal * 0.1));
        }
        correctAnswerValue = firstNumber - secondNumber;
        if (answerMode == 1) {console.log(correctAnswerValue);};
    }
}

function calculatePoints(correct) {
    //Calculate points (correct = true means that answer was correct and vice versa)
    if (correct == true) {
        if (firstNumber <= maxTotal * 0.1 || secondNumber <= maxTotal * 0.1 ) {
            points += 2;
        }
        else if (correctAnswerValue <= maxTotal * pointLimitPercentage) {
            points += 4;
        }
        else {
            points += 7;
        }
    }
    else {
        points -= 5;
    }
}

function sendErrorInfo(data) {
    //Unused (Error messages)
    io.emit('errorResponse', "ERROR: ", data);
}

function setLevel() {
    //Constantly updates/sets level
    currentLevel += 1;
    switch (currentLevel) {
        case 2:
            maxTotal = 20;
            break;
        case 3:
            maxTotal = 100;
            break;
        case 4:
            maxTotal = 1000;
            break;
        case 5:
            maxTotal = 10000;
            break;
        case 6:
            maxTotal = 100000;
            break;
        default:
            maxTotal = 10;
            currentLevel = 1;
            break;
    }
}

function stopGame() {
    //Ends/Stops the game
    gameRunning = 0;
    clearInterval(setLevelInterval);
    setLevelInterval = 0;
    clearTimeout(stopGameTimeout)
    stopGameTimeout = 0;
    console.log("Cleared timeout and interval data.");
    io.emit('gameEndMessage', { points: points, currentLevel: currentLevel });
}

function clearUserData() {
    //Used to clear user data variables
    points = 0;
    currentLevel = 1;
    gameRunning = 0;
    setLevelInterval = 0;
}