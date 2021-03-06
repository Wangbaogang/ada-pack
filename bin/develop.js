let File = require("../base/lib/file");
let Path = require("path");
let util = require("./../base/util");
let opn = require("opn");

let connected = false;
let messageQueue = {
    listeners: [],
    subscribe(fn) {
        this.listeners.push(fn);
        return this;
    },
    add(info) {
        this.listeners.forEach(fn => {
            fn(info);
        });
        return this;
    }
};

function runDev() {
    let waitTime = 5000;
    let projectPath = Path.resolve(__dirname, "./../../../");
    let express = require(Path.resolve(projectPath, "./node_modules/express"));
    let packagePath = Path.resolve(projectPath, "./package.json");
    let packageInfo = JSON.parse(new File(packagePath).readSync());
    if (!packageInfo["ada-develop"]) {
        packageInfo["ada-develop"] = {
            port: 8080,
            appPath: "./app/app.js",
            serverPath: "./server.js"
        };
    } else {
        packageInfo["ada-develop"] = Object.assign({
            port: 8080,
            appPath: "./app/app.js",
            serverPath: "./server.js"
        }, packageInfo["ada-develop"]);
    }
    let port = packageInfo["ada-develop"].port;
    let host = "localhost";
    let appPath = Path.resolve(packagePath, "./../", packageInfo["ada-develop"].appPath);
    if (!new File(appPath).isExists()) {
        appPath = Path.resolve(projectPath, "./app.js");
    }
    let appInfo = util.getAppInfo(appPath);
    let distPath = Path.resolve(appPath, "./../", appInfo.dist_path);
    let serverPath = Path.resolve(projectPath, packageInfo["ada-develop"].serverPath);
    let app = null;
    if (!new File(serverPath).isExists()) {
        app = new express();
    } else {
        app = require(serverPath);
    }
    app.use(express.static(distPath));
    app.get("/", (req, res) => {
        res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
    });
    app.use("/ada/sse", (req, res) => {
        connected = true;
        res.writeHead(200, {
            'Connection': 'keep-alive',
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });
        res.write(`retry: ${waitTime}\n`);
        messageQueue.subscribe((info) => {
            res.write("id: " + Date.now() + "\ndata: " + JSON.stringify(info) + "\n\n");
        });
    });
    require("./../index").develop(appPath, ({type, files, map, log}) => {
        messageQueue.add({type, files, map, log});
    }).then(() => {
        app.listen(port, () => {
            console.log("");
            console.log(` ▶ SERVER RUNNING LOCALHOST PORT [: ${port}] `.yellow);
            let desc = `    now try to open the page...`;
            process.stderr.write(desc.grey);
            process.stderr.cursorTo(desc.length);
            let count = waitTime / 1000;
            let num = 0;
            let intevalId = setInterval(() => {
                num += 1;
                process.stderr.clearLine();
                process.stderr.cursorTo(0);
                if (connected) {
                    clearInterval(intevalId);
                    messageQueue.add({type: "reload"});
                    process.stderr.write(`    page is opened,reload it`.grey);
                    process.stderr.write(`\n`);
                } else if (num === count) {
                    clearInterval(intevalId);
                    opn(`http://${host}:${port}`);
                    process.stderr.write(`    can not found opened page,open it`.grey);
                    process.stderr.write(`\n`);
                } else {
                    let rdesc = `    now check [${num}] times ...`;
                    process.stderr.write(rdesc.grey);
                    process.stderr.cursorTo(rdesc.length);
                }
            }, 1000);
        });
    });
}

runDev();