"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github_1 = require("@actions/github");
class ChangedFiles {
    constructor(pattern) {
        this.pattern = pattern;
        this.updated = [];
        this.created = [];
        this.deleted = [];
    }
    apply(f) {
        if (!this.pattern.test(f.filename)) {
            return;
        }
        switch (f.status) {
            case "added":
                this.created.push(f.filename);
                break;
            case "removed":
                this.deleted.push(f.filename);
                break;
            case "modified":
                this.updated.push(f.filename);
                break;
            case "renamed":
                this.created.push(f.filename);
                if (f.previous_filename && this.pattern.test(f.previous_filename)) {
                    this.deleted.push(f.previous_filename);
                }
        }
    }
}
function getChangedFiles(client, prNumber, fileCount) {
    return __awaiter(this, void 0, void 0, function* () {
        const pattern = core.getInput("pattern");
        const changedFiles = new ChangedFiles(new RegExp(pattern.length ? pattern : ".*"));
        const fetchPerPage = 100;
        for (let pageIndex = 0; pageIndex * fetchPerPage < fileCount; pageIndex++) {
            const listFilesResponse = yield client.pulls.listFiles({
                owner: github_1.context.repo.owner,
                repo: github_1.context.repo.repo,
                pull_number: prNumber,
                page: pageIndex,
                per_page: fetchPerPage,
            });
            core.debug(`Fetched page ${pageIndex} with ${listFilesResponse.data.length} changed files`);
            listFilesResponse.data.forEach(f => changedFiles.apply(f));
        }
        return changedFiles;
    });
}
function fetchPr(client) {
    return __awaiter(this, void 0, void 0, function* () {
        const prNumberInput = core.getInput("pr-number");
        // If user provides pull request number, we fetch and return that particular pull request
        if (prNumberInput) {
            const { data: pr } = yield client.pulls.get({
                owner: github_1.context.repo.owner,
                repo: github_1.context.repo.repo,
                pull_number: parseInt(prNumberInput, 10),
            });
            return pr;
        }
        // Otherwise, we infer the pull request based on the the event's context
        return github_1.context.payload.pull_request
            ? {
                number: github_1.context.payload.pull_request.number,
                changed_files: github_1.context.payload.pull_request["changed_files"],
            }
            : undefined;
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput("repo-token", { required: true });
            const client = github_1.getOctokit(token);
            const pr = yield fetchPr(client);
            if (!pr) {
                core.setFailed(`Could not get pull request from context, exiting`);
                return;
            }
            core.debug(`${pr.changed_files} changed files for pr #${pr.number}`);
            const changedFiles = yield getChangedFiles(client, pr.number, pr.changed_files);
            core.setOutput("files_created", changedFiles.created);
            core.setOutput("files_updated", changedFiles.updated);
            core.setOutput("files_deleted", changedFiles.deleted);
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
