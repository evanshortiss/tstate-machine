import { merge } from './utils/merge';
import { StateMachineInnerStore } from './StateMachineInnerStore';
import { StateMachineMetadata } from './StateMachineMetadata';

/**
 * @description isolated store for meta-information of concrete StateMachine
 */
const StateMachineWeakMap: WeakMap<
  StateMachine<any, any>,
  StateMachineInnerStore
> = new WeakMap<StateMachine<any, any>, StateMachineInnerStore>();

export enum TransitionError {
  InvalidTransition = 'InvalidTransition',
  StateNotRegistered = 'StateNotRegistered'
}

export class StateMachine<StateProperties extends Record<string, unknown>, StateNames extends string> {
  /**
   * @description constant to store initial state name
   * @type {string}
   */
  static INITIAL: string = 'initial';
  private initialTransitions: Array<string>
  private logging: boolean

  constructor (opts: {
    initialTransitions: Array<StateNames>,
    initialStateProperties: StateProperties,
    logging?: boolean
  }) {
    if (opts.initialTransitions.length === 0) {
      throw new Error('opts.initialTransitions must contain at least one valid transition string')
    }
    this.initialTransitions = opts.initialTransitions
    this.logging = opts.logging === undefined ? false : true

    // Set initial property values and remember them for future extend calls
    for (let k in opts.initialStateProperties) {
      this[k as string] = opts.initialStateProperties[k]
    }
    this.rememberInitState(opts.initialStateProperties)
  }

  private logError (msg) {
    if (this.logging) {
      console.error(msg)
    }
  }

  /**
   * @description static service method for generate error text about unable transit to
   * @param currentState - from what state cant transit
   * @param stateName - to what state cant transit
   * @returns string - message
   */
  private static NEXT_STATE_RESTRICTED(
    currentState: string,
    stateName: string
  ): string {
    return `Navigate to ${stateName} restricted by 'to' argument of state ${currentState}`;
  }

  /**
   * @description Static service decorator for hiding property/method in for-in
   */
  static hide(
    _target: object,
    _key: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    if (descriptor) {
      descriptor.enumerable = false;
    } else {
      descriptor = { enumerable: false, configurable: true };
    }
    return descriptor;
  }

  /**
   * @description Static service decorator - make state inheritance
   * Name of decorated property becomes as state name
   * @param parentState - name of parent state
   * @param to - states in which we can transit from them state
   */
  static extend(
    parentState: string,
    to: string | Array<string> = []
  ): (target: object, stateName: string) => void {
    return (target: object, stateName: string): void =>
      StateMachineMetadata.defineMetadata(target, stateName, parentState, to);
  }

  /**
   * @description Receive store of inner information for this instance of StateMachine
   */
  @StateMachine.hide
  private get $store(): StateMachineInnerStore {
    let store: StateMachineInnerStore | undefined = StateMachineWeakMap.get(
      this
    );
    if (store) {
      return store;
    }
    store = new StateMachineInnerStore();
    StateMachineWeakMap.set(this, store);
    return store;
  }

  /**
   * @description Service method for get prototype of current instance
   */
  @StateMachine.hide
  private get selfPrototype(): any {
    return Object.getPrototypeOf(this);
  }

  /**
   * @description Service method for get metadata for state
   */
  @StateMachine.hide
  private getMetadataByName(stateName: string): StateMachineMetadata {
    return StateMachineMetadata.getByName(this.selfPrototype, stateName);
  }

  /**
   * @description Method for transit machine to another state
   * Check the target state is registered, check transition is possible
   * @param targetState - name of state to transit
   * @param args - any data for pass to onEnter callback
   */
  @StateMachine.hide
  transitTo(targetState: StateNames, ...args: Array<any>): TransitionError|void {
    // Check target state is registered
    const stateToApply =
      targetState !== 'initial' ? this[targetState as string] : this.$store.initialState;
    if (!stateToApply) {
      // Here and next - simply write error to console and return
      this.logError(`No state '${targetState}' for navigation registered`);
      return TransitionError.StateNotRegistered;
    }

    // Check transition is possible
    if (this.$store.isInitialState) {
      // initial state store next on $next
      if (!this.initialTransitions.includes(targetState)) {
        this.logError(
          StateMachine.NEXT_STATE_RESTRICTED(
            this.$store.currentState,
            targetState
          )
        );
        return TransitionError.InvalidTransition;
      }
    } else {
      // another states store next in them metadata
      const currentStateProps: StateMachineMetadata = this.getMetadataByName(
        this.$store.currentState
      );
      const to: Array<string> = currentStateProps.to;
      if (!to.includes(targetState)) {
        this.logError(
          StateMachine.NEXT_STATE_RESTRICTED(
            this.$store.currentState,
            targetState
          )
        );
        return TransitionError.InvalidTransition;
      }
    }

    // Make chain of states
    const stateChain: Array<any> = [stateToApply];
    if (targetState !== 'initial') {
      const targetStateProps: StateMachineMetadata = this.getMetadataByName(
        targetState
      );
      let parentStateName = targetStateProps.parentState;

      while (parentStateName !== 'initial') {
        stateChain.unshift(this[parentStateName]);
        const prevStateProps: StateMachineMetadata = this.getMetadataByName(
          parentStateName
        );
        parentStateName = prevStateProps.parentState;
      }
    }

    // Call onLeave callbacks
    this.$store.callLeaveCbs();

    // Apply states chain
    merge(this, this.$store.initialState);
    while (stateChain.length) {
      const tempState = stateChain.shift();
      merge(this, tempState);
    }

    // Call all onEnter callbacks
    this.$store.callEnterCbs(targetState, args);

    this.$store.currentState = targetState;
  }

  /**
   * @description Service method. Required to call in constructor of child-class
   * for create a snapshot of initial state
   */
  @StateMachine.hide
  private rememberInitState(state: StateProperties): void {
    for (const key in state) {
      if (key !== 'constructor') {
        this.$store.rememberInitialKey(key, state[key]);
      }
    }
  }

  @StateMachine.hide
  onEnter(stateName: StateNames, cb: (...args: Array<any>) => void): () => void {
    return this.$store.registerEnterCallback(stateName, cb);
  }

  @StateMachine.hide
  onLeave(stateName: StateNames, cb: () => void): () => void {
    return this.$store.registerLeaveCallback(stateName, cb);
  }

  /**
   * @description getter for current state name
   */
  @StateMachine.hide
  get currentState(): string {
    return this.$store.currentState;
  }

  @StateMachine.hide
  is(stateName: StateNames|'initial'): boolean {
    return this.currentState === stateName;
  }

  @StateMachine.hide
  can(stateName: StateNames): boolean {
    if (this.$store.isInitialState) {
      return this.initialTransitions.includes(stateName);
    }
    const currentStateProps: StateMachineMetadata = StateMachineMetadata.getByName(
      this.selfPrototype,
      this.currentState
    );
    return currentStateProps.to.includes(stateName);
  }

  @StateMachine.hide
  transitions(): Array<string> {
    return this.$store.isInitialState
      ? this.initialTransitions
      : this.getMetadataByName(this.currentState).to;
  }
}
