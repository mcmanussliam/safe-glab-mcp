import { assertAllowed } from "../policy.js";
import { pickStringQuery } from "../util/pick-string-query.js";
import { defineTool, id, json, optionalString, projectPath } from "./shared.js";
export function createPipelineTools({ config, gitlab }) {
    return [
        defineTool("list_pipelines", "List pipelines.", { projectPath, ref: optionalString, status: optionalString, source: optionalString }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "list_pipelines" });
            return json(await gitlab.listPipelines(args.projectPath, pickStringQuery(args, ["ref", "status", "source"])));
        }),
        defineTool("get_pipeline", "Get one pipeline.", { projectPath, pipelineId: id() }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "get_pipeline" });
            return json(await gitlab.getPipeline(args.projectPath, args.pipelineId));
        }),
        defineTool("list_pipeline_jobs", "List jobs for a pipeline.", { projectPath, pipelineId: id() }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "list_pipeline_jobs" });
            return json(await gitlab.listPipelineJobs(args.projectPath, args.pipelineId));
        }),
    ];
}
