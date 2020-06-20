const TransitionType = {
  DETERMINISTIC: "D",
  PROBABILISTIC: "P"
}

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
    
    let systemResults = systemResultsComplete.map(({systemResult}) => systemResult)
    let transitionResults = systemResultsComplete.map(({ transitionResult }) => transitionResult)
    let nullTransitionResults = systemResultsComplete.map(({ nullTransitionResult }) => nullTransitionResult)

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
   * @param {NullTransitionIdentifierToken} nullTransitionID
   * @param {Array.<SystemStatesInput>} homeostasisGroupings
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
    this.transitionTable = null
    this.nullTransitionSpecification = null
    this.couplingVisibleStates = null
  }

  /**
   * 
   * @param {Map.<String, Array.<CouplingSpecification>>} incomingCouplings 
   * @param {Map.<String, Array.<CouplingSpecification>>} outgoingCouplings 
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
    let systemResult = new ValidationCheckResult()
    let nullTransitionResult = new ValidationCheckResult()
    let transitionResult = new ValidationCheckResult()

    if (!this.stateIdentifiers) {
      systemResult.fail(`System error: system ${this.identifier} had no state identifiers`)
      return { systemResult, nullTransitionResult, transitionResult }
    }

    if (this.stateIdentifiers.length !== new Set(this.stateIdentifiers).size) {
      systemResult.warn(`System error: system ${this.identifier} had duplicated system state identifiers`)
    }

    // We allow a transition table to be empty - it'll just behave as the null transition
    this.transitionTable = transitionLookup.get(this.transitionID)
    if (this.transitionTable) {
      this.couplingVisibleStates = this.buildOrderedCouplingVisibleStates()
      transitionResult = this.transitionTable.checkForSystem(this.identifier, this.stateIdentifiers, couplingVisibleStates)
    }

    // We don't allow null transitions to be empty, but they CAN be the "identity"
    if (this.nullTransitionID instanceof NullTransitionIdentifier_Identity) {
      let generatedNullTransitionID = `#null_identity_${this.identifier}`
      let generatedNullTransitionMap = new Map()
      this.stateIdentifiers.forEach(s => generatedNullTransitionMap.set(s, s))
      this.nullTransitionSpecification = new NullTransitionSpecification(generatedNullTransitionID, generatedNullTransitionMap)
    }
    else if (this.nullTransitionID instanceof NullTransitionIdentifier) {
      this.nullTransitionSpecification = nullTransitionLookup.get(this.nullTransitionID.identifier)
    } // no other cases
    
    if (!this.nullTransitionSpecification) {
      systemResult.fail(`System error: system ${this.identifier} had no null transition mapping`)
    }
    else {
      nullTransitionResult = this.nullTransitionSpecification.check(this.identifier, this.stateIdentifiers)
      this.checkOrAssignHomeostasisGroupings(systemResult)
      this.checkDeathStates(systemResult)
    }
    
    return { transitionResult, nullTransitionResult, systemResult }
  }

  checkOrAssignHomeostasisGroupings(checkResult) {
    let generatedHomeostasisGroupings = this.generateHomeostasisGroupings()
    if (this.homeostasisGroupings) {
      // it's entirely possible to have states NOT in a homeostasis grouping - non-homeostasis states!
      // so we just need to check to make sure homeostasis states aren't duplicated and all given homeostasis states exist
      let homeostasisStates = this.homeostasisGroupings.flat()

      let homeostasisStatesNotExisting = homeostasisStates.filter(g => !this.stateIdentifiers.includes(g))
      if (homeostasisStatesNotExisting) {
        systemResult.warn(`System error: system ${this.identifier} had the following specified homeostasis states that did not appear in the system states: ${homeostasisStatesNotExisting.join(", ")}`)
      }

      let statesInMultipleHomeostasisGroupings = homeostasisStates.filter(s => homeostasisStates.filter(s2 => s === s2).length > 1)
      if (statesInMultipleHomeostasisGroupings) {
        systemResult.warn(`System error: system ${this.identifier} had the following specified homeostasis states that appeared multiple times: ${statesInMultipleHomeostasisGroupings.join(", ")}`)
      }

      this.compareHomeostasisGroupings(checkResult, generatedHomeostasisGroupings)
    }
    else {
      this.homeostasisGroupings = generatedHomeostasisGroupings
    }
  }

  /**
   * if incoming couplings exist
   * @returns {Array.<CouplingOutputStatesInput>} the array containing arrays of coupling visible states,
   * each coupling in the same order as specified in this system's coupling list
   */
  buildOrderedCouplingVisibleStates() {
    return this.incomingCouplings.map(incoming => incoming.visibleStates)
  }

  /**
   * requires homeostasis groupings to have been checked.
   * A death state must be a system state, and must occur in a single-element homeostasis grouping
   * @param {ValidationCheckResult} checkResult
   */
  checkDeathStates(checkResult) {
    let nonExistentDeathStates = this.deathStates.filter(deathState => !this.stateIdentifiers.includes(deathState))
    if (nonExistentDeathStates) {
      checkResult.fail(`System error: system ${this.identifier} had death states that were not in its system states: ${nonExistentDeathStates.join(", ")}`)
    }
    let invalidDeathStates = this.deathStates.filter(deathState => !nonExistentDeathStates.includes(deathState) && !this.homeostasisGroupings.some(homeostasisGrouping => homeostasisGrouping.includes(deathState) && homeostasisGrouping.length === 1))
    if (invalidDeathStates) {
      checkResult.fail(`System error: system ${this.identifier} had death states not corresponding to a single-element homeostasis state group: ${invalidDeathStates.join(", ")}`)
    }
  }

  generateHomeostasisGroupings() {
    // we've got some issues here - it's trivial in a purely-deterministic system, but what is homeostasis in a probabilistic system?
    // can't just say "yeah it's all cyclic states and sinks" because the probabilistic nature needs to be taken into account, I think.
    // Ok, checked Ashby's Introduction, p. 229: "state of equilibrium" is how he phrases it; once a system gets into it it can't get out, so it's
    // the SCCs of the graph when you remove all 0-probability transitions. Given that 0-probability transitions aren't going to exist, we can just do
    // an SCC. This also works for deterministic systems - a cycle of vertices is an SCC on its own, as is a sink vertex (although non-sinks can also 
    // be SCCs! watch out - has to be a sink, not just a single-component SCC).
    
    // Interesting note: does that mean that a crisis state is a state of equilibrium? guess so! he does actually mention on p.81 (5/11) that sometimes
    // homeostasis is in an unwanted state!

    console.log("NEED TO GENERATE HOMEOSTASIS GROUPINGS")




  }

  /**
   * 
   * @param {ValidationCheckResult} checkResult 
   * @param {Array.<SystemStatesInput>} generatedHomeostasisGroupings 
   */
  compareHomeostasisGroupings(checkResult, generatedHomeostasisGroupings) {
    // We go both ways: 
    // for each generated grouping G, there must exist some provided grouping P where all of G are in P
    // for each provided grouping P, there must exist some generated grouping G where all of P are in G

    let generatedUnmatched = generatedHomeostasisGroupings
      .filter(generatedGrouping => 
        !this.homeostasisGroupings.some(providedGrouping => 
          generatedGrouping.every(g => providedGrouping.includes(g)) ))

    let providedUnmatched = this.homeostasisGroupings
      .filter(providedGrouping => 
        !this.generatedHomeostasisGroupings.some(generatedGrouping =>
          providedGrouping.every(p => generatedGrouping.includes(p))))

    if (generatedUnmatched) {
      checkResult.warn(`System warning: system ${this.identifier} found the following generated homeostasis groupings unmatched by the provided groupings: ${generatedUnmatched.join(", ")}`)
      checkResult.warn(`System warning: system ${this.identifier} found the following provided homeostasis groupings unmatched by the generated groupings: ${providedUnmatched.join(", ")}`)
    }
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
   * @returns {ValidationCheckResult}
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

    return checkResult
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
   * @returns {ValidationCheckResult}
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





/**
 * Token for parsing null transitions - it will either be some identifier, or
 * the identity-transition that leaves everything the same
 */
class NullTransitionIdentifierToken { }

class NullTransitionIdentifier_Identity extends NullTransitionIdentifierToken { }

class NullTransitionIdentifier extends NullTransitionIdentifierToken {
  constructor(identifier) {
    this._identifier = identifier
  }
  get identifier() { return this._identifier }
}

