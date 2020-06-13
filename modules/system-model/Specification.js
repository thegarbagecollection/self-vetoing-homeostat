class Specification {
  /**
   * @param {Array.<SystemSpecification>} systemSpecifications 
   * @param {Array.<CouplingSpecification>} couplingSpecifications 
   * @param {Array.<TransitionSpecification>} transitionSpecifications 
   * @param {Array.<NullTransitionSpecification} nullTransitionSpecifications
   */
  constructor(systemSpecifications, couplingSpecifications, transitionSpecifications, nullTransitionSpecifications) {
    this.systemSpecifications = systemSpecifications
    this.couplingSpecifications = couplingSpecifications
    this.transitionSpecifications = transitionSpecifications
    this.nullTransitionSpecifications = nullTransitionSpecifications
    this.systemIDs = this.systemSpecifications.map(spec => spec.identifier)
    this.couplingIDs = this.couplingSpecifications.map(spec => spec.identifier)
    this.transitionIDs = this.transitionSpecifications.map(spec => spec.identifier)
    this.nullTransitionIDs = this.nullTransitionSpecifications.map(spec => spec.identifier)

    // Get assigned once IDs are checked for uniqueness
    this.systemLookup = null
    this.couplingLookup = null
    this.transitionLookup = null
    this.nullTransitionLookup = null
  }
  /**
   * @returns {{ systemResultsMerged: ValidationCheckResult, transitionResultsMerged: ValidationCheckResult, nullTransitionResultsMerged: ValidationCheckResult, couplingResultsMerged: ValidationCheckResult }}
   */
  checkConflicts() {
    let vcr = new ValidationCheckResult()
    this.checkIdentifierUniqueness(vcr)
    if (!vcr.wasSuccess()) {
      // Early termination - we can't do the checks if identifiers aren't unique
      return vcr
    }
    // build lookups id->spec
    this.systemLookup = this.buildLookup(this.systemSpecifications)
    this.couplingLookup = this.buildLookup(this.couplingSpecifications)
    this.transitionLookup = this.buildLookup(this.transitionSpecifications)
    this.nullTransitionLookup = this.buildLookup(this.nullTransitionSpecifications)

    let couplingResults = Array.from(this.couplingLookup.values()).map(c => c.check(this.systemLookup))

    /** @type {Map.<String, Array.<CouplingSpecification>} */
    let incomingCouplings = new Map()
    /** @type {Map.<String, Array.<CouplingSpecification>} */
    let outgoingCouplings = new Map()
    this.couplingSpecifications.forEach(coupling => {
      if (!incomingCouplings.has(coupling.toID)) incomingCouplings.set(coupling.toID, [])
      incomingCouplings.get(coupling.toID).push(coupling)

      if (!outgoingCouplings.has(coupling.fromID)) outgoingCouplings.set(coupling.fromID, [])
      outgoingCouplings.get(coupling.fromID).push(coupling)
    })

    this.systemSpecifications.forEach(system => system.setIncomingAndOutgoingCouplings(incomingCouplings, outgoingCouplings))

    // this contains, for each system, the system check result, the transition table check result, and the null transition table check result
    let systemResultsComplete = this.systemSpecifications.map(system => system.check(this.transitionLookup, this.nullTransitionLookup, this.couplingLookup))
    
    let systemResults = systemResultsComplete.map(({systemResults}) => systemResults)
    let transitionResults = systemResultsComplete.map(({ transitionResults }) => transitionResults)
    let nullTransitionResults = systemResultsComplete.map(({ nullTransitionResults }) => nullTransitionResults)

    // we want all system, transition, null transition, and coupling results combined by category for easy display
    let systemResultsMerged = systemResults ? systemResults[0].mergeMultiple(systemResults.slice(1)) : null
    let transitionResultsMerged = transitionResults ? transitionResults[0].mergeMultiple(transitionResults.slice(1)) : null
    let nullTransitionResultsMerged = nullTransitionResults ? nullTransitionResults[0].mergeMultiple(nullTransitionResults.slice(1)) : null
    let couplingResultsMerged = couplingResults ? couplingResults[0].mergeMultiple(couplingResults.slice(1)) : null

    return { systemResultsMerged, transitionResultsMerged, nullTransitionResultsMerged, couplingResultsMerged }
  }

  /**
   * @template {{identifier: String}} T any
   * @param {Array.<T>} hasIdentifiers any objects with an identifier property
   * @returns {Map<String, T>} a map from identifiers to their associated object. Behaviour
   * is undefined if identifiers are duplicated in hasIdentifiers
   */
  buildLookup(hasIdentifiers) {
    let m = new Map()
    hasIdentifiers.forEach((obj) => {
      m.set(obj.identifier, obj)
    })
    return m
  }

  /**
   * @param {ValidationCheckResult} checkResult 
   */
  checkIdentifierUniqueness(checkResult) {
    let dupSystemIDs = this.getDuplicates(this.systemIDs)
    if (dupSystemIDs) {
      checkResult.fail(`Identifier uniqueness error: system identifiers ${dupSystemIDs.join(", ")} are duplicated`)
    }
    let dupCouplingIDs = this.getDuplicates(this.couplingIDs)
    if (dupCouplingIDs) {
      checkResult.fail(`Identifier uniqueness error: coupling identifiers ${dupCouplingIDs.join(", ")} are duplicated`)
    }
    let dupTransitionIDs = this.getDuplicates(this.transitionIDs)
    if (dupTransitionIDs) {
      checkResult.fail(`Identifier uniqueness error: transition identifiers ${dupTransitionIDs.join(", ")} are duplicated`)
    }
  }

  /**
   * @template T
   * @param {Array.<T>} array 
   */
  getDuplicates(array) {
    let reduced = Array.from(new Set(array))
    let cpy = Array.from(array)

    reduced.forEach(e => {
      let i = cpy.indexOf(e)
      cpy.splice(i, 1)
    })
    return cpy
  }

  construct() {}

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
   * @param {SystemStatesInput} stateIdentifiers
   * @param {String} transitionID
   * @param {String} nullTransitionID
   * @param {SystemStatesInput} homeostasisGroupings
   * @param {SystemStatesInput} deathStates
   */
  constructor(identifier, displayName, stateIdentifiers, transitionID, nullTransitionID, homeostasisGroupings, deathStates) {
    this.identifier = identifier
    this.displayName = displayName ? displayName : identifier
    this.stateIdentifiers = stateIdentifiers
    this.transitionID = transitionID
    this.nullTransitionID = nullTransitionID
    this.homeostasisGroupings = homeostasisGroupings
    this.deathStates = deathStates
    this.incomingCouplings = null
    this.outgoingCouplings = null
  }

  /**
   * 
   * @param {Map.<String, CouplingSpecification>} incomingCouplings 
   * @param {Map.<String, CouplingSpecification>} outgoingCouplings 
   */
  setIncomingAndOutgoingCouplings(incomingCouplings, outgoingCouplings) {
    this.incomingCouplings = incomingCouplings.get(this.identifier)
    this.outgoingCouplings = outgoingCouplings.get(this.identifier)
  }

  /**
   * 
   * @param {Map.<String, TransitionSpecification>} transitionLookup 
   * @param {Map.<String, NullTransitionSpecification>} nullTransitionLookup 
   * @param {Map.<String, CouplingSpecification>} couplingLookup 
   * @returns {{ transitionResults: ValidationCheckResult, nullTransitionResults: ValidationCheckResult, systemResults: ValidationCheckResult }}
   */
  check(transitionLookup, nullTransitionLookup, couplingLookup) {
    TODOasdas ...
    return { transitionResults, nullTransitionResults, systemResults }
  }
  checkOrAssignHomeostasisGroupings(checkResult) {
    let generatedHomeostasisGroupings = this.generateHomestasisGroupings()
    if (this.homeostasisGroupings) {
      this.compareHomeostasisGroupings(checkResult, generatedHomeostasisGroupings)
    }
    else {
      this.homeostasisGroupings = generatedHomeostasisGroupings
    }
  }

  /**
   * requires homeostasis groupings to have been checked
   */
  checkDeathStates(checkResult) {

  }

  generateHomestasisGroupings() {

  }

  compareHomeostasisGroupings(checkResult, generatedHomeostasisGroupings) {

  }

  construct() {}
}

/**
 * @typedef {{primary: String, secondaries: Array.<String>, resultState: String}} SingleTransitionInput
 */
/**
 * @typedef {{primary: String, secondaries: Array.<String>}} SingleTransitionPossibility
 */
/**
 * @typedef {Array.<SingleTransitionInput>} TransitionTableInput
 */
/**
 * @typedef {Array.<String>} SystemStatesInput
 */
/**
 * @typedef {Array.<String>} CouplingOutputStatesInput
 */
class TransitionSpecification {
  /**
   *
   * @param {String} identifier
   * @param {TransitionTableInput} transitions
   */
  constructor(identifier, transitions) {
    this.identifier = identifier
    this.transitions = transitions
  }
  /**
   * Requires a transition table to exist - i.e. not simply the null transition
   * @param {String} systemID
   * @param {SystemStatesInput} systemStates 
   * @param {Array.<CouplingOutputStatesInput>} couplingsStates 
   */
  checkForSystem(systemID, systemStates, couplingsStates) {
    let checkResult = new ValidationCheckResult()
    let missingStates = this.transitions.map(({ resultState }) => resultState).filter(resultState  => !systemStates.includes(resultState))

    if (missingStates) {
      checkResult.fail(`Transition table error: table ${this.identifier} in system ${systemID} had the following states not in the system: ${missingStates.join(", ")}`)
    }

    let allPossibleTransitions = this.buildAllPossibleTransitions(systemStates, couplingsStates)
    // check that every possible transition is present
    this.checkAllPossibleTransitions(checkResult, allPossibleTransitions, systemID)

    // Do we need to check that all states in the transition table can be reached? Probably give a warning
    this.checkAllTransitionsReachable(checkResult, allPossibleTransitions, systemID)
  }

  /**
   * 
   * @param {SystemStatesInput} systemStates must be non-empty
   * @param {Array.<CouplingOutputStatesInput>} couplingsStates must be non-empty
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
   * @param {String} systemID for error display
   */
  checkAllPossibleTransitions(checkResult, allPossibleTransitions, systemID) {
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
    return this.transitions.some(transition => this.compareTransitionPossibility(possibility, transition))
  }

  /**
   * 
   * @param {SingleTransitionPossibility | SingleTransitionInput} t1 can be either a fully-specified transition (with result) or a transition possibility
   * @param {SingleTransitionPossibility  | SingleTransitionInput} t2 can be either a fully-specified transition (with result) or a transition possibility
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
   * @param {SingleTransitionInput} transition 
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
   * @param {String} systemID for error display
   */
  checkAllTransitionsReachable(checkResult, allPossibleTransitions, systemID) {
    this.transitions.forEach(transition => {
      let possible = allPossibleTransitions.some(possible => this.compareTransitionPossibility(transition, possible))
      if (!possible) {
        checkResult.warn(`Transition table warning: table ${this.identifier} in system ${systemID} has an unreachable transition ${this.transitionToString(transition)}`)
      }
    })
  }
}

/**
 * Check this inside each system that references it
 */
class NullTransitionSpecification {
  /**
   * @param {String} identifier
   * @param {Map.<String, String>} mapping
   */
  constructor(identifier, mapping) {
    this.identifier = identifier
    this.mapping = mapping
  }
  /**
   * @param {String} systemIdentifier used for error message
   * @param {Array.<String>} systemStates
   */
  check(systemIdentifier, systemStates) {
    let checkResult = new ValidationCheckResult()

    this.mapping.forEach((v, k) => {
      if (!systemStates.includes(v)) {
        checkResult.fail(`Null transition error: for null transition ${this.identifier}, system ${systemIdentifier} had a transition ${k}->${v}, but ${v} is not a system state`)
      }
      if (!systemStates.includes(k)) {
        checkResult.fail(`Null transition error: for null transition ${this.identifier}, system ${systemIdentifier} had a transition ${k}->${v}, but ${k} is not a system state`)
      }
    })

    systems.forEach(v => {
      if (!this.mapping.has(v)) {
        checkResult.fail(`Null transition error: system ${systemIdentifier} does not have a null transition for state ${v}`)
      }
    })
    return checkResult
  }
}

/**
 * For some coupling A->B
 */
class CouplingSpecification {
  /**
   *
   * @param {String} identifier
   * @param {String} fromID the system the coupling is taking an input from
   * @param {String} toID the system the coupling is sending an output to
   * @param {Map.<String, String>} mapping
   */
  constructor(identifier, fromID, toID, mapping) {
    this.identifier = identifier
    this.visibleStates = new Set(mapping.values())
    this.fromID = fromID
    this.toID = toID
    this.mapping = mapping
  }
  /**
   * 
   * @param {Map.<String, SystemSpecification>} systems all the systems, mapped by their identifiers
   * @returns {ValidationCheckResult}
   */
  check(systems) {
    let fromStates = systems.get(fromID) ? systems.get(fromID).stateIdentifiers : null
    let toStates = systems.get(toID) ? systems.get(toID).stateIdentifiers : null
    let vcr = new ValidationCheckResult()
    this.checkAandBValid(vcr, fromStates, toStates)
    if (vcr.wasSuccess()) {
      this.checkAStatesMapping(vcr, fromStates)
    }
    return vcr
  }

  /**
   * 
   * @param {ValidationCheckResult} checkResult 
   */
  checkAandBExist(checkResult, fromStates, toStates) {
    if (!fromStates) {
      checkResult.fail(`Coupling error: coupling ${this.identifier} was defined to be ${this.fromID}->${this.toID}, but system ${this.fromID} does not exist`)
    }
    if (!toStates) {
      checkResult.fail(`Coupling error: coupling ${this.identifier} was defined to be ${this.fromID}->${this.toID}, but system ${this.toID} does not exist`)
    }
  }

  /**
   * 
   * @param {ValidationCheckResult} checkResult 
   */
  checkAStatesMapping(checkResult, fromStates) {
    let notFound = fromStates.filter(id => !this.mapping.has(id))
    if (notFound){
      checkResult.fail(`Coupling error: coupling ${this.identifier} did not contain mappings for system ${this.fromID}'s states ${notFound.join(", ")}`)
    }

    let mappingNotPossible = Array.from(this.mapping.keys()).filter(id => !fromStates.includes(id))
    if (mappingNotPossible) {
      checkResult.warn(`Coupling warning: coupling ${this.identifier} had unreachable mappings from system ${this.fromID}'s states ${mappingNotPossible.join(", ")}`)
    }
  }
}

class ValidationCheckResult {
  constructor() {
    this.failed = false
    this.failures = 0
    this.warnings = 0
    this.msgLog = []
  }
  fail(msg) {
    this.failures++
    this.failed = true
    this.msgLog.push(msg)
  }
  warn(msg) {
    this.warnings++
    this.msgLog.push(msg)
  }
  wasSuccess() {
    return !this.failed
  }

  terminate() {
    this.msgLog.push()
  }

  /**
   *
   * @param {ValidationCheckResult} other
   * @returns {ValidationCheckResult}
   */
  merge(other) {
    let vcr = new ValidationCheckResult()
    vcr.failed = this.failed || other.failed
    vcr.failures = this.failures + other.failures
    vcr.warnings = this.warnings + other.warnings
    vcr.msgLog = this.msgLog.concat(other.msgLog)
    return vcr
  }

  /**
   *
   * @param  {Array.<ValidationCheckResult>} others
   * @returns {ValidationCheckResult}
   */
  mergeMultiple(others) {
    let vcr = new ValidationCheckResult()
    vcr.failed = this.failed || others.map(o => o.failed).some(x => x)
    vcr.failures = this.failures + others.map(o => o.failures).reduce((acc, v) => acc + v, 0)
    vcr.warnings = this.warnings + others.map(o => o.warnings).reduce((acc, v) => acc + v, 0)
    vcr.msgLog = this.msgLog.concat(others.map(o => o.msgLog))
    return vcr
  }
}
