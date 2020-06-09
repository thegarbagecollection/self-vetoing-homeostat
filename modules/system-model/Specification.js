class Specification {
  constructor() {
    // identifier ARRAY (find duplicates!) for: systems, couplings, transitions
  }
  construct() {}
  checkConflicts() {
    // checkIdentifiers()
    // other stuff
  }

  /**
   * @returns {Array.<ISystem>}
   */
  getSystems() {}
  /**
   * @returns {Array.<Coupling>}
   */
  getCouplings() {}
}
class SystemSpecification {
  /**
   *
   * @param {String} identifier
   * @param {String} displayName
   * @param {SystemStatesSpec} stateIdentifiers
   * @param {String} transitionID
   * @param {Map.<String, TransitionSpecification>} transitionSpecifications
   * @param {NullTransitionSpecification} nullTransition
   * @param {SystemStatesSpec} homeostasisGroupings
   * @param {SystemStatesSpec} deathStates
   * @param {Array.<CouplingSpecification>} couplings
   */
  constructor(identifier, displayName, stateIdentifiers, transitionID, transitionSpecifications, nullTransition, homeostasisGroupings, deathStates, couplings) {
    this.identifier = identifier
    this.displayName = displayName ? displayName : identifier
    this.stateIdentifiers = stateIdentifiers
    this.transitionSpecification = transitionSpecifications.get(transitionID)
    this.nullTransition = nullTransition
    this.homeostasisGroupings = homeostasisGroupings
    this.deathStates = deathStates
    this.couplings = couplings
  }
  check() {
    // TODO
    // check transition specification!
  }
  checkHomeostasisGroupings() {}
  checkDeathStates() {}
  construct() {}
}

/**
 * @typedef {{primary: String, secondaries: Array.<String>, resultState: String}} SingleTransitionSpec
 */
/**
 * @typedef {{primary: String, secondaries: Array.<String>}} SingleTransitionPossibility
 */
/**
 * @typedef {Array.<SingleTransitionSpec>} TransitionTableSpec
 */
/**
 * @typedef {Array.<String>} SystemStatesSpec
 */
/**
 * @typedef {Array.<String>} CouplingOutputStateSpec
 */
class TransitionSpecification {
  /**
   *
   * @param {String} identifier
   * @param {SystemStatesSpec} systemStates
   * @param {TransitionTableSpec} transitions
   */
  constructor(identifier, transitions) {
    this.identifier = identifier
    this.transitions = transitions
  }
  /**
   * Requires a transition table to exist - i.e. not simply the null transition
   * @param {String} systemID
   * @param {SystemStatesSpec} systemStates 
   * @param {Array.<CouplingOutputStateSpec>} couplingsStates 
   */
  checkForSystem(systemID, systemStates, couplingsStates) {
    let checkResult = new ValidationCheckResult()
    let missingStates = this.transitions.map(({ resultState }) => resultState).filter(resultState  => !systemStates.includes(resultState))

    if (missingStates) {
      checkResult.fail(`Transition table error: table ${this.identifier} in system ${systemID} had the following states not in the system: ${missingStates.join(", ")}`)
    }

    let allPossibleTransitions = this.buildAllPossibleTransitions(systemStates, couplingsStates)
    // check that every possible transition is present
    this.checkAllPossibleTransitions(checkResult, allPossibleTransitions)

    // Do we need to check that all states in the transition table can be reached? Probably give a warning
    this.checkAllTransitionsReachable(checkResult, allPossibleTransitions)
  }

  /**
   * 
   * @param {SystemStatesSpec} systemStates must be non-empty
   * @param {Array.<CouplingOutputStateSpec>} couplingsStates must be non-empty
   * @returns {Array.<SingleTransitionPossibility>}
   */
  buildAllPossibleTransitions(systemStates, couplingsStates) {
    let ret = []
    systemStates.forEach(s => {
      this.buildAllPossibleRec(s, [], ret, couplingsStates)
    })
  }
  buildAllPossibleRec(currStart, currTuple, ret, couplingsStates) {
    if (currTuple.length === couplingsStates.length) {
      ret.push({ primary: currStart, secondaries: currTuple })
    }
    else {
      couplingsStates[currTuple.length].forEach(sec => {
        let newTuple = Array.from(currTuple)
        newTuple.push(sec)
        this.buildAllPossibleRec(currStart, newTuple, ret, couplingsStates)
      })      
    }
  }

  /**
   * Will fail with the given validation check if any transition was missing
   * @param {ValidationCheckResult} checkResult 
   * @param {Array.<SingleTransitionPossibility} allPossibleTransitions
   */
  checkAllPossibleTransitions(checkResult, allPossibleTransitions) {
    allPossibleTransitions.forEach(transition => {
      if (!this.checkTransitionInGivenTransitions(transition)) {
        checkResult.fail(`Transition table error: table ${this.identifier} in system ${systemID} did not provide a transition for ${this.transitionToString(transition)}`)
      }
    })
  }

  /**
   * 
   * @param {SingleTransitionPossibility} possibility 
   * @returns {Boolean}
   */
  checkTransitionInGivenTransitions(possibility) {
    return this.transitions.some(transition2 => this.compareTransitionPossibility(possibility, transition2))
  }

  /**
   * 
   * @param {SingleTransitionPossibility | SingleTransitionSpec} t1 can be either a fully-specified transition (with result) or a transition possibility
   * @param {SingleTransitionPossibility  | SingleTransitionSpec} t2 
   * @returns {Boolean}
   */
  compareTransitionPossibility(t1, t2) {
    let { primary: p1, secondaries: s1s } = t1
    let { primary: p2, secondaries: s2s } = t2

    if (p1 !== p2 || r1 !== r2 || s1s.length !== s2s.length) return false

    for (let i = 0; i < s1s.length; i++) {
      let s1 = s1s[i]
      let s2 = s2s[i]
      if (s1 !== s2) return false
    }

    return true
  }

  /**
   * 
   * @param {SingleTransitionSpec} transition 
   * @returns {String}
   */
  transitionToString(transition) {
    let str = `${transition.primary} x ${transition.secondaries.join(" x ")}`
    return str
  }

  /**
   * 
   * @param {ValidationCheckResult} checkResult 
   * @param {Array.<SingleTransitionPossibility>} allPossibleTransitions 
   */
  checkAllTransitionsReachable(checkResult, allPossibleTransitions) {
    this.transitions.forEach(transition => {
      let possible = allPossibleTransitions.some(possible => this.compareTransitionPossibility(transition, possible))
      if (!possible) {
        checkResult.warn(`Transition table warning: table ${this.identifier} in system ${systemID} has an unreachable transition ${this.transitionToString(transition)}`)
      }
    })
  }
}

class NullTransitionSpecification {
  /**
   * @param {SystemStatesSpec} systemStates
   * @param {Map.<String, String>} mapping
   */
  constructor(systemIdentifier, systemStates, mapping) {
    this.systemIdentifier = systemIdentifier
    this.systemStates = new Set(systemStates)
    this.mapping = mapping
  }
  check() {
    let checkResult = new ValidationCheckResult()
    this.mapping.forEach((v, k) => {
      if (!this.systemStates.has(v)) {
        checkResult.fail(`Null transition error: system ${this.systemIdentifier} had a transition ${k}->${v}, but ${v} is not a system state`)
      }
      if (!this.systemStates.has(k)) {
        checkResult.fail(`Null transition error: system ${this.systemIdentifier} had a transition ${k}->${v}, but ${k} is not a system state`)
      }
    })

    this.systemStates.forEach(v => {
      if (!this.mapping.has(v)) {
        checkResult.fail(`Null transition error: system ${this.systemIdentifier} does not have a null transition for state ${v}`)
      }
    })
    return checkResult
  }
}

class CouplingSpecification {
  /**
   *
   * @param {String} identifier
   * @param {String} fromID
   * @param {SystemStatesSpec} fromStates
   * @param {String} toID
   * @param {Map.<String, String>} mapping
   */
  constructor(identifier, fromID, fromStates, toID, mapping) {
    this.visibleStates = new Set(mapping.keys())
  }
  check() {}
}

class ValidationCheckResult {
  constructor() {
    this.failed = false
    this.msgLog = []
  }
  fail(msg) {
    this.failed = true
    this.msgLog.push(msg)
  }
  warn(msg) {
    this.msgLog.push(msg)
  }
  wasSuccess() {
    return !this.failed
  }

  /**
   *
   * @param {ValidationCheckResult} other
   * @returns {ValidationCheckResult}
   */
  merge(other) {
    let vcr = new ValidationCheckResult()
    vcr.failed = this.failed || other.failed
    vcr.msgLog = this.msgLog.concat(other.msgLog)
    return vcr
  }

  /**
   *
   * @param  {...ValidationCheckResult} others
   * @returns {ValidationCheckResult}
   */
  mergeMultiple(...others) {
    let vcr = new ValidationCheckResult()
    vcr.failed = this.failed || others.map(o => o.failed).some(x => x)
    vcr.msgLog = this.msgLog.concat(others.map(o => o.msgLog))
  }
}
