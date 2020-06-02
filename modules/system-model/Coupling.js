/**
 * 
 */
class Coupling {
    /**
     * 
     * @param {String} displayName
     * @param {String} identifier 
     * @param {(state:State) => VisibleState} toVisibleState 
     * @param {String} sourceIdentifier
     */
    constructor(identifier, displayName, sourceIdentifier, toVisibleState) {
        this.identifier = identifier
        this.displayName = displayName
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