let File = require("../base/lib/file");
let Path = require("path");
let adaSSE = require("./../sse/index");
let util = require("./../base/util");

function runDev() {
    let projectPath = Path.resolve(__dirname, "./../../../");
    let express = require(Path.resolve(projectPath, "./node_modules/express"));
    let packagePath = Path.resolve(projectPath, "./package.json");
    let package = JSON.parse(new File(packagePath).readSync());
    if (!package.adaDev) {
        package.adaDev = {
            port: 8080,
            appPath: "./app/app.js"
        };
    }
    let port = package.adaDev.port;
    let appPath = Path.resolve(packagePath, "./../", package.adaDev.appPath);
    if (!new File(appPath).isExists()) {
        appPath = Path.resolve(projectPath, "./app.js");
    }
    let appInfo = util.getAppInfo(appPath);
    let distPath = Path.resolve(appPath, "./../", appInfo.dist_path);
    let app = new express();
    app.use(express.static(distPath));
    app.get("/", (req, res) => {
        res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
    });
    app = adaSSE(app);
    app.listenDev(appPath, port);
};
runDev();