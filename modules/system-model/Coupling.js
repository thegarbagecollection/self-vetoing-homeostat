/**
 * 
 */
class Coupling {
    /**
     * 
     * @param {String} identifier 
     * @param {(state:State) => VisibleState} toVisibleState 
     * @param {String} sourceIdentifier
     */
    constructor(identifier, toVisibleState, sourceIdentifier) {
        this.identifier = identifier
        /**
         * @type {State}
         */
        this.currentSignal = null
        this.toVisibleState = toVisibleState
        this.sourceIdentifier = sourceIdentifier
    }

    /**
     * 
     * @param {State} state 
     */
    signal(state) {
        this.currentSignal = state
    }      

    /**
     * @returns {VisibleState}
     */
    retrieve() {
        return this.toVisibleState(this.currentSignal)
    }
}