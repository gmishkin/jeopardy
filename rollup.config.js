import cleanup from 'rollup-plugin-cleanup'

export default {
    input: 'lib/slack-command.js',
    plugins: [
        cleanup({ lineEndings: 'unix' })
    ],
    output: {
        file: 'stitch-app/services/slack/incoming_webhooks/command/source.js',
        format: 'cjs'
    }
}
