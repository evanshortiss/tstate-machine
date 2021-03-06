# 2.0.1

* Fix error where `transitioning` boolean was left `true` after state change had completed.

# 2.0.0

* `StateMachine` constructor now expects an options Object, i.e `super(opts)`.
* `opts.initialTransitions` is required by the super constructor. This replaces `$next` requirement.
* Rename `IStateDeclaration` to `PartialProperties`.
* Remove support for individual class fields in favour of a `props` container.
* `opts.props` is required by the super constructor. This replaces `rememberInitState` requirement.
* Add `Properties` and `ValidStates` generics, i.e `StateMachine<Properties, ValidStates>`
* Disable `console.error` logs by default. Can be enabled via `opts.logging`.
* Make `transitTo` and others type safe using `ValidStates` generic.
* Return typed errors from `transitTo`. These use the `TransitionError` type.
* Change signature of `onEnter` callbacks to `(prevState: string ...args: Array<any>) => void`
* Change signature of `onLeave` callbacks to `(targetState: string) => void`
* Fix issue #1.

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
