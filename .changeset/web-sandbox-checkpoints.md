---
'mastracode-web': patch
---

GitHub project sandboxes now survive Railway idle reclamation. Each per-(project,user) sandbox gets a stable checkpoint name, so the provider snapshots it before every idle window and restores new VMs from the snapshot. Reattaching to a dead sandbox recovers automatically: a replacement is provisioned from the checkpoint and the new provider id is persisted; without a checkpoint, the binding is cleared so the next open re-clones instead of failing on the stale "already materialized" flag.
