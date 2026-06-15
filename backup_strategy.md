# GPN Backup & Rollback Strategy

## 1. Firebase Export/Backup Strategy

Before any production changes go live, you must execute a complete backup of the Firestore and RTDB databases using the Firebase CLI and Google Cloud utilities.

### Firestore Backup
Use the `gcloud` CLI to export the entire Firestore database to a dedicated Google Cloud Storage bucket.
```bash
# Create a backup bucket if it doesn't exist
gcloud storage buckets create gs://gaurav-personal-notes-backups

# Export the entire database
gcloud firestore export gs://gaurav-personal-notes-backups/pre-rebuild-backup
```

### RTDB Backup
Export the JSON tree using the Firebase CLI:
```bash
firebase database:get / > rtdb-backup-pre-rebuild.json
```

### Firebase Auth Backup
Export all user accounts (including password hashes and federated login IDs):
```bash
firebase auth:export auth-backup-pre-rebuild.json --format=json
```

---

## 2. Rollback Plan

If the new application introduces data corruption or critical bugs, the rollback process is as follows:

### Step 1: Revert Client Application
* **Action**: Rollback Vercel deployment to the last known good legacy build.
* **Command**: `vercel rollback <deployment-id>`

### Step 2: Revert Security Rules
* **Action**: Restore the legacy rules.
* **Command**: `firebase deploy --only firestore:rules,database:rules` (using the old rules files).

### Step 3: Restore Database State
If data was mutated destructively:
* **Firestore**: `gcloud firestore import gs://gaurav-personal-notes-backups/pre-rebuild-backup`
* **RTDB**: `firebase database:set / rtdb-backup-pre-rebuild.json`
* **Auth**: `firebase auth:import auth-backup-pre-rebuild.json`

---

## 3. Emulator Validation Setup

The new security rules have been generated locally in `firestore.rules` and `database.rules.json`. 
Due to environment restrictions (missing Java), they cannot be executed against the emulator inside the current shell. 

To validate them locally, run the following on a machine with Java installed:
```bash
npm install -g firebase-tools
firebase emulators:start --only firestore,database
```
Run the test suite:
```bash
npm test rules.test.js
```
