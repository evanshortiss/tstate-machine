import { expect } from 'chai';

describe('Reflect.defineMetadata requirements', () => {
  it('should raise an error if Reflect.defineMetadata is not defined', () => {
    expect(() => {
      require('../src/index');
    }).to.throw(
      'tstate-machine requires Reflect.defineMetadata to be available. Please import/require the "reflect-metadata" module prior to loading tstate-machine.'
    );
  });
});
