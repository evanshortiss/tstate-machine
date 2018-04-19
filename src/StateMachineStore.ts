import { IStateMetadata, StatesStore } from './StatesStore';
import { IStateMachine } from './types';

/**
 * Store for all registered machines in runtime and them states.
 */
export class StateMachineStore {
  /**
   * Store states by machine.
   * Key - machine constructor
   * Value - States store
   */
  private static statesByMachineStore: Map<new (...args: Array<any>) => IStateMachine, StatesStore> = new Map();

  static defineState(
    target: new (...args: Array<any>) => IStateMachine,
    stateName: string,
    parentState: string,
    to: string | Array<string>
  ): void {
    let metadata;

    if (!this.statesByMachineStore.has(target)) {
      metadata = new StatesStore();
      this.statesByMachineStore.set(target, metadata);
    }

    metadata = this.statesByMachineStore.get(target);

    metadata.addState(stateName, parentState, to);
  }

  static getState(
    target: new (...args: Array<any>) => IStateMachine,
    stateName: string
  ): IStateMetadata {
    const metadata: StatesStore = this.statesByMachineStore.get(target)!;
    return metadata.getState(stateName);
  }
}