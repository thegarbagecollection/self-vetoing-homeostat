/**
 * 
 */
class TransitionTable {
    /**
     * 
     * @param {NestedStateMap<State,VisibleState,ProbabilisticState>} transitionMap 
     * @param {Array.<Coupling>} incomingCouplings 
     */
    constructor(transitionMap, incomingCouplings) {
        this.transitionMap = transitionMap
        this.incomingCouplings = incomingCouplings
    }

    prepareTransition() {}

    /**
     * @returns {State} the new state for the associated system
     */
    transition() {

    }
}

/**
 * @template PrimaryK, SecondaryK, Value
 * @description PrimaryK is the nested map's first key type, SecondaryK the key type for all nested inner maps, V for the value.
 * 
 * A lookup is done with the pair ( p: PrimaryK, s: SecondaryK[] ), which first uses the primary key to obtain the nested
 * inner maps, then consecutively applies the given secondary keys to extract the nested maps until the final inner map is reached,
 * in which case final key is used to extract the value.
 * 
 * An exception is raised if 1 + s.length !== the number of maps contained
 */
class NestedStateMap {

    /**
     * 
     * @param {PrimaryK} primary 
     * @param {Array.<SecondaryK>} secondaries 
     * @returns {Value}
     */
    get(primary, secondaries) {}

    /**
     * 
     * @param {PrimaryK} primary 
     * @param {Array.<SecondaryK>} secondaries 
     * @param {Value} value 
     */
    set(primary, secondaries, value) {}
}

class ProbabilisticState {
    /**
     * 
     * @param {Array.<{s: State, p: Number}>} distribution 
     */
    constructor(distribution) {
        this.distribution = distribution
    }

    /**
     * @returns {State}
     */
    transition() {}

    /**
     * 
     * @param {Distribution} distribution 
     */
    setDistribution(distribution) {
        this.distribution = distribution
    }
}

class Distribution {
    /**
     * 
     * @param {Array.<{s: State, p: Number}>} distribution 
     */
    constructor(distribution) {
        this.distribution = distribution
        this.lookup = this.computeLookup()
    }
    /**
     * 
     * @param {Number} r in [0,1]
     */
    get(r) {

    }

    computeLookup() {}
}