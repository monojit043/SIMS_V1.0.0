# SIMS — production (office apps server, PC-1)

SIMS runs next to ePULSE and IPMCS on the apps server: folder `E:\SIMS`, port **5000**, its own database
`SIMS_V1.0`. It has no users of its own: whoever is on the IPMCS team of a job + unit can use SIMS
there (LEAD / ML = admin). It reads ePULSE (`ePULSE_v1.0.0`) and IPMCS (`IPMCS_UTILITY_1.0`) live and
read-only, so **nothing is needed on the PIMS server (PC-2)**. P&IDs come only from ePULSE (current
revision, copied into `E:\SIMS\BACKEND\uploads\pid` when a P&ID is opened for highlighting).
It uses ePULSE's Node runtime (`E:\ePULSE_v1.0.0\backend\node-v22.19.0-win-x64`).

Packages are zips named `SIMS_<date>_<commit>[_full].zip`. `_full` ones carry the libraries
(node_modules); the first install needs a `_full` one. Every package installs **or** updates.

---

## First install (once)

Before you start: ePULSE **and IPMCS** are installed on this server (SIMS needs both databases), and you
have ePULSE's `SSO_SECRET` (in `E:\ePULSE_v1.0.0\backend\.env`).

1. Unzip the package to `E:\updates\` → a folder `E:\updates\SIMS_<date>_<commit>_full`.
2. In that folder, double-click `deploy\production\apply_update.bat`. It installs into `E:\SIMS` and
   creates `E:\SIMS\BACKEND\.env` from the template.
3. Open `E:\SIMS\BACKEND\.env` in Notepad and fill in:
   - `PGPASSWORD`, `EPULSE_DB_PASSWORD`, `IPMCS_DB_PASSWORD` = this server's postgres password
   - `SSO_SECRET` = **exactly** the same as in ePULSE's `.env`
   - `JWT_SECRET` is filled in automatically by step 1.
4. Double-click `E:\SIMS\deploy\production\step1_setup_database.bat`. It creates the database and its
   tables and checks that ePULSE, IPMCS and the PIMS server (through ePULSE) are reachable. It stops
   without changing anything if the database already has tables.
5. Double-click `E:\SIMS\deploy\production\step2_start_sims.bat`. Keep the window open; closing it
   stops SIMS.
6. Firewall (Command Prompt **as Administrator**), so other PCs can open it:
   ```bat
   netsh advfirewall firewall add rule name="SIMS (5000)" dir=in action=allow protocol=TCP localport=5000
   ```
7. Test: log in to ePULSE (`http://10.40.36.232:3000/gateway-login.html`), open **SIMS - Special Items
   Management System** from the gateway — you should be logged in already, and see the jobs / units
   where you are on the IPMCS team.

## Updates (every new version)

1. Unzip the new package to `E:\updates\`.
2. Close the "SIMS v1.0.0" window (SIMS must be stopped).
3. In the **unzipped package** folder, double-click `deploy\production\apply_update.bat`. It:
   - backs up the database and the current code to `E:\backups\SIMS\<date>_before_<commit>`
   - replaces the code — `.env`, `uploads` and the data are never touched
   - updates the database tables
4. Start it again: `E:\SIMS\deploy\production\step2_start_sims.bat`.

The installed version is in `E:\SIMS\RELEASE.json` (`version`, `commit`).

## Going back (rollback)

1. Close the SIMS window.
2. Double-click `E:\SIMS\deploy\production\rollback.bat` (it takes the last update's backup; another one:
   `rollback.bat E:\backups\SIMS\<folder>`).
3. Type `YES` to put the old code back. It then asks whether to put the **database** back too — only do
   that if the update damaged data: everything entered after the update is lost. Press Enter to keep it.
4. Start it again (step 2).

## If something fails

| Message | Fix |
|---|---|
| `SIMS is running (port 5000)` | close the SIMS window first |
| `password authentication failed` | the `*PASSWORD` lines in `BACKEND\.env` |
| `database "IPMCS_UTILITY_1.0" does not exist` | install IPMCS first |
| `PC-2 not reachable through ePULSE` | ePULSE's link to the PIMS server — `E:\ePULSE_v1.0.0\deploy\production\RECONNECT_PIMS_SERVER.md` |
| `needs new libraries ... FULL package` | ask for the `_full` package of that version |
| `pg_dump.exe not found` | PostgreSQL is not in `C:\Program Files\PostgreSQL\18` — run `set PGBIN=<its bin folder>` first, in the same Command Prompt |
| Login loops back to the login page | `SSO_SECRET` differs from ePULSE's |
