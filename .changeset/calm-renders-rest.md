---
'mastracode-remote': patch
'@mastra/core': patch
---

Reduce CPU and retained memory during active tasks by bounding live display state and batching intermediate shell, tool, and subagent updates. Lifecycle events and final results still render immediately.
