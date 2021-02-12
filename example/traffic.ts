import 'reflect-metadata';
import { StateMachine, PartialProperties } from '../src/index';

enum Colours {
  Red = 'Red',
  Orange = 'Orange',
  Green = 'Green'
}

type TrafficLightProps = {
  safe: boolean;
  message: string;
};
type PartialTrafficLightProps = PartialProperties<TrafficLightProps>;
type TrafficLightStates = Colours.Red | Colours.Orange | Colours.Green;

/**
 * Defines a state machine to simulate a Traffic Light.
 *
 * Can be in Red, Orange, or Green state. Each state has a unique "message"
 * associated with it.
 */
class TrafficLightStateMachine extends StateMachine<
  TrafficLightProps,
  TrafficLightStates
> {
  @StateMachine.extend(StateMachine.INITIAL, [Colours.Green])
  [Colours.Red]: PartialTrafficLightProps = {
    message: 'STOP'
  };

  @StateMachine.extend(StateMachine.INITIAL, [Colours.Green, Colours.Red])
  [Colours.Orange]: PartialTrafficLightProps = {
    message: 'CAUTION'
  };

  @StateMachine.extend(StateMachine.INITIAL, Colours.Orange)
  [Colours.Green]: PartialTrafficLightProps = {
    message: 'GO',
    safe: true
  };

  constructor() {
    super({
      // Tells the state machine what state(s) it can initially transition to
      initialTransitions: [Colours.Green],

      // Define the initial state values for the machine
      props: {
        message: 'OFF',
        safe: false
      }
    });
  }
}

const machine = new TrafficLightStateMachine();
const invalidStateName = 'Blue';

const logMachineState = (c: string) => {
  console.log('========================================');
  console.log(`Entered ${c} state.`);
  console.log(
    `Light is ${machine.currentState}. Message is "${machine.props.message}". Safe: ${machine.props.safe}`
  );
  console.log('========================================\n');
};

// Start by logging the initial state
logMachineState(StateMachine.INITIAL);

// Next setup onEnter callback for each state with logging
Object.values(Colours).forEach((c) => {
  machine.onEnter(c, () => logMachineState(c));
});
machine.transitTo(Colours.Green);
machine.transitTo(Colours.Orange);
machine.transitTo(Colours.Red);

// This transition will fail, even if we bypass type safety
const failReason = machine.transitTo(invalidStateName as any);

if (failReason) {
  console.log(
    `Transition to ${invalidStateName} failed. Reason: ${failReason}`
  );
}
