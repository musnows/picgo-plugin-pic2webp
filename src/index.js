"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const webp_converter_1 = __importDefault(require("webp-converter"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PLUGIN_NAME = 'webp';
var webps = [];
/**
 * @description: 改变文件路径后缀名
 * @return {string}
 * @param {string} filepath
 * @param {string} outExt
 */
const changeExt = (filepath, outExt) => {
    const fp = path_1.default.normalize(filepath);
    const pathObj = path_1.default.parse(fp);
    pathObj.ext = outExt;
    delete pathObj.base;
    return path_1.default.format(pathObj);
};
const beforeTransformPlugins = {
    async handle(ctx) {
        const uploads = [];
        try {
            for (const ifile of ctx.input) {
                if (path_1.default.extname(ifile) === '.webp') {
                    webps.push(ifile)
                    uploads.push(ifile);
                    continue;
                }
                const ofile = changeExt(ifile, '.webp');
                await webp_converter_1.default.cwebp(ifile, ofile, '-q 80', '-v');
                uploads.push(ofile);
            }

            ctx.input = uploads;
            return ctx;
        } catch (error) {
            ctx.log.error(error);
            ctx.emit('notification', {
                title: '转webp错误',
                body: error.message || error
            });
        }
    }
};

const afterUploadPlugins = {
    handle(ctx) {
        ctx.input.forEach((p) => {
            try {
                if (!webps.includes(p)) {
                    fs_1.default.unlinkSync(p);
                }
            } catch (err) {
                ctx.log.error(`Error deleting file ${p}:`, err.message || err);
            }
        });
    }
};

module.exports = (ctx) => {
    const register = () => {
		webps = [];
        ctx.helper.beforeTransformPlugins.register(PLUGIN_NAME, beforeTransformPlugins);
        ctx.helper.afterUploadPlugins.register(PLUGIN_NAME, afterUploadPlugins);
    };
    return {
        register
    };
};
