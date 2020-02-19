"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
class ChangedFiles {
    constructor() {
        this.updated = [];
        this.created = [];
        this.deleted = [];
    }
    count() {
        return this.updated.length + this.created.length + this.deleted.length;
    }
}
function getChangedFiles(client, prNumber, fileCount) {
    return __awaiter(this, void 0, void 0, function* () {
        const changedFiles = new ChangedFiles();
        const fetchPerPage = 100;
        for (let pageIndex = 0; pageIndex * fetchPerPage < fileCount; pageIndex++) {
            const listFilesResponse = yield client.pulls.listFiles({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                pull_number: prNumber,
                page: pageIndex,
                per_page: fetchPerPage,
            });
            listFilesResponse.data.forEach(f => {
                if (f.status === "added") {
                    changedFiles.created.push(f.filename);
                }
                else if (f.status === "removed") {
                    changedFiles.deleted.push(f.filename);
                }
                else if (f.status === "modified") {
                    changedFiles.updated.push(f.filename);
                }
                else if (f.status === "renamed") {
                    changedFiles.created.push(f.filename);
                    changedFiles.deleted.push(f["previous_filename"]);
                }
            });
        }
        return changedFiles;
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput("repo-token", { required: true });
            const client = new github.GitHub(token);
            const pr = github.context.payload.pull_request;
            if (!pr) {
                core.setFailed("Could not get pull request number from context, exiting");
                return;
            }
            const changedFiles = yield getChangedFiles(client, pr.number, pr.changed_files);
            core.debug(`Found ${changedFiles.count} changed files for pr #${pr.number}`);
            core.setOutput("files_created", changedFiles.created.join(" "));
            core.setOutput("files_updated", changedFiles.updated.join(" "));
            core.setOutput("files_deleted", changedFiles.deleted.join(" "));
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
