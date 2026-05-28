import { readFileSync } from "node:fs";
import { z } from "zod";
const booleanFlag = z.boolean();
const permissionsSchema = z
    .object({
    branches: z
        .object({
        list: booleanFlag,
        get: booleanFlag,
        create: booleanFlag,
    })
        .strict(),
    mergeRequests: z
        .object({
        list: booleanFlag,
        get: booleanFlag,
        create: booleanFlag,
        comment: booleanFlag,
    })
        .strict(),
    issues: z
        .object({
        list: booleanFlag,
        get: booleanFlag,
        create: booleanFlag,
        update: booleanFlag,
        delete: booleanFlag,
        comment: booleanFlag,
    })
        .strict(),
    metadata: z
        .object({
        labels: booleanFlag,
        milestones: booleanFlag,
        users: booleanFlag,
    })
        .strict(),
    pipelines: z
        .object({
        list: booleanFlag,
        get: booleanFlag,
        jobs: booleanFlag,
    })
        .strict(),
    repository: z
        .object({
        readFiles: booleanFlag,
        readTree: booleanFlag,
    })
        .strict(),
})
    .strict();
const projectPathSchema = z.string().superRefine((value, ctx) => {
    if (/^\d+$/.test(value)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Project path must be a namespace/project path, not a numeric ID",
        });
        return;
    }
    if (!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(value)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Project path must be a namespace/project path",
        });
    }
});
const rawConfigSchema = z
    .object({
    gitlab: z
        .object({
        baseUrl: z.string().url(),
        tokenEnv: z.string().min(1),
    })
        .strict(),
    defaults: z
        .object({
        protectedBranches: z.array(z.string().min(1)).min(1),
        allowedMergeRequestTargetBranches: z.array(z.string().min(1)).min(1),
        maxRepositoryFileBytes: z.number().int().positive(),
    })
        .strict(),
    projects: z
        .array(z
        .object({
        path: projectPathSchema,
        permissions: permissionsSchema,
    })
        .strict())
        .min(1),
})
    .strict();
/**
 * Loads policy config while keeping the GitLab token out of the JSON file.
 *
 * The config stores the environment variable name in `gitlab.tokenEnv`; this
 * function resolves that variable and returns the token only in memory.
 */
export function loadConfig(path, env = process.env) {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const parsed = rawConfigSchema.parse(raw);
    const token = env[parsed.gitlab.tokenEnv];
    if (!token) {
        throw new Error(`Environment variable ${parsed.gitlab.tokenEnv} is required`);
    }
    return {
        ...parsed,
        gitlab: {
            ...parsed.gitlab,
            token,
        },
    };
}
