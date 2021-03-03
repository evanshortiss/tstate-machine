import { merge } from './utils/merge';
import { StateMachineInnerStore } from './StateMachineInnerStore';
import { StateMachineMetadata } from './StateMachineMetadata';

/**
 * @description isolated store for meta-information of concrete StateMachine
 */
const StateMachineWeakMap: WeakMap<
  StateMachine<any, any>,
  StateMachineInnerStore<any>
> = new WeakMap<StateMachine<any, any>, StateMachineInnerStore<any>>();

export enum TransitionError {
  InvalidTransition = 'InvalidTransition',
  StateNotRegistered = 'StateNotRegistered'
}

export class StateMachine<
  Props extends Record<string, unknown>,
  ValidStates extends string
> {
  /**
   * @description constant to store initial state name
   * @type {string}
   */
  static INITIAL: string = 'initial';
  private initialTransitions: Array<string>;
  private logging: boolean;
  public props: Props;
  private transitioning = false

  constructor(opts: {
    initialTransitions: Array<ValidStates>;
    props: Props;
    logging?: boolean;
  }) {
    if (opts.initialTransitions.length === 0) {
      throw new Error(
        'opts.initialTransitions must contain at least one valid transition string'
      );
    }
    this.initialTransitions = opts.initialTransitions;
    this.logging = opts.logging === undefined ? false : true;

    // Set initial property values and remember them for future extend calls
    this.props = opts.props;
    this.rememberInitProps(opts.props);
  }

  private logError(msg) {
    if (this.logging) {
      console.error(msg);
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
  private get $store(): StateMachineInnerStore<Props> {
    let store:
      | StateMachineInnerStore<Props>
      | undefined = StateMachineWeakMap.get(this);
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

  @StateMachine.hide
  transitTo(
    targetState: ValidStates,
    ...args: Array<any>
  ) {
    if (this.transitioning) {
      throw new Error('Calling transitTo from an onEnter/onLeave callback is not supported')
    }

    this.transitioning = true
    const ret = this._transitTo(targetState, ...args)
    this.transitioning = false

    return ret
  }

  /**
   * @description Method for transit machine to another state
   * Check the target state is registered, check transition is possible
   * @param targetState - name of state to transit
   * @param args - any data for pass to onEnter callback
   */
  @StateMachine.hide
  private _transitTo(
    targetState: ValidStates,
    ...args: Array<any>
  ): TransitionError | void {
    // Check target state is registered
    const stateToApply =
      targetState !== 'initial'
        ? this[targetState as string]
        : this.$store.initialState;
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
    this.$store.callLeaveCbs(targetState);

    // Apply states chain
    merge(this.props, this.$store.initialState);
    while (stateChain.length) {
      const tempState = stateChain.shift();
      merge(this.props, tempState);
    }

    const prevState = this.$store.currentState
    this.$store.currentState = targetState;

    // Call all onEnter callbacks
    this.$store.callEnterCbs(prevState, targetState, args);
  }

  /**
   * @description Service method. Required to call in constructor of child-class
   * for create a snapshot of initial state
   */
  @StateMachine.hide
  private rememberInitProps(props: Props): void {
    this.$store.rememberInitialState(props);
  }

  @StateMachine.hide
  onEnter(
    stateName: ValidStates,
    cb: (...args: Array<any>) => void
  ): () => void {
    return this.$store.registerEnterCallback(stateName, cb);
  }

  @StateMachine.hide
  onLeave(stateName: ValidStates|'initial', cb: (toState: string) => void): () => void {
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
  is(stateName: ValidStates | 'initial'): boolean {
    return this.currentState === stateName;
  }

  @StateMachine.hide
  can(stateName: ValidStates): boolean {
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
