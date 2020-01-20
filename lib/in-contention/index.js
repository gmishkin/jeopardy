import { runInContentionPipeline } from '../dao/scorecards';
import evaluator from './in-contention'

export default async function () {
    return evaluator(await runInContentionPipeline());
}
