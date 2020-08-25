import * as core from "@actions/core"
import { context, getOctokit } from "@actions/github"

type GitHub = ReturnType<typeof getOctokit>

interface File {
    readonly status: string
    readonly filename: string
    readonly previous_filename?: string
}

class ChangedFiles {
    readonly updated: string[] = []
    readonly created: string[] = []
    readonly deleted: string[] = []

    constructor(private readonly pattern: RegExp) {}

    apply(f: File): void {
        if (!this.pattern.test(f.filename)) {
            return
        }
        switch (f.status) {
            case "added":
                this.created.push(f.filename)
                break
            case "removed":
                this.deleted.push(f.filename)
                break
            case "modified":
                this.updated.push(f.filename)
                break
            case "renamed":
                this.created.push(f.filename)
                if (f.previous_filename && this.pattern.test(f.previous_filename)) {
                    this.deleted.push(f.previous_filename)
                }
        }
    }
}

async function getChangedFiles(client: GitHub, prNumber: number, fileCount: number): Promise<ChangedFiles> {
    const pattern = core.getInput("pattern")
    const changedFiles = new ChangedFiles(new RegExp(pattern.length ? pattern : ".*"))
    const fetchPerPage = 100
    for (let pageIndex = 0; pageIndex * fetchPerPage < fileCount; pageIndex++) {
        const listFilesResponse = await client.pulls.listFiles({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: prNumber,
            page: pageIndex,
            per_page: fetchPerPage,
        })
        core.debug(`Fetched page ${pageIndex} with ${listFilesResponse.data.length} changed files`)
        listFilesResponse.data.forEach(f => changedFiles.apply(f))
    }
    return changedFiles
}

async function fetchPr(client: GitHub): Promise<{ number: number; changed_files: number } | undefined> {
    const prNumberInput = core.getInput("pr-number")

    // If user provides pull request number, we fetch and return that particular pull request
    if (prNumberInput) {
        const { data: pr } = await client.pulls.get({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: parseInt(prNumberInput, 10),
        })
        return pr
    }

    // Otherwise, we infer the pull request based on the the event's context
    return context.payload.pull_request
        ? {
              number: context.payload.pull_request.number,
              changed_files: context.payload.pull_request["changed_files"],
          }
        : undefined
}

async function run(): Promise<void> {
    try {
        const token = core.getInput("repo-token", { required: true })
        const client = getOctokit(token)
        const pr = await fetchPr(client)

        if (!pr) {
            core.setFailed(`Could not get pull request from context, exiting`)
            return
        }

        core.debug(`${pr.changed_files} changed files for pr #${pr.number}`)
        const changedFiles = await getChangedFiles(client, pr.number, pr.changed_files)

        core.setOutput("files_created", changedFiles.created)
        core.setOutput("files_updated", changedFiles.updated)
        core.setOutput("files_deleted", changedFiles.deleted)
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
