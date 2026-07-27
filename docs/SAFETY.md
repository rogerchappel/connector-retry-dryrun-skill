# Safety Model

The package is local-first. Planning commands can write report files only when the caller provides output paths. Any external write, provider retry, fixture rewrite, publication, or merge remains outside this tool and requires explicit approval.

## Action-name heuristic

The planner splits action names at punctuation, underscores, and camel-case
boundaries. A segment equal to `post`, `send`, `comment`, `create`, `update`,
`delete`, `write`, `publish`, or `upload` is treated as a mutation. Delete
actions are never retried automatically; other mutations require an
idempotency key and approval guidance.

The segment match is intentionally boundary-aware: a read such as
`reports.getPostmortem` does not become a mutation merely because
`postmortem` contains `post`. This is a conservative naming heuristic, not
provider-schema validation. Unknown mutation verbs can still be classified as
safe, so callers must review generated plans against the connector's API
semantics before acting.
