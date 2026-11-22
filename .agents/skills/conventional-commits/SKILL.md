---
name: conventional-commits
description: Write commit messages following the Conventional Commits 1.0.0 specification (https://www.conventionalcommits.org/en/v1.0.0/). Use when creating, reviewing, or fixing git commits, writing commit messages, or when the user asks about commit types, scopes, breaking changes, or SemVer correlation.
---

# Conventional Commits 1.0.0

A lightweight convention on top of commit messages. It provides rules for an explicit
commit history and dovetails with [SemVer](https://semver.org) by describing features,
fixes, and breaking changes.

## Message Structure

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

- The `type` is a noun (`feat`, `fix`, etc.), followed by an optional scope, an optional
  `!`, and a required terminal colon and space.
- The description immediately follows the colon and space: a short summary of the change.

## Core Types

| Type | Meaning | SemVer bump |
|---|---|---|
| `fix` | Patches a bug | PATCH |
| `feat` | Introduces a new feature | MINOR |
| `BREAKING CHANGE` (footer or `!`) | Breaking API change, any type | MAJOR |

Other types are allowed (per `@commitlint/config-conventional`): `build`, `chore`, `ci`,
`docs`, `style`, `refactor`, `perf`, `test`, and others. They have no implicit SemVer effect
unless they carry a breaking change.

## Scope

An optional noun describing a section of the codebase, in parentheses:

```
feat(parser): add ability to parse arrays
fix(api): prevent racing of requests
```

## Body and Footers

- The body MAY follow one blank line after the description, providing context. It is
  free-form and may be multiple newline-separated paragraphs.
- Footers MAY follow one blank line after the body. Each footer is a word token, then
  either `: ` or ` #`, then a value (git trailer convention).
- Footer tokens use `-` instead of whitespace (e.g. `Acked-by`, `Reviewed-by`, `Refs`).
  `BREAKING CHANGE` is the exception and MAY be used as a token.
- Footer values may contain spaces and newlines; parsing ends at the next valid
  token/separator pair.

## Breaking Changes

Indicate a breaking change either in the prefix with `!` or in a footer:

```
feat!: send an email to the customer when a product is shipped

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

- Footer form MUST be uppercase `BREAKING CHANGE: <description>`.
- Prefix form is `!` immediately before the `:`. If `!` is used, the footer MAY be omitted
  and the description describes the breaking change.
- `BREAKING-CHANGE` is synonymous with `BREAKING CHANGE` as a footer token.

## Examples

```
docs: correct spelling of CHANGELOG

feat(lang): add Polish language

fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123

revert: let us never again speak of the noodle incident

Refs: 676104e, a215868
```

## Rules Checklist (RFC 2119)

1. Commits MUST be prefixed with a type, optional scope, optional `!`, then required `: `.
2. `feat` MUST be used for a new feature.
3. `fix` MUST be used for a bug fix.
4. A scope MUST be a noun in parentheses, e.g. `fix(parser):`.
5. A short description MUST immediately follow the colon and space.
6. A body MAY follow, starting one blank line after the description.
7. Footers MAY follow, one blank line after the body.
8. Types other than `feat`/`fix` MAY be used.
9. Units of information MUST NOT be treated as case-sensitive, EXCEPT `BREAKING CHANGE`
   which MUST be uppercase.

## Practical Guidance

- If a change fits more than one type, split it into multiple commits.
- Preferred casing: lowercase types, consistent across the repo.
- Wrong type before merge/release: fix with `git rebase -i`. After release, cleanup depends
  on tooling.
- Reverts: no spec-mandated behavior; the `revert` type with a `Refs:` footer is recommended.
- Emit commit messages as plain text. Do not add commentary to the message itself.

## Why It Matters

- Automatically generate CHANGELOGs.
- Automatically determine the semantic version bump.
- Communicate change nature to teammates and stakeholders.
- Trigger build and publish processes.

Source: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
(CC BY 3.0).
