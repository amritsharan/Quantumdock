
import { EventEmitter } from 'events';

// This is a global event emitter to propagate errors, especially for async operations
// where standard try/catch blocks in React components are not sufficient.
export const errorEmitter = new EventEmitter();
