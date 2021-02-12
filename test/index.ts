import 'reflect-metadata';
import { expect } from 'chai';
import { StateMachine, TransitionError } from '../src/StateMachine';
import { IStateDeclaration } from '../src/StateDeclaration';

type MachineProps = IStateDeclaration<Machine>;
type ValidStates = 'requestState'|'errorState'|'mainState'|'successState'

class Machine extends StateMachine<MachineProps, ValidStates> {
  text: string;
  alert: Record<string, any>;

  @StateMachine.extend(StateMachine.INITIAL, ['requestState'])
  mainState: MachineProps = {};

  @StateMachine.extend('mainState', ['successState', 'errorState'])
  requestState: MachineProps = {
    text: 'request'
  };

  // Base state for extending only
  @StateMachine.extend('mainState', [])
  doneState: MachineProps = {
    text: 'done',
    alert: {
      visible: true
    }
  };

  @StateMachine.extend('doneState', ['mainState'])
  successState: MachineProps = {
    alert: {
      text: 'success'
    }
  };

  @StateMachine.extend('doneState', ['mainState'])
  errorState: MachineProps = {
    alert: {
      text: 'error'
    }
  };

  constructor() {
    super({
      initialTransitions: ['mainState'],
      initialStateProperties: {
        text: 'do',
        alert: {
          text: 'alert',
          visible: false
        }
      }
    });
  }
}

function expectIsInitial(machine: Machine): void {
  // TODO
  // Actually I don`t know why expect(machine).to.include(...) not work
  // to have property 'alert' of { text: 'alert', visible: false }, but got { text: 'alert', visible: false }
  expect(machine.text).to.be.equal('do');
  expect(machine.alert).to.be.eql({
    text: 'alert',
    visible: false
  });
}

describe('tstate-machine', () => {
  it('initial state is immutable', () => {
    const machine = new Machine();
    machine.transitTo('mainState');
    expect(machine.currentState).to.equal('mainState');
    machine.transitTo('requestState');
    expect(machine.currentState).to.equal('requestState');
    machine.transitTo('successState');
    expect(machine.currentState).to.equal('successState');
    machine.transitTo('mainState');
    expect(machine.currentState).to.equal('mainState');
    machine.transitTo('requestState');
    expect(machine.currentState).to.equal('requestState');

    expect(machine.alert).to.deep.equal({
      text: 'alert',
      visible: false
    });
  });

  it('must be in initial state after creation', () => {
    const machine = new Machine();
    expectIsInitial(machine);
  });

  it('must correctly transit to next state', () => {
    const machine = new Machine();
    machine.transitTo('mainState');
    machine.transitTo('requestState');
    expect(machine.text).to.be.eq('request');
  });

  it('must not transit to incorrect state from initial', () => {
    const machine = new Machine();
    // Correct transition
    machine.transitTo('mainState');
    // Incorrect transition
    const failureReason = machine.transitTo('successState');

    expect(failureReason).to.equal(TransitionError.InvalidTransition)

    expectIsInitial(machine);
  });

  it('must not transit to incorrect state', () => {
    const machine = new Machine();
    // Correct transitions
    machine.transitTo('mainState');
    machine.transitTo('requestState');
    // Incorrect state
    const failureReason = machine.transitTo('mainState');

    expect(failureReason).to.equal(TransitionError.InvalidTransition)

    expect(machine.text).to.be.equal('request');
    expect(machine.alert).to.be.eql({
      text: 'alert',
      visible: false
    });
  });

  it('must not transit to unregistered state from initial', () => {
    const machine = new Machine();
    // need to cast to attempt to enter invalid state
    const failureReason = machine.transitTo('foobar' as any);
    expect(failureReason).to.equal(TransitionError.StateNotRegistered)
    expectIsInitial(machine);
  });

  it('must not transit to incorrect state from initial', () => {
    const machine = new Machine();
    machine.transitTo('requestState');
    expectIsInitial(machine);
  });

  it('must correct extend state', () => {
    const machine = new Machine();
    machine.transitTo('mainState');
    machine.transitTo('requestState');
    machine.transitTo('successState');

    expect(machine.text).to.be.equal('done');
    expect(machine.alert).to.be.eql({
      text: 'success',
      visible: true
    });
  });

  it('currentState correct', () => {
    const machine = new Machine();
    expect(machine.currentState).to.be.eq('initial');
    machine.transitTo('mainState');
    expect(machine.currentState).to.be.eq('mainState');
  });

  it('.is() correct', () => {
    const machine = new Machine();
    expect(machine.is('initial')).to.be.true;
    machine.transitTo('mainState');
    expect(machine.is('mainState')).to.be.true;
  });

  it('.can() correct', () => {
    const machine = new Machine();
    expect(machine.can('mainState')).to.be.true;
    expect(machine.can('requestState')).to.be.false;
    machine.transitTo('mainState');
    expect(machine.can('requestState')).to.be.true;
    expect(machine.can('successState')).to.be.false;
  });

  it('.transitions() correct', () => {
    const machine = new Machine();
    expect(machine.transitions()).to.be.eql(['mainState']);
    machine.transitTo('mainState');
    expect(machine.transitions()).to.be.eql(['requestState']);
    machine.transitTo('requestState');
    expect(machine.transitions()).to.be.eql(['successState', 'errorState']);
  });

  it('.onEnter() register correct', () => {
    const machine = new Machine();
    let a = 1;
    machine.onEnter('mainState', () => {
      a += 1;
    });
    machine.transitTo('mainState');
    expect(a).to.be.eq(2);
  });

  it('.onEnter(...args) register correct', () => {
    const machine = new Machine();
    let a = 1;
    machine.onEnter('mainState', (inc: number) => {
      a += inc;
    });
    machine.transitTo('mainState', 2);
    expect(a).to.be.eq(3);
  });

  it('.onLeave() register correct', () => {
    const machine = new Machine();
    let a = 1;
    machine.onLeave('mainState', () => {
      a += 1;
    });
    machine.transitTo('mainState');
    machine.transitTo('requestState');
    expect(a).to.be.eq(2);
  });

  it('.onEnter() unregister correct and dont touch another callbacks', () => {
    const machine = new Machine();
    let a = 1;
    let b = 1;
    const dropCb = machine.onEnter('mainState', () => {
      a += 1;
    });
    machine.onEnter('mainState', () => {
      b += 1;
    });
    dropCb();
    machine.transitTo('mainState');
    expect(a).to.be.eq(1);
    expect(b).to.be.eq(2);
  });

  it('.onLeave() unregister correct and dont touch another callbacks', () => {
    const machine = new Machine();
    let a = 1;
    let b = 1;
    const dropCb = machine.onLeave('mainState', () => {
      a += 1;
    });
    machine.onLeave('mainState', () => {
      b += 1;
    });
    dropCb();
    machine.transitTo('mainState');
    expect(a).to.be.eq(1);
    expect(b).to.be.eq(1);
    machine.transitTo('requestState');
    expect(a).to.be.eq(1);
    expect(b).to.be.eq(2);
  });
});
