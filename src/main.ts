import * as core from "@actions/core"
import * as github from "@actions/github"

class ChangedFiles {
    updated: Array<string> = []
    created: Array<string> = []
    deleted: Array<string> = []

    count(): number {
        return this.updated.length + this.created.length + this.deleted.length
    }
}

async function getChangedFiles(client: github.GitHub, prNumber: number, fileCount: number): Promise<ChangedFiles> {
    const changedFiles = new ChangedFiles()
    const fetchPerPage = 100
    for (let pageIndex = 0; pageIndex * fetchPerPage < fileCount; pageIndex++) {
        const listFilesResponse = await client.pulls.listFiles({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
            page: pageIndex,
            per_page: fetchPerPage,
        })

        listFilesResponse.data.forEach(f => {
            if (f.status === "added") {
                changedFiles.created.push(f.filename)
            } else if (f.status === "removed") {
                changedFiles.deleted.push(f.filename)
            } else if (f.status === "modified") {
                changedFiles.updated.push(f.filename)
            } else if (f.status === "renamed") {
                changedFiles.created.push(f.filename)
                changedFiles.deleted.push(f["previous_filename"])
            }
        })
    }
    return changedFiles
}

async function run(): Promise<void> {
    try {
        const token = core.getInput("repo-token", { required: true })
        const client = new github.GitHub(token)

        const pr = github.context.payload.pull_request
        if (!pr) {
            core.setFailed("Could not get pull request number from context, exiting")
            return
        }

        const changedFiles = await getChangedFiles(client, pr.number, pr.changed_files)
        core.debug(`Found ${changedFiles.count} changed files for pr #${pr.number}`)

        core.setOutput("files_created", changedFiles.created.join(" "))
        core.setOutput("files_updated", changedFiles.updated.join(" "))
        core.setOutput("files_deleted", changedFiles.deleted.join(" "))
    } catch (error) {
        core.error(error)
        core.setFailed(error.message)
    }
}

run()
