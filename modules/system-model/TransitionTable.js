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

class ProbabilisticState {
  /**
   *
   * @param {Distribution} distribution
   */
  constructor(distribution) {
    this.distribution = distribution
  }

  /**
   * @returns {State}
   */
  transition() {
    return this.distribution.get(Math.random())
  }

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
   * @returns {State}
   */
  get(r) {
    for (let i = 0; i < this.lookup.length; i++) {
      if (r <= this.lookup[i].r) return this.lookup[i].s
    }
    throw "ran off the end of the random array for unknown reasons"
  }

  /**
   * @returns {Array.<{r: Number, s: State}>}
   */
  computeLookup() {
    let lookup = []
    let sum = 0
    this.distribution.forEach(({ s, p }) => {
      sum += p
      lookup.push({ r: sum, s })
    })
    lookup[lookup.length-1].r = 1.0 // just in case of FP errors leaving us without a sum of 1
    return lookup
  }
}
