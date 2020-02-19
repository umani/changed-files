# Changed Files Action

This GitHub action applies to pull requests and populates 3 output variables with the modified files. They are: "files_created", "files_updated", and "files_deleted".

### Workflow Config Example
```
- name: Changed Files Exporter
  uses: futuratrepadeira/changed-files@v3.0.0
  with:
    repo-token: ${{ github.token }}
```

### Inputs
* **`repo-token`**: GitHub Access Token

### Outputs
All output values are a single JSON encoded array.

* **`files_created`**: Created files
* **`files_updated`**: Updated files
* **`files_deleted`**: Deleted files

