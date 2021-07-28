require('dotenv').config();
const express = require('express');
const {Prompter} = require('./Prompter');
const app = express();
const expressPORT = 35004;
let ServerInstance = require('./ServerInstance').ServerInstance;
let Servers = [];
let findServerLoadStep = 10;
let averageLoad = 0;
let startDate = 0;
let prompter = new Prompter();
const MASTERAPIKEY = process.env.MASTERAPIKEY;

let createServer = require('dgramx').createServer;
let addr = `udp://0.0.0.0:${expressPORT}`;
let server = createServer(addr);

StartServer();

function FindBestServerWithLowestLoad(start = 60, iterations = 0) {
    if (averageLoad > start)
        start = averageLoad + findServerLoadStep;

    if (start <= 0 || iterations > 1)
        return false;

    let retServer;
    let actualServerCount = 0;
    let serverLoads = 0;

    for (let i = 0; i < Servers.length; i++) {
        let server = Servers[i];

        if (typeof server === 'undefined') {
            continue;
        }

        if (!server.online) {
            continue;
        }

        if (server.loadLevel !== 101) {
            actualServerCount++;
            serverLoads += server.loadLevel;
        }

        if (server.gamesOpen === 0) {
            continue;
        }

        if (server.loadLevel > start) {
            continue;
        }

        if (typeof retServer === 'undefined')
            retServer = server;
    }
    averageLoad = serverLoads / actualServerCount;

    if (typeof retServer !== 'undefined')
        return retServer;

    if (start >= 100)
        iterations++;

    FindBestServerWithLowestLoad(start + findServerLoadStep, iterations);
}

function StartServer() {
    startDate = Date.now();
    //UDP Server to Server communication
    server.on("listening", function () {

        server.on("relayRegister", function (msg, rinfo) {
            let req = JSON.parse(msg);
            if (req.apikey !== MASTERAPIKEY) {
                return;
            }
            let {IP, PORT, PASS, InstanceID, date} = req;

            if (date < startDate)
                return;

            let serverInstance = Servers[InstanceID];
            if (typeof serverInstance !== 'undefined') {
                if (serverInstance.port !== PORT || serverInstance.ip !== IP) {
                    console.log('Conflict Relay Server same InstanceID', InstanceID, 'ip:port', serverInstance.ip, ':', serverInstance.port, ' with ', IP, ':', PORT);
                    return;
                }
                serverInstance.key = PASS;

                let {ip, port, key, instanceID} = serverInstance;
                let som = {ip, port, key, instanceID};

                SetServerTimeout(serverInstance);
                console.log('Relay Server Updated', JSON.stringify(som));

                //201 Created
                server.to(rinfo.address, rinfo.port);
                server.emit("status", 201);
                return;
            }

            serverInstance = new ServerInstance(IP, PORT, PASS, InstanceID);
            Servers[InstanceID] = serverInstance;

            let {ip, port, key, instanceID} = serverInstance;
            let som = {ip, port, key, instanceID};

            SetServerTimeout(serverInstance);
            console.log('Relay Server Registered', JSON.stringify(som));

            //201 Created
            server.to(rinfo.address, rinfo.port);
            server.emit("status", 201);
        });
        server.on("relayUpdate", function (msg, rinfo) {
            let req = JSON.parse(msg);
            if (req.apikey !== MASTERAPIKEY)
                return;

            let {InstanceID, gamesOpen, totalGames} = req;
            let serverInstance = Servers[InstanceID];
            if (typeof serverInstance === 'undefined') {
                let errID = {InstanceID};
                console.log('Relay Server update request but Relay Server has not registered. Relay Server ID:', errID);
                //410 Gone
                server.to(rinfo.address, rinfo.port);
                server.emit("status", 410);
                return;
            }
            serverInstance.online = true;
            serverInstance.lastPing = Date.now();
            serverInstance.gamesOpen = gamesOpen;
            serverInstance.totalGames = totalGames;
            if (totalGames !== 0)
                serverInstance.loadLevel = (1 - (gamesOpen / totalGames)).toFixed(2) * 100;
            else
                serverInstance.loadLevel = 101;

            SetServerTimeout(serverInstance);

            if (!prompter.ServerOpen) {
                //204 No Content
                server.to(rinfo.address, rinfo.port);
                server.emit("status", 204);
            } else {
                //200 OK
                server.to(rinfo.address, rinfo.port);
                server.emit("status", 200);
            }
        });
    });

    //Express Client to Server communication
    app.use(express.json());
    app.listen(expressPORT);

    app.get('/server', (req, res) => {
        if (!prompter.ServerOpen) {
            //204 No Content
            res.status(204).send({server: null});
            return;
        }
        let server = FindBestServerWithLowestLoad();
        if (typeof server === 'boolean') {
            //206 Partial Content
            res.status(206).send({server: null});
            return;
        }
        let {IP, PORT, key} = server;
        let obj = {IP, PORT, key};
        //200 OK
        res.status(200).send({server: obj});
    });

    function SetServerTimeout(serverInstance) {
        if (serverInstance.timeout) {
            clearTimeout(serverInstance.timeout);
            serverInstance.timeout = null;
        }
        serverInstance.timeout = setTimeout(() => {
            serverInstance.online = false;

            console.log('Relay Server went offline', 'IP: ', serverInstance.ip, 'Port: ', serverInstance.port, 'InstanceID: ', serverInstance.instanceID);
        }, 2000);
    }

    console.log("Server started (type 'start' to allow players to connect 'stop' to not allow players to connect)");
}
