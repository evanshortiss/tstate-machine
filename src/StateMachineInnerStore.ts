import cloneDeep = require('clone-deep');

type LeaveCallback = (targetState: string) => void;
type EnterCallback = (prevState: string) => void;
/**
 * Store for inner meta-information for concrete StateMachine.
 * All methods and properties of this class used only in parent StateMachine class and no one child statemachine no access to it
 */
export class StateMachineInnerStore<Props> {
  /**
   * @description Store initial state
   */
  private $initialState: Props;

  /**
   * @description name of current state
   */
  public currentState: string = 'initial';

  /**
   * @description - key-value-store for onEnter callbacks
   * key - state name, value - array with callbacks
   */
  private onEnterCbs: Record<string, EnterCallback[]> = {};

  /**
   * @description - key-value-store for onLeave callbacks
   * key - state name, value - array with callbacks
   */
  private onLeaveCbs: Record<string, LeaveCallback[]> = {};

  /**
   * @description store initial value of property to $initialState
   */
  rememberInitialState(props: Props): void {
    this.$initialState = cloneDeep(props);
  }

  get initialState(): Props {
    return this.$initialState;
  }

  get isInitialState(): boolean {
    return this.currentState === 'initial';
  }

  /**
   * @description register onEnter callback, return function for drop callback
   */
  registerEnterCallback(stateName: string, cb: () => void): () => void {
    if (!this.onEnterCbs[stateName]) {
      this.onEnterCbs[stateName] = [];
    }
    const stateEnterCbs: EnterCallback[] = this.onEnterCbs[stateName];
    stateEnterCbs.push(cb);
    return (): any => stateEnterCbs.splice(stateEnterCbs.indexOf(cb), 1);
  }

  /**
   * @description register onLeave callback, return function for drop callback
   */
  registerLeaveCallback(stateName: string, cb: LeaveCallback): () => void {
    if (!this.onLeaveCbs[stateName]) {
      this.onLeaveCbs[stateName] = [];
    }
    const stateLeaveCbs: LeaveCallback[] = this.onLeaveCbs[stateName];
    stateLeaveCbs.push(cb);
    return (): any => stateLeaveCbs.splice(stateLeaveCbs.indexOf(cb), 1);
  }

  callEnterCbs(prevState: string, stateName: string, args?: Array<any>): void {
    if (this.onEnterCbs[stateName]) {
      this.onEnterCbs[stateName].forEach((cb) => cb.apply(cb, [prevState].concat(args || [])));
    }
  }

  callLeaveCbs(targetState: string): void {
    const stateName = this.currentState;
    if (this.onLeaveCbs[stateName]) {
      this.onLeaveCbs[stateName].forEach((cb) => cb(targetState));
    }
  }
}
