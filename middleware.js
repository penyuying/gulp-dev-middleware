
var utils = require('./lib/utils');
var through = require('through2');
var FileShared = require('./lib/FileShared');

var path = require('path'); // 获取路径
var mime = require('mime');
var getFilenameFromUrl = require('./lib/GetFilenameFromUrl');

var pathJoin = require('./lib/PathJoin');

module.exports = function(options) {
    var globeData = utils.extend({
        state: false,
        callbacks: [],
        watching: undefined,
        forceRebuild: false,
        outputPath: '',
        options:{}
    }, options);

    globeData.outputPath = (utils.absPath(globeData.outputPath) || '') + '';

    var fileShared = FileShared(globeData);

    // The middleware function
    function devMiddleware(req, res, next) {
        function goNext() {
            // if (!context.options.serverSideRender) return next();
            // fileShared.ready(function() {
            // res.locals.webpackStats = context.webpackStats;
            if (next instanceof Function) {
                next();
            }
            // }, req);
        }

        if (req.method !== 'GET') {
            return goNext();
        }

        var filename = getFilenameFromUrl('', globeData.outputPath, req.url);
        if (filename === false) return goNext();
        // _destPath=encodeURIComponent(_destPath);//防止名称和取的时候不一样
        filename=decodeURIComponent(filename);
        filename = path.normalize(filename).replace(/\\/g, '/');

        // console.log('filenamefilename:',filename)
        fileShared.handleRequest(filename, processRequest, req);
        /**
         * 读取文件的回调
         *
         * @returns
         */
        function processRequest() {

            // console.log('filename2:',filename);
            // console.log(filename, 'stat');
            try {
                var stat = globeData.fs.statSync(filename);
                if (!stat.isFile()) {
                    if (stat.isDirectory()) {
                        filename = pathJoin(filename, globeData.index || 'index.html');
                        stat = globeData.fs.statSync(filename);
                        if (!stat.isFile()) throw 'next';
                    } else {
                        throw 'next';
                    }
                }
            } catch (e) {
                return goNext();
            }

            // globeData.fs.stat(filename,function(err, targetStat){
            //     console.log('targetStat:',targetStat);
            // });
            // server content
            setTimeout(function() {//页面取到的数据不是最新的
                var content = globeData.fs.readFileSync(filename);
                content = fileShared.handleRangeHeaders(content, req, res);
                res.setHeader('Access-Control-Allow-Origin', '*'); // To support XHR, etc.
                res.setHeader('Content-Type', mime.lookup(filename) + '; charset=UTF-8');
                res.setHeader('Content-Length', content.length);

                //设置成不缓存
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');

                if (globeData.options && globeData.options.headers) {//参数传过来的头信息
                    for (var name in globeData.options.headers) {
                        res.setHeader(name, globeData.options.headers[name]);
                    }
                }
                // Express automatically sets the statusCode to 200, but not all servers do (Koa).
                res.statusCode = res.statusCode || 200;
                if (res.send) res.send(content);
                else res.end(content);
            }, 20);
        }
    }

    /**
     * 加入
     *
     * @param {String} destDir 存放的目录
     */
    function dest(destDir, _options) {
        _options = utils.extend({}, _options);
        var ret = through.obj(function (file, enc, cb) {
            // 如果文件为空，不做任何操作，转入下一个操作，即下一个 .pipe()

            if (file.isNull()) {
                this.push(file);
                return cb();
            }

            // 插件不支持对 Stream 对直接操作，跑出异常
            if (file.isStream()) {
                // this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
                this.push(file);
                return cb();
            }
            // var _filepath = file.path,
            //     _extname = path.extname(_filepath);

            // if (_extname && _extname.toLowerCase() === '.wxss') {
            //     var content = contentHandle(file.contents.toString(), options);
            //     file.contents = new Buffer(content);
            // }

            fileShared.dest(utils.absPath(destDir), file, _options);//存放文件到内存

            // 下面这两句基本是标配啦，可以参考下 through2 的API
            this.push(file);
            cb();
        });

        return ret;
    }
    /**
     * 设置文件存放的根目录
     *
     * @param {String} outputPath 目录路径
     */
    function setOutputPath(outputPath) {
        globeData.outputPath = (utils.absPath(outputPath) || '') + '';
    }

    devMiddleware.dest = dest;
    devMiddleware.setOutputPath = setOutputPath;
    devMiddleware.getFs=fileShared.getFs;
    devMiddleware.compilerDone=function(){
        fileShared.compilerDone(true);
    };
    devMiddleware.watch = function(){
        var _fs=fileShared.getFs();
        _fs.watch.apply(_fs,arguments)
    };
    // devMiddleware.getFilenameFromUrl = getFilenameFromUrl.bind(this, context.options.publicPath, context.compiler.outputPath);
    // devMiddleware.waitUntilValid = shared.waitUntilValid;
    // devMiddleware.invalidate = shared.invalidate;
    // devMiddleware.close = shared.close;
    // devMiddleware.fileSystem = context.fs;
    return devMiddleware;
};
