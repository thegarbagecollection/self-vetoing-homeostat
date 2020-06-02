/**
 * @typedef {Array.<{id: String, visibleState: VisibleState}>} VisibleStateTuple
 */

/**
 * @typedef { {
 *   state: State,
 *   visibleStateIDTuple: VisibleStateTuple,
 *   probabilityDistribution: ProbabilisticState
 * }
 * } Transition
 */

/**
 * @typedef {{
 *   transition: Transition
 *   resultingState: State}
 * } CompletedTransition
 */

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
    /**
     * @type {Transition}
     */
    this.comingTransition = null

    /**
     * @type {CompletedTransition}
     */
    this.completedTransition = null
  }

  /**
   *
   * @param {State} fromState
   */
  prepareTransition(fromState) {
    let visibleStateIDTuple = this.incomingCouplings.map(coupling => ({ id: coupling.identifier, visibleState: coupling.retrieve() }))
    let visibleStateTuple = this.comingTransition.visibleStateIDTuple.map(({ visibleState }) => visibleState)
    this.comingTransition = {
      state: fromState,
      visibleStateIDTuple,
      probabilityDistribution: this.transitionMap.get(fromState, visibleStateTuple),
    }
  }

  /**
   * @returns {State} the new state for the associated system
   */
  transition() {
    let nextState = this.comingTransition.probabilityDistribution.transition()
    this.completedTransition = {
      transition: this.comingTransition,
      resultingState: nextState,
    }
    return nextState
  }

  /**
   * @returns {CompletedTransition}
   */
  getCompletedTransition() {
    return this.completedTransition
  }
}

/**
 * @template PrimaryK, SecondaryK, Value
 * @description PrimaryK is the nested map's first key type, SecondaryK the key type for all nested inner maps, V for the value.
 *
 * A lookup is done with the pair ( p: PrimaryK, s: SecondaryK[] ), which first uses the primary key to obtain the nested
 * inner maps, then consecutively applies the given secondary keys to extract the nested maps until the final inner map is reached,
 * in which case final key is used to extract the value. Note that s must be in the correct order!
 *
 * An exception is raised if 1 + s.length !== the number of maps contained
 */
class NestedStateMap {
  /**
   * 
   * @param {Number} secondaryCount 
   */
  constructor(secondaryCount) {
    this.secondaryCount = secondaryCount
  }
  /**
   *
   * @param {PrimaryK} primary
   * @param {Array.<SecondaryK>} secondaries
   * @returns {Value}
   */
  get(primary, secondaries) {
    if (secondaries.length !== this.secondaryCount) throw `get() given secondaries of length ${secondaries.length}; required ${this.secondaryCount}`
    
  }

  /**
   *
   * @param {PrimaryK} primary
   * @param {Array.<SecondaryK>} secondaries
   * @param {Value} value
   */
  set(primary, secondaries, value) {
    if (secondaries.length !== this.secondaryCount) throw `set() given secondaries of length ${secondaries.length}; required ${this.secondaryCount}`
  }
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
  get(r) {}

  computeLookup() {}
}
