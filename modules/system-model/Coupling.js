/**
 * 
 */
class Coupling {
    /**
     * 
     * @param {String} identifier 
     * @param {(state:State) => State} toVisibleState 
     */
    constructor(identifier, toVisibleState) {
        this.identifier = identifier
        /**
         * @type {State}
         */
        this.currentSignal = null
        this.toVisibleState = toVisibleState
    }

    /**
     * 
     * @param {State} state 
     */
    signal(state) {
        this.currentSignal = state
    }      

    /**
     * @returns {State}
     */
    retrieve() {
        return this.toVisibleState(this.currentSignal)
    }
}