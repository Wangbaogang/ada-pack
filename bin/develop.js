let File = require("../base/lib/file");
let Path = require("path");
let util = require("./../base/util");
let opn = require("opn");

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
    let projectPath = Path.resolve(__dirname, "./../../../");
    let express = require(Path.resolve(projectPath, "./node_modules/express"));
    let packagePath = Path.resolve(projectPath, "./package.json");
    let packageInfo = JSON.parse(new File(packagePath).readSync());
    if (!packageInfo.adaDev) {
        packageInfo.adaDev = {
            port: 8080,
            appPath: "./app/app.js",
            serverPath: "./server.js"
        };
    }
    let port = packageInfo.adaDev.port;
    let host = "localhost";
    let appPath = Path.resolve(packagePath, "./../", packageInfo.adaDev.appPath);
    if (!new File(appPath).isExists()) {
        appPath = Path.resolve(projectPath, "./app.js");
    }
    let appInfo = util.getAppInfo(appPath);
    let distPath = Path.resolve(appPath, "./../", appInfo.dist_path);
    let serverPath = Path.resolve(projectPath, packageInfo.adaDev.serverPath);
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
        res.writeHead(200, {
            'Connection': 'keep-alive',
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });
        res.write("retry: 10000\n");
        messageQueue.subscribe((info) => {
            res.write("id: " + Date.now() + "\ndata: " + JSON.stringify(info) + "\n\n");
        });
    });
    require("./../index").develop(appPath, ({type, files, map}) => {
        messageQueue.add({type, files, map});
    }).then(() => {
        app.listen(port, () => {
            console.log("");
            console.log(` SERVER RUNNING LOCALHOST PORT [: ${port}] ▶`.yellow);
            opn(`http://${host}:${port}`);
        });
    });
}
runDev();