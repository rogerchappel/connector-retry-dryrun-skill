# Safety Model

The package is local-first. Planning commands can write report files only when the caller provides output paths. Any external write, provider retry, fixture rewrite, publication, or merge remains outside this tool and requires explicit approval.

## Action-name heuristic

The planner splits action names at punctuation, underscores, and camel-case
boundaries. A segment equal to `post`, `send`, `comment`, `create`, `update`,
`patch`, `put`, `upsert`, `add`, `delete`, `remove`, `archive`, `write`,
`edit`, `set`, `move`, `publish`, or `upload` is treated as a mutation. Delete,
remove, and archive actions are classified as `do_not_retry` even when an
idempotency key is present, because the planner cannot establish the
provider-side state needed to reverse them. Other mutations require an
idempotency key and approval guidance.

The segment match is intentionally boundary-aware: a read such as
`reports.getPostmortem` does not become a mutation merely because `postmortem`
contains `post`; similarly, `records.putative` and `contacts.dispatch` remain
read-only by name. `members.address` also remains read-only because `add` is
only a substring. The same protection keeps `messages.credit`,
`contacts.settings`, and `files.movement` read-only by name. Separator forms
such as `contacts.patch`, `messages.edit`, `contacts.set`, and `files.move`, and
camel-case forms such as `patchContact`, `editMessage`, `setContact`, and
`moveFile`, are recognized.

This is a conservative naming heuristic, not provider-schema validation. It
does not inspect HTTP methods, payloads, or provider metadata. Unknown or
provider-specific mutation verbs can still be classified as safe, while an
action whose name uses one of these verbs for a read-only operation can be
classified as a mutation. Callers must review generated plans against the
connector's API semantics and current provider state before acting.
