# tstate-machine

StateMachine implementation in TypeScript. This is an updated fork of the
excellent [SoEasy/tstate-machine](https://github.com/SoEasy/tstate-machine).

## Overview
Class-based, declarative, strongly typed state machine with hard declared transitions and without autocomplete problems.

## Install

```bash
npm install reflect-metadata @evanshortiss/tstate-machine --save
```

## Example

A complete example can be found in [example/traffic.ts](example/traffic.ts).
Run it by issuing an `npm run example` command.

```ts
// A Reflect.defineMetata polyfill is required by tstate-machine
import 'reflect-metadata';

import { StateMachine, PartialProperties } from '@evanshortiss/tstate-machine';

enum Colours {
  Red = 'Red',
  Orange = 'Orange',
  Green = 'Green'
};

// Properties of the TrafficLightStateMachine
type TrafficLightProps = {
  safe: boolean
  message: string
}
// Can be used to represent partial state changes
type PartialTrafficLightProps = PartialProperties<TrafficLightProps>

// A union type that defines valid states for the machine
type TrafficLightStates = Colours.Red|Colours.Orange|Colours.Green

class TrafficLightStateMachine extends StateMachine<TrafficLightProps, TrafficLightStates> {
  /**
   * Define the Red state:
   *  - Inherits the initial properties (passed in constructor)
   *  - Overwrites the initial "message" property value with "STOP"
   *  - Can only transition to the Green state
   */
  @StateMachine.extend(StateMachine.INITIAL, [Colours.Green])
  [Colours.Red]: PartialTrafficLightProps = { message: 'STOP' }

  @StateMachine.extend(StateMachine.INITIAL, [Colours.Green, Colours.Red])
  [Colours.Orange]: PartialTrafficLightProps = { message: 'CAUTION' }

  @StateMachine.extend(StateMachine.INITIAL, [Colours.Orange])
  [Colours.Green]: PartialTrafficLightProps = { message: 'GO', safe: true }

  constructor () {
    super({
      // Tells the state machine what state(s) it can initially transition to
      initialTransitions: [Colours.Green],

      // Define the initial state values for the machine
      props: {
        message: 'OFF',
        safe: false
      }
    })
  }
}

const machine = new TrafficLightStateMachine()

machine.transitTo(Colours.Green)
console.log(`Light is ${machine.currentState}. Message is ${machine.props.message}.`)

machine.transitTo(Colours.Orange)
console.log(`Light is ${machine.currentState}. Message is ${machine.props.message}.`)

machine.transitTo(Colours.Red)
console.log(`Light is ${machine.currentState}. Message is ${machine.props.message}.`)
```

## Usage

1. Create class that extends `StateMachine<ValidProps, ValidStates>` and calls the super constructor.
2. Define states on your class using `@StateMachine.extend(parent, transitions)`
3. Use the state machine, and register optional callbacks.

### #1 Create your own StateMachine

To create your own state machine you must create class and inherit it from
`StateMachine` class.

All instances of `StateMachine` start in the default `StateMachine.INITIAL`
state. You must pass `initialTransitions` and `initialProps` to the
super constructor to correctly initialise the machine.

```ts
enum Colours {
  Red = 'Red',
  Orange = 'Orange',
  Green = 'Green'
}

type TrafficLightProps = {
  safe: boolean
  message: string
}
type PartialTrafficLightProps = PartialProperties<TrafficLightProps>
type TrafficLightStates = Colours.Red|Colours.Orange|Colours.Green

class TrafficLightStateMachine extends StateMachine<TrafficLightProps, TrafficLightStates> {

  constructor() {
    super({
      // What state(s) the machine can initially transition to
      initialTransitions: [Colours.Green],

      // Define the initial property values for the machine
      initialProps: {
        message: 'OFF',
        safe: false
      }
    })
  }
}
```

### #2 Define States

* States are defined as properties on the class.
* The property name is the state name.
* Use `@StateMachine.extend` to define a state. It accepts two arguments:
  * A state to inherit from. This can be `State.INITIAL` or another state.
  * The state, or states, to which this state can transition.
* [PartialProperties](/src/StateDeclaration.ts) utility is used to:
  * Extract a type containing class properties.
  * Pass this type as a Generic to the StateMachine.
  * This type is used for safety in defining state properties, and the initial state in the super constructor.

The following snippet defines the `Green` state on this
`TrafficLightStateMachine`.

```ts
enum Colours {
  Red = 'Red',
  Orange = 'Orange',
  Green = 'Green'
}

type TrafficLightProps = {
  safe: boolean
  message: string
}
type PartialTrafficLightProps = PartialProperties<TrafficLightProps>
type TrafficLightStates = Colours.Red|Colours.Orange|Colours.Green

class TrafficLightStateMachine extends StateMachine<TrafficLightProps, TrafficLightStates> {

  /**
   * Define the "Green" state (Colours.Green).
   *
   * Extends the initial state, but we override both properties:
   *  - Property "safe=true", because false is overwritten
   *  - Property "message="GO", because "OFF" is overwritten
   *
   * This state can transition to the "Orange" state.
   */
  @StateMachine.extend(StateMachine.INITIAL, [Colours.Orange])
  [Colours.Green]: PartialTrafficLightProps = {
    message: 'GO',
    safe: true
  }

  constructor() {
    super({
      // Tells the state machine what state(s) it can initially transition to
      initialTransitions: [Colours.Green],

      // Define the initial state values for the machine
      initialProps: {
        message: 'OFF',
        safe: false
      }
    })
  }
}
```

The `Red` state could be defined as shown below. Only the `message` property is
defined, since this state is uses the inherited `false` value for `safe`.

```ts
/**
 * Define the "Red" state (Colours.Red).
 *
 * Extends the initial state:
 *  - Property "safe=false", because it's inherited from the initial state
 *  - Property "message="STOP", because it's overwritten
 *
 * This state can transition to the "Green" state.
 */
@StateMachine.extend(StateMachine.INITIAL, [Colours.Green])
[Colours.Red]: PartialTrafficLightProps = {
  message: 'STOP'
}
```

### #3.1 Transition Between States

Call `transitTo(targetState: string, ...args: Array<any>)` to transition
between states. Arguments passed to `transitTo()` are passed to the `onEnter`
transition callback(s).

```ts
const machine = TrafficLightStateMachine()

const ORANGE_TIMEOUT = 4 * 1000 // 4000 milliseconds

machine.transitTo(Colors.Green)
machine.transitTo(Colors.Orange, ORANGE_TIMEOUT)
machine.transitTo(Colors.Red)
```

Attempting to transition to an invalid state will fail. This can be detected by
checking the return value of `transitTo`.

```ts
const machine = new TrafficLightStateMachine()

// Will return undefined, since this is a valid transition
machine.transitTo(Colors.Green)

// Result is "InvalidTransition" since Green => Red is not a valid path
const greenToRedError = machine.transitTo(Colors.Red)

if (greenToRedError) {
  console.log(`Failed to transition due to error: ${greenToRedError}`)
}
```

### #3.2 Transition Callbacks (onEnter and onLeave)

Multiple callbacks can be registered for `onLeave` and `onEnter` phases of a
state transition.

The `onLeave` callbacks are called **before** the transition has occurred. This
means that the machine properties have not been updated when the callback is
invoked.

The `onEnter` callbacks are called **after** the transition has occurred. This
means that the machine properties have been updated when the callback is
invoked.

```ts
const machine = new TrafficLightStateMachine();

const ORANGE_TIMEOUT = 4 * 1000; // 4000 milliseconds

const removeOrangeEnterCb = machine.onEnter(Colours.Orange, (timeout: number) => {
  // Change to Red state after the given timeout
  setTimeout(() => machine.transitTo(Colous.Red), timeout);
});

machine.onLeave(Colours.Orange, () => console.log('Leaving Orange state'));

// Transition to green, then orange (this will trigger a callback)
machine.transitTo(Colors.Green);
machine.transitTo(Colors.Orange, ORANGE_TIMEOUT);

// Remove a registered callback
removeOrangeEnterCb();
```

## API

### StateMachine Static Methods
- `@StateMachine.hide()` - decorator for wrapping fields/methods that are not related to the state
- `@StateMachine.extend(parentState: string, toStates: Array<string>)` - Declares new state. Inherit class properties from `parentState`. Possible transitions are `to` states.

### StateMachine Instance Methods
- `transitTo(targetState, ...args)` - Transition to `targetState`. Supports optional variadic arguments that will be passed
- `currentState: string` - Get the current state the machine is in.
- `is(stateName: string): boolean` - Check if current state is `stateName`.
- `can(stateNameL string): boolean` - Check if it's possible to transition to stateName.
- `transitions(): Array<string>` - Returns a list possible transitions from the current state.
- `onEnter(stateName: string, cb: (...args: Array<any>) => void): () => void` - add onEnter callback
- `onLeave(stateName: string, cb: () => void): () => void` - add onLeave callback

## Thanks
The interface is peeked here:
[JS FSM](https://github.com/jakesgordon/javascript-state-machine).
