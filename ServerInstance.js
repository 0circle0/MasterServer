class ServerInstance {
    constructor(ip, port, key, instanceID) {
        this.ip = ip;
        this.port = port;
        this.key = key;
        this.instanceID = instanceID;
        this.lastPing = Date.now();
        this.timeout;
        this.online = true;
        this.gamesOpen = 0;
        this.totalGames = 0;
        this.loadLevel = 0;
    }
}

module.exports = { ServerInstance };