/**
 * @interface
 */
class ISystem {
    /**
     * @param {State} state 
     */
    init(state) { throw "init(state) not implemented" }
    prepareTransition() { throw "prepareTransition() not implemented" }
    prepareTransition() { throw "transition() not implemented" }
}


/**
 * @implements {ISystem}
 */
class System extends ISystem{
    /**
     * @param {String} identifier 
     * @param {LearningStrategy} learningStrategy 
     * @param {String} displayName
     * @param {{allStates: Array.<State>, 
                homeostasisStates: Set.<State>, 
                endStates:Set.<State>, 
                outgoingCouplings: Array.<Coupling>, 
                transitionTable: TransitionTable}} stateDetails
     */
    constructor(identifier, learningStrategy, displayName, { allStates, homeostasisStates, endStates, outgoingCouplings, transitionTable }) {
        this.identifier = identifier
        this.displayName = displayName
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

    prepareTransition() {
        this.outgoingCouplings.forEach(coupling => coupling.signal(this.currentState))
        this.transitionTable.prepareTransition()
        if (this.learningStrategy) this.learningStrategy.transitionReady()
    }

    transition() {
        this.currentState = this.transitionTable.transition()
        if (this.learningStrategy) this.learningStrategy.transitionComplete()
    }

    get state() { return this.currentState }
}

/**
 * @implements {ISystem}
 */
class Source extends ISystem {
    /**
     * 
     * @param {String} displayName
     * @param {String} identifier 
     * @param {Array.<State>} allStates 
     * @param {() => State | StateGenerator | { run: () => State }} stateGenerator
     */
    constructor(identifier, displayName, allStates, stateGenerator) {
        this.identifier = identifier
        this.displayName = displayName
        /**
         * @type {State}
         */
        this.currentState = null
        this.allStates = allStates
        this.stateGenerator = stateGenerator
    }
    /**
     * 
     * @param {State} state 
     */
    init(state) {
        this.currentState = state
    }

    prepareTransition() {
        this.outgoingCouplings.forEach(coupling => coupling.signal(this.currentState))
    }

    transition() {
        this.currentState = this.runStateGenerator()
    }

    runStateGenerator() {
        if (this.stateGenerator instanceof Function) 
            return this.stateGenerator()
        else if (this.stateGenerator instanceof StateGenerator)
            return this.stateGenerator.run()
        else if (typeof this.stateGenerator === "object" && this.stateGenerator.hasOwnProperty("run") && typeof this.stateGenerator.run === "function")
            return this.stateGenerator.run()
        else
            throw "Was given a stateGenerator that was not a function or an object with a run() method"
    }
}

/**
 * @abstract
 */
class StateGenerator {
    /**
     * @returns {State}
     */
    run() { throw "run() not implemented"}
}

/**
 * 
 */
class State {
    /**
     * 
     * @param {String} id 
     */
    constructor(id) {
        this.id = id
    }
}

/**
 * 
 */
class VisibleState {
    /**
     * 
     * @param {String} id 
     */
    constructor(id) {
        this.id = id
    }
}