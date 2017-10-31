
var pathIsAbsolute = require('path-is-absolute');
var path = require('path'); // 获取路径

module.exports = {
    absPath: absPath,
    extend: extend
};

/**
* 合并对象
* @global
* @param {Object} defaultObj 默认的对象
* @param {Object} addobj 要合并的对象
* @return {Object} 返回修改值后的默认对象
*/
function extend(defaultObj, addobj) { // 合并对象
    if (!addobj) {
        return defaultObj;
    }
    defaultObj = defaultObj || {};
    for (var item in addobj) {
        if (addobj[item]) {
            defaultObj[item] = addobj[item];
        }
    }
    return defaultObj;
}

/**
 * 相对路径转成绝对路径
 *
 * @param {String} dir 需要转换的路径
 * @returns {String} 已转换好的路径
 */
function absPath(dir) {
    var res = dir;

    if (!dir) {
        return res;
    }
    if (typeof dir === 'string' && !pathIsAbsolute.posix(dir) && !pathIsAbsolute.win32(dir)) { //相对路径转绝对路径
        res = path.normalize(path.join(process.cwd(), dir)).replace(/\\/g, '/');
    } else {
        res = path.normalize(dir).replace(/\\/g, '/');
    }
    return res;
}