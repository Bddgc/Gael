# Publish Gael on GitHub

## Repository

Review the staged files with `git diff --cached --stat` and `git status`. Set your identity if needed, then commit:

```sh
git config user.name "Bddgc"
git config user.email "Bddgc@users.noreply.github.com"
git commit -m "Prepare Gael 0.6.1 for GitHub"
```

Create an empty GitHub repository named `gael`, without another README or license. The remote is configured for Bddgc:

```sh
git remote -v
git push -u origin main
```

Use the description and topics in `docs/PRESS-KIT.md`. Choose a license before presenting the project as open source. Enable private vulnerability reporting if desired.

## Release

1. Run `npm ci`, `npm test`, and `npm run dist` on Windows.
2. Smoke-test the built EXE: startup, drag, menu, panel, adventures, and quit. Test real microphone, paid APIs, and games separately before claiming verified compatibility.
3. Package the current EXE and `QUICK-START.txt` as `Gael-0.6.1-Windows-x64.zip`. Exclude personal data.
4. Generate SHA-256 checksums for the final EXE and ZIP and save them as `SHA256SUMS.txt`.
5. Tag the reviewed commit `v0.6.1` and push the tag. The binary must be built from the tagged source.
6. Create a GitHub Release with `docs/RELEASE-v0.6.1.md` as notes. Upload the EXE, ZIP, and checksums.
7. Insert the published release URL into the press kit and share the English launch posts.

Existing dist files are local artifacts excluded from Git. Rebuild them after source changes before publishing. GitHub Actions tests on Windows and offers a manual build artifact; it does not publish automatically.
