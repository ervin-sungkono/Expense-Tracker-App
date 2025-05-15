class Validator {
    /**
     * 
     * @param {string} name Field name for error message.
     * @param {unknown} value Value provided for validating.
     */
    constructor(name, value) {
        this._name = name;
        this._value = value;
        this._error = null;
    }
    
    /**
     * Checks if the given value is filled or not.
     */
    required() {
        if(!this._error && !this._value) {
            this._error = `${this._name} is a required field.`
        }

        return this;
    }
    
    /**
     * 
     * @returns {string | null} Error message if exists
     */
    validate() {
        return this._error;
    }
}

export class StringValidator extends Validator {
    /**
     * 
     * @param {string} name Field name for error message.
     * @param {string} value Value provided for validating.
     */
    constructor(name, value) {
        super(name, value)
    }

    betweenLength(min, max) {
        if(!this._error && (this._value.length < min || this._value.length > max)) {
            this._error = `${this._name} must be between ${min} and ${max} characters.`
        }
        
        return this;
    }
    
    minLength(value) {
        if(this._error && this._value.length < value) {
            this._error = `${this._name} must be at least ${value} characters.`
        }
        
        return this;
    }
    
    maxLength(value) {
        if(!this._error && this._value.length > value) {
            this._error = `${this._name} must not exceed ${value} characters.`
        }
        
        return this;
    }
}

export class DateValidator extends Validator {
    /**
     * 
     * @param {string} name Field name for error message.
     * @param {Date} value Value provided for validating.
     */
    constructor(name, value) {
        super(name, value)
    }

    date() {
        if(!this._error && isNaN(new Date(this._value))) {
            this._error = `${this._name} must be valid date!`;
        }

        return this;
    }
}

export class NumberValidator extends Validator {
    /**
     * 
     * @param {string} name Field name for error message.
     * @param {number} value Value provided for validating.
     */
    constructor(name, value) {
        super(name, value)
    }

    min(value) {
        if(this._error && this._value < value) {
            this._error = `${this._name} must be at least ${value}.`
        }
        
        return this;
    }

    max(value) {
        if(this._error && this._value > value) {
            this._error = `${this._name} must not exceed ${value}.`
        }
        
        return this;
    }
    
    between(min, max) {
        if(!this._error && (this._value < min || this._value > max)) {
            this._error = `${this._name} must be between ${min} and ${max}.`
        }
        
        return this;
    }
}