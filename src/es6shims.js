'use strict';

if (!Number.isNaN) {
    Object.defineProperty(Number, 'isNaN', {
        'value': function (value) {
            return value !== value;
        },
        'configurable': true,
        'writable': true
    });
}
