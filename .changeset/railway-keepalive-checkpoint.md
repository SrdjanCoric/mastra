---
'@mastra/railway': patch
---

RailwaySandbox now keeps checkpoint-backed sandboxes alive across idle windows. When a `checkpointName` is configured, the pre-idle refresh pings the VM (resetting Railway's idle-destroy clock) before capturing the checkpoint, and reschedules itself each idle window. Every sandbox action debounces the timer, so the snapshot always lands just before the VM would otherwise be reclaimed.
