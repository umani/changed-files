import * as core from "@actions/core"
import * as github from "@actions/github"

class ChangedFiles {
    updated: Array<string> = []
    created: Array<string> = []
    deleted: Array<string> = []
}

async function getChangedFiles(client: github.GitHub, prNumber: number): Promise<ChangedFiles> {
    const listFilesResponse = await client.pulls.listFiles({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
    })

    console.log("Found changed files:")
    return listFilesResponse.data.reduce((acc: ChangedFiles, f) => {
        console.log(f)
        if (f.status === "added") {
            acc.created.push(f.filename)
        } else if (f.status === "removed") {
            acc.deleted.push(f.filename)
        } else if (f.status === "modified") {
            acc.updated.push(f.filename)
        } else if (f.status === "renamed") {
            acc.created.push(f.filename)
            acc.deleted.push(f["previous_filename"])
        }
        return acc
    }, new ChangedFiles())
}

function getPrNumber(): number | null {
    const pullRequest = github.context.payload.pull_request
    return pullRequest ? pullRequest.number : null
}

async function run(): Promise<void> {
    try {
        const token = core.getInput("repo-token", { required: true })
        const client = new github.GitHub(token)

        const prNumber = getPrNumber()
        if (prNumber == null) {
            core.setFailed("Could not get pull request number from context, exiting")
            return
        }

        core.debug(`Fetching changed files for pr #${prNumber}`)
        const changedFiles = await getChangedFiles(client, prNumber)

        core.setOutput("files_created", changedFiles.created.join(" "))
        core.setOutput("files_updated", changedFiles.updated.join(" "))
        core.setOutput("files_deleted", changedFiles.deleted.join(" "))
    } catch (error) {
        core.error(error)
        core.setFailed(error.message)
    }
}

run()
