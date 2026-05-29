import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
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
        tokenKey: z.string().min(1),
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
      .array(
        z
          .object({
            path: projectPathSchema,
            permissions: permissionsSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strip();

export type Permissions = z.infer<typeof permissionsSchema>;

export type ProjectConfig = {
  path: string;
  permissions: Permissions;
};

export type SafeGlabConfig = {
  gitlab: {
    baseUrl: string;
    tokenKey: string;
    token: string;
  };
  defaults: {
    protectedBranches: string[];
    allowedMergeRequestTargetBranches: string[];
    maxRepositoryFileBytes: number;
  };
  projects: ProjectConfig[];
};

/**
 * Loads policy config while keeping the GitLab token out of the JSON file.
 *
 * Attempts to resolve key from OS keychain then falls back to `.env` in the
 * case the keychain cannot be accessed.
 */
export async function loadConfig(path: string, env: NodeJS.ProcessEnv = process.env): Promise<SafeGlabConfig> {
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const parsed = rawConfigSchema.parse(raw);

  let token: string | null | undefined = null;

  try {
    token = execSync(`security find-generic-password -s safe-glab -a ${parsed.gitlab.tokenKey} -w`, { stdio: ["pipe", "pipe", "pipe"] })
      .toString()
      .trim();
  } catch {
    // keychain unavailable or entry not found, fall through to env var
  }

  if (!token) {
    token = env[parsed.gitlab.tokenKey];
  }

  if (!token) {
    throw new Error(
      `No token found for "${parsed.gitlab.tokenKey}". Add it to the OS keychain \`security add-generic-password -s safe-glab -a ${parsed.gitlab.tokenKey} -w <token>\`, or set the environment variable ${parsed.gitlab.tokenKey}.`,
    );
  }

  return {
    ...parsed,
    gitlab: {
      ...parsed.gitlab,
      token,
    },
  };
}
