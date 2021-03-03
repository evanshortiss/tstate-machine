if (
  typeof Reflect === 'undefined' ||
  typeof (Reflect as any).defineMetadata === 'undefined'
) {
  throw new Error(
    'tstate-machine requires Reflect.defineMetadata to be available. Please import/require the "reflect-metadata" module prior to loading tstate-machine.'
  );
}

export { StateMachine } from './StateMachine';
export { PartialProperties } from './PartialProperties';
