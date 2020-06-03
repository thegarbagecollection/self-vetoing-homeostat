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
 * 
 * May also be used as a regular map if s.length === 0
 */
class NestedStateMap {
  /**
   *
   * @param {Number} secondaryCount
   * @param {(p: PrimaryK) => any} pkExtractor extracts the key from the primary object
   * @param {(s: SecondaryK) => any} skExtractor extracts the key from the primary object
   */
  constructor(secondaryCount, pkExtractor, skExtractor) {
    this.map = new Map()
    this.secondaryCount = secondaryCount
    this.pkExtractor = pkExtractor
    this.skExtractor = skExtractor
  }
  /**
   *
   * @param {PrimaryK} primary
   * @param {Array.<SecondaryK>} secondaries
   * @returns {Value}
   */
  get(primary, secondaries) {
    let pk = this.pkExtractor(primary)
    if (!this.map.has(pk)) `key not found: ${pk} of (${pk}, ${sks.toString()})`
    let sks = secondaries.map(this.skExtractor)
    if (secondaries && secondaries.length !== this.secondaryCount) throw `get() given secondaries of length ${secondaries.length}; required ${this.secondaryCount}`
    if (!secondaries || secondaries.length === 0) {
      return this.map.get(pk)
    }
    else {
      /** @type {Map | Value} */
      let outer = this.map.get(pk)
      sks.forEach(sk => {
        if (!outer.has(sk)) throw `key not found: ${sk} of (${pk}, ${sks.toString()})`
        outer = outer.get(sk) // in last iteration, this gets assigned a Value
      })
      return outer
    }
  }

  /**
   *
   * @param {PrimaryK} primary
   * @param {Array.<SecondaryK>} secondaries
   * @param {Value} value
   */
  set(primary, secondaries, value) {
    let pk = this.pkExtractor(primary)
    let sks = secondaries.map(this.skExtractor)
    if (secondaries && secondaries.length !== this.secondaryCount) throw `set() given secondaries of length ${secondaries.length}; required ${this.secondaryCount}`
    if (!secondaries || secondaries.length === 0) {
      this.map.set(pk, value)
    } else {
      if (!this.map.has(pk)) this.map.set(pk, new Map())
      /** @type {Map} */
      let outer = this.map.get(pk)

      sks.forEach((sk, i) => {
        // need to distinguish the case where this is the last sk (maps to value) rather than not (maps to Map)
        if (i === sks.length - 1) { // last element, so needs to set a value
          outer.set(sk, value)
        }
        if (!outer.has(sk) && i < sks.length - 1) {
          outer.set(sk, new Map())
        }
        /** @type {Map} */
        outer = outer.get(sk) // in the last iteration, this gets assigned a non-map, but doesn't matter because we're done
      })
    }
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
