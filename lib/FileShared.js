var utils = require('./utils');
var parseRange = require('range-parser');
var pathIsAbsolute = require('path-is-absolute');
var MemoryFileSystem = require('memory-fs');

var path = require('path'); // 获取路径

module.exports = function FileShared(globeData) {
    var share = {

        /**
         * 设置fs对象
         *
         * @param {String} _destPath 设置存储的路径
         * @returns {Fs} 返回FS对象
         */
        setFs: function(_destPath) {
            if (typeof _destPath === 'string' && !pathIsAbsolute.posix(_destPath) && !pathIsAbsolute.win32(_destPath)) {
                throw new Error('`destPath` needs to be an absolute path or `/`.');
            }

            var fs;
            var isMemoryFs = globeData.fs instanceof MemoryFileSystem;
            if (isMemoryFs) {
                fs = globeData.fs;
            } else {
                fs = new MemoryFileSystem();
            }
            globeData.fs = fs;
            return fs;
        },
        /**
         * 设置返回的报文头
         * 
         * @param {bytes} content 文件内容
         * @param {Object} req 请求信息
         * @param {Object} res 返回信息
         * @returns 
         */
        handleRangeHeaders: function handleRangeHeaders(content, req, res) {
            res.setHeader('Accept-Ranges', 'bytes');
            if (req.headers.range) {
                var ranges = parseRange(content.length, req.headers.range);

                if (ranges == -1) {
                    res.setHeader('Content-Range', 'bytes */' + content.length);
                    res.statusCode = 416;
                }

                if (ranges != -2 && ranges.length === 1) {
                    res.statusCode = 206;
                    var length = content.length;
                    res.setHeader(
                        'Content-Range',
                        'bytes ' + ranges[0].start + '-' + ranges[0].end + '/' + length
                    );

                    content = content.slice(ranges[0].start, ranges[0].end + 1);
                }
            }
            return content;
        },

        handleRequest: function(filename, processRequest, req) {
            try {
                if (globeData.fs.statSync(filename).isFile()) {
                    processRequest();
                    return;
                }
            } catch (e) {
            }
            share.ready(processRequest, req);
        },
        /**
         * 储存文件
         * 
         * @param {String} destPath 储存目录
         * @param {File} _file 文件对象
         */
        dest: function (destPath, _file) {
            var basePath = (utils.absPath(_file.base) || '') + '';//源文件基础目录
            var _filePath = (utils.absPath(_file.path) || '') + '';//源文件路径
            var _destPath = _filePath.replace((new RegExp('(^|\\s)' + basePath, 'g')), (destPath || '') + '');//把源文件路径里的基础目录改成存放目录
            var fs = share.setFs(_destPath);//创建文件目录
            fs.mkdirpSync(path.dirname(_destPath));//写入文件
            fs.writeFileSync(_destPath, _file.contents);//写入文件内容
        },
        /**
         * 读取文件
         * 
         * @param {String} fn 读取文件的回调
         */
        ready: function(fn) {
            fn();
        }
    };
    return share;
};