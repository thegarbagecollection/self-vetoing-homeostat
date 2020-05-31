/**
 * 
 */
class System {
    /**
     * @param {String} identifier 
     * @param {LearningStrategy} learningStrategy 
     * @param {{allStates: Array.<State>, 
                homeostasisStates: Set.<State>, 
                endStates:Set.<State>, 
                outgoingCouplings: Array.<Coupling>, 
                transitionTable: TransitionTable}} stateDetails
     */
    constructor(identifier, learningStrategy, { allStates, homeostasisStates, endStates, outgoingCouplings, transitionTable }) {
        this.identifier = identifier
        this.currentState = null
        this.allStates = allStates
        this.homeostasisStates = homeostasisStates
        this.endStates = endStates
        this.transitionTable = transitionTable
        this.outgoingCouplings = outgoingCouplings
        this.learningStrategy = learningStrategy
        this.learningStrategy.setup(this, transitionTable)
    }

    /**
     * 
     * @param {State} state 
     */
    init(state) {
        this.currentState = state
    }

    prepareTransition() {}

    transition()
}


/**
 * 
 */
class State {
    constructor(id) {
        this.id = id
    }
}

/**
 * 
 */
class VisibleState {
    constructor(id) {
        this.id = id
    }
}