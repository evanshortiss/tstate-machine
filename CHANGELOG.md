# 2.0.0

* `StateMachine` constructor now expects an options Object, i.e `super(opts)`.
* `opts.initialTransitions` is required by the super constructor. This replaces `$next` requirement.
* `opts.initialStateProperties` is required by the super constructor. This replaces `rememberInitState` requirement.
* Add `Properties` and `ValidStates` generics, i.e `StateMachine<Properties, ValidStates>`
* Disable `console.error` logs by default. Can be enabled via `opts.logging`.
* Make `transitTo` and others type safe using `ValidStates` generic.
* Return typed errors from `transitTo`. These use the `TransitionError` type.

# 1.1.6

* Ensure updated JS files are published using `prepublish` hook.

# 1.1.5

* Remove extra `console.log` calls from published module.

# 1.1.4

* Do not publish TypeScript (`.ts`) files, but *do* publish `d.ts`.

# 1.1.3

* Do not publish TypeScript (`.ts`) files.

# 1.1.1
- Translated readme, comments and changelog
- `@StateMachine.hide` become universal - for properties and methods

# 1.1.0
- tests complete
- remove lodash from bundle
- .hide now not able to call
- attach TravisCI

# 1.0.7
- remove `reflect-metadata` from bundle
