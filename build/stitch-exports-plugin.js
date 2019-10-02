const MODULE_ACCESS_LENGTH = 'module.'.length;

export default {
    name: 'stitch-exports-plugin',
    renderChunk: function (code, chunk, options) {
        if (options.format !== 'cjs') {
            this.error('Plugin only supposed CommonJS output');
        }
        else {
            const b = Buffer.from(code);
            const lastLinePosition = b.lastIndexOf('\n', b.length - 2) + 1;
            const exportsStatement = b.toString('utf8', lastLinePosition + MODULE_ACCESS_LENGTH);
            b.write(exportsStatement, lastLinePosition);
            return b.toString('utf8', 0, b.length - MODULE_ACCESS_LENGTH);
        }
    }
};
