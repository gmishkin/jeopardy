import cleanup from 'rollup-plugin-cleanup'

import stitchExports from './build/stitch-exports-plugin'

export default {
    input: 'lib/slack-command.js',
    plugins: [
        cleanup({ lineEndings: 'unix' }),
        stitchExports
    ],
    output: {
        file: 'stitch-app/services/slack/incoming_webhooks/command/source.js',
        format: 'cjs'
    }
}
